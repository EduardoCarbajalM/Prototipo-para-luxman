using System;
using System.Globalization;
using System.IO;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // genera la ficha tecnica interna de medidas, formulas matematicas y desarrollo de lamina
    public class CalculoTanquePdfService
    {
        private const string ColorPrimario = "#1F5FA8";
        private const string ColorSecundario = "#2A8BB0";
        private const string ColorFondoSuave = "#EEF4FB";
        private const string ColorTextoGris = "#555555";

        private static readonly string RutaHeader = Path.Combine(AppContext.BaseDirectory, "Assets", "header_luxman.png");
        private static readonly string RutaFooter = Path.Combine(AppContext.BaseDirectory, "Assets", "footer_luxman.png");

        private static readonly string[] Meses =
        {
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        };

        public byte[] GenerarPdfMedidas(CalculoTanque calculo)
        {
            string folio = "CALC-" + calculo.IdCalculo.ToString("D5");
            DateTime fecha = calculo.FechaCreacion == default ? DateTime.Now : calculo.FechaCreacion;
            string referencia = string.IsNullOrWhiteSpace(calculo.NombreReferencia)
                ? "Cálculo general de ingeniería"
                : calculo.NombreReferencia;

            decimal areaHoja = Math.Round((decimal)CalculoTanqueService.ObtenerAreaHoja(calculo.MedidaHoja), 4);
            string medidaHojaTexto = calculo.MedidaHoja.Replace("x", " × ") + " m";
            bool tienePrecioHoja = calculo.PrecioHoja > 0;

            string rTxt = FormatearDecimal(calculo.RadioM, 4);
            string lTxt = FormatearDecimal(calculo.LongitudM, 4);
            string dTxt = FormatearDecimal(calculo.DiametroM, 4);
            string vTxt = FormatearDecimal(calculo.VolumenM3, 4);
            string litrosTxt = FormatearNumero(calculo.LitrosTanque);
            string pTxt = FormatearDecimal(calculo.PerimetroM, 4);
            string aTxt = FormatearDecimal(calculo.AreaLaminaM2, 4);
            string aHojaTxt = FormatearDecimal(areaHoja, 4);

            var documento = Document.Create(contenedor =>
            {
                contenedor.Page(pagina =>
                {
                    pagina.Size(PageSizes.Letter);
                    pagina.MarginHorizontal(32);
                    pagina.MarginVertical(16);
                    pagina.DefaultTextStyle(estilo => estilo.FontSize(9f).FontColor("#222222"));

                    // encabezado institucional con folio de ingenieria
                    pagina.Header().Column(encabezado =>
                    {
                        if (File.Exists(RutaHeader))
                            encabezado.Item().Image(RutaHeader).FitWidth();
                        else
                            encabezado.Item().Text("LUXMAN - EQUIMEX").FontSize(20).Bold().FontColor(ColorPrimario);

                        encabezado.Item().PaddingTop(6).Row(fila =>
                        {
                            fila.RelativeItem().Column(col =>
                            {
                                col.Item().Text("FICHA TÉCNICA DE MEDIDAS Y DESARROLLO DE LÁMINA")
                                    .FontSize(14.5f).Bold().FontColor(ColorPrimario);
                                col.Item().Text("Documento interno de ingeniería • Dimensionamiento de cuerpo cilíndrico")
                                    .FontSize(8.5f).FontColor(ColorTextoGris);
                            });

                            fila.ConstantItem(165).Border(1).BorderColor(ColorPrimario).Column(col =>
                            {
                                col.Item().Background(ColorPrimario).PaddingVertical(2.5f).AlignCenter()
                                    .Text("REGISTRO TÉCNICO").FontSize(7.5f).Bold().FontColor(Colors.White);
                                col.Item().PaddingTop(2).AlignCenter()
                                    .Text(folio).FontSize(12f).Bold().FontColor(ColorPrimario);
                                col.Item().PaddingHorizontal(8).PaddingVertical(2.5f).Row(f =>
                                {
                                    f.RelativeItem().Text("Fecha:").FontSize(8f).FontColor(ColorTextoGris);
                                    f.RelativeItem().AlignRight().Text(FormatearFecha(fecha)).FontSize(8f);
                                });
                            });
                        });

                        encabezado.Item().PaddingTop(5).LineHorizontal(1.2f).LineColor(ColorPrimario);
                    });

                    // cuerpo con parametros, formulas matematicas y desglose de hojas comerciales
                    pagina.Content().PaddingVertical(6).Column(cuerpo =>
                    {
                        cuerpo.Spacing(8);

                        // barra de identificacion de referencia
                        cuerpo.Item().Background(ColorFondoSuave).Padding(7).Row(fila =>
                        {
                            fila.RelativeItem(3).Column(col =>
                            {
                                col.Item().Text("REFERENCIA DEL PROYECTO / EQUIPO").FontSize(7.5f).Bold().FontColor(ColorSecundario);
                                col.Item().Text(referencia).FontSize(10.5f).Bold();
                            });
                            fila.RelativeItem(2).AlignRight().Column(col =>
                            {
                                col.Item().AlignRight().Text("INGENIERÍA").FontSize(7.5f).Bold().FontColor(ColorSecundario);
                                col.Item().AlignRight().Text("Ing. Raúl Romero Juárez").FontSize(9f).Bold();
                            });
                        });

                        // bloque 1: resumen geometrico principal
                        cuerpo.Item().Column(bloqueGeo =>
                        {
                            bloqueGeo.Item().Text("1. DIMENSIONES GEOMÉTRICAS DEL TANQUE").FontSize(9.5f).Bold().FontColor(ColorPrimario);
                            bloqueGeo.Item().PaddingTop(1).LineHorizontal(0.5f).LineColor(ColorSecundario);
                            bloqueGeo.Item().PaddingTop(3).Table(tabla =>
                            {
                                tabla.ColumnsDefinition(col =>
                                {
                                    col.RelativeColumn(1.8f);
                                    col.RelativeColumn(2.2f);
                                    col.RelativeColumn(1.8f);
                                    col.RelativeColumn(2.2f);
                                });

                                FilaDoble(tabla, "Radio (r)", $"{rTxt} m", "Diámetro (D)", $"{dTxt} m");
                                FilaDoble(tabla, "Longitud / Altura (L)", $"{lTxt} m", "Tipo de fondo", calculo.TipoFondo);
                                FilaDoble(tabla, "Volumen cilíndrico (V)", $"{vTxt} m³", "Capacidad nominal", $"{litrosTxt} Litros");
                                FilaDoble(tabla, "Desarrollo de lámina (P)", $"{pTxt} m", "Área del cuerpo (A)", $"{aTxt} m²");
                            });
                        });

                        // bloque 2: memoria de calculo con las formulas matematicas utilizadas
                        cuerpo.Item().Column(bloqueFormulas =>
                        {
                            bloqueFormulas.Item().Text("2. MEMORIA DE CÁLCULO Y FÓRMULAS MATEMÁTICAS UTILIZADAS")
                                .FontSize(9.5f).Bold().FontColor(ColorPrimario);
                            bloqueFormulas.Item().PaddingTop(1).LineHorizontal(0.5f).LineColor(ColorSecundario);
                            bloqueFormulas.Item().PaddingTop(3).Table(tabla =>
                            {
                                tabla.ColumnsDefinition(col =>
                                {
                                    col.RelativeColumn(2.3f);
                                    col.RelativeColumn(2.1f);
                                    col.RelativeColumn(2.8f);
                                    col.RelativeColumn(2.0f);
                                });

                                tabla.Header(cabecera =>
                                {
                                    cabecera.Cell().Element(CeldaEncabezado).Text("MAGNITUD");
                                    cabecera.Cell().Element(CeldaEncabezado).Text("FÓRMULA");
                                    cabecera.Cell().Element(CeldaEncabezado).Text("SUSTITUCIÓN");
                                    cabecera.Cell().Element(CeldaEncabezado).AlignRight().Text("RESULTADO");
                                });

                                FilaFormula(tabla, "Diámetro del cilindro", "D = 2 · r", $"2 × {rTxt} m", $"{dTxt} m");
                                FilaFormula(tabla, "Volumen geométrico", "V = π · r² · L", $"3.14159 × ({rTxt})² × {lTxt}", $"{vTxt} m³");
                                FilaFormula(tabla, "Capacidad en litros", "Litros = V × 1,000", $"{vTxt} m³ × 1,000", $"{litrosTxt} L");
                                FilaFormula(tabla, "Desarrollo de lámina", "P = π · D", $"3.14159 × {dTxt} m", $"{pTxt} m");
                                FilaFormula(tabla, "Área del cuerpo", "A = P · L", $"{pTxt} m × {lTxt} m", $"{aTxt} m²");
                                FilaFormula(
                                    tabla,
                                    "Cantidad de hojas",
                                    "N = redondeo superior (A / A_hoja)",
                                    $"redondeo superior ({aTxt} / {aHojaTxt})",
                                    $"{calculo.CantidadHojas} {(calculo.CantidadHojas == 1 ? "hoja" : "hojas")}"
                                );
                            });
                        });

                        // bloque 3: cuantificacion de hojas comerciales y estimacion interna de lamina
                        cuerpo.Item().Column(bloqueLamina =>
                        {
                            bloqueLamina.Item().Text("3. ESTIMACIÓN DE LÁMINA COMERCIAL REQUERIDA")
                                .FontSize(9.5f).Bold().FontColor(ColorPrimario);
                            bloqueLamina.Item().PaddingTop(1).LineHorizontal(0.5f).LineColor(ColorSecundario);
                            bloqueLamina.Item().PaddingTop(3).Table(tabla =>
                            {
                                tabla.ColumnsDefinition(col =>
                                {
                                    col.RelativeColumn(1.8f);
                                    col.RelativeColumn(2.2f);
                                    col.RelativeColumn(1.8f);
                                    col.RelativeColumn(2.2f);
                                });

                                FilaDoble(
                                    tabla,
                                    "Medida de hoja comercial",
                                    $"{medidaHojaTexto} ({aHojaTxt} m²/hoja)",
                                    "Hojas requeridas (cuerpo)",
                                    $"{calculo.CantidadHojas} {(calculo.CantidadHojas == 1 ? "hoja comercial" : "hojas comerciales")}"
                                );

                                FilaDoble(
                                    tabla,
                                    "Costo unitario por hoja",
                                    tienePrecioHoja ? $"{FormatearMoneda(calculo.PrecioHoja)} MXN" : "No especificado",
                                    "Costo estimado de lámina",
                                    tienePrecioHoja ? $"{FormatearMoneda(calculo.CostoTotalLamina)} MXN" : "No especificado"
                                );
                            });
                        });

                        cuerpo.Item().Background("#F8FAFC").Border(0.5f).BorderColor("#CBD5E1").Padding(6)
                            .Text("Nota técnica: Esta ficha es de uso interno de ingeniería para dimensionamiento geométrico y cuantificación de lámina del cuerpo cilíndrico. El tipo de cabezal/fondo indicado se registra como especificación constructiva.")
                            .FontSize(7.5f).FontColor(ColorTextoGris);

                        cuerpo.Item().PaddingTop(8).AlignCenter().Width(210).Column(firma =>
                        {
                            firma.Item().LineHorizontal(0.8f).LineColor("#888888");
                            firma.Item().PaddingTop(2.5f).AlignCenter().Text("Ing. Raúl Romero Juárez").Bold().FontSize(8.5f);
                            firma.Item().AlignCenter().Text("Dirección de Ingeniería • Equipos Inoxidables Luxman").FontSize(8f).FontColor(ColorTextoGris);
                        });
                    });

                    // pie de pagina institucional
                    pagina.Footer().Column(pie =>
                    {
                        pie.Item().Row(fila =>
                        {
                            fila.RelativeItem().Text("Ficha técnica interna generada por Luxman ERP")
                                .FontSize(7).Italic().FontColor("#999999");
                            fila.RelativeItem().AlignRight().Text(texto =>
                            {
                                texto.DefaultTextStyle(e => e.FontSize(7.5f).FontColor(ColorTextoGris));
                                texto.Span("Página ");
                                texto.CurrentPageNumber();
                                texto.Span(" de ");
                                texto.TotalPages();
                            });
                        });

                        if (File.Exists(RutaFooter))
                            pie.Item().PaddingTop(3).Image(RutaFooter).FitWidth();
                        else
                            pie.Item().PaddingTop(3).AlignCenter()
                                .Text("Av. Guadiana 203, Ecatepec Edo. México  •  www.equiposinoxidablesluxman.com")
                                .FontSize(8.5f).FontColor(ColorSecundario);
                    });
                });
            });

            return documento.GeneratePdf();
        }

        private static IContainer CeldaEncabezado(IContainer celda) =>
            celda.Background(ColorPrimario).PaddingVertical(3.5f).PaddingHorizontal(5)
                .DefaultTextStyle(e => e.FontSize(8f).Bold().FontColor(Colors.White));

        private static void FilaFormula(TableDescriptor tabla, string magnitud, string formula, string sustitucion, string resultado)
        {
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2").Padding(3.5f).Text(magnitud).Bold().FontSize(8f);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2").Padding(3.5f).Text(formula).FontSize(8f).FontColor(ColorPrimario);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2").Padding(3.5f).Text(sustitucion).FontSize(8f).FontColor(ColorTextoGris);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2").Padding(3.5f).AlignRight().Text(resultado).Bold().FontSize(8f);
        }

        private static void FilaDoble(
            TableDescriptor tabla,
            string etiquetaIzq,
            string valorIzq,
            string etiquetaDer,
            string valorDer)
        {
            tabla.Cell().Background(ColorFondoSuave).BorderBottom(0.5f).BorderColor(Colors.White)
                .Padding(3.5f).Text(etiquetaIzq).Bold().FontSize(8f);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2")
                .Padding(3.5f).Text(valorIzq).FontSize(8f);
            tabla.Cell().Background(ColorFondoSuave).BorderBottom(0.5f).BorderColor(Colors.White)
                .Padding(3.5f).Text(etiquetaDer).Bold().FontSize(8f);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2")
                .Padding(3.5f).Text(valorDer).FontSize(8f);
        }

        private static string FormatearMoneda(decimal cantidad) =>
            "$" + cantidad.ToString("N2", CultureInfo.InvariantCulture);

        private static string FormatearNumero(decimal cantidad) =>
            cantidad.ToString("#,##0.##", CultureInfo.InvariantCulture);

        private static string FormatearDecimal(decimal cantidad, int decimales) =>
            cantidad.ToString("0." + new string('#', decimales), CultureInfo.InvariantCulture);

        private static string FormatearFecha(DateTime fecha) =>
            $"{fecha.Day:D2}/{Meses[fecha.Month - 1].Substring(0, 3)}/{fecha.Year}";
    }
}
