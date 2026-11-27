using System;
using System.Collections.Generic;
using Npgsql;
using Microsoft.Extensions.Configuration;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // servicio para gestionar el catalogo real de clientes en postgres y precargar clientes base
    public class ClienteService
    {
        private readonly string cadenaConexion;

        private static readonly string[] ClientesSemilla =
        {
            "Cosméticos Naturales Ideal SA de CV",
            "Farbe SA de CV"
        };

        public ClienteService(IConfiguration configuracion)
        {
            cadenaConexion = configuracion.GetConnectionString("DefaultConnection")
                ?? configuracion.GetConnectionString("LuxmanDb")
                ?? throw new InvalidOperationException("No se encontro la cadena de conexion en el appsettings.");
        }

        // asegura que la tabla clientes exista y que esten precargados los clientes iniciales
        public static void AsegurarTablaYSemilla(NpgsqlConnection conexion)
        {
            using (var crear = new NpgsqlCommand(@"
                CREATE TABLE IF NOT EXISTS clientes (
                    id_cliente      SERIAL PRIMARY KEY,
                    nombre_cliente  VARCHAR(150) NOT NULL,
                    rfc_cliente     VARCHAR(20),
                    telefono        VARCHAR(20),
                    correo          VARCHAR(150),
                    tiene_descuento BOOLEAN DEFAULT FALSE,
                    fecha_alta      TIMESTAMP DEFAULT NOW()
                );", conexion))
            {
                crear.ExecuteNonQuery();
            }

            foreach (string nombreSemilla in ClientesSemilla)
            {
                using var insertarSemilla = new NpgsqlCommand(@"
                    INSERT INTO clientes (nombre_cliente)
                    SELECT @nombre_cliente
                    WHERE NOT EXISTS (
                        SELECT 1 FROM clientes
                        WHERE LOWER(TRIM(nombre_cliente)) = LOWER(TRIM(@nombre_cliente))
                    );", conexion);
                insertarSemilla.Parameters.AddWithValue("nombre_cliente", nombreSemilla);
                insertarSemilla.ExecuteNonQuery();
            }
        }

        public List<Cliente> Listar()
        {
            var lista = new List<Cliente>();

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTablaYSemilla(conexion);

            using var comando = new NpgsqlCommand(@"
                SELECT id_cliente, nombre_cliente, rfc_cliente, telefono, correo, tiene_descuento, fecha_alta
                FROM clientes
                ORDER BY nombre_cliente ASC;", conexion);

            using var lector = comando.ExecuteReader();
            while (lector.Read())
            {
                lista.Add(new Cliente
                {
                    IdCliente = lector.GetInt32(0),
                    NombreCliente = lector.GetString(1),
                    RfcCliente = lector.IsDBNull(2) ? null : lector.GetString(2),
                    Telefono = lector.IsDBNull(3) ? null : lector.GetString(3),
                    Correo = lector.IsDBNull(4) ? null : lector.GetString(4),
                    TieneDescuento = !lector.IsDBNull(5) && lector.GetBoolean(5),
                    FechaAlta = lector.IsDBNull(6) ? DateTime.Now : lector.GetDateTime(6)
                });
            }

            return lista;
        }

        public Cliente Crear(ClienteRequestDTO datos)
        {
            if (string.IsNullOrWhiteSpace(datos.NombreCliente))
                throw new ArgumentException("El nombre del cliente (nombre_cliente) es obligatorio.");

            string nombreLimpio = datos.NombreCliente.Trim();
            if (nombreLimpio.Length > 150)
                throw new ArgumentException("El nombre del cliente no puede exceder 150 caracteres.");

            string? rfcLimpio = string.IsNullOrWhiteSpace(datos.RfcCliente) ? null : datos.RfcCliente.Trim().ToUpperInvariant();
            string? telefonoLimpio = string.IsNullOrWhiteSpace(datos.Telefono) ? null : datos.Telefono.Trim();
            string? correoLimpio = string.IsNullOrWhiteSpace(datos.Correo) ? null : datos.Correo.Trim();

            if (rfcLimpio != null && rfcLimpio.Length > 20)
                throw new ArgumentException("El RFC no puede exceder 20 caracteres.");
            if (telefonoLimpio != null && telefonoLimpio.Length > 20)
                throw new ArgumentException("El teléfono no puede exceder 20 caracteres.");
            if (correoLimpio != null && correoLimpio.Length > 150)
                throw new ArgumentException("El correo no puede exceder 150 caracteres.");

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTablaYSemilla(conexion);

            // si ya existe un cliente con el mismo nombre exacto, lo devolvemos para evitar duplicados
            using (var buscarExistente = new NpgsqlCommand(@"
                SELECT id_cliente, nombre_cliente, rfc_cliente, telefono, correo, tiene_descuento, fecha_alta
                FROM clientes
                WHERE LOWER(TRIM(nombre_cliente)) = LOWER(@nombre_cliente)
                LIMIT 1;", conexion))
            {
                buscarExistente.Parameters.AddWithValue("nombre_cliente", nombreLimpio);
                using var lectorExistente = buscarExistente.ExecuteReader();
                if (lectorExistente.Read())
                {
                    return new Cliente
                    {
                        IdCliente = lectorExistente.GetInt32(0),
                        NombreCliente = lectorExistente.GetString(1),
                        RfcCliente = lectorExistente.IsDBNull(2) ? null : lectorExistente.GetString(2),
                        Telefono = lectorExistente.IsDBNull(3) ? null : lectorExistente.GetString(3),
                        Correo = lectorExistente.IsDBNull(4) ? null : lectorExistente.GetString(4),
                        TieneDescuento = !lectorExistente.IsDBNull(5) && lectorExistente.GetBoolean(5),
                        FechaAlta = lectorExistente.IsDBNull(6) ? DateTime.Now : lectorExistente.GetDateTime(6)
                    };
                }
            }

            using var insertar = new NpgsqlCommand(@"
                INSERT INTO clientes (nombre_cliente, rfc_cliente, telefono, correo)
                VALUES (@nombre_cliente, @rfc_cliente, @telefono, @correo)
                RETURNING id_cliente, fecha_alta;", conexion);

            insertar.Parameters.AddWithValue("nombre_cliente", nombreLimpio);
            insertar.Parameters.AddWithValue("rfc_cliente", (object?)rfcLimpio ?? DBNull.Value);
            insertar.Parameters.AddWithValue("telefono", (object?)telefonoLimpio ?? DBNull.Value);
            insertar.Parameters.AddWithValue("correo", (object?)correoLimpio ?? DBNull.Value);

            using var lector = insertar.ExecuteReader();
            lector.Read();

            return new Cliente
            {
                IdCliente = lector.GetInt32(0),
                NombreCliente = nombreLimpio,
                RfcCliente = rfcLimpio,
                Telefono = telefonoLimpio,
                Correo = correoLimpio,
                TieneDescuento = false,
                FechaAlta = lector.GetDateTime(1)
            };
        }
    }
}
