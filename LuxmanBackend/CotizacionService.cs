using System;
using System.Collections.Generic;
using Npgsql;
using Microsoft.Extensions.Configuration;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // servicio para guardar y consultar las cotizaciones en postgres usando sql directo
    public class CotizacionService
    {
        private readonly string cadenaConexion;

        public CotizacionService(IConfiguration configuracion)
        {
            cadenaConexion = configuracion.GetConnectionString("DefaultConnection")
                ?? configuracion.GetConnectionString("LuxmanDb")
                ?? throw new InvalidOperationException("No se encontro la cadena de conexion en el appsettings.");
        }

        // si la base en el servidor aun tenia el nombre anterior is_cotizacion_aprobada, lo migra a cotizacion_aprobada
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
                END $$;", conexion);
            migrar.ExecuteNonQuery();
        }

        // inserta la cotizacion y deja que el trigger de la base de datos calcule los precios
        public Cotizacion CrearCotizacion(CotizacionRequestDTO datos)
        {
            if (datos.LitrosTanque <= 0)
                throw new ArgumentException("Los litros del tanque deben ser mayores a cero.");

            if (datos.TipoAcero != "304" && datos.TipoAcero != "316")
                throw new ArgumentException("El tipo de acero solo puede ser 304 o 316.");

            var nueva = new Cotizacion
            {
                IdCliente = datos.IdCliente,
                LitrosTanque = datos.LitrosTanque,
                TipoAcero = datos.TipoAcero,
                TieneAgitacion = datos.TieneAgitacion
            };

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarEsquema(conexion);

            string consulta = @"
                INSERT INTO cotizaciones (id_cliente, litros_tanque, tipo_acero, tiene_agitacion)
                VALUES (@id_cliente, @litros_tanque, @tipo_acero, @tiene_agitacion)
                RETURNING id_cotizacion, precio_base, precio_final, fecha_creacion, cotizacion_aprobada;";

            using var comando = new NpgsqlCommand(consulta, conexion);

            // si el cliente viene en 0 o vacio le mandamos null para que no truene la llave foranea
            object valorCliente = (datos.IdCliente == null || datos.IdCliente == 0)
                ? DBNull.Value
                : datos.IdCliente;

            var parametroCliente = comando.Parameters.AddWithValue("id_cliente", valorCliente);
            parametroCliente.NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Integer;

            comando.Parameters.AddWithValue("litros_tanque", datos.LitrosTanque);
            comando.Parameters.AddWithValue("tipo_acero", datos.TipoAcero);
            comando.Parameters.AddWithValue("tiene_agitacion", datos.TieneAgitacion);

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

        // busca una cotizacion por su id para poder armar el pdf
        public (Cotizacion? cotizacion, string nombreCliente) ObtenerCotizacionPorId(int id_cotizacion)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarEsquema(conexion);

            string consulta = @"
                SELECT c.id_cotizacion, c.id_cliente, c.litros_tanque, c.tipo_acero, c.tiene_agitacion,
                       c.precio_base, c.precio_final, c.cotizacion_aprobada, c.fecha_creacion,
                       cl.nombre_cliente
                FROM cotizaciones c
                LEFT JOIN clientes cl ON cl.id_cliente = c.id_cliente
                WHERE c.id_cotizacion = @id_cotizacion;";

            using var comando = new NpgsqlCommand(consulta, conexion);
            comando.Parameters.AddWithValue("id_cotizacion", id_cotizacion);

            using var lector = comando.ExecuteReader();
            if (!lector.Read()) return (null, "");

            var encontrada = new Cotizacion
            {
                IdCotizacion = lector.GetInt32(0),
                IdCliente = lector.IsDBNull(1) ? null : lector.GetInt32(1),
                LitrosTanque = lector.GetDecimal(2),
                TipoAcero = lector.GetString(3),
                TieneAgitacion = !lector.IsDBNull(4) && lector.GetBoolean(4),
                PrecioBase = lector.IsDBNull(5) ? 0m : lector.GetDecimal(5),
                PrecioFinal = lector.IsDBNull(6) ? 0m : lector.GetDecimal(6),
                CotizacionAprobada = !lector.IsDBNull(7) && lector.GetBoolean(7),
                FechaCreacion = lector.IsDBNull(8) ? DateTime.Now : lector.GetDateTime(8)
            };

            string cliente = lector.IsDBNull(9) ? "Público en general" : lector.GetString(9);
            return (encontrada, cliente);
        }

        // saca todas las cotizaciones que ha hecho un cliente
        public List<Cotizacion> ObtenerCotizacionesPorCliente(int id_cliente)
        {
            var lista = new List<Cotizacion>();

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarEsquema(conexion);

            string consulta = @"
                SELECT id_cotizacion, id_cliente, litros_tanque, tipo_acero, tiene_agitacion,
                       precio_base, precio_final, cotizacion_aprobada, fecha_creacion
                FROM cotizaciones
                WHERE id_cliente = @id_cliente
                ORDER BY fecha_creacion DESC;";
            using var comando = new NpgsqlCommand(consulta, conexion);
            comando.Parameters.AddWithValue("id_cliente", id_cliente);

            using var lector = comando.ExecuteReader();
            while (lector.Read())
            {
                lista.Add(new Cotizacion
                {
                    IdCotizacion = lector.GetInt32(0),
                    IdCliente = lector.IsDBNull(1) ? null : lector.GetInt32(1),
                    LitrosTanque = lector.GetDecimal(2),
                    TipoAcero = lector.GetString(3),
                    TieneAgitacion = !lector.IsDBNull(4) && lector.GetBoolean(4),
                    PrecioBase = lector.IsDBNull(5) ? 0m : lector.GetDecimal(5),
                    PrecioFinal = lector.IsDBNull(6) ? 0m : lector.GetDecimal(6),
                    CotizacionAprobada = !lector.IsDBNull(7) && lector.GetBoolean(7),
                    FechaCreacion = lector.IsDBNull(8) ? DateTime.Now : lector.GetDateTime(8)
                });
            }

            return lista;
        }
    }
}
