using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace LuxmanErp.Services
{
    // Interpreta el texto libre del CEO: extrae el nombre del cliente
    // y entiende instrucciones de correccion ("corrige solo el precio a X").
    // Es deterministico (reglas), asi no depende de una API externa.
    public static class TextoCotizacionParser
    {
        public record Resultado(string NombreCliente, List<string> Encabezado, List<string> Cuerpo);

        public record Correccion(bool Aplicada, string TextoNuevo, string Mensaje);

        private static readonly Regex RxAtencion =
            new(@"^\s*(atenci[oó]n|attn?\.?)\s*:", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex RxPrefijoCliente =
            new(@"^\s*(cliente|empresa|raz[oó]n social)\s*:\s*", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex RxNoEsNombre =
            new(@"^\s*([-•*·]|\d|\$)", RegexOptions.Compiled);

        private static readonly Regex RxCorreccion = new(
            @"^\s*(?:por favor[,\s]+)?(?:corrig[eé]|corregir|cambia|modifica|actualiza)\s+(?:solo\s+|solamente\s+|únicamente\s+|unicamente\s+)?(?:el\s+|la\s+|los\s+|las\s+)?(?<campo>.+?)\s+(?:a|por|con)\s+(?<valor>.+?)\s*$",
            RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

        private static readonly Regex RxNumero =
            new(@"\$?\s?\d[\d,]*(?:\.\d+)?", RegexOptions.Compiled);

        public static Resultado Parsear(string texto)
        {
            var lineas = (texto ?? "")
                .Replace("\r\n", "\n").Replace('\r', '\n')
                .Split('\n')
                .Select(l => l.TrimEnd())
                .ToList();

            while (lineas.Count > 0 && string.IsNullOrWhiteSpace(lineas[0])) lineas.RemoveAt(0);

            string nombre = "Cliente sin nombre";
            if (lineas.Count > 0 && !RxNoEsNombre.IsMatch(lineas[0]))
            {
                nombre = RxPrefijoCliente.Replace(lineas[0].Trim(), "").Trim();
                if (nombre.Length == 0) nombre = "Cliente sin nombre";
                lineas.RemoveAt(0);
            }

            // la linea(s) de "Atencion:" van pegadas al nombre, antes de la fecha
            var encabezado = new List<string>();
            while (lineas.Count > 0 && RxAtencion.IsMatch(lineas[0]))
            {
                encabezado.Add(lineas[0].Trim());
                lineas.RemoveAt(0);
            }

            while (lineas.Count > 0 && string.IsNullOrWhiteSpace(lineas[0])) lineas.RemoveAt(0);
            while (lineas.Count > 0 && string.IsNullOrWhiteSpace(lineas[^1])) lineas.RemoveAt(lineas.Count - 1);

            return new Resultado(nombre, encabezado, lineas);
        }

        public static bool EsCorreccion(string mensaje)
        {
            return RxCorreccion.IsMatch(mensaje ?? "");
        }

        // Cambia unicamente el fragmento pedido; el resto del texto queda identico.
        public static Correccion AplicarCorreccion(string textoActual, string instruccion)
        {
            var m = RxCorreccion.Match(instruccion ?? "");
            if (!m.Success)
                return new Correccion(false, textoActual, "No entendí la corrección. Ejemplo: \"corrige solo el precio a $15,000\".");

            string campo = m.Groups["campo"].Value.Trim().TrimEnd(':');
            string valor = m.Groups["valor"].Value.Trim().TrimEnd('.');
            string campoNorm = Normalizar(campo);

            var lineas = textoActual.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n').ToList();

            var coincidencias = new List<int>();
            for (int i = 0; i < lineas.Count; i++)
            {
                if (Normalizar(lineas[i]).Contains(campoNorm)) coincidencias.Add(i);
            }

            if (coincidencias.Count == 0)
                return new Correccion(false, textoActual, $"No encontré \"{campo}\" en el documento.");

            foreach (int i in coincidencias)
            {
                string? nueva = ReemplazarEnLinea(lineas[i], valor);
                if (nueva == null) continue;

                lineas[i] = nueva;
                string extra = coincidencias.Count > 1
                    ? $" (hay {coincidencias.Count} coincidencias; se corrigió la primera)"
                    : "";
                return new Correccion(true, string.Join("\n", lineas), $"Listo, corregí \"{campo}\" a {valor}{extra}.");
            }

            return new Correccion(false, textoActual, $"Encontré \"{campo}\" pero no tiene un valor que pueda reemplazar.");
        }

        private static string? ReemplazarEnLinea(string linea, string valor)
        {
            var num = RxNumero.Match(linea);
            if (num.Success)
            {
                string nuevo = valor;
                if (decimal.TryParse(valor.Replace("$", "").Replace(",", "").Trim(),
                        NumberStyles.Number, CultureInfo.InvariantCulture, out decimal cantidad))
                {
                    bool conSimbolo = num.Value.TrimStart().StartsWith("$") || valor.Contains('$');
                    bool conDecimales = num.Value.Contains('.') || valor.Contains('.');
                    nuevo = (conSimbolo ? "$" : "") +
                            cantidad.ToString(conDecimales ? "N2" : "N0", CultureInfo.InvariantCulture);
                }
                return linea.Substring(0, num.Index) + nuevo + linea.Substring(num.Index + num.Length);
            }

            int dosPuntos = linea.IndexOf(':');
            if (dosPuntos >= 0) return linea.Substring(0, dosPuntos + 1) + " " + valor;

            return null;
        }

        private static string Normalizar(string s)
        {
            var sb = new StringBuilder();
            foreach (char c in s.Normalize(NormalizationForm.FormD))
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                    sb.Append(char.ToLowerInvariant(c));
            }
            return sb.ToString();
        }
    }
}
