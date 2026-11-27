using System;
using System.Text.Json.Serialization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace LuxmanErp.Models
{
    // Modelo para guardar el pdf con membrete en la coleccion de mongodb
    [BsonIgnoreExtraElements]
    public class MemebretePdf
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        [JsonPropertyName("id_documento")]
        public string? IdDocumento { get; set; }

        [BsonElement("numero_folio")]
        [JsonPropertyName("numero_folio")]
        public int NumeroFolio { get; set; }

        [BsonElement("fecha_creacion")]
        [JsonPropertyName("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }

        [BsonElement("nombre_cliente")]
        [JsonPropertyName("nombre_cliente")]
        public string NombreCliente { get; set; } = "";

        [BsonElement("archivo_pdf")]
        [JsonPropertyName("archivo_pdf")]
        public byte[] ArchivoPdf { get; set; } = Array.Empty<byte>();

        [BsonElement("texto_original")]
        [JsonPropertyName("texto_original")]
        public string TextoOriginal { get; set; } = "";

        // Propiedad para controlar la papelera de reciclaje (soft delete)
        [BsonElement("eliminado")]
        [JsonPropertyName("eliminado")]
        public bool Eliminado { get; set; } = false;
    }

    // Clase ligera para mostrar la lista en el historial sin cargar todos los bytes del pdf
    public class MemebreteResumen
    {
        [JsonPropertyName("id_documento")]
        public string IdDocumento { get; set; } = "";

        [JsonPropertyName("numero_folio")]
        public int NumeroFolio { get; set; }

        [JsonPropertyName("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }

        [JsonPropertyName("nombre_cliente")]
        public string NombreCliente { get; set; } = "";

        [JsonPropertyName("eliminado")]
        public bool Eliminado { get; set; } = false;
    }

    // Datos que manda el chat desde el frontend
    public class PeticionMemebrete
    {
        [JsonPropertyName("mensaje")]
        public string Mensaje { get; set; } = "";

        [JsonPropertyName("id_documento_actual")]
        public string? IdDocumentoActual { get; set; }
    }

    // Respuesta estandarizada cuando se genera o corrige un PDF con membrete
    public class RespuestaMemebreteDTO
    {
        [JsonPropertyName("id_documento")]
        public string? IdDocumento { get; set; }

        [JsonPropertyName("numero_folio")]
        public int NumeroFolio { get; set; }

        [JsonPropertyName("nombre_cliente")]
        public string NombreCliente { get; set; } = "";

        [JsonPropertyName("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }

        [JsonPropertyName("nombre_archivo")]
        public string NombreArchivo { get; set; } = "";

        [JsonPropertyName("corregido")]
        public bool Corregido { get; set; }

        [JsonPropertyName("mensaje")]
        public string Mensaje { get; set; } = "";
    }
}
