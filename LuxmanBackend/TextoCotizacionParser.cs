using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace LuxmanErp.Services
{
    // clase para separar el texto que escribe el usuario en el chat y aplicar correcciones
    public static class TextoCotizacionParser
    {
        public record Resultado(string NombreCliente, List<string> Encabezado, List<string> Cuerpo);
        public record Correccion(bool Aplicada, string TextoNuevo, string Mensaje);

        private static readonly Regex ExpresionAtencion =
            new(@"^\s*(atenci[oó]n|attn?\.?)\s*:", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex ExpresionPrefijoCliente =
            new(@"^\s*(cliente|empresa|raz[oó]n social)\s*:\s*", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex ExpresionNoEsNombre =
            new(@"^\s*([-•*·]|\d|\$)", RegexOptions.Compiled);

        private static readonly Regex ExpresionCorreccion = new(
            @"^\s*(?:por favor[,\s]+)?(?:corrig[eé]|corregir|cambia|modifica|actualiza)\s+(?:solo\s+|solamente\s+|únicamente\s+|unicamente\s+)?(?:el\s+|la\s+|los\s+|las\s+)?(?<campo>.+?)\s+(?:a|por|con)\s+(?<valor>.+?)\s*$",
            RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

        private static readonly Regex ExpresionNumero =
            new(@"\$?\s?\d[\d,]*(?:\.\d+)?", RegexOptions.Compiled);

        // separa el nombre del cliente, la linea de atencion y el resto del cuerpo
        public static Resultado Parsear(string texto)
        {
            var lineas = (texto ?? "")
                .Replace("\r\n", "\n").Replace('\r', '\n')
                .Split('\n')
                .Select(linea => linea.TrimEnd())
                .ToList();

            while (lineas.Count > 0 && string.IsNullOrWhiteSpace(lineas[0]))
                lineas.RemoveAt(0);

            string nombreCliente = "Cliente sin nombre";
            if (lineas.Count > 0 && !ExpresionNoEsNombre.IsMatch(lineas[0]))
            {
                nombreCliente = ExpresionPrefijoCliente.Replace(lineas[0].Trim(), "").Trim();
                if (nombreCliente.Length == 0) nombreCliente = "Cliente sin nombre";
                lineas.RemoveAt(0);
            }

            var encabezado = new List<string>();
            while (lineas.Count > 0 && ExpresionAtencion.IsMatch(lineas[0]))
            {
                encabezado.Add(lineas[0].Trim());
                lineas.RemoveAt(0);
            }

            while (lineas.Count > 0 && string.IsNullOrWhiteSpace(lineas[0]))
                lineas.RemoveAt(0);
            while (lineas.Count > 0 && string.IsNullOrWhiteSpace(lineas[^1]))
                lineas.RemoveAt(lineas.Count - 1);

            return new Resultado(nombreCliente, encabezado, lineas);
        }

        public static bool EsCorreccion(string mensaje) => ExpresionCorreccion.IsMatch(mensaje ?? "");

        // busca el campo que pidio cambiar el usuario y reemplaza su valor
        public static Correccion AplicarCorreccion(string textoActual, string instruccion)
        {
            var coincidencia = ExpresionCorreccion.Match(instruccion ?? "");
            if (!coincidencia.Success)
                return new Correccion(false, textoActual, "No entendí la corrección. Ejemplo: \"corrige solo el precio a $15,000\".");

            string campoBuscado = coincidencia.Groups["campo"].Value.Trim().TrimEnd(':');
            string nuevoValor = coincidencia.Groups["valor"].Value.Trim().TrimEnd('.');
            string campoNormalizado = QuitarAcentos(campoBuscado);

            var lineas = textoActual.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n').ToList();
            var indicesEncontrados = new List<int>();

            for (int i = 0; i < lineas.Count; i++)
            {
                if (QuitarAcentos(lineas[i]).Contains(campoNormalizado))
                    indicesEncontrados.Add(i);
            }

            if (indicesEncontrados.Count == 0)
                return new Correccion(false, textoActual, $"No encontré \"{campoBuscado}\" en el documento.");

            foreach (int i in indicesEncontrados)
            {
                string? lineaModificada = CambiarValorEnLinea(lineas[i], nuevoValor);
                if (lineaModificada == null) continue;

                lineas[i] = lineaModificada;
                string notaExtra = indicesEncontrados.Count > 1
                    ? $" (hay {indicesEncontrados.Count} coincidencias; se corrigió la primera)"
                    : "";
                return new Correccion(true, string.Join("\n", lineas), $"Listo, corregí \"{campoBuscado}\" a {nuevoValor}{notaExtra}.");
            }

            return new Correccion(false, textoActual, $"Encontré \"{campoBuscado}\" pero no tiene un valor que pueda reemplazar.");
        }

        private static string? CambiarValorEnLinea(string linea, string nuevoValor)
        {
            var numeroActual = ExpresionNumero.Match(linea);
            if (numeroActual.Success)
            {
                string valorFormateado = nuevoValor;
                if (decimal.TryParse(nuevoValor.Replace("$", "").Replace(",", "").Trim(),
                        NumberStyles.Number, CultureInfo.InvariantCulture, out decimal cantidad))
                {
                    bool llevaSignoPesos = numeroActual.Value.TrimStart().StartsWith("$") || nuevoValor.Contains('$');
                    bool llevaDecimales = numeroActual.Value.Contains('.') || nuevoValor.Contains('.');
                    valorFormateado = (llevaSignoPesos ? "$" : "") +
                        cantidad.ToString(llevaDecimales ? "N2" : "N0", CultureInfo.InvariantCulture);
                }
                return linea.Substring(0, numeroActual.Index) + valorFormateado + linea.Substring(numeroActual.Index + numeroActual.Length);
            }

            int posicionDosPuntos = linea.IndexOf(':');
            if (posicionDosPuntos >= 0)
                return linea.Substring(0, posicionDosPuntos + 1) + " " + nuevoValor;

            return null;
        }

        // quita tildes y pasa todo a minusculas para comparar sin fallar por acentos
        private static string QuitarAcentos(string texto)
        {
            var resultado = new StringBuilder();
            foreach (char caracter in texto.Normalize(NormalizationForm.FormD))
            {
                if (CharUnicodeInfo.GetUnicodeCategory(caracter) != UnicodeCategory.NonSpacingMark)
                    resultado.Append(char.ToLowerInvariant(caracter));
            }
            return resultado.ToString();
        }
    }
}
