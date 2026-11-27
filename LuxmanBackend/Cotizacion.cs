using System;
using System.Text.Json.Serialization;

namespace LuxmanErp.Models
{
    // modelo que representa la tabla clientes de postgres
    public class Cliente
    {
        [JsonPropertyName("id_cliente")]
        public int IdCliente { get; set; }

        [JsonPropertyName("nombre_cliente")]
        public string NombreCliente { get; set; } = "";

        [JsonPropertyName("rfc_cliente")]
        public string? RfcCliente { get; set; }

        [JsonPropertyName("telefono")]
        public string? Telefono { get; set; }

        [JsonPropertyName("correo")]
        public string? Correo { get; set; }

        [JsonPropertyName("tiene_descuento")]
        public bool TieneDescuento { get; set; }

        [JsonPropertyName("fecha_alta")]
        public DateTime FechaAlta { get; set; }
    }

    // datos para registrar un nuevo cliente desde la calculadora o el panel
    public class ClienteRequestDTO
    {
        [JsonPropertyName("nombre_cliente")]
        public string? NombreCliente { get; set; }

        [JsonPropertyName("rfc_cliente")]
        public string? RfcCliente { get; set; }

        [JsonPropertyName("telefono")]
        public string? Telefono { get; set; }

        [JsonPropertyName("correo")]
        public string? Correo { get; set; }
    }

    // modelo que representa la tabla cotizaciones de postgres
    public class Cotizacion
    {
        [JsonPropertyName("id_cotizacion")]
        public int IdCotizacion { get; set; }

        [JsonPropertyName("id_cliente")]
        public int? IdCliente { get; set; }

        [JsonPropertyName("radio_m")]
        public decimal RadioM { get; set; }

        [JsonPropertyName("longitud_m")]
        public decimal LongitudM { get; set; }

        [JsonPropertyName("tipo_fondo")]
        public string TipoFondo { get; set; } = "Plano";

        [JsonPropertyName("diametro_m")]
        public decimal DiametroM { get; set; }

        [JsonPropertyName("volumen_m3")]
        public decimal VolumenM3 { get; set; }

        [JsonPropertyName("litros_tanque")]
        public decimal LitrosTanque { get; set; }

        [JsonPropertyName("perimetro_m")]
        public decimal PerimetroM { get; set; }

        [JsonPropertyName("area_lamina_m2")]
        public decimal AreaLaminaM2 { get; set; }

        [JsonPropertyName("tipo_acero")]
        public string? TipoAcero { get; set; }

        [JsonPropertyName("tiene_agitacion")]
        public bool TieneAgitacion { get; set; }

        [JsonPropertyName("precio_base")]
        public decimal PrecioBase { get; set; }

        [JsonPropertyName("precio_final")]
        public decimal PrecioFinal { get; set; }

        [JsonPropertyName("cotizacion_aprobada")]
        public bool CotizacionAprobada { get; set; }

        [JsonPropertyName("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }
    }

    // clase para recibir los datos de cotizacion de venta
    public class CotizacionRequestDTO
    {
        [JsonPropertyName("id_cliente")]
        public int? IdCliente { get; set; }

        [JsonPropertyName("radio_m")]
        public decimal RadioM { get; set; }

        [JsonPropertyName("longitud_m")]
        public decimal LongitudM { get; set; }

        [JsonPropertyName("tipo_fondo")]
        public string? TipoFondo { get; set; }

        [JsonPropertyName("diametro_m")]
        public decimal DiametroM { get; set; }

        [JsonPropertyName("volumen_m3")]
        public decimal VolumenM3 { get; set; }

        [JsonPropertyName("litros_tanque")]
        public decimal LitrosTanque { get; set; }

        [JsonPropertyName("perimetro_m")]
        public decimal PerimetroM { get; set; }

        [JsonPropertyName("area_lamina_m2")]
        public decimal AreaLaminaM2 { get; set; }

        [JsonPropertyName("tipo_acero")]
        public string? TipoAcero { get; set; }

        [JsonPropertyName("tiene_agitacion")]
        public bool TieneAgitacion { get; set; }
    }
}
