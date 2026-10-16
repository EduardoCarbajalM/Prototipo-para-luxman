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
using Letra = UglyToad.PdfPig.Content.Letter;
using ITextDocument = iText.Kernel.Pdf.PdfDocument;
using PigDocument = UglyToad.PdfPig.PdfDocument;

namespace LuxmanErp.Services
{
    // Genera el PDF con membrete (header/footer en imagen) usando QuestPDF y despues
    // convierte cada linea de texto en un campo editable AcroForm (estilo Acrobat).
    //
    // Como QuestPDF no crea campos de formulario, el flujo es:
    //   1) QuestPDF maqueta el documento con el texto en BLANCO (solo fija posiciones/saltos de pagina).
    //   2) PdfPig lee de ese PDF la posicion exacta de cada linea blanca.
    //   3) iText agrega un campo de texto negro con ese valor sobre cada linea.
    // Resultado: layout tipografico de QuestPDF + valores 100% editables.
    public class MemebretePdfService
    {
        private const string ColorCampo = "#FFFFFF";   // texto "fantasma" que luego cubren los campos
        private const string ColorPrimario = "#1F5FA8";
        private const string ColorSecundario = "#2A8BB0";

        private static readonly string RutaHeader = Path.Combine(AppContext.BaseDirectory, "Assets", "header_luxman.png");
        private static readonly string RutaFooter = Path.Combine(AppContext.BaseDirectory, "Assets", "footer_luxman.png");

        private static readonly Regex RxViñeta = new(@"^\s*[-•*·]\s+(.*)$", RegexOptions.Compiled);
        private static readonly Regex RxTitulo =
            new(@"^\s*(propuesta|cotizaci[oó]n|opci[oó]n|alternativa)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly string[] Meses =
        {
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        };

        public const string TextoFirma = "Atte. Ing Raúl Romero Juárez";

        // Fecha actual del sistema en hora de Mexico (el contenedor Docker corre en UTC)
        public static DateTime AhoraMexico()
        {
            foreach (string id in new[] { "America/Mexico_City", "Central Standard Time (Mexico)" })
            {
                try { return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(id)); }
                catch { /* probamos el siguiente id */ }
            }
            return DateTime.UtcNow.AddHours(-6);
        }

        public static string FormatearFecha(DateTime f) => $"{f.Day} de {Meses[f.Month - 1]} de {f.Year}";

        public byte[] Generar(TextoCotizacionParser.Resultado contenido, DateTime fecha)
        {
            byte[] base_ = ConstruirConQuestPdf(contenido, FormatearFecha(fecha));
            return ConvertirLineasEnCampos(base_);
        }

        // -----------------------------------------------------------------
        // PASO 1: QuestPDF
        // -----------------------------------------------------------------
        private static byte[] ConstruirConQuestPdf(TextoCotizacionParser.Resultado r, string fechaTexto)
        {
            return Document.Create(doc =>
            {
                doc.Page(pagina =>
                {
                    pagina.Size(PageSizes.Letter);
                    pagina.MarginHorizontal(40);
                    pagina.MarginVertical(25);
                    pagina.DefaultTextStyle(e => e.FontSize(10).FontColor("#111111"));

                    // ---------- HEADER (siempre con imagen) ----------
                    pagina.Header().PaddingBottom(10).Element(c =>
                    {
                        if (File.Exists(RutaHeader))
                            c.Image(RutaHeader).FitWidth();
                        else
                            BannerRespaldo(c, "LUXMAN - EQUIMEX",
                                "Reactores, tanques, condensadores, marmitas, mezcladoras de polvo, máquinas de precisión");
                    });

                    // ---------- CONTENIDO ----------
                    pagina.Content().Column(col =>
                    {
                        col.Spacing(3);

                        col.Item().Text(r.NombreCliente).Bold().FontSize(11).FontColor(ColorCampo);

                        foreach (string linea in r.Encabezado)
                            col.Item().Text(linea).FontSize(10).FontColor(ColorCampo);

                        col.Item().Row(fila =>
                        {
                            fila.ConstantItem(36).Text("Fecha:").FontSize(10);
                            fila.RelativeItem().Text(fechaTexto).FontSize(10).FontColor(ColorCampo);
                        });

                        col.Item().Height(10);

                        foreach (string cruda in r.Cuerpo)
                        {
                            string linea = cruda.Trim();

                            if (linea.Length == 0)
                            {
                                col.Item().Height(6);
                                continue;
                            }

                            var viñeta = RxViñeta.Match(linea);
                            if (viñeta.Success)
                            {
                                string texto = viñeta.Groups[1].Value;
                                col.Item().PaddingLeft(10).Row(fila =>
                                {
                                    fila.ConstantItem(12).Text("•").FontSize(10);
                                    fila.RelativeItem().Text(texto).FontSize(10).FontColor(ColorCampo);
                                });
                            }
                            else if (RxTitulo.IsMatch(linea) || (linea.EndsWith(":") && linea.Length < 60))
                            {
                                col.Item().PaddingTop(6).Text(linea).Bold().FontSize(12).FontColor(ColorCampo);
                            }
                            else
                            {
                                col.Item().Text(linea).FontSize(10).FontColor(ColorCampo);
                            }
                        }

                        // ---------- Firma fija ----------
                        col.Item().PaddingTop(28).ShowEntire()
                            .Text(TextoFirma).Bold().FontSize(11).FontColor(ColorCampo);
                    });

                    // ---------- FOOTER (siempre con imagen) ----------
                    pagina.Footer().PaddingTop(8).Element(c =>
                    {
                        if (File.Exists(RutaFooter))
                            c.Image(RutaFooter).FitWidth();
                        else
                            BannerRespaldo(c, "www.equiposinoxidablesluxman.com",
                                "Av. Guadiana 203, Ecatepec Edo. México");
                    });
                });
            }).GeneratePdf();
        }

