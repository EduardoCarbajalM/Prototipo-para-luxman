using System;
using System.Collections.Generic;
using Npgsql;
using Microsoft.Extensions.Configuration;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // servicio para guardar y consultar las cotizaciones tecnicas en postgres usando sql directo
    public class CotizacionService
    {
        private readonly string cadenaConexion;

        private static readonly HashSet<string> FondosValidos = new(StringComparer.Ordinal)
        {
            "Plano",
            "Cónico",
            "Toriesférico"
        };

        public CotizacionService(IConfiguration configuracion)
        {
            cadenaConexion = configuracion.GetConnectionString("DefaultConnection")
                ?? configuracion.GetConnectionString("LuxmanDb")
                ?? throw new InvalidOperationException("No se encontro la cadena de conexion en el appsettings.");
        }

        public static string? NormalizarTipoFondo(string? tipoFondo)
        {
            if (string.IsNullOrWhiteSpace(tipoFondo)) return null;
            string limpio = tipoFondo.Trim();
            if (limpio.Equals("Conico", StringComparison.OrdinalIgnoreCase) ||
                limpio.Equals("Cónico", StringComparison.OrdinalIgnoreCase))
                return "Cónico";
            if (limpio.Equals("Toriesferico", StringComparison.OrdinalIgnoreCase) ||
                limpio.Equals("Toriesférico", StringComparison.OrdinalIgnoreCase))
                return "Toriesférico";
            if (limpio.Equals("Plano", StringComparison.OrdinalIgnoreCase))
                return "Plano";
            return FondosValidos.Contains(limpio) ? limpio : null;
        }

        private static void AsegurarEsquema(NpgsqlConnection conexion)
        {
            using var migrar = new NpgsqlCommand(@"
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'cotizaciones' AND column_name = 'is_cotizacion_aprobada'
                    ) THEN
                        ALTER TABLE cotizaciones RENAME COLUMN is_cotizacion_aprobada TO cotizacion_aprobada;
                    END IF;
                END $$;

                ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS numero_folio INTEGER;
                ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS eliminado BOOLEAN DEFAULT FALSE;
                ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS radio_m NUMERIC(10,4) DEFAULT 0;
                ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS longitud_m NUMERIC(10,4) DEFAULT 0;
                ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS tipo_fondo VARCHAR(30) DEFAULT 'Plano';
                ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS diametro_m NUMERIC(10,4) DEFAULT 0;
                ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS volumen_m3 NUMERIC(12,4) DEFAULT 0;
                ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS perimetro_m NUMERIC(10,4) DEFAULT 0;
                ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS area_lamina_m2 NUMERIC(12,4) DEFAULT 0;

                UPDATE cotizaciones SET numero_folio = id_cotizacion WHERE numero_folio IS NULL OR numero_folio <= 0;
                UPDATE cotizaciones SET eliminado = FALSE WHERE eliminado IS NULL;", conexion);
            migrar.ExecuteNonQuery();
        }

        private static int ObtenerMenorFolioDisponible(NpgsqlConnection conexion)
        {
            var ocupados = new List<int>();
            using var cmd = new NpgsqlCommand(@"
                SELECT DISTINCT numero_folio
                FROM cotizaciones
                WHERE NOT COALESCE(eliminado, FALSE) AND numero_folio > 0
                ORDER BY numero_folio ASC;", conexion);
            using var lector = cmd.ExecuteReader();
            while (lector.Read())
            {
                ocupados.Add(lector.GetInt32(0));
            }
            return CalculoTanqueService.CalcularMenorEnteroDisponible(ocupados);
        }

        public Cotizacion CrearCotizacion(CotizacionRequestDTO datos)
        {
            if (datos.RadioM <= 0)
                throw new ArgumentException("El radio del tanque (radio_m) debe ser mayor a cero.");

            if (datos.LongitudM <= 0)
                throw new ArgumentException("La longitud del tanque (longitud_m) debe ser mayor a cero.");

            string? fondoNormalizado = NormalizarTipoFondo(datos.TipoFondo);
            if (fondoNormalizado == null)
                throw new ArgumentException("El tipo de fondo solo puede ser Plano, Cónico o Toriesférico.");

            if (datos.TipoAcero != "304" && datos.TipoAcero != "316")
                throw new ArgumentException("El tipo de acero solo puede ser 304 o 316.");

            double radio = (double)datos.RadioM;
            double longitud = (double)datos.LongitudM;
            double diametro = 2.0 * radio;
            double volumen = Math.PI * radio * radio * longitud;
            double litros = volumen * 1000.0;
            double perimetro = Math.PI * diametro;
            double areaLamina = perimetro * longitud;

            decimal litrosRedondeados = Math.Round((decimal)litros, 2);
            if (litrosRedondeados <= 0)
                throw new ArgumentException("Las dimensiones ingresadas producen un volumen menor o igual a cero.");

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarEsquema(conexion);

            int folioDisponible = ObtenerMenorFolioDisponible(conexion);

            var nueva = new Cotizacion
            {
                NumeroFolio = folioDisponible,
                IdCliente = datos.IdCliente,
                RadioM = Math.Round(datos.RadioM, 4),
                LongitudM = Math.Round(datos.LongitudM, 4),
                TipoFondo = fondoNormalizado,
                DiametroM = Math.Round((decimal)diametro, 4),
                VolumenM3 = Math.Round((decimal)volumen, 4),
                LitrosTanque = litrosRedondeados,
                PerimetroM = Math.Round((decimal)perimetro, 4),
                AreaLaminaM2 = Math.Round((decimal)areaLamina, 4),
                TipoAcero = datos.TipoAcero,
                TieneAgitacion = datos.TieneAgitacion,
                Eliminado = false
            };

            string consulta = @"
                INSERT INTO cotizaciones (
                    numero_folio, id_cliente, radio_m, longitud_m, tipo_fondo,
                    diametro_m, volumen_m3, litros_tanque, perimetro_m, area_lamina_m2,
                    tipo_acero, tiene_agitacion, eliminado
                )
                VALUES (
                    @numero_folio, @id_cliente, @radio_m, @longitud_m, @tipo_fondo,
                    @diametro_m, @volumen_m3, @litros_tanque, @perimetro_m, @area_lamina_m2,
                    @tipo_acero, @tiene_agitacion, FALSE
                )
                RETURNING id_cotizacion, precio_base, precio_final, fecha_creacion, cotizacion_aprobada;";

            using var comando = new NpgsqlCommand(consulta, conexion);

            comando.Parameters.AddWithValue("numero_folio", nueva.NumeroFolio);

            object valorCliente = (datos.IdCliente == null || datos.IdCliente == 0)
                ? DBNull.Value
                : datos.IdCliente;

            var parametroCliente = comando.Parameters.AddWithValue("id_cliente", valorCliente);
            parametroCliente.NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Integer;

            comando.Parameters.AddWithValue("radio_m", nueva.RadioM);
            comando.Parameters.AddWithValue("longitud_m", nueva.LongitudM);
            comando.Parameters.AddWithValue("tipo_fondo", nueva.TipoFondo);
            comando.Parameters.AddWithValue("diametro_m", nueva.DiametroM);
            comando.Parameters.AddWithValue("volumen_m3", nueva.VolumenM3);
            comando.Parameters.AddWithValue("litros_tanque", nueva.LitrosTanque);
            comando.Parameters.AddWithValue("perimetro_m", nueva.PerimetroM);
            comando.Parameters.AddWithValue("area_lamina_m2", nueva.AreaLaminaM2);
            comando.Parameters.AddWithValue("tipo_acero", nueva.TipoAcero!);
            comando.Parameters.AddWithValue("tiene_agitacion", nueva.TieneAgitacion);

            using var lector = comando.ExecuteReader();
            if (lector.Read())
            {
                nueva.IdCotizacion = lector.GetInt32(0);
                nueva.PrecioBase = lector.GetDecimal(1);
                nueva.PrecioFinal = lector.GetDecimal(2);
                nueva.FechaCreacion = lector.GetDateTime(3);
                nueva.CotizacionAprobada = lector.GetBoolean(4);
            }

            return nueva;
        }

        public (Cotizacion? cotizacion, string nombreCliente) ObtenerCotizacionPorId(int id_cotizacion)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarEsquema(conexion);

            string consulta = @"
                SELECT c.id_cotizacion, c.id_cliente,
                       c.radio_m, c.longitud_m, c.tipo_fondo,
                       c.diametro_m, c.volumen_m3, c.litros_tanque, c.perimetro_m, c.area_lamina_m2,
                       c.tipo_acero, c.tiene_agitacion,
                       c.precio_base, c.precio_final, c.cotizacion_aprobada, c.fecha_creacion,
                       c.numero_folio, c.eliminado,
                       cl.nombre_cliente
                FROM cotizaciones c
                LEFT JOIN clientes cl ON cl.id_cliente = c.id_cliente
                WHERE c.id_cotizacion = @id_cotizacion;";

            using var comando = new NpgsqlCommand(consulta, conexion);
            comando.Parameters.AddWithValue("id_cotizacion", id_cotizacion);

            using var lector = comando.ExecuteReader();
            if (!lector.Read()) return (null, "");

            var encontrada = MapearCotizacion(lector);
            string cliente = lector.IsDBNull(18) ? "Público en general" : lector.GetString(18);
            return (encontrada, cliente);
        }

        public List<Cotizacion> ObtenerCotizacionesPorCliente(int id_cliente)
        {
            var lista = new List<Cotizacion>();

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarEsquema(conexion);

            string consulta = @"
                SELECT id_cotizacion, id_cliente,
                       radio_m, longitud_m, tipo_fondo,
                       diametro_m, volumen_m3, litros_tanque, perimetro_m, area_lamina_m2,
                       tipo_acero, tiene_agitacion,
                       precio_base, precio_final, cotizacion_aprobada, fecha_creacion,
                       numero_folio, eliminado
                FROM cotizaciones
                WHERE id_cliente = @id_cliente AND NOT COALESCE(eliminado, FALSE)
                ORDER BY numero_folio ASC, fecha_creacion DESC;";
            using var comando = new NpgsqlCommand(consulta, conexion);
            comando.Parameters.AddWithValue("id_cliente", id_cliente);

            using var lector = comando.ExecuteReader();
            while (lector.Read())
            {
                lista.Add(MapearCotizacion(lector));
            }

            return lista;
        }

        private static Cotizacion MapearCotizacion(NpgsqlDataReader lector)
        {
            int idCot = lector.GetInt32(0);
            int numFolio = lector.IsDBNull(16) ? idCot : lector.GetInt32(16);
            if (numFolio <= 0) numFolio = idCot;

            return new Cotizacion
            {
                IdCotizacion = idCot,
                NumeroFolio = numFolio,
                IdCliente = lector.IsDBNull(1) ? null : lector.GetInt32(1),
                RadioM = lector.IsDBNull(2) ? 0m : lector.GetDecimal(2),
                LongitudM = lector.IsDBNull(3) ? 0m : lector.GetDecimal(3),
                TipoFondo = lector.IsDBNull(4) ? "Plano" : lector.GetString(4),
                DiametroM = lector.IsDBNull(5) ? 0m : lector.GetDecimal(5),
                VolumenM3 = lector.IsDBNull(6) ? 0m : lector.GetDecimal(6),
                LitrosTanque = lector.IsDBNull(7) ? 0m : lector.GetDecimal(7),
                PerimetroM = lector.IsDBNull(8) ? 0m : lector.GetDecimal(8),
                AreaLaminaM2 = lector.IsDBNull(9) ? 0m : lector.GetDecimal(9),
                TipoAcero = lector.IsDBNull(10) ? "304" : lector.GetString(10),
                TieneAgitacion = !lector.IsDBNull(11) && lector.GetBoolean(11),
                PrecioBase = lector.IsDBNull(12) ? 0m : lector.GetDecimal(12),
                PrecioFinal = lector.IsDBNull(13) ? 0m : lector.GetDecimal(13),
                CotizacionAprobada = !lector.IsDBNull(14) && lector.GetBoolean(14),
                FechaCreacion = lector.IsDBNull(15) ? DateTime.Now : lector.GetDateTime(15),
                Eliminado = !lector.IsDBNull(17) && lector.GetBoolean(17)
            };
        }
    }
}
