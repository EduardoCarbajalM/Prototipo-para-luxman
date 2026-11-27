using System;
using System.Text.Json.Serialization;

namespace LuxmanErp.Models
{
    // registro guardado en la tabla calculos_tanques de postgres
    public class CalculoTanque
    {
        [JsonPropertyName("id_calculo")]
        public int IdCalculo { get; set; }

        [JsonPropertyName("nombre_referencia")]
        public string? NombreReferencia { get; set; }

        [JsonPropertyName("radio_m")]
        public decimal RadioM { get; set; }

        [JsonPropertyName("longitud_m")]
        public decimal LongitudM { get; set; }

        [JsonPropertyName("tipo_fondo")]
        public string TipoFondo { get; set; } = "Plano";

        [JsonPropertyName("medida_hoja")]
        public string MedidaHoja { get; set; } = "1.22x2.44";

        [JsonPropertyName("precio_hoja")]
        public decimal PrecioHoja { get; set; }

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

        [JsonPropertyName("cantidad_hojas")]
        public int CantidadHojas { get; set; }

        [JsonPropertyName("costo_total_lamina")]
        public decimal CostoTotalLamina { get; set; }

        [JsonPropertyName("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }
    }

    // datos que envia la calculadora tecnica desde el panel del Ing. Raul
    public class CalculoTanqueRequestDTO
    {
        [JsonPropertyName("nombre_referencia")]
        public string? NombreReferencia { get; set; }

        [JsonPropertyName("radio_m")]
        public decimal RadioM { get; set; }

        [JsonPropertyName("longitud_m")]
        public decimal LongitudM { get; set; }

        [JsonPropertyName("tipo_fondo")]
        public string? TipoFondo { get; set; }

        [JsonPropertyName("medida_hoja")]
        public string? MedidaHoja { get; set; }

        [JsonPropertyName("precio_hoja")]
        public decimal? PrecioHoja { get; set; }

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

        [JsonPropertyName("cantidad_hojas")]
        public int CantidadHojas { get; set; }

        [JsonPropertyName("costo_total_lamina")]
        public decimal CostoTotalLamina { get; set; }
    }
}