        // Si aun no se copian las imagenes reales a Assets/, se dibuja un banner con la
        // identidad de Luxman para que el membrete nunca falte.
        private static void BannerRespaldo(IContainer c, string titulo, string subtitulo)
        {
            c.Background("#EAF4FA").Border(1).BorderColor(ColorSecundario).Padding(8).Column(col =>
            {
                col.Item().AlignCenter().Text(titulo).Bold().FontSize(16).FontColor(ColorPrimario);
                col.Item().AlignCenter().Text(subtitulo).FontSize(7.5f).FontColor("#333333");
            });
        }

        // -----------------------------------------------------------------
        // PASOS 2 y 3: PdfPig localiza las lineas, iText crea los campos
        // -----------------------------------------------------------------
        private record LineaCampo(int Pagina, string Texto, double X, double Y, double Ancho, double Alto, double Tamano, bool Negrita);

        private static byte[] ConvertirLineasEnCampos(byte[] pdfBase)
        {
            var lineas = new List<LineaCampo>();

            using (var pig = PigDocument.Open(pdfBase))
            {
                foreach (var pagina in pig.GetPages())
                {
                    var blancas = pagina.Letters
                        .Where(l => !string.IsNullOrEmpty(l.Value) && EsBlanca(l))
                        .OrderByDescending(l => l.StartBaseLine.Y)
                        .ToList();

                    var grupos = new List<List<Letra>>();
                    foreach (var l in blancas)
                    {
                        if (grupos.Count > 0 &&
                            Math.Abs(grupos[^1][0].StartBaseLine.Y - l.StartBaseLine.Y) < l.PointSize * 0.4)
                            grupos[^1].Add(l);
                        else
                            grupos.Add(new List<Letra> { l });
                    }

                    foreach (var grupo in grupos)
                    {
                        var ordenadas = grupo.OrderBy(l => l.StartBaseLine.X).ToList();
                        var sb = new StringBuilder();
                        Letra? previa = null;
                        foreach (var l in ordenadas)
                        {
                            if (previa != null)
                            {
                                double hueco = l.StartBaseLine.X - previa.EndBaseLine.X;
                                if (hueco > l.PointSize * 0.18 && !previa.Value.EndsWith(" ") && l.Value != " ")
                                    sb.Append(' ');
                            }
                            sb.Append(l.Value);
                            previa = l;
                        }

                        string texto = sb.ToString().Trim();
                        if (texto.Length == 0) continue;

                        double tam = ordenadas.Max(l => l.PointSize);
                        double izq = ordenadas.Min(l => l.StartBaseLine.X);
                        double der = ordenadas.Max(l => l.EndBaseLine.X);
                        double baseY = ordenadas.Average(l => l.StartBaseLine.Y);
                        bool negrita = ordenadas.Any(l => (l.FontName ?? "").Contains("Bold", StringComparison.OrdinalIgnoreCase));

                        lineas.Add(new LineaCampo(pagina.Number, texto, izq, baseY, der - izq, tam * 1.4, tam, negrita));
                    }
                }
            }

            using var salida = new MemoryStream();
            using (var lector = new PdfReader(new MemoryStream(pdfBase)))
            using (var escritor = new PdfWriter(salida))
            using (var doc = new ITextDocument(lector, escritor))
            {
                var form = PdfAcroForm.GetAcroForm(doc, true);
                var fuenteNormal = PdfFontFactory.CreateFont(StandardFonts.HELVETICA);
                var fuenteNegrita = PdfFontFactory.CreateFont(StandardFonts.HELVETICA_BOLD);

                int n = 1;
                foreach (var l in lineas)
                {
                    float anchoPagina = doc.GetPage(l.Pagina).GetPageSize().GetWidth();
                    float x = (float)l.X - 2f;
                    float ancho = (float)(l.Ancho * 1.12 + 10);
                    ancho = Math.Min(ancho, anchoPagina - 20f - x);
                    float y = (float)(l.Y - l.Tamano * 0.32);

                    var campo = new TextFormFieldBuilder(doc, $"campo_{n++}")
                        .SetWidgetRectangle(new iText.Kernel.Geom.Rectangle(x, y, ancho, (float)l.Alto))
                        .SetPage(l.Pagina)
                        .CreateText();

                    campo.SetFont(l.Negrita ? fuenteNegrita : fuenteNormal);
                    campo.SetFontSize((float)l.Tamano);
                    campo.SetValue(l.Texto);
                    form.AddField(campo);
                }

                form.SetNeedAppearances(true);
            }

            return salida.ToArray();
        }

        private static bool EsBlanca(Letra l)
        {
            try
            {
                var (r, g, b) = l.Color.ToRGBValues();
                return r > 0.97 && g > 0.97 && b > 0.97;
            }
            catch
            {
                return false;
            }
        }
    }
}
