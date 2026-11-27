using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace LuxmanErp.Models
{
    // renglon individual de material seleccionado para la fabricacion del tanque
    public class MaterialCalculoItem
    {
        [JsonPropertyName("clave")]
        public string Clave { get; set; } = "";

        [JsonPropertyName("concepto")]
        public string Concepto { get; set; } = "";

        [JsonPropertyName("unidad")]
        public string Unidad { get; set; } = "pza";

        [JsonPropertyName("cantidad")]
        public decimal Cantidad { get; set; }

        [JsonPropertyName("precio_unitario")]
        public decimal PrecioUnitario { get; set; }

        [JsonPropertyName("subtotal")]
        public decimal Subtotal { get; set; }
    }

    // registro completo guardado en la tabla calculos_tanques de postgres
    public class CalculoTanque
    {
        [JsonPropertyName("id_calculo")]
        public int IdCalculo { get; set; }

        [JsonPropertyName("numero_folio")]
        public int NumeroFolio { get; set; }

        [JsonPropertyName("id_cliente")]
        public int? IdCliente { get; set; }

        [JsonPropertyName("nombre_cliente")]
        public string? NombreCliente { get; set; }

        [JsonPropertyName("nombre_referencia")]
        public string? NombreReferencia { get; set; }

        [JsonPropertyName("modo_calculo")]
        public string ModoCalculo { get; set; } = "por_medidas";

        [JsonPropertyName("litros_deseados")]
        public decimal LitrosDeseados { get; set; }

        [JsonPropertyName("radio_m")]
        public decimal RadioM { get; set; }

        [JsonPropertyName("longitud_m")]
        public decimal LongitudM { get; set; }

        [JsonPropertyName("tipo_fondo")]
        public string TipoFondo { get; set; } = "Plano";

        [JsonPropertyName("diametro_m")]
        public decimal DiametroM { get; set; }

        [JsonPropertyName("volumen_cilindro_m3")]
        public decimal VolumenCilindroM3 { get; set; }

        [JsonPropertyName("volumen_fondo_m3")]
        public decimal VolumenFondoM3 { get; set; }

        [JsonPropertyName("volumen_total_m3")]
        public decimal VolumenTotalM3 { get; set; }

        [JsonPropertyName("volumen_m3")]
        public decimal VolumenM3 { get; set; }

        [JsonPropertyName("litros_tanque")]
        public decimal LitrosTanque { get; set; }

        [JsonPropertyName("perimetro_m")]
        public decimal PerimetroM { get; set; }

        [JsonPropertyName("area_lamina_m2")]
        public decimal AreaLaminaM2 { get; set; }

        [JsonPropertyName("medida_hoja")]
        public string MedidaHoja { get; set; } = "1.22x2.44";

        [JsonPropertyName("cantidad_hojas")]
        public int CantidadHojas { get; set; }

        [JsonPropertyName("precio_hoja")]
        public decimal PrecioHoja { get; set; }

        [JsonPropertyName("costo_total_lamina")]
        public decimal CostoTotalLamina { get; set; }

        [JsonPropertyName("materiales_json")]
        public List<MaterialCalculoItem> MaterialesJson { get; set; } = new();

        [JsonPropertyName("costo_total_materiales")]
        public decimal CostoTotalMateriales { get; set; }

        [JsonPropertyName("notas")]
        public string? Notas { get; set; }

        [JsonPropertyName("eliminado")]
        public bool Eliminado { get; set; }

        [JsonPropertyName("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }
    }

    // datos que envia la calculadora tecnica al guardar medidas y materiales
    public class CalculoTanqueRequestDTO
    {
        [JsonPropertyName("id_cliente")]
        public int? IdCliente { get; set; }

        [JsonPropertyName("nombre_referencia")]
        public string? NombreReferencia { get; set; }

        [JsonPropertyName("modo_calculo")]
        public string? ModoCalculo { get; set; }

        [JsonPropertyName("litros_deseados")]
        public decimal? LitrosDeseados { get; set; }

        [JsonPropertyName("radio_m")]
        public decimal RadioM { get; set; }

        [JsonPropertyName("longitud_m")]
        public decimal LongitudM { get; set; }

        [JsonPropertyName("tipo_fondo")]
        public string? TipoFondo { get; set; }

        [JsonPropertyName("diametro_m")]
        public decimal DiametroM { get; set; }

        [JsonPropertyName("volumen_cilindro_m3")]
        public decimal VolumenCilindroM3 { get; set; }

        [JsonPropertyName("volumen_fondo_m3")]
        public decimal VolumenFondoM3 { get; set; }

        [JsonPropertyName("volumen_total_m3")]
        public decimal VolumenTotalM3 { get; set; }

        [JsonPropertyName("litros_tanque")]
        public decimal LitrosTanque { get; set; }

        [JsonPropertyName("perimetro_m")]
        public decimal PerimetroM { get; set; }

        [JsonPropertyName("area_lamina_m2")]
        public decimal AreaLaminaM2 { get; set; }

        [JsonPropertyName("medida_hoja")]
        public string? MedidaHoja { get; set; }

        [JsonPropertyName("cantidad_hojas")]
        public int CantidadHojas { get; set; }

        [JsonPropertyName("precio_hoja")]
        public decimal? PrecioHoja { get; set; }

        [JsonPropertyName("costo_total_lamina")]
        public decimal CostoTotalLamina { get; set; }

        [JsonPropertyName("materiales_json")]
        public List<MaterialCalculoItem>? MaterialesJson { get; set; }

        [JsonPropertyName("costo_total_materiales")]
        public decimal CostoTotalMateriales { get; set; }

        [JsonPropertyName("notas")]
        public string? Notas { get; set; }
    }
}
