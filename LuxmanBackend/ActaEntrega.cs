using System;
using System.Text.Json.Serialization;

namespace LuxmanErp.Models
{
    // registro completo de la tabla actas_entrega en postgres
    public class ActaEntrega
    {
        [JsonPropertyName("id_acta")]
        public int IdActa { get; set; }

        [JsonPropertyName("numero_folio")]
        public int NumeroFolio { get; set; }

        [JsonPropertyName("codigo_folio")]
        public string CodigoFolio { get; set; } = "";

        [JsonPropertyName("id_proyecto")]
        public int? IdProyecto { get; set; }

        [JsonPropertyName("folio_proyecto")]
        public string? FolioProyecto { get; set; }

        [JsonPropertyName("nombre_proyecto")]
        public string? NombreProyecto { get; set; }

        [JsonPropertyName("nombre_cliente")]
        public string? NombreCliente { get; set; }

        [JsonPropertyName("nombre_receptor")]
        public string NombreReceptor { get; set; } = "";

        [JsonPropertyName("puesto_receptor")]
        public string? PuestoReceptor { get; set; }

        [JsonPropertyName("observaciones")]
        public string? Observaciones { get; set; }

        [JsonPropertyName("firma_base64")]
        public string FirmaBase64 { get; set; } = "";

        [JsonPropertyName("fecha_entrega")]
        public DateTime FechaEntrega { get; set; }

        [JsonPropertyName("eliminado")]
        public bool Eliminado { get; set; }
    }

    // datos que envia el formulario de Acta de Entrega Logistica con firma digital
    public class ActaEntregaRequestDTO
    {
        [JsonPropertyName("id_proyecto")]
        public int IdProyecto { get; set; }

        [JsonPropertyName("nombre_receptor")]
        public string? NombreReceptor { get; set; }

        [JsonPropertyName("puesto_receptor")]
        public string? PuestoReceptor { get; set; }

        [JsonPropertyName("observaciones")]
        public string? Observaciones { get; set; }

        [JsonPropertyName("firma_base64")]
        public string? FirmaBase64 { get; set; }
    }
}
