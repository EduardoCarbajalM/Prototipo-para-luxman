using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace LuxmanErp.Models
{
    // respuesta consolidada de metricas en tiempo real para el Dashboard Ejecutivo
    public class DashboardMetricasDTO
    {
        [JsonPropertyName("total_cotizaciones")]
        public int TotalCotizaciones { get; set; }

        [JsonPropertyName("total_aprobadas")]
        public int TotalAprobadas { get; set; }

        [JsonPropertyName("total_rechazadas")]
        public int TotalRechazadas { get; set; }

        [JsonPropertyName("total_pendientes")]
        public int TotalPendientes { get; set; }

        [JsonPropertyName("proyectos_activos_taller")]
        public int ProyectosActivosTaller { get; set; }

        [JsonPropertyName("solicitudes_pendientes")]
        public int SolicitudesPendientes { get; set; }

        [JsonPropertyName("total_clientes")]
        public int TotalClientes { get; set; }

        [JsonPropertyName("tasa_cierre_porcentaje")]
        public decimal TasaCierrePorcentaje { get; set; }

        [JsonPropertyName("monto_total_cotizado")]
        public decimal MontoTotalCotizado { get; set; }

        [JsonPropertyName("monto_total_vendido")]
        public decimal MontoTotalVendido { get; set; }

        [JsonPropertyName("monto_total_anticipos")]
        public decimal MontoTotalAnticipos { get; set; }

        [JsonPropertyName("fecha_limite_aplicada")]
        public string? FechaLimiteAplicada { get; set; }

        [JsonPropertyName("proyectos_por_sector")]
        public List<SectorMetricaDTO> ProyectosPorSector { get; set; } = new();

        [JsonPropertyName("proyectos_por_etapa")]
        public List<EtapaMetricaDTO> ProyectosPorEtapa { get; set; } = new();

        [JsonPropertyName("proximas_entregas")]
        public List<ProximaEntregaDTO> ProximasEntregas { get; set; } = new();
    }

    public class SectorMetricaDTO
    {
        [JsonPropertyName("sector")]
        public string Sector { get; set; } = "";

        [JsonPropertyName("cantidad_proyectos")]
        public int CantidadProyectos { get; set; }

        [JsonPropertyName("cantidad_aprobados")]
        public int CantidadAprobados { get; set; }

        [JsonPropertyName("monto_cotizado")]
        public decimal MontoCotizado { get; set; }

        [JsonPropertyName("monto_vendido")]
        public decimal MontoVendido { get; set; }
    }

    public class EtapaMetricaDTO
    {
        [JsonPropertyName("orden_paso")]
        public int OrdenPaso { get; set; }

        [JsonPropertyName("etapa_fabricacion")]
        public string EtapaFabricacion { get; set; } = "";

        [JsonPropertyName("cantidad_proyectos")]
        public int CantidadProyectos { get; set; }
    }

    public class ProximaEntregaDTO
    {
        [JsonPropertyName("id_proyecto")]
        public int IdProyecto { get; set; }

        [JsonPropertyName("codigo_folio")]
        public string CodigoFolio { get; set; } = "";

        [JsonPropertyName("nombre_proyecto")]
        public string NombreProyecto { get; set; } = "";

        [JsonPropertyName("nombre_cliente")]
        public string NombreCliente { get; set; } = "";

        [JsonPropertyName("sector")]
        public string Sector { get; set; } = "";

        [JsonPropertyName("etapa_fabricacion")]
        public string EtapaFabricacion { get; set; } = "";

        [JsonPropertyName("fecha_compromiso_entrega")]
        public string? FechaCompromisoEntrega { get; set; }

        [JsonPropertyName("dias_restantes")]
        public int? DiasRestantes { get; set; }

        [JsonPropertyName("nivel_alerta")]
        public string NivelAlerta { get; set; } = "sin_fecha";
    }
}
