using System;
using System.Globalization;
using System.IO;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // servicio para armar el pdf de las cotizaciones de tanques con questpdf
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
            string folio = "COT-" + cotizacion.idCotizacion.ToString("D5");
            DateTime fecha = cotizacion.fechaCreacion == default ? DateTime.Now : cotizacion.fechaCreacion;
            DateTime fechaVigencia = fecha.AddDays(15);

            string descripcionAcero = cotizacion.tipoAcero == "316"
                ? "Acero inoxidable AISI 316 (grado químico / farmacéutico)"
                : "Acero inoxidable AISI 304 (grado alimenticio)";

            decimal precioPorLitro = cotizacion.litrosTanque > 0
                ? Math.Round(cotizacion.precioBase / cotizacion.litrosTanque, 2)
                : 0m;
            decimal costoAgitacion = cotizacion.precioFinal - cotizacion.precioBase;

            decimal subtotal = cotizacion.precioFinal;
            decimal iva = Math.Round(subtotal * TasaIva, 2);
            decimal total = subtotal + iva;

            // creamos la estructura del documento hoja carta
            var documento = Document.Create(contenedor =>
            {
                contenedor.Page(pagina =>
                {
                    pagina.Size(PageSizes.Letter);
                    pagina.MarginHorizontal(35);
                    pagina.MarginVertical(25);
                    pagina.DefaultTextStyle(estilo => estilo.FontSize(10).FontColor("#222222"));

                    // parte de arriba con el logo y el recuadro del folio
                    pagina.Header().Column(encabezado =>
                    {
                        if (File.Exists(RutaHeader))
                            encabezado.Item().Image(RutaHeader).FitWidth();
                        else
                            encabezado.Item().Text("LUXMAN - EQUIMEX").FontSize(22).Bold().FontColor(ColorPrimario);

                        encabezado.Item().PaddingTop(12).Row(fila =>
                        {
                            fila.RelativeItem().Column(col =>
                            {
                                col.Item().Text("COTIZACIÓN").FontSize(24).Bold().FontColor(ColorPrimario);
                                col.Item().Text("Equipo de proceso en acero inoxidable").FontSize(10).FontColor(ColorTextoGris);
                            });

                            fila.ConstantItem(190).Border(1).BorderColor(ColorPrimario).Column(col =>
                            {
                                col.Item().Background(ColorPrimario).PaddingVertical(4).AlignCenter()
                                    .Text("FOLIO").FontSize(9).Bold().FontColor(Colors.White);
                                col.Item().PaddingTop(4).AlignCenter()
                                    .Text(folio).FontSize(15).Bold().FontColor(ColorPrimario);
                                col.Item().PaddingHorizontal(8).PaddingVertical(4).Column(datos =>
                                {
                                    datos.Item().Row(f =>
                                    {
                                        f.RelativeItem().Text("Fecha:").FontSize(9).FontColor(ColorTextoGris);
                                        f.RelativeItem().AlignRight().Text(FormatearFecha(fecha)).FontSize(9);
                                    });
                                    datos.Item().Row(f =>
                                    {
                                        f.RelativeItem().Text("Vigencia:").FontSize(9).FontColor(ColorTextoGris);
                                        f.RelativeItem().AlignRight().Text(FormatearFecha(fechaVigencia)).FontSize(9);
                                    });
                                });
                            });
                        });

                        encabezado.Item().PaddingTop(10).LineHorizontal(1.5f).LineColor(ColorPrimario);
                    });

                    // cuerpo del pdf con la tabla y precios
                    pagina.Content().PaddingVertical(12).Column(cuerpo =>
                    {
                        cuerpo.Spacing(12);

                        cuerpo.Item().Background(ColorFondoSuave).Padding(10).Row(fila =>
                        {
                            fila.RelativeItem().Column(col =>
                            {
                                col.Item().Text("CLIENTE").FontSize(8).Bold().FontColor(ColorSecundario);
                                col.Item().Text(nombreCliente).FontSize(12).Bold();
                            });
                            fila.RelativeItem().AlignRight().Column(col =>
                            {
                                col.Item().AlignRight().Text("ATENCIÓN").FontSize(8).Bold().FontColor(ColorSecundario);
                                col.Item().AlignRight().Text("Departamento de Compras / Ingeniería").FontSize(10);
                            });
                        });

                        cuerpo.Item().Text(
                            "Por medio de la presente, nos permitimos someter a su consideración la siguiente " +
                            "cotización para la fabricación del equipo descrito a continuación:")
                            .FontSize(10).FontColor(ColorTextoGris);

                        // tabla con el desglose del tanque y la agitacion
                        cuerpo.Item().Table(tabla =>
                        {
                            tabla.ColumnsDefinition(columnas =>
                            {
                                columnas.ConstantColumn(30);
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
                                col.Item().Text($"Tanque de proceso de {FormatearNumero(cotizacion.litrosTanque)} litros").Bold();
                                col.Item().Text(descripcionAcero).FontSize(9).FontColor(ColorTextoGris);
                                col.Item().Text($"Costo de material: {FormatearMoneda(precioPorLitro)} por litro").FontSize(9).FontColor(ColorTextoGris);
                            });
                            tabla.Cell().Element(CeldaCuerpo).AlignCenter().Text("1");
                            tabla.Cell().Element(CeldaCuerpo).AlignRight().Text(FormatearMoneda(cotizacion.precioBase));
                            tabla.Cell().Element(CeldaCuerpo).AlignRight().Text(FormatearMoneda(cotizacion.precioBase));

                            if (cotizacion.tieneAgitacion)
                            {
                                tabla.Cell().Element(CeldaCuerpo).Text("2");
                                tabla.Cell().Element(CeldaCuerpo).Column(col =>
                                {
                                    col.Item().Text("Sistema de agitación dinámica").Bold();
                                    col.Item().Text("Motorreductor trifásico, flecha de acero inoxidable e impulsor calibrado")
                                        .FontSize(9).FontColor(ColorTextoGris);
                                });
                                tabla.Cell().Element(CeldaCuerpo).AlignCenter().Text("1");
                                tabla.Cell().Element(CeldaCuerpo).AlignRight().Text(FormatearMoneda(costoAgitacion));
                                tabla.Cell().Element(CeldaCuerpo).AlignRight().Text(FormatearMoneda(costoAgitacion));
                            }
                        });

                        // cuadro de subtotal, iva y total
                        cuerpo.Item().AlignRight().Width(230).Column(totales =>
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
                            totales.Item().Background(ColorPrimario).Padding(6).Row(f =>
                            {
                                f.RelativeItem().Text("TOTAL MXN:").Bold().FontColor(Colors.White);
                                f.RelativeItem().AlignRight().Text(FormatearMoneda(total)).Bold().FontSize(12).FontColor(Colors.White);
                            });
                        });

                        // tabla pequeña de especificaciones
                        cuerpo.Item().Column(bloqueSpec =>
                        {
                            bloqueSpec.Item().Text("ESPECIFICACIONES TÉCNICAS").FontSize(11).Bold().FontColor(ColorPrimario);
                            bloqueSpec.Item().PaddingTop(2).LineHorizontal(0.5f).LineColor(ColorSecundario);
                            bloqueSpec.Item().PaddingTop(6).Table(tablaSpec =>
                            {
                                tablaSpec.ColumnsDefinition(col =>
                                {
                                    col.RelativeColumn(2);
                                    col.RelativeColumn(3);
                                });

                                FilaEspecificacion(tablaSpec, "Capacidad nominal", $"{FormatearNumero(cotizacion.litrosTanque)} litros");
                                FilaEspecificacion(tablaSpec, "Material de construcción", descripcionAcero);
                                FilaEspecificacion(tablaSpec, "Acabado interior", "Pulido sanitario");
                                FilaEspecificacion(tablaSpec, "Sistema de agitación",
                                    cotizacion.tieneAgitacion ? "Incluido (motorreductor + flecha + impulsor)" : "No incluido (tanque estático)");
                            });
                        });

                        // lista de condiciones de venta
                        cuerpo.Item().Column(condiciones =>
                        {
                            condiciones.Item().Text("CONDICIONES COMERCIALES").FontSize(11).Bold().FontColor(ColorPrimario);
                            condiciones.Item().PaddingTop(2).LineHorizontal(0.5f).LineColor(ColorSecundario);
                            condiciones.Item().PaddingTop(6).Column(lista =>
                            {
                                lista.Spacing(3);
                                ItemCondicion(lista, "Precios expresados en moneda nacional (MXN).");
                                ItemCondicion(lista, $"Vigencia de la cotización: 15 días naturales (hasta el {FormatearFecha(fechaVigencia)}).");
                                ItemCondicion(lista, "Forma de pago: 50% de anticipo y 50% contra aviso de entrega.");
                                ItemCondicion(lista, "Tiempo de entrega: a confirmar al recibir orden de compra y anticipo.");
                                ItemCondicion(lista, "Entrega L.A.B. en nuestra planta de Ecatepec, Edo. de México.");
                            });
                        });

                        cuerpo.Item().PaddingTop(20).AlignCenter().Width(220).Column(firma =>
                        {
                            firma.Item().LineHorizontal(0.8f).LineColor("#888888");
                            firma.Item().PaddingTop(4).AlignCenter().Text("Departamento de Ventas").Bold();
                            firma.Item().AlignCenter().Text("Luxman - Equimex").FontSize(9).FontColor(ColorTextoGris);
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
                                texto.DefaultTextStyle(e => e.FontSize(8).FontColor(ColorTextoGris));
                                texto.Span("Página ");
                                texto.CurrentPageNumber();
                                texto.Span(" de ");
                                texto.TotalPages();
                            });
                        });

                        if (File.Exists(RutaFooter))
                            pie.Item().PaddingTop(4).Image(RutaFooter).FitWidth();
                        else
                            pie.Item().PaddingTop(4).AlignCenter()
                                .Text("Av. Guadiana 203, Ecatepec Edo. México  •  www.equiposinoxidablesluxman.com")
                                .FontSize(9).FontColor(ColorSecundario);
                    });
                });
            });

            return documento.GeneratePdf();
        }

        // funciones chiquitas para no repetir los estilos de las celdas
        private static IContainer CeldaEncabezado(IContainer celda) =>
            celda.Background(ColorPrimario).PaddingVertical(6).PaddingHorizontal(5)
                .DefaultTextStyle(e => e.FontSize(9).Bold().FontColor(Colors.White));

        private static IContainer CeldaCuerpo(IContainer celda) =>
            celda.BorderBottom(0.5f).BorderColor("#D0D7E2").PaddingVertical(7).PaddingHorizontal(5);

        private static IContainer FilaTotal(IContainer celda) =>
            celda.BorderBottom(0.5f).BorderColor("#D0D7E2").PaddingVertical(4).PaddingHorizontal(6);

        private static void FilaEspecificacion(TableDescriptor tabla, string etiqueta, string valor)
        {
            tabla.Cell().Background(ColorFondoSuave).BorderBottom(0.5f).BorderColor(Colors.White)
                .Padding(5).Text(etiqueta).Bold().FontSize(9);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2").Padding(5).Text(valor).FontSize(9);
        }

        private static void ItemCondicion(ColumnDescriptor lista, string texto)
        {
            lista.Item().Row(fila =>
            {
                fila.ConstantItem(12).Text("•").FontColor(ColorSecundario).Bold();
                fila.RelativeItem().Text(texto).FontSize(9);
            });
        }

        private static string FormatearMoneda(decimal cantidad) =>
            "$" + cantidad.ToString("N2", CultureInfo.InvariantCulture);

        private static string FormatearNumero(decimal cantidad) =>
            cantidad.ToString("#,##0.##", CultureInfo.InvariantCulture);

        private static string FormatearFecha(DateTime fecha) =>
            $"{fecha.Day:D2}/{Meses[fecha.Month - 1].Substring(0, 3)}/{fecha.Year}";
    }
}
