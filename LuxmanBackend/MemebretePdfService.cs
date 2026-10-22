using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using iText.Forms;
using iText.Forms.Fields;
using iText.IO.Font.Constants;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using LetraPdf = UglyToad.PdfPig.Content.Letter;
using DocIText = iText.Kernel.Pdf.PdfDocument;
using DocPdfPig = UglyToad.PdfPig.PdfDocument;

namespace LuxmanErp.Services
{
    // servicio que genera el pdf con membrete y le pone campos editables encima del texto
    public class MemebretePdfService
    {
        private const string ColorCampo = "#FFFFFF";
        private const string ColorPrimario = "#1F5FA8";
        private const string ColorSecundario = "#2A8BB0";

        private static readonly string RutaHeader = Path.Combine(AppContext.BaseDirectory, "Assets", "header_luxman.png");
        private static readonly string RutaFooter = Path.Combine(AppContext.BaseDirectory, "Assets", "footer_luxman.png");

        private static readonly Regex ExpresionVineta = new(@"^\s*[-•*·]\s+(.*)$", RegexOptions.Compiled);
        private static readonly Regex ExpresionTitulo =
            new(@"^\s*(propuesta|cotizaci[oó]n|opci[oó]n|alternativa)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly string[] Meses =
        {
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        };

        public const string TextoFirma = "Atte. Ing Raúl Romero Juárez";

        // sacamos la hora de mexico por si el contenedor de docker esta en otra zona horaria
        public static DateTime AhoraMexico()
        {
            foreach (string zona in new[] { "America/Mexico_City", "Central Standard Time (Mexico)" })
            {
                try { return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(zona)); }
                catch { }
            }
            return DateTime.UtcNow.AddHours(-6);
        }

        public static string FormatearFecha(DateTime fecha) => $"{fecha.Day} de {Meses[fecha.Month - 1]} de {fecha.Year}";

        public byte[] Generar(TextoCotizacionParser.Resultado contenido, DateTime fecha)
        {
            byte[] pdfBase = ArmarBaseConQuestPdf(contenido, FormatearFecha(fecha));
            return PonerCamposEditables(pdfBase);
        }

        // primero hacemos el pdf con questpdf poniendo el texto en blanco para acomodar las posiciones
        private static byte[] ArmarBaseConQuestPdf(TextoCotizacionParser.Resultado datos, string fechaTexto)
        {
            return Document.Create(documento =>
            {
                documento.Page(pagina =>
                {
                    pagina.Size(PageSizes.Letter);
                    pagina.MarginHorizontal(40);
                    pagina.MarginVertical(25);
                    pagina.DefaultTextStyle(estilo => estilo.FontSize(10).FontColor("#111111"));

                    pagina.Header().PaddingBottom(10).Element(contenedor =>
                    {
                        if (File.Exists(RutaHeader))
                            contenedor.Image(RutaHeader).FitWidth();
                        else
                            DibujarBannerRespaldo(contenedor, "LUXMAN - EQUIMEX",
                                "Reactores, tanques, condensadores, marmitas, mezcladoras de polvo, máquinas de precisión");
                    });

                    pagina.Content().Column(columna =>
                    {
                        columna.Spacing(3);
                        columna.Item().Text(datos.NombreCliente).Bold().FontSize(11).FontColor(ColorCampo);

                        foreach (string linea in datos.Encabezado)
                            columna.Item().Text(linea).FontSize(10).FontColor(ColorCampo);

                        columna.Item().Row(fila =>
                        {
                            fila.ConstantItem(36).Text("Fecha:").FontSize(10);
                            fila.RelativeItem().Text(fechaTexto).FontSize(10).FontColor(ColorCampo);
                        });

                        columna.Item().Height(10);

                        foreach (string lineaCruda in datos.Cuerpo)
                        {
                            string linea = lineaCruda.Trim();
                            if (linea.Length == 0)
                            {
                                columna.Item().Height(6);
                                continue;
                            }

                            var coincidenciaVineta = ExpresionVineta.Match(linea);
                            if (coincidenciaVineta.Success)
                            {
                                string textoVineta = coincidenciaVineta.Groups[1].Value;
                                columna.Item().PaddingLeft(10).Row(fila =>
                                {
                                    fila.ConstantItem(12).Text("•").FontSize(10);
                                    fila.RelativeItem().Text(textoVineta).FontSize(10).FontColor(ColorCampo);
                                });
                            }
                            else if (ExpresionTitulo.IsMatch(linea) || (linea.EndsWith(":") && linea.Length < 60))
                            {
                                columna.Item().PaddingTop(6).Text(linea).Bold().FontSize(12).FontColor(ColorCampo);
                            }
                            else
                            {
                                columna.Item().Text(linea).FontSize(10).FontColor(ColorCampo);
                            }
                        }

                        columna.Item().PaddingTop(28).ShowEntire()
                            .Text(TextoFirma).Bold().FontSize(11).FontColor(ColorCampo);
                    });

                    pagina.Footer().PaddingTop(8).Element(contenedor =>
                    {
                        if (File.Exists(RutaFooter))
                            contenedor.Image(RutaFooter).FitWidth();
                        else
                            DibujarBannerRespaldo(contenedor, "www.equiposinoxidablesluxman.com",
                                "Av. Guadiana 203, Ecatepec Edo. México");
                    });
                });
            }).GeneratePdf();
        }

