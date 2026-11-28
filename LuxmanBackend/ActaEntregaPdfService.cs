using System;
using System.IO;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // genera el comprobante oficial en PDF del Acta de Entrega-Recepcion con firma digital incrustada
    public class ActaEntregaPdfService
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

        public byte[] GenerarPdfActa(ActaEntrega acta)
        {
            DateTime fecha = acta.FechaEntrega == default ? DateTime.Now : acta.FechaEntrega;
            string folioActa = string.IsNullOrWhiteSpace(acta.CodigoFolio)
                ? ActaEntregaService.FormatearCodigoActa(acta.NumeroFolio, fecha)
                : acta.CodigoFolio;

            byte[]? bytesFirma = ExtraerBytesPng(acta.FirmaBase64);

            return Document.Create(contenedor =>
            {
                contenedor.Page(pagina =>
                {
                    pagina.Size(PageSizes.Letter);
                    pagina.MarginHorizontal(34);
                    pagina.MarginVertical(20);
                    pagina.DefaultTextStyle(e => e.FontSize(9.5f).FontColor("#222222"));

                    pagina.Header().Column(enc =>
                    {
                        if (File.Exists(RutaHeader))
                            enc.Item().Image(RutaHeader).FitWidth();
                        else
                            enc.Item().Text("LUXMAN - EQUIMEX").FontSize(20).Bold().FontColor(ColorPrimario);

                        enc.Item().PaddingTop(8).Row(fila =>
                        {
                            fila.RelativeItem().Column(col =>
                            {
                                col.Item().Text("ACTA DE ENTREGA - RECEPCIÓN DE EQUIPO")
                                    .FontSize(15).Bold().FontColor(ColorPrimario);
                                col.Item().Text("Departamento de Logística e Ingeniería • Equipos Inoxidables Luxman")
                                    .FontSize(9f).FontColor(ColorTextoGris);
                            });

                            fila.ConstantItem(170).Border(1).BorderColor(ColorPrimario).Column(col =>
                            {
                                col.Item().Background(ColorPrimario).PaddingVertical(2.5f).AlignCenter()
                                    .Text("FOLIO DE ACTA").FontSize(8f).Bold().FontColor(Colors.White);
                                col.Item().PaddingTop(2).AlignCenter()
                                    .Text(folioActa).FontSize(12f).Bold().FontColor(ColorPrimario);
                                col.Item().PaddingHorizontal(8).PaddingVertical(2.5f).Row(f =>
                                {
                                    f.RelativeItem().Text("Fecha:").FontSize(8f).FontColor(ColorTextoGris);
                                    f.RelativeItem().AlignRight().Text(FormatearFecha(fecha)).FontSize(8f);
                                });
                            });
                        });

                        enc.Item().PaddingTop(5).LineHorizontal(1.2f).LineColor(ColorPrimario);
                    });

                    pagina.Content().PaddingVertical(10).Column(cuerpo =>
                    {
                        cuerpo.Spacing(10);

                        cuerpo.Item().Text(
                            "Por medio de la presente se hace constar la entrega física y recepción de conformidad " +
                            "del equipo de proceso en acero inoxidable descrito a continuación:")
                            .FontSize(9.5f).FontColor(ColorTextoGris);

                        cuerpo.Item().Table(tabla =>
                        {
                            tabla.ColumnsDefinition(col =>
                            {
                                col.RelativeColumn(1.8f);
                                col.RelativeColumn(3.2f);
                            });

                            FilaDato(tabla, "Folio de Proyecto", acta.FolioProyecto ?? "—");
                            FilaDato(tabla, "Equipo / Proyecto Entregado", acta.NombreProyecto ?? "Equipo en acero inoxidable");
                            FilaDato(tabla, "Cliente / Empresa", acta.NombreCliente ?? "—");
                            FilaDato(tabla, "Recibido por", acta.NombreReceptor);
                            FilaDato(tabla, "Puesto / Cargo", string.IsNullOrWhiteSpace(acta.PuestoReceptor) ? "No especificado" : acta.PuestoReceptor);
                            FilaDato(tabla, "Fecha y Hora de Recepción", $"{FormatearFecha(fecha)} {fecha:HH:mm} hrs");
                            FilaDato(tabla, "Observaciones", string.IsNullOrWhiteSpace(acta.Observaciones) ? "Equipo entregado en óptimas condiciones sanitarias y estructurales." : acta.Observaciones);
                        });

                        cuerpo.Item().PaddingTop(14).Row(firmas =>
                        {
                            firmas.RelativeItem().AlignCenter().Column(col =>
                            {
                                col.Item().Height(85).AlignBottom().AlignCenter()
                                    .PaddingBottom(6).Text("Ing. Raúl Romero Juárez").SemiBold().FontSize(9.5f);
                                col.Item().Width(210).LineHorizontal(0.8f).LineColor("#64748B");
                                col.Item().PaddingTop(3).AlignCenter().Text("ENTREGA POR LUXMAN").Bold().FontSize(8.5f);
                                col.Item().AlignCenter().Text("Dirección de Ingeniería").FontSize(8f).FontColor(ColorTextoGris);
                            });

                            firmas.RelativeItem().AlignCenter().Column(col =>
                            {
                                col.Item().Height(85).AlignMiddle().AlignCenter().Element(cajaFirma =>
                                {
                                    if (bytesFirma != null && bytesFirma.Length > 0)
                                        cajaFirma.MaxHeight(78).MaxWidth(210).Image(bytesFirma).FitArea();
                                    else
                                        cajaFirma.AlignBottom().Text(acta.NombreReceptor).Italic();
                                });
                                col.Item().Width(210).LineHorizontal(0.8f).LineColor("#64748B");
                                col.Item().PaddingTop(3).AlignCenter().Text("RECIBE DE CONFORMIDAD").Bold().FontSize(8.5f);
                                col.Item().AlignCenter().Text(acta.NombreReceptor).FontSize(8.5f).FontColor(ColorTextoGris);
                            });
                        });
                    });

                    pagina.Footer().Column(pie =>
                    {
                        pie.Item().Row(fila =>
                        {
                            fila.RelativeItem().Text("Comprobante logístico oficial generado por Luxman ERP")
                                .FontSize(7f).Italic().FontColor("#999999");
                            fila.RelativeItem().AlignRight().Text("Página 1 de 1")
                                .FontSize(7.5f).FontColor(ColorTextoGris);
                        });

                        if (File.Exists(RutaFooter))
                            pie.Item().PaddingTop(3).Image(RutaFooter).FitWidth();
                        else
                            pie.Item().PaddingTop(3).AlignCenter()
                                .Text("Av. Guadiana 203, Ecatepec Edo. México  •  www.equiposinoxidablesluxman.com")
                                .FontSize(8f).FontColor(ColorSecundario);
                    });
                });
            }).GeneratePdf();
        }

        private static void FilaDato(TableDescriptor tabla, string etiqueta, string valor)
        {
            tabla.Cell().Background(ColorFondoSuave).BorderBottom(0.5f).BorderColor(Colors.White)
                .Padding(6f).Text(etiqueta).Bold().FontSize(8.8f);
            tabla.Cell().BorderBottom(0.5f).BorderColor("#D0D7E2")
                .Padding(6f).Text(valor).FontSize(9f);
        }

        private static byte[]? ExtraerBytesPng(string? dataUrl)
        {
            if (string.IsNullOrWhiteSpace(dataUrl)) return null;
            try
            {
                int coma = dataUrl.IndexOf(',');
                string base64Puro = coma >= 0 ? dataUrl.Substring(coma + 1) : dataUrl;
                return Convert.FromBase64String(base64Puro.Trim());
            }
            catch
            {
                return null;
            }
        }

        private static string FormatearFecha(DateTime fecha) =>
            $"{fecha.Day:D2} de {Meses[fecha.Month - 1]} de {fecha.Year}";
    }
}
