using System;
using System.Globalization;
using System.IO;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // servicio para armar el pdf de la pre-cotizacion en una sola hoja
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
                    pagina.MarginVertical(18);
                    pagina.DefaultTextStyle(estilo => estilo.FontSize(9.5f).FontColor("#222222"));

                    // parte de arriba con el logo y el recuadro del folio
                    pagina.Header().Column(encabezado =>
                    {
                        if (File.Exists(RutaHeader))
                            encabezado.Item().Image(RutaHeader).FitWidth();
                        else
                            encabezado.Item().Text("LUXMAN - EQUIMEX").FontSize(20).Bold().FontColor(ColorPrimario);

                        encabezado.Item().PaddingTop(8).Row(fila =>
                        {
                            fila.RelativeItem().Column(col =>
                            {
                                col.Item().Text("PRE-COTIZACIÓN").FontSize(20).Bold().FontColor(ColorPrimario);
                                col.Item().Text("Equipo de proceso en acero inoxidable").FontSize(9.5f).FontColor(ColorTextoGris);
                            });

                            fila.ConstantItem(180).Border(1).BorderColor(ColorPrimario).Column(col =>
                            {
                                col.Item().Background(ColorPrimario).PaddingVertical(3).AlignCenter()
                                    .Text("FOLIO").FontSize(8.5f).Bold().FontColor(Colors.White);
                                col.Item().PaddingTop(2).AlignCenter()
                                    .Text(folio).FontSize(13).Bold().FontColor(ColorPrimario);
                                col.Item().PaddingHorizontal(8).PaddingVertical(3).Column(datos =>
                                {
                                    datos.Item().Row(f =>
                                    {
                                        f.RelativeItem().Text("Fecha:").FontSize(8.5f).FontColor(ColorTextoGris);
                                        f.RelativeItem().AlignRight().Text(FormatearFecha(fecha)).FontSize(8.5f);
                                    });
                                    datos.Item().Row(f =>
                                    {
                                        f.RelativeItem().Text("Vigencia:").FontSize(8.5f).FontColor(ColorTextoGris);
                                        f.RelativeItem().AlignRight().Text(FormatearFecha(fechaVigencia)).FontSize(8.5f);
                                    });
                                });
                            });
                        });

                        encabezado.Item().PaddingTop(6).LineHorizontal(1.2f).LineColor(ColorPrimario);
                    });

                    // cuerpo del pdf con la tabla y precios
                    pagina.Content().PaddingVertical(8).Column(cuerpo =>
                    {
                        cuerpo.Spacing(8);

                        cuerpo.Item().Background(ColorFondoSuave).Padding(7).Row(fila =>
                        {
                            fila.RelativeItem().Column(col =>
                            {
                                col.Item().Text("CLIENTE").FontSize(7.5f).Bold().FontColor(ColorSecundario);
                                col.Item().Text(nombreCliente).FontSize(11).Bold();
                            });
                            fila.RelativeItem().AlignRight().Column(col =>
                            {
                                col.Item().AlignRight().Text("ATENCIÓN").FontSize(7.5f).Bold().FontColor(ColorSecundario);
                                col.Item().AlignRight().Text("Departamento de Compras / Ingeniería").FontSize(9.5f);
                            });
                        });

                        cuerpo.Item().Text(
                            "Por medio de la presente, nos permitimos someter a su consideración la siguiente " +
                            "pre-cotización para la fabricación del equipo descrito a continuación:")
                            .FontSize(9.5f).FontColor(ColorTextoGris);

                        // tabla con el desglose del tanque y la agitacion
                        cuerpo.Item().Table(tabla =>
                        {
                            tabla.ColumnsDefinition(columnas =>
                            {
                                columnas.ConstantColumn(28);
                                columnas.RelativeColumn(5);
                                columnas.ConstantColumn(45);
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
                                col.Item().Text($"Tanque de proceso de {FormatearNumero(cotizacion.LitrosTanque)} litros").Bold();
                                col.Item().Text(descripcionAcero).FontSize(8.5f).FontColor(ColorTextoGris);
                                col.Item().Text($"Costo de material: {FormatearMoneda(precioPorLitro)} por litro").FontSize(8.5f).FontColor(ColorTextoGris);
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
                                        .FontSize(8.5f).FontColor(ColorTextoGris);
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
                            totales.Item().Background(ColorPrimario).Padding(5).Row(f =>
                            {
                                f.RelativeItem().Text("TOTAL MXN:").Bold().FontColor(Colors.White);
                                f.RelativeItem().AlignRight().Text(FormatearMoneda(total)).Bold().FontSize(11).FontColor(Colors.White);
                            });
                        });

                        // tabla pequeña de especificaciones
                        cuerpo.Item().Column(bloqueSpec =>
                        {
                            bloqueSpec.Item().Text("ESPECIFICACIONES TÉCNICAS").FontSize(10).Bold().FontColor(ColorPrimario);
                            bloqueSpec.Item().PaddingTop(1).LineHorizontal(0.5f).LineColor(ColorSecundario);
                            bloqueSpec.Item().PaddingTop(4).Table(tablaSpec =>
                            {
                                tablaSpec.ColumnsDefinition(col =>
                                {
                                    col.RelativeColumn(2);
                                    col.RelativeColumn(3);
                                });

                                FilaEspecificacion(tablaSpec, "Capacidad nominal", $"{FormatearNumero(cotizacion.LitrosTanque)} litros");
                                FilaEspecificacion(tablaSpec, "Material de construcción", descripcionAcero);
                                FilaEspecificacion(tablaSpec, "Acabado interior", "Pulido sanitario");
                                FilaEspecificacion(tablaSpec, "Sistema de agitación",
                                    cotizacion.TieneAgitacion ? "Incluido (motorreductor + flecha + impulsor)" : "No incluido (tanque estático)");
                            });
                        });

                        cuerpo.Item().PaddingTop(10).AlignCenter().Width(200).Column(firma =>
                        {
                            firma.Item().LineHorizontal(0.8f).LineColor("#888888");
                            firma.Item().PaddingTop(3).AlignCenter().Text("Departamento de Ventas").Bold().FontSize(9);
                            firma.Item().AlignCenter().Text("Luxman - Equimex").FontSize(8.5f).FontColor(ColorTextoGris);
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

        // funciones chiquitas para no repetir los estilos de las celdas
        private static IContainer CeldaEncabezado(IContainer celda) =>
            celda.Background(ColorPrimario).PaddingVertical(4).PaddingHorizontal(5)
                .DefaultTextStyle(e => e.FontSize(8.5f).Bold().FontColor(Colors.White));

        private static IContainer CeldaCuerpo(IContainer celda) =>
            celda.BorderBottom(0.5f).BorderColor("#D0D7E2").PaddingVertical(5).PaddingHorizontal(5);

        private static IContainer FilaTotal(IContainer celda) =>
            celda.BorderBottom(0.5f).BorderColor("#D0D7E2").PaddingVertical(3).PaddingHorizontal(5);

        private static void FilaEspecificacion(TableDescriptor tabla, string etiqueta, string valor)
        {
            tabla.Cell().Background(ColorFondoSuave).BorderBottom(0.5f).BorderColor(Colors.White)
                .Padding(3.5f).Text(etiqueta).Bold().FontSize(8.5f);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2").Padding(3.5f).Text(valor).FontSize(8.5f);
        }

        private static string FormatearMoneda(decimal cantidad) =>
            "$" + cantidad.ToString("N2", CultureInfo.InvariantCulture);

        private static string FormatearNumero(decimal cantidad) =>
            cantidad.ToString("#,##0.##", CultureInfo.InvariantCulture);

        private static string FormatearFecha(DateTime fecha) =>
            $"{fecha.Day:D2}/{Meses[fecha.Month - 1].Substring(0, 3)}/{fecha.Year}";
    }
}
