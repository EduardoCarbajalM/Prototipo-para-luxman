using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Npgsql;
using NpgsqlTypes;
using Microsoft.Extensions.Configuration;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // calcula en tiempo real los indicadores comerciales, embudo de fabricacion y proximas entregas
    public class DashboardService
    {
        private readonly string cadenaConexion;

        private static readonly string[] CincoEtapasFabricacion =
        {
            "Aprobado / Anticipo Recibido",
            "En Fabricación (Corte y Rolado)",
            "Soldadura y Pulido Sanitario",
            "Listo para Entrega",
            "Entregado"
        };

        public DashboardService(IConfiguration configuracion)
        {
            cadenaConexion = configuracion.GetConnectionString("DefaultConnection")
                ?? configuracion.GetConnectionString("LuxmanDb")
                ?? throw new InvalidOperationException("No se encontro la cadena de conexion en el appsettings.");
        }

        public DashboardMetricasDTO ObtenerMetricas(string? fechaLimiteTexto)
        {
            DateTime? fechaLimite = null;
            string? fechaLimiteNormalizada = null;

            if (!string.IsNullOrWhiteSpace(fechaLimiteTexto))
            {
                if (DateTime.TryParseExact(
                        fechaLimiteTexto.Trim(),
                        "yyyy-MM-dd",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateTime parseada) ||
                    DateTime.TryParse(fechaLimiteTexto.Trim(), out parseada))
                {
                    fechaLimite = parseada.Date;
                    fechaLimiteNormalizada = fechaLimite.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                }
            }

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            ProyectoVentaService.AsegurarTabla(conexion);

            var resultado = new DashboardMetricasDTO
            {
                FechaLimiteAplicada = fechaLimiteNormalizada
            };

            // 1. KPIs globales de proyectos_venta activos
            using (var cmdTotales = new NpgsqlCommand(@"
                SELECT
                    COUNT(*),
                    COUNT(*) FILTER (WHERE estado_venta = 'APROBADO'),
                    COUNT(*) FILTER (WHERE estado_venta = 'RECHAZADO'),
                    COUNT(*) FILTER (WHERE estado_venta = 'COTIZADO'),
                    COUNT(*) FILTER (WHERE estado_venta = 'APROBADO' AND etapa_fabricacion <> 'Entregado'),
                    COALESCE(SUM(monto_cotizado), 0),
                    COALESCE(SUM(monto_cotizado) FILTER (WHERE estado_venta = 'APROBADO'), 0),
                    COALESCE(SUM(monto_anticipo) FILTER (WHERE estado_venta = 'APROBADO'), 0)
                FROM proyectos_venta
                WHERE NOT COALESCE(eliminado, FALSE);", conexion))
            {
                using var lector = cmdTotales.ExecuteReader();
                if (lector.Read())
                {
                    resultado.TotalCotizaciones = lector.GetInt32(0);
                    resultado.TotalAprobadas = lector.GetInt32(1);
                    resultado.TotalRechazadas = lector.GetInt32(2);
                    resultado.TotalPendientes = lector.GetInt32(3);
                    resultado.ProyectosActivosTaller = lector.GetInt32(4);
                    resultado.MontoTotalCotizado = Math.Round(lector.GetDecimal(5), 2);
                    resultado.MontoTotalVendido = Math.Round(lector.GetDecimal(6), 2);
                    resultado.MontoTotalAnticipos = Math.Round(lector.GetDecimal(7), 2);
                }
            }

            resultado.TasaCierrePorcentaje = resultado.TotalCotizaciones > 0
                ? Math.Round((decimal)resultado.TotalAprobadas * 100m / resultado.TotalCotizaciones, 1)
                : 0m;

            // Conteos rapidos de solicitudes pendientes y clientes totales
            using (var cmdExtras = new NpgsqlCommand(@"
                SELECT
                    (SELECT COUNT(*) FROM solicitudes_contacto WHERE NOT COALESCE(atendida, FALSE)),
                    (SELECT COUNT(*) FROM clientes);", conexion))
            {
                using var lectorExtra = cmdExtras.ExecuteReader();
                if (lectorExtra.Read())
                {
                    resultado.SolicitudesPendientes = lectorExtra.GetInt32(0);
                    resultado.TotalClientes = lectorExtra.GetInt32(1);
                }
            }

            // 2. Desglose por sector industrial (garantizando siempre todos los sectores del catalogo)
            var mapaSectores = ClienteService.SectoresValidos.ToDictionary(
                sec => sec,
                sec => new SectorMetricaDTO { Sector = sec },
                StringComparer.OrdinalIgnoreCase);

            using (var cmdSectores = new NpgsqlCommand(@"
                SELECT
                    COALESCE(NULLIF(TRIM(sector), ''), 'Otro') AS sector_norm,
                    COUNT(*),
                    COUNT(*) FILTER (WHERE estado_venta = 'APROBADO'),
                    COALESCE(SUM(monto_cotizado), 0),
                    COALESCE(SUM(monto_cotizado) FILTER (WHERE estado_venta = 'APROBADO'), 0)
                FROM proyectos_venta
                WHERE NOT COALESCE(eliminado, FALSE)
                GROUP BY sector_norm;", conexion))
            {
                using var lectorSec = cmdSectores.ExecuteReader();
                while (lectorSec.Read())
                {
                    string nombreSec = ClienteService.NormalizarSector(lectorSec.GetString(0));
                    if (!mapaSectores.TryGetValue(nombreSec, out var itemSec))
                    {
                        itemSec = new SectorMetricaDTO { Sector = nombreSec };
                        mapaSectores[nombreSec] = itemSec;
                    }
                    itemSec.CantidadProyectos += lectorSec.GetInt32(1);
                    itemSec.CantidadAprobados += lectorSec.GetInt32(2);
                    itemSec.MontoCotizado = Math.Round(itemSec.MontoCotizado + lectorSec.GetDecimal(3), 2);
                    itemSec.MontoVendido = Math.Round(itemSec.MontoVendido + lectorSec.GetDecimal(4), 2);
                }
            }

            resultado.ProyectosPorSector = ClienteService.SectoresValidos
                .Select(s => mapaSectores[s])
                .ToList();

            // 3. Embudo de las 5 etapas de fabricacion (proyectos APROBADO activos)
            var conteoEtapas = CincoEtapasFabricacion.ToDictionary(
                e => e,
                _ => 0,
                StringComparer.OrdinalIgnoreCase);

            using (var cmdEtapas = new NpgsqlCommand(@"
                SELECT etapa_fabricacion, COUNT(*)
                FROM proyectos_venta
                WHERE NOT COALESCE(eliminado, FALSE)
                  AND estado_venta = 'APROBADO'
                GROUP BY etapa_fabricacion;", conexion))
            {
                using var lectorEtapa = cmdEtapas.ExecuteReader();
                while (lectorEtapa.Read())
                {
                    string etapaNombre = lectorEtapa.IsDBNull(0) ? "" : lectorEtapa.GetString(0);
                    if (conteoEtapas.ContainsKey(etapaNombre))
                    {
                        conteoEtapas[etapaNombre] += lectorEtapa.GetInt32(1);
                    }
                    else
                    {
                        conteoEtapas["Aprobado / Anticipo Recibido"] += lectorEtapa.GetInt32(1);
                    }
                }
            }

            for (int i = 0; i < CincoEtapasFabricacion.Length; i++)
            {
                string nombreEtapa = CincoEtapasFabricacion[i];
                resultado.ProyectosPorEtapa.Add(new EtapaMetricaDTO
                {
                    OrdenPaso = i + 1,
                    EtapaFabricacion = nombreEtapa,
                    CantidadProyectos = conteoEtapas[nombreEtapa]
                });
            }

            // 4. Proximas entregas (APROBADO pendientes de entregar, con filtro opcional por fecha_limite)
            DateTime hoyMexico = MemebretePdfService.AhoraMexico().Date;

            string sqlEntregas = @"
                SELECT pv.id_proyecto, pv.numero_folio, pv.nombre_proyecto,
                       COALESCE(cl.nombre_cliente, pv.razon_social_facturacion, 'Sin cliente asignado') AS cliente_mostrar,
                       pv.sector, pv.etapa_fabricacion, pv.fecha_compromiso_entrega, pv.fecha_creacion
                FROM proyectos_venta pv
                LEFT JOIN clientes cl ON cl.id_cliente = pv.id_cliente
                WHERE NOT COALESCE(pv.eliminado, FALSE)
                  AND pv.estado_venta = 'APROBADO'
                  AND pv.etapa_fabricacion <> 'Entregado'"
                + (fechaLimite.HasValue
                    ? " AND pv.fecha_compromiso_entrega IS NOT NULL AND pv.fecha_compromiso_entrega <= @fecha_limite"
                    : "")
                + " ORDER BY pv.fecha_compromiso_entrega ASC NULLS LAST, pv.numero_folio ASC;";

            using (var cmdEntregas = new NpgsqlCommand(sqlEntregas, conexion))
            {
                if (fechaLimite.HasValue)
                {
                    var pLimite = cmdEntregas.Parameters.AddWithValue("fecha_limite", fechaLimite.Value);
                    pLimite.NpgsqlDbType = NpgsqlDbType.Date;
                }

                using var lectorEnt = cmdEntregas.ExecuteReader();
                while (lectorEnt.Read())
                {
                    int idProy = lectorEnt.GetInt32(0);
                    int numFolio = lectorEnt.IsDBNull(1) ? idProy : lectorEnt.GetInt32(1);
                    string nombreProy = lectorEnt.GetString(2);
                    string clienteNombre = lectorEnt.GetString(3);
                    string sector = lectorEnt.IsDBNull(4) ? "Otro" : lectorEnt.GetString(4);
                    string etapa = lectorEnt.IsDBNull(5) ? "Aprobado / Anticipo Recibido" : lectorEnt.GetString(5);
                    DateTime? fechaComp = lectorEnt.IsDBNull(6) ? null : lectorEnt.GetDateTime(6).Date;
                    DateTime fechaCreacion = lectorEnt.IsDBNull(7) ? hoyMexico : lectorEnt.GetDateTime(7);

                    int? diasRestantes = null;
                    string nivelAlerta = "sin_fecha";
                    if (fechaComp.HasValue)
                    {
                        int dias = (fechaComp.Value - hoyMexico).Days;
                        diasRestantes = dias;
                        if (dias < 0)
                            nivelAlerta = "vencida";
                        else if (dias <= 7)
                            nivelAlerta = "proxima";
                        else
                            nivelAlerta = "en_tiempo";
                    }

                    resultado.ProximasEntregas.Add(new ProximaEntregaDTO
                    {
                        IdProyecto = idProy,
                        CodigoFolio = ProyectoVentaService.FormatearCodigoFolio(numFolio, fechaCreacion),
                        NombreProyecto = nombreProy,
                        NombreCliente = clienteNombre,
                        Sector = sector,
                        EtapaFabricacion = etapa,
                        FechaCompromisoEntrega = fechaComp?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                        DiasRestantes = diasRestantes,
                        NivelAlerta = nivelAlerta
                    });
                }
            }

            return resultado;
        }
    }
}
