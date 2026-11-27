using System;
using System.Globalization;
using System.IO;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // servicio para armar el pdf de la pre-cotizacion tecnica en una sola hoja
    public class PdfService
    {
        private const string ColorPrimario = "#1F5FA8";
        private const string ColorSecundario = "#2A8BB0";
        private const string ColorFondoSuave = "#EEF4FB";
        private const string ColorTextoGris = "#555555";
        private const decimal TasaIva = 0.16m;

        private static readonly string RutaHeader = Path.Combine(AppContext.BaseDirectory, "Assets", "header_luxman.png");
        private static readonly string RutaFooter = Path.Combine(AppContext.BaseDirectory, "Assets", "footer_luxman.png");

        private static readonly string[] Meses =
        {
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        };

        public byte[] GenerarPdfCotizacion(Cotizacion cotizacion, string nombreCliente)
        {
            string folio = "COT-" + cotizacion.IdCotizacion.ToString("D5");
            DateTime fecha = cotizacion.FechaCreacion == default ? DateTime.Now : cotizacion.FechaCreacion;
            DateTime fechaVigencia = fecha.AddDays(15);

            string descripcionAcero = cotizacion.TipoAcero == "316"
                ? "Acero inoxidable AISI 316 (grado químico / farmacéutico)"
                : "Acero inoxidable AISI 304 (grado alimenticio)";

            string tipoFondo = string.IsNullOrWhiteSpace(cotizacion.TipoFondo) ? "Plano" : cotizacion.TipoFondo;
            bool tieneGeometria = cotizacion.RadioM > 0 && cotizacion.LongitudM > 0;

            decimal precioPorLitro = cotizacion.LitrosTanque > 0
                ? Math.Round(cotizacion.PrecioBase / cotizacion.LitrosTanque, 2)
                : 0m;
            decimal costoAgitacion = cotizacion.PrecioFinal - cotizacion.PrecioBase;

            decimal subtotal = cotizacion.PrecioFinal;
            decimal iva = Math.Round(subtotal * TasaIva, 2);
            decimal total = subtotal + iva;

            // armamos todo compacto para que quepa siempre en una sola hoja carta
            var documento = Document.Create(contenedor =>
            {
                contenedor.Page(pagina =>
                {
                    pagina.Size(PageSizes.Letter);
                    pagina.MarginHorizontal(32);
                    pagina.MarginVertical(16);
                    pagina.DefaultTextStyle(estilo => estilo.FontSize(9f).FontColor("#222222"));

                    // parte de arriba con el logo y el recuadro del folio
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
                                col.Item().Text("PRE-COTIZACIÓN TÉCNICA").FontSize(18).Bold().FontColor(ColorPrimario);
                                col.Item().Text("Equipo de proceso en acero inoxidable").FontSize(9f).FontColor(ColorTextoGris);
                            });

                            fila.ConstantItem(180).Border(1).BorderColor(ColorPrimario).Column(col =>
                            {
                                col.Item().Background(ColorPrimario).PaddingVertical(2.5f).AlignCenter()
                                    .Text("FOLIO").FontSize(8f).Bold().FontColor(Colors.White);
                                col.Item().PaddingTop(2).AlignCenter()
                                    .Text(folio).FontSize(12.5f).Bold().FontColor(ColorPrimario);
                                col.Item().PaddingHorizontal(8).PaddingVertical(2.5f).Column(datos =>
                                {
                                    datos.Item().Row(f =>
                                    {
                                        f.RelativeItem().Text("Fecha:").FontSize(8f).FontColor(ColorTextoGris);
                                        f.RelativeItem().AlignRight().Text(FormatearFecha(fecha)).FontSize(8f);
                                    });
                                    datos.Item().Row(f =>
                                    {
                                        f.RelativeItem().Text("Vigencia:").FontSize(8f).FontColor(ColorTextoGris);
                                        f.RelativeItem().AlignRight().Text(FormatearFecha(fechaVigencia)).FontSize(8f);
                                    });
                                });
                            });
                        });

                        encabezado.Item().PaddingTop(5).LineHorizontal(1.2f).LineColor(ColorPrimario);
                    });

                    // cuerpo del pdf con la tabla y precios
                    pagina.Content().PaddingVertical(6).Column(cuerpo =>
                    {
                        cuerpo.Spacing(7);

                        cuerpo.Item().Background(ColorFondoSuave).Padding(6).Row(fila =>
                        {
                            fila.RelativeItem().Column(col =>
                            {
                                col.Item().Text("CLIENTE").FontSize(7.5f).Bold().FontColor(ColorSecundario);
                                col.Item().Text(nombreCliente).FontSize(10.5f).Bold();
                            });
                            fila.RelativeItem().AlignRight().Column(col =>
                            {
                                col.Item().AlignRight().Text("ATENCIÓN").FontSize(7.5f).Bold().FontColor(ColorSecundario);
                                col.Item().AlignRight().Text("Departamento de Compras / Ingeniería").FontSize(9f);
                            });
                        });

                        cuerpo.Item().Text(
                            "Por medio de la presente, nos permitimos someter a su consideración la siguiente " +
                            "pre-cotización para la fabricación del equipo descrito a continuación:")
                            .FontSize(9f).FontColor(ColorTextoGris);

                        // tabla con el desglose del tanque y la agitacion
                        cuerpo.Item().Table(tabla =>
                        {
                            tabla.ColumnsDefinition(columnas =>
                            {
                                columnas.ConstantColumn(26);
                                columnas.RelativeColumn(5);
                                columnas.ConstantColumn(42);
                                columnas.RelativeColumn(2);
                                columnas.RelativeColumn(2);
                            });

                            tabla.Header(cabecera =>
                            {
                                cabecera.Cell().Element(CeldaEncabezado).Text("#");
                                cabecera.Cell().Element(CeldaEncabezado).Text("DESCRIPCIÓN");
                                cabecera.Cell().Element(CeldaEncabezado).AlignCenter().Text("CANT.");
                                cabecera.Cell().Element(CeldaEncabezado).AlignRight().Text("P. UNITARIO");
                                cabecera.Cell().Element(CeldaEncabezado).AlignRight().Text("IMPORTE");
                            });

                            tabla.Cell().Element(CeldaCuerpo).Text("1");
                            tabla.Cell().Element(CeldaCuerpo).Column(col =>
                            {
                                string resumenVolumen = tieneGeometria
                                    ? $"Tanque cilíndrico de proceso de {FormatearNumero(cotizacion.LitrosTanque)} L ({FormatearDecimal(cotizacion.VolumenM3, 3)} m³)"
                                    : $"Tanque de proceso de {FormatearNumero(cotizacion.LitrosTanque)} litros";

                                col.Item().Text(resumenVolumen).Bold();
                                col.Item().Text($"{descripcionAcero}  •  Fondo {tipoFondo}").FontSize(8f).FontColor(ColorTextoGris);

                                if (tieneGeometria)
                                {
                                    col.Item().Text(
                                        $"Geometría: R = {FormatearDecimal(cotizacion.RadioM, 2)} m (Ø {FormatearDecimal(cotizacion.DiametroM, 2)} m) × L = {FormatearDecimal(cotizacion.LongitudM, 2)} m  •  Costo base: {FormatearMoneda(precioPorLitro)}/L")
                                        .FontSize(8f).FontColor(ColorTextoGris);
                                }
                                else
                                {
                                    col.Item().Text($"Costo de material: {FormatearMoneda(precioPorLitro)} por litro")
                                        .FontSize(8f).FontColor(ColorTextoGris);
                                }
                            });
                            tabla.Cell().Element(CeldaCuerpo).AlignCenter().Text("1");
                            tabla.Cell().Element(CeldaCuerpo).AlignRight().Text(FormatearMoneda(cotizacion.PrecioBase));
                            tabla.Cell().Element(CeldaCuerpo).AlignRight().Text(FormatearMoneda(cotizacion.PrecioBase));

                            if (cotizacion.TieneAgitacion)
                            {
                                tabla.Cell().Element(CeldaCuerpo).Text("2");
                                tabla.Cell().Element(CeldaCuerpo).Column(col =>
                                {
                                    col.Item().Text("Sistema de agitación dinámica").Bold();
                                    col.Item().Text("Motorreductor trifásico, flecha de acero inoxidable e impulsor calibrado")
                                        .FontSize(8f).FontColor(ColorTextoGris);
                                });
                                tabla.Cell().Element(CeldaCuerpo).AlignCenter().Text("1");
                                tabla.Cell().Element(CeldaCuerpo).AlignRight().Text(FormatearMoneda(costoAgitacion));
                                tabla.Cell().Element(CeldaCuerpo).AlignRight().Text(FormatearMoneda(costoAgitacion));
                            }
                        });

                        // cuadro de subtotal, iva y total
                        cuerpo.Item().AlignRight().Width(220).Column(totales =>
                        {
                            totales.Item().Element(FilaTotal).Row(f =>
                            {
                                f.RelativeItem().Text("Subtotal:").FontColor(ColorTextoGris);
                                f.RelativeItem().AlignRight().Text(FormatearMoneda(subtotal));
                            });
                            totales.Item().Element(FilaTotal).Row(f =>
                            {
                                f.RelativeItem().Text("IVA (16%):").FontColor(ColorTextoGris);
                                f.RelativeItem().AlignRight().Text(FormatearMoneda(iva));
                            });
                            totales.Item().Background(ColorPrimario).Padding(4.5f).Row(f =>
                            {
                                f.RelativeItem().Text("TOTAL MXN:").Bold().FontColor(Colors.White);
                                f.RelativeItem().AlignRight().Text(FormatearMoneda(total)).Bold().FontSize(10.5f).FontColor(Colors.White);
                            });
                        });

                        // ficha tecnica y geometrica en dos pares de columnas para mantener una sola pagina
                        cuerpo.Item().Column(bloqueSpec =>
                        {
                            bloqueSpec.Item().Text("ESPECIFICACIONES TÉCNICAS Y GEOMÉTRICAS").FontSize(9.5f).Bold().FontColor(ColorPrimario);
                            bloqueSpec.Item().PaddingTop(1).LineHorizontal(0.5f).LineColor(ColorSecundario);
                            bloqueSpec.Item().PaddingTop(3).Table(tablaSpec =>
                            {
                                tablaSpec.ColumnsDefinition(col =>
                                {
                                    col.RelativeColumn(1.8f);
                                    col.RelativeColumn(2.2f);
                                    col.RelativeColumn(1.8f);
                                    col.RelativeColumn(2.2f);
                                });

                                FilaDobleEspecificacion(
                                    tablaSpec,
                                    "Radio / Diámetro",
                                    tieneGeometria
                                        ? $"R = {FormatearDecimal(cotizacion.RadioM, 3)} m  (Ø {FormatearDecimal(cotizacion.DiametroM, 3)} m)"
                                        : "Según plano",
                                    "Longitud / Altura",
                                    tieneGeometria ? $"{FormatearDecimal(cotizacion.LongitudM, 3)} m" : "Según plano"
                                );

                                FilaDobleEspecificacion(
                                    tablaSpec,
                                    "Tipo de fondo",
                                    tipoFondo,
                                    "Volumen geométrico",
                                    tieneGeometria
                                        ? $"{FormatearDecimal(cotizacion.VolumenM3, 4)} m³ ({FormatearNumero(cotizacion.LitrosTanque)} L)"
                                        : $"{FormatearNumero(cotizacion.LitrosTanque)} L"
                                );

                                FilaDobleEspecificacion(
                                    tablaSpec,
                                    "Desarrollo de lámina",
                                    tieneGeometria ? $"{FormatearDecimal(cotizacion.PerimetroM, 4)} m (perímetro)" : "Por definir",
                                    "Área de lámina (cuerpo)",
                                    tieneGeometria ? $"{FormatearDecimal(cotizacion.AreaLaminaM2, 4)} m²" : "Por definir"
                                );

                                FilaDobleEspecificacion(
                                    tablaSpec,
                                    "Material y acabado",
                                    $"AISI {cotizacion.TipoAcero} • Pulido sanitario",
                                    "Sistema de agitación",
                                    cotizacion.TieneAgitacion ? "Incluido (motorreductor + flecha)" : "No incluido (estático)"
                                );
                            });
                        });

                        cuerpo.Item().PaddingTop(8).AlignCenter().Width(200).Column(firma =>
                        {
                            firma.Item().LineHorizontal(0.8f).LineColor("#888888");
                            firma.Item().PaddingTop(2.5f).AlignCenter().Text("Ing. Raúl Romero Juárez").Bold().FontSize(8.5f);
                            firma.Item().AlignCenter().Text("Dirección de Ingeniería • Luxman - Equimex").FontSize(8f).FontColor(ColorTextoGris);
                        });
                    });

                    // pie de pagina con la imagen de la direccion
                    pagina.Footer().Column(pie =>
                    {
                        pie.Item().Row(fila =>
                        {
                            fila.RelativeItem().Text("Documento generado automáticamente por el sistema Luxman ERP")
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

        // estilos compactos reutilizables para celdas
        private static IContainer CeldaEncabezado(IContainer celda) =>
            celda.Background(ColorPrimario).PaddingVertical(3.5f).PaddingHorizontal(5)
                .DefaultTextStyle(e => e.FontSize(8f).Bold().FontColor(Colors.White));

        private static IContainer CeldaCuerpo(IContainer celda) =>
            celda.BorderBottom(0.5f).BorderColor("#D0D7E2").PaddingVertical(4).PaddingHorizontal(5);

        private static IContainer FilaTotal(IContainer celda) =>
            celda.BorderBottom(0.5f).BorderColor("#D0D7E2").PaddingVertical(2.5f).PaddingHorizontal(5);

        private static void FilaDobleEspecificacion(
            TableDescriptor tabla,
            string etiquetaIzq,
            string valorIzq,
            string etiquetaDer,
            string valorDer)
        {
            tabla.Cell().Background(ColorFondoSuave).BorderBottom(0.5f).BorderColor(Colors.White)
                .Padding(3f).Text(etiquetaIzq).Bold().FontSize(8f);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2")
                .Padding(3f).Text(valorIzq).FontSize(8f);
            tabla.Cell().Background(ColorFondoSuave).BorderBottom(0.5f).BorderColor(Colors.White)
                .Padding(3f).Text(etiquetaDer).Bold().FontSize(8f);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2")
                .Padding(3f).Text(valorDer).FontSize(8f);
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
