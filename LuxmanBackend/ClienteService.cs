using System;
using System.Collections.Generic;
using Npgsql;
using Microsoft.Extensions.Configuration;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // servicio para gestionar el catalogo real de clientes en postgres
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

        // asegura que la tabla clientes exista y aplica la precarga inicial una sola vez
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
                );

                CREATE TABLE IF NOT EXISTS control_semillas (
                    clave          VARCHAR(80) PRIMARY KEY,
                    fecha_aplicada TIMESTAMP DEFAULT NOW()
                );", conexion))
            {
                crear.ExecuteNonQuery();
            }

            bool yaAplicada;
            using (var verificar = new NpgsqlCommand(
                "SELECT 1 FROM control_semillas WHERE clave = 'clientes_iniciales_luxman_v1' LIMIT 1;", conexion))
            {
                yaAplicada = verificar.ExecuteScalar() != null;
            }

            if (!yaAplicada)
            {
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

                using var registrarSemilla = new NpgsqlCommand(@"
                    INSERT INTO control_semillas (clave)
                    VALUES ('clientes_iniciales_luxman_v1')
                    ON CONFLICT (clave) DO NOTHING;", conexion);
                registrarSemilla.ExecuteNonQuery();
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

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTablaYSemilla(conexion);

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
                INSERT INTO clientes (nombre_cliente)
                VALUES (@nombre_cliente)
                RETURNING id_cliente, fecha_alta;", conexion);

            insertar.Parameters.AddWithValue("nombre_cliente", nombreLimpio);

            using var lector = insertar.ExecuteReader();
            lector.Read();

            return new Cliente
            {
                IdCliente = lector.GetInt32(0),
                NombreCliente = nombreLimpio,
                TieneDescuento = false,
                FechaAlta = lector.GetDateTime(1)
            };
        }

        // desvincula cualquier referencia previa (id_cliente = NULL) antes de eliminar el cliente
        public bool Eliminar(int id_cliente)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTablaYSemilla(conexion);

            using var transaccion = conexion.BeginTransaction();

            using (var desvincular = new NpgsqlCommand(@"
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'calculos_tanques' AND column_name = 'id_cliente'
                    ) THEN
                        UPDATE calculos_tanques SET id_cliente = NULL WHERE id_cliente = " + id_cliente + @";
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'cotizaciones' AND column_name = 'id_cliente'
                    ) THEN
                        UPDATE cotizaciones SET id_cliente = NULL WHERE id_cliente = " + id_cliente + @";
                    END IF;
                END $$;", conexion, transaccion))
            {
                desvincular.ExecuteNonQuery();
            }

            int filasEliminadas;
            using (var eliminar = new NpgsqlCommand(
                "DELETE FROM clientes WHERE id_cliente = @id_cliente;", conexion, transaccion))
            {
                eliminar.Parameters.AddWithValue("id_cliente", id_cliente);
                filasEliminadas = eliminar.ExecuteNonQuery();
            }

            transaccion.Commit();
            return filasEliminadas > 0;
        }
    }
}
