using System;
using System.Globalization;
using System.IO;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // Este servicio genera el PDF oficial de la cotizacion con el membrete
    // de Luxman-Equimex (imagen en el header y en el footer) usando QuestPDF.
    // La licencia de QuestPDF se configura en Program.cs
    public class PdfService
    {
        // colores corporativos sacados del membrete
        private const string ColorPrimario = "#1F5FA8";
        private const string ColorSecundario = "#2A8BB0";
        private const string ColorFondoSuave = "#EEF4FB";
        private const string ColorTextoGris = "#555555";

        private const decimal TasaIva = 0.16m;

        // rutas de las imagenes del membrete (se copian a la salida desde la carpeta Assets)
        private static readonly string RutaHeader = Path.Combine(AppContext.BaseDirectory, "Assets", "header_luxman.png");
        private static readonly string RutaFooter = Path.Combine(AppContext.BaseDirectory, "Assets", "footer_luxman.png");

        // -----------------------------------------------------------------
        // Metodo que arma el documento PDF con los datos de la cotizacion
        // regresa el pdf en bytes para poderlo mandar por la API
        // -----------------------------------------------------------------
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

            Document documentoPdf = Document.Create(contenedor =>
            {
                contenedor.Page(pagina =>
                {
                    pagina.Size(PageSizes.Letter);
                    pagina.MarginHorizontal(35);
                    pagina.MarginVertical(25);
                    pagina.DefaultTextStyle(estilo => estilo.FontSize(10).FontColor("#222222"));

                    // =================================================
                    // ENCABEZADO: imagen del membrete + folio
                    // =================================================
                    pagina.Header().Column(columnaHeader =>
                    {
                        if (File.Exists(RutaHeader))
                        {
                            columnaHeader.Item().Image(RutaHeader).FitWidth();
                        }
                        else
                        {
                            columnaHeader.Item().Text("LUXMAN - EQUIMEX").FontSize(22).Bold().FontColor(ColorPrimario);
                        }

                        columnaHeader.Item().PaddingTop(12).Row(fila =>
                        {
                            fila.RelativeItem().Column(c =>
                            {
                                c.Item().Text("COTIZACIÓN").FontSize(24).Bold().FontColor(ColorPrimario);
                                c.Item().Text("Equipo de proceso en acero inoxidable")
                                    .FontSize(10).FontColor(ColorTextoGris);
                            });

                            fila.ConstantItem(190).Border(1).BorderColor(ColorPrimario).Column(c =>
                            {
                                c.Item().Background(ColorPrimario).PaddingVertical(4).AlignCenter()
                                    .Text("FOLIO").FontSize(9).Bold().FontColor(Colors.White);
                                c.Item().PaddingTop(4).AlignCenter()
                                    .Text(folio).FontSize(15).Bold().FontColor(ColorPrimario);
                                c.Item().PaddingHorizontal(8).PaddingVertical(4).Column(datos =>
                                {
                                    datos.Item().Row(r =>
                                    {
                                        r.RelativeItem().Text("Fecha:").FontSize(9).FontColor(ColorTextoGris);
                                        r.RelativeItem().AlignRight().Text(FormatearFecha(fecha)).FontSize(9);
                                    });
                                    datos.Item().Row(r =>
                                    {
                                        r.RelativeItem().Text("Vigencia:").FontSize(9).FontColor(ColorTextoGris);
                                        r.RelativeItem().AlignRight().Text(FormatearFecha(fechaVigencia)).FontSize(9);
                                    });
                                });
                            });
                        });

                        columnaHeader.Item().PaddingTop(10).LineHorizontal(1.5f).LineColor(ColorPrimario);
                    });

                    // =================================================
                    // CONTENIDO PRINCIPAL
                    // =================================================
                    pagina.Content().PaddingVertical(12).Column(col =>
                    {
                        col.Spacing(12);

                        // ---------- Datos del cliente ----------
                        col.Item().Background(ColorFondoSuave).Padding(10).Row(fila =>
                        {
                            fila.RelativeItem().Column(c =>
                            {
                                c.Item().Text("CLIENTE").FontSize(8).Bold().FontColor(ColorSecundario);
                                c.Item().Text(nombreCliente).FontSize(12).Bold();
                            });
                            fila.RelativeItem().AlignRight().Column(c =>
                            {
                                c.Item().AlignRight().Text("ATENCIÓN").FontSize(8).Bold().FontColor(ColorSecundario);
                                c.Item().AlignRight().Text("Departamento de Compras / Ingeniería").FontSize(10);
                            });
                        });

                        col.Item().Text(
                            "Por medio de la presente, nos permitimos someter a su consideración la siguiente " +
                            "cotización para la fabricación del equipo descrito a continuación:")
                            .FontSize(10).FontColor(ColorTextoGris);

                        // ---------- Tabla de conceptos ----------
                        col.Item().Table(tabla =>
                        {
                            tabla.ColumnsDefinition(columnas =>
                            {
                                columnas.ConstantColumn(30);
                                columnas.RelativeColumn(5);
                                columnas.ConstantColumn(45);
                                columnas.RelativeColumn(2);
                                columnas.RelativeColumn(2);
                            });

                            tabla.Header(h =>
                            {
                                h.Cell().Element(CeldaEncabezado).Text("#");
                                h.Cell().Element(CeldaEncabezado).Text("DESCRIPCIÓN");
                                h.Cell().Element(CeldaEncabezado).AlignCenter().Text("CANT.");
                                h.Cell().Element(CeldaEncabezado).AlignRight().Text("P. UNITARIO");
                                h.Cell().Element(CeldaEncabezado).AlignRight().Text("IMPORTE");
                            });

                            // partida 1: el tanque
                            tabla.Cell().Element(CeldaCuerpo).Text("1");
                            tabla.Cell().Element(CeldaCuerpo).Column(c =>
                            {
                                c.Item().Text($"Tanque de proceso de {FormatearNumero(cotizacion.litrosTanque)} litros").Bold();
                                c.Item().Text(descripcionAcero).FontSize(9).FontColor(ColorTextoGris);
                                c.Item().Text($"Costo de material: {FormatearMoneda(precioPorLitro)} por litro")
                                    .FontSize(9).FontColor(ColorTextoGris);
                            });
                            tabla.Cell().Element(CeldaCuerpo).AlignCenter().Text("1");
                            tabla.Cell().Element(CeldaCuerpo).AlignRight().Text(FormatearMoneda(cotizacion.precioBase));
                            tabla.Cell().Element(CeldaCuerpo).AlignRight().Text(FormatearMoneda(cotizacion.precioBase));

                            // partida 2: sistema de agitacion (solo si aplica)
                            if (cotizacion.tieneAgitacion)
                            {
                                tabla.Cell().Element(CeldaCuerpo).Text("2");
                                tabla.Cell().Element(CeldaCuerpo).Column(c =>
                                {
                                    c.Item().Text("Sistema de agitación dinámica").Bold();
                                    c.Item().Text("Motorreductor trifásico, flecha de acero inoxidable e impulsor calibrado")
                                        .FontSize(9).FontColor(ColorTextoGris);
                                });
                                tabla.Cell().Element(CeldaCuerpo).AlignCenter().Text("1");
                                tabla.Cell().Element(CeldaCuerpo).AlignRight().Text(FormatearMoneda(costoAgitacion));
                                tabla.Cell().Element(CeldaCuerpo).AlignRight().Text(FormatearMoneda(costoAgitacion));
                            }
                        });

                        // ---------- Totales ----------
                        col.Item().AlignRight().Width(230).Column(totales =>
                        {
                            totales.Item().Element(FilaTotal).Row(r =>
                            {
                                r.RelativeItem().Text("Subtotal:").FontColor(ColorTextoGris);
                                r.RelativeItem().AlignRight().Text(FormatearMoneda(subtotal));
                            });
                            totales.Item().Element(FilaTotal).Row(r =>
                            {
                                r.RelativeItem().Text("IVA (16%):").FontColor(ColorTextoGris);
                                r.RelativeItem().AlignRight().Text(FormatearMoneda(iva));
                            });
                            totales.Item().Background(ColorPrimario).Padding(6).Row(r =>
                            {
                                r.RelativeItem().Text("TOTAL MXN:").Bold().FontColor(Colors.White);
                                r.RelativeItem().AlignRight().Text(FormatearMoneda(total)).Bold().FontSize(12).FontColor(Colors.White);
                            });
                        });

                        // ---------- Especificaciones tecnicas ----------
                        col.Item().Column(spec =>
                        {
                            spec.Item().Text("ESPECIFICACIONES TÉCNICAS").FontSize(11).Bold().FontColor(ColorPrimario);
                            spec.Item().PaddingTop(2).LineHorizontal(0.5f).LineColor(ColorSecundario);
                            spec.Item().PaddingTop(6).Table(t =>
                            {
                                t.ColumnsDefinition(c =>
                                {
                                    c.RelativeColumn(2);
                                    c.RelativeColumn(3);
                                });

                                FilaEspecificacion(t, "Capacidad nominal", $"{FormatearNumero(cotizacion.litrosTanque)} litros");
                                FilaEspecificacion(t, "Material de construcción", descripcionAcero);
                                FilaEspecificacion(t, "Acabado interior", "Pulido sanitario");
                                FilaEspecificacion(t, "Sistema de agitación",
                                    cotizacion.tieneAgitacion ? "Incluido (motorreductor + flecha + impulsor)" : "No incluido (tanque estático)");
                            });
                        });

                        // ---------- Condiciones comerciales ----------
                        col.Item().Column(cond =>
                        {
                            cond.Item().Text("CONDICIONES COMERCIALES").FontSize(11).Bold().FontColor(ColorPrimario);
                            cond.Item().PaddingTop(2).LineHorizontal(0.5f).LineColor(ColorSecundario);
                            cond.Item().PaddingTop(6).Column(lista =>
                            {
                                lista.Spacing(3);
                                ItemCondicion(lista, "Precios expresados en moneda nacional (MXN).");
                                ItemCondicion(lista, $"Vigencia de la cotización: 15 días naturales (hasta el {FormatearFecha(fechaVigencia)}).");
                                ItemCondicion(lista, "Forma de pago: 50% de anticipo y 50% contra aviso de entrega.");
                                ItemCondicion(lista, "Tiempo de entrega: a confirmar al recibir orden de compra y anticipo.");
                                ItemCondicion(lista, "Entrega L.A.B. en nuestra planta de Ecatepec, Edo. de México.");
                            });
                        });

                        // ---------- Firma ----------
                        col.Item().PaddingTop(20).AlignCenter().Width(220).Column(firma =>
                        {
                            firma.Item().LineHorizontal(0.8f).LineColor("#888888");
                            firma.Item().PaddingTop(4).AlignCenter().Text("Departamento de Ventas").Bold();
                            firma.Item().AlignCenter().Text("Luxman - Equimex").FontSize(9).FontColor(ColorTextoGris);
                        });
                    });

                    // =================================================
                    // PIE DE PAGINA: numero de pagina + imagen del membrete
                    // =================================================
                    pagina.Footer().Column(columnaFooter =>
                    {
                        columnaFooter.Item().Row(fila =>
                        {
                            fila.RelativeItem().Text("Documento generado automáticamente por el sistema Luxman ERP")
                                .FontSize(7).Italic().FontColor("#999999");
                            fila.RelativeItem().AlignRight().Text(t =>
                            {
                                t.DefaultTextStyle(e => e.FontSize(8).FontColor(ColorTextoGris));
                                t.Span("Página ");
                                t.CurrentPageNumber();
                                t.Span(" de ");
                                t.TotalPages();
                            });
                        });

                        if (File.Exists(RutaFooter))
                        {
                            columnaFooter.Item().PaddingTop(4).Image(RutaFooter).FitWidth();
                        }
                        else
                        {
                            columnaFooter.Item().PaddingTop(4).AlignCenter()
                                .Text("Av. Guadiana 203, Ecatepec Edo. México  •  www.equiposinoxidablesluxman.com")
                                .FontSize(9).FontColor(ColorSecundario);
                        }
                    });
                });
            });

            // generamos los bytes del pdf para regresarlos en la respuesta HTTP
            return documentoPdf.GeneratePdf();
        }

        // -----------------------------------------------------------------
        // Helpers de estilo
        // -----------------------------------------------------------------
        private static IContainer CeldaEncabezado(IContainer celda)
        {
            return celda.Background(ColorPrimario).PaddingVertical(6).PaddingHorizontal(5)
                .DefaultTextStyle(e => e.FontSize(9).Bold().FontColor(Colors.White));
        }

        private static IContainer CeldaCuerpo(IContainer celda)
        {
            return celda.BorderBottom(0.5f).BorderColor("#D0D7E2").PaddingVertical(7).PaddingHorizontal(5);
        }

        private static IContainer FilaTotal(IContainer celda)
        {
            return celda.BorderBottom(0.5f).BorderColor("#D0D7E2").PaddingVertical(4).PaddingHorizontal(6);
        }

        private static void FilaEspecificacion(TableDescriptor tabla, string etiqueta, string valor)
        {
            tabla.Cell().Background(ColorFondoSuave).BorderBottom(0.5f).BorderColor(Colors.White)
                .Padding(5).Text(etiqueta).Bold().FontSize(9);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2").Padding(5).Text(valor).FontSize(9);
        }

        private static void ItemCondicion(ColumnDescriptor lista, string texto)
        {
            lista.Item().Row(r =>
            {
                r.ConstantItem(12).Text("•").FontColor(ColorSecundario).Bold();
                r.RelativeItem().Text(texto).FontSize(9);
            });
        }

        // -----------------------------------------------------------------
        // Helpers de formato (no dependen de la cultura del servidor/Docker)
        // -----------------------------------------------------------------
        private static string FormatearMoneda(decimal cantidad)
        {
            return "$" + cantidad.ToString("N2", CultureInfo.InvariantCulture);
        }

        private static string FormatearNumero(decimal cantidad)
        {
            return cantidad.ToString("#,##0.##", CultureInfo.InvariantCulture);
        }

        private static readonly string[] Meses =
        {
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        };

        private static string FormatearFecha(DateTime fecha)
        {
            return $"{fecha.Day:D2}/{Meses[fecha.Month - 1].Substring(0, 3)}/{fecha.Year}";
        }
    }
}