        private static void DibujarBannerRespaldo(IContainer contenedor, string titulo, string subtitulo)
        {
            contenedor.Background("#EAF4FA").Border(1).BorderColor(ColorSecundario).Padding(8).Column(col =>
            {
                col.Item().AlignCenter().Text(titulo).Bold().FontSize(16).FontColor(ColorPrimario);
                col.Item().AlignCenter().Text(subtitulo).FontSize(7.5f).FontColor("#333333");
            });
        }

        private record DatosLinea(int Pagina, string Texto, double X, double Y, double Ancho, double Alto, double Tamano, bool Negrita);

        // leemos donde quedaron las letras blancas con pdfpig y les ponemos inputs de itext encima
        private static byte[] PonerCamposEditables(byte[] pdfBase)
        {
            var lineasDetectadas = new List<DatosLinea>();

            using (var documentoPig = DocPdfPig.Open(pdfBase))
            {
                foreach (var pagina in documentoPig.GetPages())
                {
                    var letrasBlancas = pagina.Letters
                        .Where(letra => !string.IsNullOrEmpty(letra.Value) && EsLetraBlanca(letra))
                        .OrderByDescending(letra => letra.StartBaseLine.Y)
                        .ToList();

                    var renglones = new List<List<LetraPdf>>();
                    foreach (var letra in letrasBlancas)
                    {
                        if (renglones.Count > 0 &&
                            Math.Abs(renglones[^1][0].StartBaseLine.Y - letra.StartBaseLine.Y) < letra.PointSize * 0.4)
                            renglones[^1].Add(letra);
                        else
                            renglones.Add(new List<LetraPdf> { letra });
                    }

                    foreach (var renglon in renglones)
                    {
                        var ordenadas = renglon.OrderBy(letra => letra.StartBaseLine.X).ToList();
                        var constructorTexto = new StringBuilder();
                        LetraPdf? letraPrevia = null;

                        foreach (var letra in ordenadas)
                        {
                            if (letraPrevia != null)
                            {
                                double espacio = letra.StartBaseLine.X - letraPrevia.EndBaseLine.X;
                                if (espacio > letra.PointSize * 0.18 && !letraPrevia.Value.EndsWith(" ") && letra.Value != " ")
                                    constructorTexto.Append(' ');
                            }
                            constructorTexto.Append(letra.Value);
                            letraPrevia = letra;
                        }

                        string textoRenglon = constructorTexto.ToString().Trim();
                        if (textoRenglon.Length == 0) continue;

                        double tamano = ordenadas.Max(letra => letra.PointSize);
                        double posIzq = ordenadas.Min(letra => letra.StartBaseLine.X);
                        double posDer = ordenadas.Max(letra => letra.EndBaseLine.X);
                        double posY = ordenadas.Average(letra => letra.StartBaseLine.Y);
                        bool esNegrita = ordenadas.Any(letra => (letra.FontName ?? "").Contains("Bold", StringComparison.OrdinalIgnoreCase));

                        lineasDetectadas.Add(new DatosLinea(pagina.Number, textoRenglon, posIzq, posY, posDer - posIzq, tamano * 1.4, tamano, esNegrita));
                    }
                }
            }

            using var flujoSalida = new MemoryStream();
            using (var lectorPdf = new PdfReader(new MemoryStream(pdfBase)))
            using (var escritorPdf = new PdfWriter(flujoSalida))
            using (var docEditable = new DocIText(lectorPdf, escritorPdf))
            {
                var formulario = PdfAcroForm.GetAcroForm(docEditable, true);
                var fuenteNormal = PdfFontFactory.CreateFont(StandardFonts.HELVETICA);
                var fuenteNegrita = PdfFontFactory.CreateFont(StandardFonts.HELVETICA_BOLD);

                int contador = 1;
                foreach (var linea in lineasDetectadas)
                {
                    float anchoPagina = docEditable.GetPage(linea.Pagina).GetPageSize().GetWidth();
                    float posX = (float)linea.X - 2f;
                    float anchoCampo = Math.Min((float)(linea.Ancho * 1.12 + 10), anchoPagina - 20f - posX);
                    float posY = (float)(linea.Y - linea.Tamano * 0.32);

                    var campoTexto = new TextFormFieldBuilder(docEditable, $"campo_{contador++}")
                        .SetWidgetRectangle(new iText.Kernel.Geom.Rectangle(posX, posY, anchoCampo, (float)linea.Alto))
                        .SetPage(linea.Pagina)
                        .CreateText();

                    campoTexto.SetFont(linea.Negrita ? fuenteNegrita : fuenteNormal);
                    campoTexto.SetFontSize((float)linea.Tamano);
                    campoTexto.SetValue(linea.Texto);
                    formulario.AddField(campoTexto);
                }

                formulario.SetNeedAppearances(true);
            }

            return flujoSalida.ToArray();
        }

        private static bool EsLetraBlanca(LetraPdf letra)
        {
            try
            {
                var (rojo, verde, azul) = letra.Color.ToRGBValues();
                return rojo > 0.97 && verde > 0.97 && azul > 0.97;
            }
            catch
            {
                return false;
            }
        }
    }
}
