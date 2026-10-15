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
            _connectionString = configuration.GetConnectionString("LuxmanDb");
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
                    var paramCliente = comando.Parameters.AddWithValue("idCliente", (object?)datosCotizacion.idCliente ?? DBNull.Value);
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
