using System;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // Este servicio genera (de forma simulada / mock) el PDF de la cotizacion
    // con el membrete de Luxman. No esta 100% terminado, es mas que nada
    // para mostrar la estructura del documento con QuestPDF
    public class PdfService
    {
        // en la version real esto tendria que configurar la licencia
        // QuestPDF.Settings.License = LicenseType.Community; // TODO: poner esto en el Program.cs

        // -----------------------------------------------------------------
        // Metodo que arma el documento PDF con los datos de la cotizacion
        // regresa el pdf en bytes para poderlo mandar por la API
        // -----------------------------------------------------------------
        public byte[] GenerarPdfCotizacion(Cotizacion cotizacion, string nombreCliente)
        {
            // aqui armamos el documento paso a paso, nada de plantillas raras
            Document documentoPdf = Document.Create(contenedor =>
            {
                contenedor.Page(pagina =>
                {
                    pagina.Size(PageSizes.Letter);
                    pagina.Margin(30);
                    pagina.DefaultTextStyle(estilo => estilo.FontSize(11));

                    // -------------------------------------------------
                    // ENCABEZADO / MEMBRETE de Luxman
                    // -------------------------------------------------
                    pagina.Header().Column(columnaHeader =>
                    {
                        columnaHeader.Item().Text("EQUIPOS INOXIDABLES LUXMAN")
                            .FontSize(20).Bold();

                        columnaHeader.Item().Text("Fabricacion de tanques y equipo en acero inoxidable")
                            .FontSize(10).Italic();

                        columnaHeader.Item().PaddingTop(5).LineHorizontal(1);
                    });

                    // -------------------------------------------------
                    // CONTENIDO PRINCIPAL con los datos del tanque
                    // -------------------------------------------------
                    pagina.Content().PaddingVertical(15).Column(columnaContenido =>
                    {
                        columnaContenido.Item().Text($"Cotizacion No: {cotizacion.idCotizacion}").Bold();
                        columnaContenido.Item().Text($"Cliente: {nombreCliente}");
                        columnaContenido.Item().Text($"Fecha: {cotizacion.fechaCreacion.ToShortDateString()}");

                        columnaContenido.Item().PaddingTop(10).Text("Detalle del tanque").Bold().FontSize(13);

                        // aqui hacemos una tablita basica con los datos, nada de estilos raros
                        columnaContenido.Item().Table(tabla =>
                        {
                            tabla.ColumnsDefinition(columnas =>
                            {
                                columnas.RelativeColumn();
                                columnas.RelativeColumn();
                            });

                            tabla.Cell().Text("Litros del tanque:");
                            tabla.Cell().Text(cotizacion.litrosTanque.ToString());

                            tabla.Cell().Text("Tipo de acero:");
                            tabla.Cell().Text(cotizacion.tipoAcero);

                            // si tiene agitacion ponemos "Si", si no "No" (nada de operador ternario raro
                            // para que se lea facil como estudiante)
                            string textoAgitacion = "";
                            if (cotizacion.tieneAgitacion == true)
                            {
                                textoAgitacion = "Si";
                            }
                            else
                            {
                                textoAgitacion = "No";
                            }

                            tabla.Cell().Text("Lleva agitacion:");
                            tabla.Cell().Text(textoAgitacion);

                            tabla.Cell().Text("Precio base:");
                            tabla.Cell().Text("$" + cotizacion.precioBase.ToString("N2"));

                            tabla.Cell().Text("PRECIO FINAL:").Bold();
                            tabla.Cell().Text("$" + cotizacion.precioFinal.ToString("N2")).Bold();
                        });
                    });

                    // -------------------------------------------------
                    // PIE DE PAGINA
                    // -------------------------------------------------
                    pagina.Footer().AlignCenter().Text(textoPie =>
                    {
                        textoPie.Span("Cotizacion generada automaticamente por el sistema Luxman ERP - ");
                        textoPie.Span("valida por 15 dias.").Italic();
                    });
                });
            });

            // generamos los bytes del pdf para regresarlos en la respuesta HTTP
            byte[] pdfBytes = documentoPdf.GeneratePdf();
            return pdfBytes;
        }
    }
}
