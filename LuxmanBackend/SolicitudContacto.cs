using System;
using System.Text.Json.Serialization;

namespace LuxmanErp.Models
{
    // registro guardado en la tabla solicitudes_contacto
    public class SolicitudContacto
    {
        [JsonPropertyName("id_solicitud")]
        public int IdSolicitud { get; set; }

        [JsonPropertyName("nombre")]
        public string Nombre { get; set; } = "";

        [JsonPropertyName("empresa")]
        public string? Empresa { get; set; }

        [JsonPropertyName("correo")]
        public string Correo { get; set; } = "";

        [JsonPropertyName("telefono")]
        public string Telefono { get; set; } = "";

        [JsonPropertyName("sector")]
        public string? Sector { get; set; }

        [JsonPropertyName("tipo_equipo")]
        public string? TipoEquipo { get; set; }

        [JsonPropertyName("mensaje")]
        public string? Mensaje { get; set; }

        [JsonPropertyName("atendida")]
        public bool Atendida { get; set; }

        [JsonPropertyName("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }
    }

    // datos que envia el asistente chatbot de la landing page para que ingenieria contacte al prospecto
    public class SolicitudContactoDTO
    {
        [JsonPropertyName("nombre")]
        public string? Nombre { get; set; }

        [JsonPropertyName("empresa")]
        public string? Empresa { get; set; }

        [JsonPropertyName("correo")]
        public string? Correo { get; set; }

        [JsonPropertyName("telefono")]
        public string? Telefono { get; set; }

        [JsonPropertyName("sector")]
        public string? Sector { get; set; }

        [JsonPropertyName("tipo_equipo")]
        public string? TipoEquipo { get; set; }

        [JsonPropertyName("capacidad_litros")]
        public string? CapacidadLitros { get; set; }

        [JsonPropertyName("especificaciones")]
        public string? Especificaciones { get; set; }

        [JsonPropertyName("mensaje")]
        public string? Mensaje { get; set; }
    }

    // cuerpo para marcar o desmarcar una solicitud como atendida
    public class MarcarAtendidaDTO
    {
        [JsonPropertyName("atendida")]
        public bool Atendida { get; set; }
    }
}
