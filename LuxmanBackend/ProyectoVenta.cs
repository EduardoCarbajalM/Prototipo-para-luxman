using System;
using System.Text.Json.Serialization;

namespace LuxmanErp.Models
{
    // registro completo de la tabla proyectos_venta en postgres
    public class ProyectoVenta
    {
        [JsonPropertyName("id_proyecto")]
        public int IdProyecto { get; set; }

        [JsonPropertyName("numero_folio")]
        public int NumeroFolio { get; set; }

        [JsonPropertyName("codigo_folio")]
        public string CodigoFolio { get; set; } = "";

        [JsonPropertyName("id_cliente")]
        public int? IdCliente { get; set; }

        [JsonPropertyName("nombre_cliente")]
        public string? NombreCliente { get; set; }

        [JsonPropertyName("id_solicitud")]
        public int? IdSolicitud { get; set; }

        [JsonPropertyName("id_calculo")]
        public int? IdCalculo { get; set; }

        [JsonPropertyName("folio_calculo")]
        public int? FolioCalculo { get; set; }

        [JsonPropertyName("nombre_proyecto")]
        public string NombreProyecto { get; set; } = "";

        [JsonPropertyName("sector")]
        public string Sector { get; set; } = "Otro";

        [JsonPropertyName("monto_cotizado")]
        public decimal MontoCotizado { get; set; }

        [JsonPropertyName("porcentaje_anticipo")]
        public decimal PorcentajeAnticipo { get; set; }

        [JsonPropertyName("monto_anticipo")]
        public decimal MontoAnticipo { get; set; }

        [JsonPropertyName("rfc_facturacion")]
        public string? RfcFacturacion { get; set; }

        [JsonPropertyName("razon_social_facturacion")]
        public string? RazonSocialFacturacion { get; set; }

        [JsonPropertyName("estado_venta")]
        public string EstadoVenta { get; set; } = "COTIZADO";

        [JsonPropertyName("etapa_fabricacion")]
        public string EtapaFabricacion { get; set; } = "Cotizado";

        [JsonPropertyName("fecha_compromiso_entrega")]
        public string? FechaCompromisoEntrega { get; set; }

        [JsonPropertyName("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }

        [JsonPropertyName("fecha_cierre")]
        public DateTime? FechaCierre { get; set; }

        [JsonPropertyName("eliminado")]
        public bool Eliminado { get; set; }
    }

    // datos para crear un nuevo proyecto o cotizacion de venta
    public class ProyectoVentaRequestDTO
    {
        [JsonPropertyName("id_cliente")]
        public int? IdCliente { get; set; }

        [JsonPropertyName("id_solicitud")]
        public int? IdSolicitud { get; set; }

        [JsonPropertyName("id_calculo")]
        public int? IdCalculo { get; set; }

        [JsonPropertyName("nombre_proyecto")]
        public string? NombreProyecto { get; set; }

        [JsonPropertyName("sector")]
        public string? Sector { get; set; }

        [JsonPropertyName("monto_cotizado")]
        public decimal MontoCotizado { get; set; }
    }

    // datos para ejecutar el cierre comercial (aprobar con anticipo y facturacion o rechazar)
    public class CerrarVentaProyectoDTO
    {
        [JsonPropertyName("estado_venta")]
        public string? EstadoVenta { get; set; }

        [JsonPropertyName("porcentaje_anticipo")]
        public decimal? PorcentajeAnticipo { get; set; }

        [JsonPropertyName("rfc_facturacion")]
        public string? RfcFacturacion { get; set; }

        [JsonPropertyName("razon_social_facturacion")]
        public string? RazonSocialFacturacion { get; set; }

        [JsonPropertyName("fecha_compromiso_entrega")]
        public string? FechaCompromisoEntrega { get; set; }
    }

    // datos para actualizar la etapa de fabricacion en taller
    public class ActualizarEtapaProyectoDTO
    {
        [JsonPropertyName("etapa_fabricacion")]
        public string? EtapaFabricacion { get; set; }
    }

    // respuesta publica limitada de seguimiento (sin montos ni datos fiscales/sensibles)
    public class SeguimientoPublicoProyectoDTO
    {
        [JsonPropertyName("folio")]
        public string Folio { get; set; } = "";

        [JsonPropertyName("nombre_proyecto")]
        public string NombreProyecto { get; set; } = "";

        [JsonPropertyName("etapa_fabricacion")]
        public string EtapaFabricacion { get; set; } = "";

        [JsonPropertyName("fecha_compromiso_entrega")]
        public string? FechaCompromisoEntrega { get; set; }
    }
}
