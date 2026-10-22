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

        // inserta la cotizacion y deja que el trigger de la base de datos calcule los precios
        public Cotizacion CrearCotizacion(CotizacionRequestDTO datos)
        {
            if (datos.litrosTanque <= 0)
                throw new ArgumentException("Los litros del tanque deben ser mayores a cero.");

            if (datos.tipoAcero != "304" && datos.tipoAcero != "316")
                throw new ArgumentException("El tipo de acero solo puede ser 304 o 316.");

            var nueva = new Cotizacion
            {
                idCliente = datos.idCliente,
                litrosTanque = datos.litrosTanque,
                tipoAcero = datos.tipoAcero,
                tieneAgitacion = datos.tieneAgitacion
            };

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();

            string consulta = @"
                INSERT INTO cotizaciones (id_cliente, litros_tanque, tipo_acero, tiene_agitacion)
                VALUES (@idCliente, @litros, @tipoAcero, @agitacion)
                RETURNING id_cotizacion, precio_base, precio_final, fecha_creacion, is_cotizacion_aprobada;";

            using var comando = new NpgsqlCommand(consulta, conexion);

            // si el cliente viene en 0 o vacio le mandamos null para que no truene la llave foranea
            object valorCliente = (datos.idCliente == null || datos.idCliente == 0)
                ? DBNull.Value
                : datos.idCliente;

            var parametroCliente = comando.Parameters.AddWithValue("idCliente", valorCliente);
            parametroCliente.NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Integer;

            comando.Parameters.AddWithValue("litros", datos.litrosTanque);
            comando.Parameters.AddWithValue("tipoAcero", datos.tipoAcero);
            comando.Parameters.AddWithValue("agitacion", datos.tieneAgitacion);

            using var lector = comando.ExecuteReader();
            if (lector.Read())
            {
                nueva.idCotizacion = lector.GetInt32(0);
                nueva.precioBase = lector.GetDecimal(1);
                nueva.precioFinal = lector.GetDecimal(2);
                nueva.fechaCreacion = lector.GetDateTime(3);
                nueva.isCotizacionAprobada = lector.GetBoolean(4);
            }

            return nueva;
        }

        // busca una cotizacion por su id para poder armar el pdf
        public (Cotizacion? cotizacion, string nombreCliente) ObtenerCotizacionPorId(int idCotizacion)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();

            string consulta = @"
                SELECT c.id_cotizacion, c.id_cliente, c.litros_tanque, c.tipo_acero, c.tiene_agitacion,
                       c.precio_base, c.precio_final, c.is_cotizacion_aprobada, c.fecha_creacion,
                       cl.nombre_cliente
                FROM cotizaciones c
                LEFT JOIN clientes cl ON cl.id_cliente = c.id_cliente
                WHERE c.id_cotizacion = @idCotizacion;";

            using var comando = new NpgsqlCommand(consulta, conexion);
            comando.Parameters.AddWithValue("idCotizacion", idCotizacion);

            using var lector = comando.ExecuteReader();
            if (!lector.Read()) return (null, "");

            var encontrada = new Cotizacion
            {
                idCotizacion = lector.GetInt32(0),
                idCliente = lector.IsDBNull(1) ? null : lector.GetInt32(1),
                litrosTanque = lector.GetDecimal(2),
                tipoAcero = lector.GetString(3),
                tieneAgitacion = !lector.IsDBNull(4) && lector.GetBoolean(4),
                precioBase = lector.IsDBNull(5) ? 0m : lector.GetDecimal(5),
                precioFinal = lector.IsDBNull(6) ? 0m : lector.GetDecimal(6),
                isCotizacionAprobada = !lector.IsDBNull(7) && lector.GetBoolean(7),
                fechaCreacion = lector.IsDBNull(8) ? DateTime.Now : lector.GetDateTime(8)
            };

            string cliente = lector.IsDBNull(9) ? "Público en general" : lector.GetString(9);
            return (encontrada, cliente);
        }

        // saca todas las cotizaciones que ha hecho un cliente
        public List<Cotizacion> ObtenerCotizacionesPorCliente(int idCliente)
        {
            var lista = new List<Cotizacion>();

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();

            string consulta = "SELECT * FROM cotizaciones WHERE id_cliente = @idCliente ORDER BY fecha_creacion DESC;";
            using var comando = new NpgsqlCommand(consulta, conexion);
            comando.Parameters.AddWithValue("idCliente", idCliente);

            using var lector = comando.ExecuteReader();
            while (lector.Read())
            {
                lista.Add(new Cotizacion
                {
                    idCotizacion = lector.GetInt32(lector.GetOrdinal("id_cotizacion")),
                    idCliente = lector.IsDBNull(lector.GetOrdinal("id_cliente")) ? null : lector.GetInt32(lector.GetOrdinal("id_cliente")),
                    litrosTanque = lector.GetDecimal(lector.GetOrdinal("litros_tanque")),
                    tipoAcero = lector.GetString(lector.GetOrdinal("tipo_acero")),
                    tieneAgitacion = lector.GetBoolean(lector.GetOrdinal("tiene_agitacion")),
                    precioBase = lector.GetDecimal(lector.GetOrdinal("precio_base")),
                    precioFinal = lector.GetDecimal(lector.GetOrdinal("precio_final")),
                    isCotizacionAprobada = lector.GetBoolean(lector.GetOrdinal("is_cotizacion_aprobada")),
                    fechaCreacion = lector.GetDateTime(lector.GetOrdinal("fecha_creacion"))
                });
            }

            return lista;
        }
    }
}
