using System;
using System.Globalization;
using System.IO;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // genera la ficha tecnica de ingenieria con cliente, formulas completas (con fondo) y desglose de materiales
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

            string clienteTexto = !string.IsNullOrWhiteSpace(calculo.NombreCliente)
                ? calculo.NombreCliente
                : (!string.IsNullOrWhiteSpace(calculo.NombreReferencia)
                    ? calculo.NombreReferencia
                    : "Cálculo interno de ingeniería (sin cliente asignado)");

            string modoTexto = calculo.ModoCalculo == "por_capacidad"
                ? $"Por capacidad deseada ({FormatearNumero(calculo.LitrosDeseados)} L)"
                : "Por medidas directas (r y L)";

            decimal areaHoja = Math.Round((decimal)CalculoTanqueService.ObtenerAreaHoja(calculo.MedidaHoja), 4);
            string medidaHojaTexto = calculo.MedidaHoja.Replace("x", " × ") + " m";

            string rTxt = FormatearDecimal(calculo.RadioM, 4);
            string lTxt = FormatearDecimal(calculo.LongitudM, 4);
            string dTxt = FormatearDecimal(calculo.DiametroM, 4);
            string vCilTxt = FormatearDecimal(calculo.VolumenCilindroM3, 4);
            string vFonTxt = FormatearDecimal(calculo.VolumenFondoM3, 4);
            string vTotTxt = FormatearDecimal(calculo.VolumenTotalM3, 4);
            string litrosTxt = FormatearNumero(calculo.LitrosTanque);
            string pTxt = FormatearDecimal(calculo.PerimetroM, 4);
            string aTxt = FormatearDecimal(calculo.AreaLaminaM2, 4);
            string aHojaTxt = FormatearDecimal(areaHoja, 4);

            // formula y sustitucion especificas segun el tipo de fondo elegido
            string formulaFondo;
            string sustitucionFondo;
            if (calculo.TipoFondo == "Cónico")
            {
                decimal hc = Math.Round(0.25m * calculo.DiametroM, 4);
                formulaFondo = "V_fondo = (1/3) · π · r² · h_c  (h_c = 0.25·D)";
                sustitucionFondo = $"(1/3) × 3.14159 × ({rTxt})² × {FormatearDecimal(hc, 4)}";
            }
            else if (calculo.TipoFondo == "Toriesférico")
            {
                formulaFondo = "V_fondo = 0.0847 · D³  (ASME F&D)";
                sustitucionFondo = $"0.0847 × ({dTxt})³";
            }
            else
            {
                formulaFondo = "V_fondo = 0  (fondo plano)";
                sustitucionFondo = "Sin aportación adicional de volumen";
            }

            var documento = Document.Create(contenedor =>
            {
                contenedor.Page(pagina =>
                {
                    pagina.Size(PageSizes.Letter);
                    pagina.MarginHorizontal(30);
                    pagina.MarginVertical(16);
                    pagina.DefaultTextStyle(estilo => estilo.FontSize(8.5f).FontColor("#222222"));

                    // encabezado institucional
                    pagina.Header().Column(encabezado =>
                    {
                        if (File.Exists(RutaHeader))
                            encabezado.Item().Image(RutaHeader).FitWidth();
                        else
                            encabezado.Item().Text("LUXMAN - EQUIMEX").FontSize(20).Bold().FontColor(ColorPrimario);

                        encabezado.Item().PaddingTop(5).Row(fila =>
                        {
                            fila.RelativeItem().Column(col =>
                            {
                                col.Item().Text("FICHA TÉCNICA DE MEDIDAS, DESARROLLO Y MATERIALES")
                                    .FontSize(13.5f).Bold().FontColor(ColorPrimario);
                                col.Item().Text("Documento interno de ingeniería • Equipos Inoxidables Luxman")
                                    .FontSize(8.5f).FontColor(ColorTextoGris);
                            });

                            fila.ConstantItem(160).Border(1).BorderColor(ColorPrimario).Column(col =>
                            {
                                col.Item().Background(ColorPrimario).PaddingVertical(2f).AlignCenter()
                                    .Text("REGISTRO TÉCNICO").FontSize(7.5f).Bold().FontColor(Colors.White);
                                col.Item().PaddingTop(2).AlignCenter()
                                    .Text(folio).FontSize(11.5f).Bold().FontColor(ColorPrimario);
                                col.Item().PaddingHorizontal(8).PaddingVertical(2f).Row(f =>
                                {
                                    f.RelativeItem().Text("Fecha:").FontSize(7.5f).FontColor(ColorTextoGris);
                                    f.RelativeItem().AlignRight().Text(FormatearFecha(fecha)).FontSize(7.5f);
                                });
                            });
                        });

                        encabezado.Item().PaddingTop(4).LineHorizontal(1.2f).LineColor(ColorPrimario);
                    });

                    // cuerpo completo con cliente, geometria, formulas (incluyendo fondo) y tabla de materiales
                    pagina.Content().PaddingVertical(5).Column(cuerpo =>
                    {
                        cuerpo.Spacing(7);

                        cuerpo.Item().Background(ColorFondoSuave).Padding(6).Row(fila =>
                        {
                            fila.RelativeItem(3).Column(col =>
                            {
                                col.Item().Text("CLIENTE / REFERENCIA").FontSize(7f).Bold().FontColor(ColorSecundario);
                                col.Item().Text(clienteTexto).FontSize(10f).Bold();
                            });
                            fila.RelativeItem(2).AlignRight().Column(col =>
                            {
                                col.Item().AlignRight().Text("MODO DE DIMENSIONAMIENTO").FontSize(7f).Bold().FontColor(ColorSecundario);
                                col.Item().AlignRight().Text(modoTexto).FontSize(8.5f).Bold();
                            });
                        });

                        // 1. dimensiones geometricas y volumenes
                        cuerpo.Item().Column(bloqueGeo =>
                        {
                            bloqueGeo.Item().Text("1. DIMENSIONES GEOMÉTRICAS Y VOLÚMENES DEL TANQUE")
                                .FontSize(9f).Bold().FontColor(ColorPrimario);
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

                                FilaDoble(tabla, "Radio (r)", $"{rTxt} m ({Math.Round(calculo.RadioM * 1000, 0)} mm)", "Diámetro (D)", $"{dTxt} m ({Math.Round(calculo.DiametroM * 1000, 0)} mm)");
                                FilaDoble(tabla, "Longitud / Altura (L)", $"{lTxt} m ({Math.Round(calculo.LongitudM * 1000, 0)} mm)", "Tipo de fondo", calculo.TipoFondo);
                                FilaDoble(tabla, "Volumen cilindro", $"{vCilTxt} m³", $"Volumen fondo ({calculo.TipoFondo})", $"{vFonTxt} m³");
                                FilaDoble(tabla, "Volumen total", $"{vTotTxt} m³", "Capacidad total", $"{litrosTxt} Litros");
                                FilaDoble(tabla, "Desarrollo lámina (P)", $"{pTxt} m", "Área del cuerpo (A)", $"{aTxt} m² ({calculo.CantidadHojas} hojas {medidaHojaTexto})");
                            });
                        });

                        // 2. formulas matematicas utilizadas
                        cuerpo.Item().Column(bloqueFormulas =>
                        {
                            bloqueFormulas.Item().Text("2. MEMORIA DE CÁLCULO Y FÓRMULAS MATEMÁTICAS UTILIZADAS")
                                .FontSize(9f).Bold().FontColor(ColorPrimario);
                            bloqueFormulas.Item().PaddingTop(1).LineHorizontal(0.5f).LineColor(ColorSecundario);
                            bloqueFormulas.Item().PaddingTop(3).Table(tabla =>
                            {
                                tabla.ColumnsDefinition(col =>
                                {
                                    col.RelativeColumn(2.1f);
                                    col.RelativeColumn(2.6f);
                                    col.RelativeColumn(2.6f);
                                    col.RelativeColumn(1.7f);
                                });

                                tabla.Header(cabecera =>
                                {
                                    cabecera.Cell().Element(CeldaEncabezado).Text("MAGNITUD");
                                    cabecera.Cell().Element(CeldaEncabezado).Text("FÓRMULA");
                                    cabecera.Cell().Element(CeldaEncabezado).Text("SUSTITUCIÓN");
                                    cabecera.Cell().Element(CeldaEncabezado).AlignRight().Text("RESULTADO");
                                });

                                if (calculo.ModoCalculo == "por_capacidad")
                                {
                                    decimal vDeseado = Math.Round(calculo.LitrosDeseados / 1000m, 4);
                                    FilaFormula(tabla, "Despeje de radio", "r = raiz(V / (π · L))", $"raiz({FormatearDecimal(vDeseado, 4)} / (3.14159 × {lTxt}))", $"{rTxt} m");
                                }

                                FilaFormula(tabla, "Diámetro", "D = 2 · r", $"2 × {rTxt} m", $"{dTxt} m");
                                FilaFormula(tabla, "Volumen cilindro", "V_cil = π · r² · L", $"3.14159 × ({rTxt})² × {lTxt}", $"{vCilTxt} m³");
                                FilaFormula(tabla, $"Fondo {calculo.TipoFondo}", formulaFondo, sustitucionFondo, $"{vFonTxt} m³");
                                FilaFormula(tabla, "Volumen y litros", "V_tot = V_cil + V_fondo", $"({vCilTxt} + {vFonTxt}) × 1,000", $"{litrosTxt} L");
                                FilaFormula(tabla, "Desarrollo (perímetro)", "P = π · D", $"3.14159 × {dTxt} m", $"{pTxt} m");
                                FilaFormula(tabla, "Área cuerpo / Hojas", "A = P · L  |  N = redondeo sup.(A / A_hoja)", $"{pTxt} × {lTxt} = {aTxt} m² / {aHojaTxt} m²", $"{calculo.CantidadHojas} hoja(s)");
                            });
                        });

                        // 3. desglose de materiales seleccionados y costeo interno
                        cuerpo.Item().Column(bloqueMat =>
                        {
                            bloqueMat.Item().Text("3. DESGLOSE DE MATERIALES DE FABRICACIÓN SELECCIONADOS")
                                .FontSize(9f).Bold().FontColor(ColorPrimario);
                            bloqueMat.Item().PaddingTop(1).LineHorizontal(0.5f).LineColor(ColorSecundario);
                            bloqueMat.Item().PaddingTop(3).Table(tabla =>
                            {
                                tabla.ColumnsDefinition(col =>
                                {
                                    col.ConstantColumn(24);
                                    col.RelativeColumn(4.5f);
                                    col.RelativeColumn(1.2f);
                                    col.RelativeColumn(1.8f);
                                    col.RelativeColumn(1.8f);
                                });

                                tabla.Header(cabecera =>
                                {
                                    cabecera.Cell().Element(CeldaEncabezado).Text("#");
                                    cabecera.Cell().Element(CeldaEncabezado).Text("CONCEPTO / MATERIAL");
                                    cabecera.Cell().Element(CeldaEncabezado).AlignCenter().Text("CANT.");
                                    cabecera.Cell().Element(CeldaEncabezado).AlignRight().Text("P. UNITARIO");
                                    cabecera.Cell().Element(CeldaEncabezado).AlignRight().Text("SUBTOTAL");
                                });

                                if (calculo.MaterialesJson != null && calculo.MaterialesJson.Count > 0)
                                {
                                    int idx = 1;
                                    foreach (var mat in calculo.MaterialesJson)
                                    {
                                        tabla.Cell().Element(CeldaMaterial).Text((idx++).ToString());
                                        tabla.Cell().Element(CeldaMaterial).Text(mat.Concepto).SemiBold();
                                        tabla.Cell().Element(CeldaMaterial).AlignCenter()
                                            .Text($"{FormatearNumero(mat.Cantidad)} {mat.Unidad}");
                                        tabla.Cell().Element(CeldaMaterial).AlignRight()
                                            .Text(mat.PrecioUnitario > 0 ? FormatearMoneda(mat.PrecioUnitario) : "—");
                                        tabla.Cell().Element(CeldaMaterial).AlignRight()
                                            .Text(mat.Subtotal > 0 ? FormatearMoneda(mat.Subtotal) : "—").Bold();
                                    }
                                }
                                else
                                {
                                    tabla.Cell().Element(CeldaMaterial).Text("1");
                                    tabla.Cell().Element(CeldaMaterial).Text($"Lámina de acero inoxidable ({medidaHojaTexto})");
                                    tabla.Cell().Element(CeldaMaterial).AlignCenter().Text($"{calculo.CantidadHojas} hojas");
                                    tabla.Cell().Element(CeldaMaterial).AlignRight()
                                        .Text(calculo.PrecioHoja > 0 ? FormatearMoneda(calculo.PrecioHoja) : "—");
                                    tabla.Cell().Element(CeldaMaterial).AlignRight()
                                        .Text(calculo.CostoTotalLamina > 0 ? FormatearMoneda(calculo.CostoTotalLamina) : "—").Bold();
                                }
                            });

                            bloqueMat.Item().PaddingTop(4).AlignRight().Width(260).Background(ColorPrimario).Padding(5).Row(f =>
                            {
                                f.RelativeItem().Text("COSTO TOTAL MATERIALES:").Bold().FontSize(8.5f).FontColor(Colors.White);
                                f.RelativeItem().AlignRight()
                                    .Text($"{FormatearMoneda(calculo.CostoTotalMateriales)} MXN")
                                    .Bold().FontSize(9.5f).FontColor(Colors.White);
                            });
                        });

                        if (!string.IsNullOrWhiteSpace(calculo.Notas))
                        {
                            cuerpo.Item().Background("#F8FAFC").Border(0.5f).BorderColor("#CBD5E1").Padding(6).Column(col =>
                            {
                                col.Item().Text("NOTAS TÉCNICAS:").Bold().FontSize(7.5f).FontColor(ColorPrimario);
                                col.Item().PaddingTop(1).Text(calculo.Notas).FontSize(8f).FontColor("#334155");
                            });
                        }

                        cuerpo.Item().PaddingTop(6).ShowEntire().AlignCenter().Width(210).Column(firma =>
                        {
                            firma.Item().LineHorizontal(0.8f).LineColor("#888888");
                            firma.Item().PaddingTop(2f).AlignCenter().Text("Ing. Raúl Romero Juárez").Bold().FontSize(8.5f);
                            firma.Item().AlignCenter().Text("Dirección de Ingeniería • Equipos Inoxidables Luxman").FontSize(7.5f).FontColor(ColorTextoGris);
                        });
                    });

                    // pie de pagina institucional
                    pagina.Footer().Column(pie =>
                    {
                        pie.Item().Row(fila =>
                        {
                            fila.RelativeItem().Text("Ficha técnica interna generada por Luxman ERP (costeo directo de insumos, sin precios comerciales ni IVA)")
                                .FontSize(6.8f).Italic().FontColor("#999999");
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
                                .FontSize(8f).FontColor(ColorSecundario);
                    });
                });
            });

            return documento.GeneratePdf();
        }

        private static IContainer CeldaEncabezado(IContainer celda) =>
            celda.Background(ColorPrimario).PaddingVertical(3f).PaddingHorizontal(4)
                .DefaultTextStyle(e => e.FontSize(7.5f).Bold().FontColor(Colors.White));

        private static IContainer CeldaMaterial(IContainer celda) =>
            celda.BorderBottom(0.5f).BorderColor("#D0D7E2").PaddingVertical(3f).PaddingHorizontal(4)
                .DefaultTextStyle(e => e.FontSize(7.8f));

        private static void FilaFormula(TableDescriptor tabla, string magnitud, string formula, string sustitucion, string resultado)
        {
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2").Padding(3f).Text(magnitud).Bold().FontSize(7.8f);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2").Padding(3f).Text(formula).FontSize(7.5f).FontColor(ColorPrimario);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2").Padding(3f).Text(sustitucion).FontSize(7.5f).FontColor(ColorTextoGris);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2").Padding(3f).AlignRight().Text(resultado).Bold().FontSize(7.8f);
        }

        private static void FilaDoble(
            TableDescriptor tabla,
            string etiquetaIzq,
            string valorIzq,
            string etiquetaDer,
            string valorDer)
        {
            tabla.Cell().Background(ColorFondoSuave).BorderBottom(0.5f).BorderColor(Colors.White)
                .Padding(3f).Text(etiquetaIzq).Bold().FontSize(7.8f);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2")
                .Padding(3f).Text(valorIzq).FontSize(7.8f);
            tabla.Cell().Background(ColorFondoSuave).BorderBottom(0.5f).BorderColor(Colors.White)
                .Padding(3f).Text(etiquetaDer).Bold().FontSize(7.8f);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2")
                .Padding(3f).Text(valorDer).FontSize(7.8f);
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
