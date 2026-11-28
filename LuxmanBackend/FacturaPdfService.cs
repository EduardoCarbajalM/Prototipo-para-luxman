using System;
using System.Globalization;
using System.IO;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // genera un PDF profesional de Factura / Comprobante Fiscal con membrete corporativo de Equipos Inoxidables Luxman
    public class FacturaPdfService
    {
        private const string ColorPrimario = "#1F5FA8";
        private const string ColorSecundario = "#2A8BB0";
        private const string ColorFondoSuave = "#EEF4FB";
        private const string ColorTextoGris = "#555555";
        private const string ColorBordeTabla = "#CBD5E1";

        private static readonly string RutaHeader = Path.Combine(AppContext.BaseDirectory, "Assets", "header_luxman.png");
        private static readonly string RutaFooter = Path.Combine(AppContext.BaseDirectory, "Assets", "footer_luxman.png");

        private static readonly string[] Meses =
        {
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        };

        public byte[] GenerarPdfFactura(ProyectoVenta proyecto)
        {
            DateTime fechaEmision = proyecto.FechaFacturacion ?? MemebretePdfService.AhoraMexico();
            string folioFactura = string.IsNullOrWhiteSpace(proyecto.FolioFactura)
                ? $"FAC-{fechaEmision.Year}-{Math.Max(1, proyecto.NumeroFolio):D3}"
                : proyecto.FolioFactura;

            string folioProyecto = string.IsNullOrWhiteSpace(proyecto.CodigoFolio)
                ? ProyectoVentaService.FormatearCodigoFolio(proyecto.NumeroFolio, proyecto.FechaCreacion)
                : proyecto.CodigoFolio;

            string rfcReceptor = string.IsNullOrWhiteSpace(proyecto.RfcFacturacion)
                ? "XAXX010101000"
                : proyecto.RfcFacturacion;
            string razonReceptor = string.IsNullOrWhiteSpace(proyecto.RazonSocialFacturacion)
                ? (proyecto.NombreCliente ?? "Público en General")
                : proyecto.RazonSocialFacturacion;
            string usoCfdi = string.IsNullOrWhiteSpace(proyecto.UsoCfdi)
                ? "I08 - Otra maquinaria y equipo"
                : proyecto.UsoCfdi;
            string regimenReceptor = string.IsNullOrWhiteSpace(proyecto.RegimenFiscal)
                ? "601 - General de Ley Personas Morales"
                : proyecto.RegimenFiscal;

            string metodoCodigo = (proyecto.MetodoPago ?? "PUE").Trim().ToUpperInvariant();
            string metodoDescripcion = metodoCodigo == "PPD"
                ? "PPD - Pago en parcialidades o diferido"
                : "PUE - Pago en una sola exhibición";
            string formaPago = string.IsNullOrWhiteSpace(proyecto.FormaPago)
                ? "03 - Transferencia electrónica"
                : proyecto.FormaPago;

            bool esAnticipo = string.Equals(proyecto.EstadoFacturacion, "ANTICIPO_FACTURADO", StringComparison.OrdinalIgnoreCase);

            decimal subtotal = proyecto.SubtotalFactura > 0m
                ? proyecto.SubtotalFactura
                : (esAnticipo ? proyecto.MontoAnticipo : proyecto.MontoCotizado);
            decimal iva = proyecto.IvaFactura > 0m
                ? proyecto.IvaFactura
                : Math.Round(subtotal * 0.16m, 2);
            decimal total = proyecto.TotalFactura > 0m
                ? proyecto.TotalFactura
                : Math.Round(subtotal + iva, 2);

            decimal saldoBasePendiente = esAnticipo
                ? Math.Max(0m, Math.Round(proyecto.MontoCotizado - subtotal, 2))
                : 0m;

            string descripcionConcepto = esAnticipo
                ? $"Anticipo comercial ({FormatearDecimal(proyecto.PorcentajeAnticipo, 0)}%) para fabricación de equipo en acero inoxidable: {proyecto.NombreProyecto} • Sector {proyecto.Sector} (Ref. {folioProyecto})"
                : $"Fabricación y suministro de equipo de proceso en acero inoxidable: {proyecto.NombreProyecto} • Sector {proyecto.Sector} (Ref. {folioProyecto})";

            string etiquetaAlcance = esAnticipo
                ? $"ANTICIPO FACTURADO ({FormatearDecimal(proyecto.PorcentajeAnticipo, 0)}%)"
                : "FACTURADO AL 100% (LIQUIDACIÓN TOTAL)";

            return Document.Create(contenedor =>
            {
                contenedor.Page(pagina =>
                {
                    pagina.Size(PageSizes.Letter);
                    pagina.MarginHorizontal(32);
                    pagina.MarginVertical(18);
                    pagina.DefaultTextStyle(e => e.FontSize(9f).FontColor("#222222"));

                    // ===== ENCABEZADO MEMBRETADO =====
                    pagina.Header().Column(enc =>
                    {
                        if (File.Exists(RutaHeader))
                            enc.Item().Image(RutaHeader).FitWidth();
                        else
                            enc.Item().Text("EQUIPOS INOXIDABLES LUXMAN").FontSize(20).Bold().FontColor(ColorPrimario);

                        enc.Item().PaddingTop(6).Row(fila =>
                        {
                            fila.RelativeItem().Column(col =>
                            {
                                col.Item().Text("FACTURA / COMPROBANTE FISCAL COMERCIAL")
                                    .FontSize(14.5f).Bold().FontColor(ColorPrimario);
                                col.Item().Text("Equipos Inoxidables Luxman • Ingeniería y Fabricación Sanitaria")
                                    .FontSize(8.8f).FontColor(ColorTextoGris);
                                col.Item().PaddingTop(2).Text("Tipo de Comprobante: I - Ingreso  •  Moneda: MXN - Peso Mexicano")
                                    .FontSize(8f).FontColor(ColorTextoGris);
                            });

                            fila.ConstantItem(188).Border(1).BorderColor(ColorPrimario).Column(col =>
                            {
                                col.Item().Background(ColorPrimario).PaddingVertical(2.5f).AlignCenter()
                                    .Text("FOLIO DE FACTURA").FontSize(8f).Bold().FontColor(Colors.White);
                                col.Item().PaddingTop(2).AlignCenter()
                                    .Text(folioFactura).FontSize(12.5f).Bold().FontColor(ColorPrimario);
                                col.Item().PaddingHorizontal(8).PaddingVertical(3f).Column(det =>
                                {
                                    det.Item().Row(r =>
                                    {
                                        r.RelativeItem().Text("Emisión:").FontSize(7.8f).FontColor(ColorTextoGris);
                                        r.RelativeItem().AlignRight().Text($"{FormatearFechaCorta(fechaEmision)} {fechaEmision:HH:mm}").FontSize(7.8f);
                                    });
                                    det.Item().Row(r =>
                                    {
                                        r.RelativeItem().Text("Proyecto:").FontSize(7.8f).FontColor(ColorTextoGris);
                                        r.RelativeItem().AlignRight().Text(folioProyecto).FontSize(7.8f).Bold();
                                    });
                                });
                            });
                        });

                        enc.Item().PaddingTop(5).LineHorizontal(1.2f).LineColor(ColorPrimario);
                    });

                    // ===== CUERPO DEL COMPROBANTE =====
                    pagina.Content().PaddingVertical(8).Column(cuerpo =>
                    {
                        cuerpo.Spacing(8);

                        // Bloque Emisor y Receptor
                        cuerpo.Item().Row(fila =>
                        {
                            fila.RelativeItem().Border(0.75f).BorderColor(ColorBordeTabla).Column(col =>
                            {
                                col.Item().Background(ColorFondoSuave).PaddingHorizontal(8).PaddingVertical(4)
                                    .Text("DATOS DEL EMISOR").FontSize(8f).Bold().FontColor(ColorPrimario);
                                col.Item().Padding(7).Column(datos =>
                                {
                                    datos.Spacing(2);
                                    datos.Item().Text("EQUIPOS INOXIDABLES LUXMAN").Bold().FontSize(9.2f);
                                    datos.Item().Text("Dirección: Ing. Raúl Romero Juárez").FontSize(8.3f).FontColor(ColorTextoGris);
                                    datos.Item().Text("Régimen Fiscal: 601 - General de Ley Personas Morales").FontSize(8.2f);
                                    datos.Item().Text("Lugar de Expedición: C.P. 55140, Ecatepec, Edo. de México").FontSize(8.2f);
                                });
                            });

                            fila.ConstantItem(10);

                            fila.RelativeItem(1.25f).Border(0.75f).BorderColor(ColorBordeTabla).Column(col =>
                            {
                                col.Item().Background(ColorFondoSuave).PaddingHorizontal(8).PaddingVertical(4)
                                    .Text("DATOS FISCALES DEL RECEPTOR").FontSize(8f).Bold().FontColor(ColorPrimario);
                                col.Item().Padding(7).Column(datos =>
                                {
                                    datos.Spacing(2);
                                    datos.Item().Text(razonReceptor).Bold().FontSize(9.5f);
                                    datos.Item().Text($"RFC: {rfcReceptor}").Bold().FontSize(8.5f).FontColor(ColorPrimario);
                                    datos.Item().Text($"Régimen Fiscal: {regimenReceptor}").FontSize(8.2f);
                                    datos.Item().Text($"Uso de CFDI: {usoCfdi}").FontSize(8.2f);
                                });
                            });
                        });

                        // Barra de condiciones comerciales y metodo/forma de pago
                        cuerpo.Item().Background("#F8FAFC").Border(0.75f).BorderColor(ColorBordeTabla).Padding(6).Row(fila =>
                        {
                            fila.RelativeItem(1.2f).Column(col =>
                            {
                                col.Item().Text("MÉTODO DE PAGO").FontSize(7f).Bold().FontColor(ColorSecundario);
                                col.Item().Text(metodoDescripcion).FontSize(8.3f).SemiBold();
                            });
                            fila.RelativeItem(1.1f).Column(col =>
                            {
                                col.Item().Text("FORMA DE PAGO").FontSize(7f).Bold().FontColor(ColorSecundario);
                                col.Item().Text(formaPago).FontSize(8.3f).SemiBold();
                            });
                            fila.RelativeItem(1.1f).Column(col =>
                            {
                                col.Item().Text("ESTADO / ALCANCE").FontSize(7f).Bold().FontColor(ColorSecundario);
                                col.Item().Text(etiquetaAlcance).FontSize(8.2f).Bold()
                                    .FontColor(esAnticipo ? "#0369A1" : "#15803D");
                            });
                        });

                        // Tabla de conceptos facturados
                        cuerpo.Item().Table(tabla =>
                        {
                            tabla.ColumnsDefinition(cols =>
                            {
                                cols.ConstantColumn(58);
                                cols.ConstantColumn(36);
                                cols.ConstantColumn(54);
                                cols.RelativeColumn(4.2f);
                                cols.RelativeColumn(1.4f);
                                cols.RelativeColumn(1.4f);
                            });

                            tabla.Header(cab =>
                            {
                                cab.Cell().Element(CeldaEncabezado).Text("CLAVE SAT");
                                cab.Cell().Element(CeldaEncabezado).AlignCenter().Text("CANT.");
                                cab.Cell().Element(CeldaEncabezado).AlignCenter().Text("UNIDAD");
                                cab.Cell().Element(CeldaEncabezado).Text("DESCRIPCIÓN DEL CONCEPTO");
                                cab.Cell().Element(CeldaEncabezado).AlignRight().Text("VALOR UNIT.");
                                cab.Cell().Element(CeldaEncabezado).AlignRight().Text("IMPORTE");
                            });

                            tabla.Cell().Element(CeldaDetalle).Text("24111800").FontSize(8.2f);
                            tabla.Cell().Element(CeldaDetalle).AlignCenter().Text("1.00").FontSize(8.5f);
                            tabla.Cell().Element(CeldaDetalle).AlignCenter().Text("H87 Pieza").FontSize(8.2f);
                            tabla.Cell().Element(CeldaDetalle).Column(col =>
                            {
                                col.Item().Text(descripcionConcepto).SemiBold().FontSize(8.8f);
                                col.Item().PaddingTop(2).Text("Objeto de impuesto: 02 - Sí objeto de impuesto (IVA Trasladado Tasa 16.00%)")
                                    .FontSize(7.6f).FontColor(ColorTextoGris);
                            });
                            tabla.Cell().Element(CeldaDetalle).AlignRight().Text(FormatearMoneda(subtotal)).FontSize(8.8f);
                            tabla.Cell().Element(CeldaDetalle).AlignRight().Text(FormatearMoneda(subtotal)).Bold().FontSize(8.8f);
                        });

                        // Resumen de estado de pago/anticipo + Desglose Fiscal Subtotal / IVA 16% / Total
                        cuerpo.Item().PaddingTop(4).Row(fila =>
                        {
                            fila.RelativeItem(1.45f).Border(0.75f).BorderColor(ColorBordeTabla).Padding(8).Column(col =>
                            {
                                col.Spacing(3);
                                col.Item().Text("CONTROL COMERCIAL DEL PROYECTO Y ANTICIPO")
                                    .FontSize(8f).Bold().FontColor(ColorPrimario);

                                col.Item().Row(r =>
                                {
                                    r.RelativeItem().Text("Monto base cotizado del proyecto (sin IVA):").FontSize(8.2f).FontColor(ColorTextoGris);
                                    r.ConstantItem(95).AlignRight().Text(FormatearMoneda(proyecto.MontoCotizado)).SemiBold().FontSize(8.2f);
                                });

                                col.Item().Row(r =>
                                {
                                    r.RelativeItem().Text($"Anticipo comercial pactado ({FormatearDecimal(proyecto.PorcentajeAnticipo, 0)}%):").FontSize(8.2f).FontColor(ColorTextoGris);
                                    r.ConstantItem(95).AlignRight().Text(FormatearMoneda(proyecto.MontoAnticipo)).SemiBold().FontSize(8.2f);
                                });

                                col.Item().Row(r =>
                                {
                                    r.RelativeItem().Text("Etapa operativa actual:").FontSize(8.2f).FontColor(ColorTextoGris);
                                    r.ConstantItem(140).AlignRight().Text(proyecto.EtapaFabricacion).FontSize(8.2f);
                                });

                                col.Item().PaddingTop(2).LineHorizontal(0.5f).LineColor(ColorBordeTabla);

                                col.Item().PaddingTop(2).Row(r =>
                                {
                                    r.RelativeItem().Text(esAnticipo ? "Saldo base pendiente por facturar (sin IVA):" : "Estatus de facturación del proyecto:")
                                        .Bold().FontSize(8.3f);
                                    r.ConstantItem(130).AlignRight().Text(
                                        esAnticipo ? FormatearMoneda(saldoBasePendiente) : "100% Facturado ($0.00 pendiente)")
                                        .Bold().FontSize(8.3f).FontColor(esAnticipo ? "#B45309" : "#15803D");
                                });
                            });

                            fila.ConstantItem(12);

                            fila.RelativeItem(1.05f).Border(1).BorderColor(ColorPrimario).Column(col =>
                            {
                                col.Item().Background(ColorFondoSuave).PaddingHorizontal(10).PaddingVertical(6).Row(r =>
                                {
                                    r.RelativeItem().Text("Subtotal:").FontSize(9f).SemiBold();
                                    r.RelativeItem().AlignRight().Text(FormatearMoneda(subtotal)).FontSize(9.2f).SemiBold();
                                });

                                col.Item().PaddingHorizontal(10).PaddingVertical(6).Row(r =>
                                {
                                    r.RelativeItem().Text("IVA Trasladado (16%):").FontSize(9f).SemiBold();
                                    r.RelativeItem().AlignRight().Text(FormatearMoneda(iva)).FontSize(9.2f).SemiBold();
                                });

                                col.Item().Background(ColorPrimario).PaddingHorizontal(10).PaddingVertical(8).Row(r =>
                                {
                                    r.RelativeItem().Text("TOTAL MXN:").FontSize(10.5f).Bold().FontColor(Colors.White);
                                    r.RelativeItem().AlignRight().Text(FormatearMoneda(total)).FontSize(11f).Bold().FontColor(Colors.White);
                                });
                            });
                        });

                        // Sello informativo digital del ERP
                        cuerpo.Item().PaddingTop(6).Background("#F8FAFC").Border(0.5f).BorderColor(ColorBordeTabla).Padding(6).Column(sello =>
                        {
                            sello.Item().Text("CADENA INFORMATIVA DE CONTROL ADMINISTRATIVO • LUXMAN ERP")
                                .FontSize(7f).Bold().FontColor(ColorTextoGris);
                            sello.Item().PaddingTop(1).Text(
                                $"||1.0|{folioFactura}|{fechaEmision:yyyy-MM-ddTHH:mm:ss}|{rfcReceptor}|{usoCfdi.Split(' ')[0]}|{metodoCodigo}|{subtotal.ToString("0.00", CultureInfo.InvariantCulture)}|{iva.ToString("0.00", CultureInfo.InvariantCulture)}|{total.ToString("0.00", CultureInfo.InvariantCulture)}|MXN|{folioProyecto}||")
                                .FontSize(7f).FontColor("#64748B");
                        });
                    });

                    // ===== PIE DE PÁGINA MEMBRETADO =====
                    pagina.Footer().Column(pie =>
                    {
                        pie.Item().Row(fila =>
                        {
                            fila.RelativeItem().Text($"Emitido el {FormatearFechaLarga(fechaEmision)} • Comprobante fiscal comercial interno Luxman ERP")
                                .FontSize(7f).Italic().FontColor("#888888");
                            fila.ConstantItem(80).AlignRight().Text("Página 1 de 1")
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

        private static IContainer CeldaEncabezado(IContainer c) =>
            c.Background(ColorPrimario).PaddingVertical(5).PaddingHorizontal(5)
             .DefaultTextStyle(x => x.FontColor(Colors.White).Bold().FontSize(7.8f));

        private static IContainer CeldaDetalle(IContainer c) =>
            c.BorderBottom(0.75f).BorderColor(ColorBordeTabla).PaddingVertical(8).PaddingHorizontal(5);

        private static string FormatearMoneda(decimal valor) =>
            "$" + valor.ToString("#,##0.00", CultureInfo.InvariantCulture);

        private static string FormatearDecimal(decimal valor, int decimales) =>
            valor.ToString("N" + decimales, CultureInfo.InvariantCulture);

        private static string FormatearFechaCorta(DateTime f) =>
            $"{f.Day:D2}/{f.Month:D2}/{f.Year}";

        private static string FormatearFechaLarga(DateTime f) =>
            $"{f.Day:D2} de {Meses[f.Month - 1]} de {f.Year}";
    }
}
