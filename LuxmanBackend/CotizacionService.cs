using System;
using System.Collections.Generic;
using Npgsql;
using Microsoft.Extensions.Configuration;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // Servicio "sencillote" para manejar las cotizaciones.
    // No usamos Entity Framework aqui a proposito, usamos Npgsql directo
    // para que se vea clarito que es lo que esta pasando con la base de datos
    // (asi el profe/jurado ve el SQL crudo y no se pierde en el ORM)
    public class CotizacionService
    {
        private readonly string _connectionString;

        // inyeccion de dependencias minima, solo para traer el connection string
        // desde el appsettings.json
        public CotizacionService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                        ?? throw new InvalidOperationException("La cadena de conexión 'DefaultConnection' no fue encontrada.");
        }

        // -----------------------------------------------------------------
        // Metodo para crear una cotizacion nueva
        // el precio_base y precio_final los calcula el trigger de PL/Python
        // asi que aqui solo insertamos los datos crudos y leemos el resultado
        // -----------------------------------------------------------------
        public Cotizacion CrearCotizacion(CotizacionRequestDTO datosCotizacion)
        {
            Cotizacion cotizacionCreada = new Cotizacion();

            // validacion basica antes de mandar a la base, para no batallar
            // con el error feo de postgres
            if (datosCotizacion.litrosTanque <= 0)
            {
                throw new ArgumentException("Los litros del tanque deben ser mayores a cero, no se permiten valores negativos ni cero.");
            }

            if (datosCotizacion.tipoAcero != "304" && datosCotizacion.tipoAcero != "316")
            {
                throw new ArgumentException("El tipo de acero debe ser 304 o 316, checa el formulario");
            }

            using (NpgsqlConnection conexion = new NpgsqlConnection(_connectionString))
            {
                conexion.Open();

                string queryInsert = @"
                    INSERT INTO cotizaciones (id_cliente, litros_tanque, tipo_acero, tiene_agitacion)
                    VALUES (@idCliente, @litros, @tipoAcero, @agitacion)
                    RETURNING id_cotizacion, precio_base, precio_final, fecha_creacion, is_cotizacion_aprobada;
                ";

                using (NpgsqlCommand comando = new NpgsqlCommand(queryInsert, conexion))
                {
                    // =========================================================
                    // CORRECCIÓN: Evitar que el idCliente 0 de React truene la base
                    // =========================================================
                    object valorIdCliente = (datosCotizacion.idCliente == 0 || datosCotizacion.idCliente == null) 
                        ? DBNull.Value 
                        : datosCotizacion.idCliente;

                    var paramCliente = comando.Parameters.AddWithValue("idCliente", valorIdCliente);
                    paramCliente.NpgsqlDbType = NpgsqlTypes.NpgsqlDbType.Integer;
                    
                    comando.Parameters.AddWithValue("litros", datosCotizacion.litrosTanque);
                    comando.Parameters.AddWithValue("tipoAcero", datosCotizacion.tipoAcero);
                    comando.Parameters.AddWithValue("agitacion", datosCotizacion.tieneAgitacion);

                    // aqui se dispara el trigger de PL/Python en automatico
                    // al hacer el INSERT, magia de postgres
                    using (NpgsqlDataReader lector = comando.ExecuteReader())
                    {
                        if (lector.Read())
                        {
                            cotizacionCreada.idCotizacion = lector.GetInt32(0);
                            cotizacionCreada.precioBase = lector.GetDecimal(1);
                            cotizacionCreada.precioFinal = lector.GetDecimal(2);
                            cotizacionCreada.fechaCreacion = lector.GetDateTime(3);
                            cotizacionCreada.isCotizacionAprobada = lector.GetBoolean(4);
                        }
                    }
                }

                conexion.Close();
            }

            // llenamos lo demas con lo que ya teniamos del request
            cotizacionCreada.idCliente = datosCotizacion.idCliente;
            cotizacionCreada.litrosTanque = datosCotizacion.litrosTanque;
            cotizacionCreada.tipoAcero = datosCotizacion.tipoAcero;
            cotizacionCreada.tieneAgitacion = datosCotizacion.tieneAgitacion;

            return cotizacionCreada;
        }

        // -----------------------------------------------------------------
        // Metodo para traer una sola cotizacion por su id (se usa para el PDF)
        // regresa null si no existe. Tambien trae el nombre del cliente si tiene,
        // si no, se pone "Público en general"
        // -----------------------------------------------------------------
        public (Cotizacion? cotizacion, string nombreCliente) ObtenerCotizacionPorId(int idCotizacion)
        {
            using (NpgsqlConnection conexion = new NpgsqlConnection(_connectionString))
            {
                conexion.Open();

                string queryGet = @"
                    SELECT c.id_cotizacion, c.id_cliente, c.litros_tanque, c.tipo_acero, c.tiene_agitacion,
                           c.precio_base, c.precio_final, c.is_cotizacion_aprobada, c.fecha_creacion,
                           cl.nombre_cliente
                    FROM cotizaciones c
                    LEFT JOIN clientes cl ON cl.id_cliente = c.id_cliente
                    WHERE c.id_cotizacion = @idCotizacion;";

                using (NpgsqlCommand comando = new NpgsqlCommand(queryGet, conexion))
                {
                    comando.Parameters.AddWithValue("idCotizacion", idCotizacion);

                    using (NpgsqlDataReader lector = comando.ExecuteReader())
                    {
                        if (!lector.Read())
                        {
                            return (null, "");
                        }

                        Cotizacion c = new Cotizacion();
                        c.idCotizacion = lector.GetInt32(0);
                        c.idCliente = lector.IsDBNull(1) ? (int?)null : lector.GetInt32(1);
                        c.litrosTanque = lector.GetDecimal(2);
                        c.tipoAcero = lector.GetString(3);
                        c.tieneAgitacion = !lector.IsDBNull(4) && lector.GetBoolean(4);
                        c.precioBase = lector.IsDBNull(5) ? 0m : lector.GetDecimal(5);
                        c.precioFinal = lector.IsDBNull(6) ? 0m : lector.GetDecimal(6);
                        c.isCotizacionAprobada = !lector.IsDBNull(7) && lector.GetBoolean(7);
                        c.fechaCreacion = lector.IsDBNull(8) ? DateTime.Now : lector.GetDateTime(8);

                        string nombreCliente = lector.IsDBNull(9) ? "Público en general" : lector.GetString(9);
                        return (c, nombreCliente);
                    }
                }
            }
        }

        // -----------------------------------------------------------------
        // Metodo para listar todas las cotizaciones de un cliente
        // (se usa foreach normalito, nada de LINQ raro)
        // -----------------------------------------------------------------
        public List<Cotizacion> ObtenerCotizacionesPorCliente(int idCliente)
        {
            List<Cotizacion> listaCotizaciones = new List<Cotizacion>();

            using (NpgsqlConnection conexion = new NpgsqlConnection(_connectionString))
            {
                conexion.Open();

                string queryGet = "SELECT * FROM cotizaciones WHERE id_cliente = @idCliente ORDER BY fecha_creacion DESC;";

                using (NpgsqlCommand comando = new NpgsqlCommand(queryGet, conexion))
                {
                    comando.Parameters.AddWithValue("idCliente", idCliente);

                    using (NpgsqlDataReader lector = comando.ExecuteReader())
                    {
                        // aqui usamos while normal, leyendo fila por fila
                        while (lector.Read())
                        {
                            Cotizacion c = new Cotizacion();
                            c.idCotizacion = lector.GetInt32(lector.GetOrdinal("id_cotizacion"));
                            c.idCliente = lector.IsDBNull(lector.GetOrdinal("id_cliente")) ? (int?)null : lector.GetInt32(lector.GetOrdinal("id_cliente"));
                            c.litrosTanque = lector.GetDecimal(lector.GetOrdinal("litros_tanque"));
                            c.tipoAcero = lector.GetString(lector.GetOrdinal("tipo_acero"));
                            c.tieneAgitacion = lector.GetBoolean(lector.GetOrdinal("tiene_agitacion"));
                            c.precioBase = lector.GetDecimal(lector.GetOrdinal("precio_base"));
                            c.precioFinal = lector.GetDecimal(lector.GetOrdinal("precio_final"));
                            c.isCotizacionAprobada = lector.GetBoolean(lector.GetOrdinal("is_cotizacion_aprobada"));
                            c.fechaCreacion = lector.GetDateTime(lector.GetOrdinal("fecha_creacion"));

                            listaCotizaciones.Add(c);
                        }
                    }
                }
            }

            return listaCotizaciones;
        }
    }
}