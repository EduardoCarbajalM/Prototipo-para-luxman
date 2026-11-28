using System;
using System.Collections.Generic;
using System.Linq;
using Npgsql;
using Microsoft.Extensions.Configuration;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // servicio para gestionar el directorio real de clientes en postgres con su sector industrial
    public class ClienteService
    {
        private readonly string cadenaConexion;

        public static readonly string[] SectoresValidos =
        {
            "Agroalimentaria",
            "Farmacéutica",
            "Cosmética",
            "Química",
            "Tratamiento de Aguas",
            "Otro"
        };

        private static readonly (string Nombre, string Sector)[] ClientesSemilla =
        {
            ("Cosméticos Naturales Ideal SA de CV", "Cosmética"),
            ("Farbe SA de CV", "Química")
        };

        public ClienteService(IConfiguration configuracion)
        {
            cadenaConexion = configuracion.GetConnectionString("DefaultConnection")
                ?? configuracion.GetConnectionString("LuxmanDb")
                ?? throw new InvalidOperationException("No se encontro la cadena de conexion en el appsettings.");
        }

        public static string NormalizarSector(string? sector)
        {
            if (string.IsNullOrWhiteSpace(sector)) return "Otro";
            string limpio = sector.Trim();
            var coincidencia = SectoresValidos.FirstOrDefault(
                s => string.Equals(s, limpio, StringComparison.OrdinalIgnoreCase));
            if (coincidencia != null) return coincidencia;

            if (limpio.Contains("aliment", StringComparison.OrdinalIgnoreCase) ||
                limpio.Contains("lact", StringComparison.OrdinalIgnoreCase) ||
                limpio.Contains("láct", StringComparison.OrdinalIgnoreCase) ||
                limpio.Contains("agro", StringComparison.OrdinalIgnoreCase))
                return "Agroalimentaria";

            if (limpio.Contains("farma", StringComparison.OrdinalIgnoreCase))
                return "Farmacéutica";
            if (limpio.Contains("cosmet", StringComparison.OrdinalIgnoreCase) ||
                limpio.Contains("cosmét", StringComparison.OrdinalIgnoreCase))
                return "Cosmética";
            if (limpio.Contains("quim", StringComparison.OrdinalIgnoreCase) ||
                limpio.Contains("quím", StringComparison.OrdinalIgnoreCase))
                return "Química";
            if (limpio.Contains("agua", StringComparison.OrdinalIgnoreCase))
                return "Tratamiento de Aguas";

            return "Otro";
        }

        // asegura que la tabla clientes y la columna sector existan, y aplica la precarga inicial una sola vez
        public static void AsegurarTablaYSemilla(NpgsqlConnection conexion)
        {
            using (var crear = new NpgsqlCommand(@"
                CREATE TABLE IF NOT EXISTS clientes (
                    id_cliente      SERIAL PRIMARY KEY,
                    nombre_cliente  VARCHAR(150) NOT NULL,
                    sector          VARCHAR(60) NOT NULL DEFAULT 'Otro',
                    rfc_cliente     VARCHAR(20),
                    telefono        VARCHAR(30),
                    correo          VARCHAR(150),
                    tiene_descuento BOOLEAN DEFAULT FALSE,
                    fecha_alta      TIMESTAMP DEFAULT NOW()
                );

                ALTER TABLE clientes ADD COLUMN IF NOT EXISTS sector VARCHAR(60) DEFAULT 'Otro';
                ALTER TABLE clientes ADD COLUMN IF NOT EXISTS rfc_cliente VARCHAR(20);
                ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefono VARCHAR(30);
                ALTER TABLE clientes ADD COLUMN IF NOT EXISTS correo VARCHAR(150);
                ALTER TABLE clientes ALTER COLUMN telefono TYPE VARCHAR(30);

                UPDATE clientes SET sector = 'Otro' WHERE sector IS NULL OR TRIM(sector) = '';

                CREATE TABLE IF NOT EXISTS control_semillas (
                    clave          VARCHAR(80) PRIMARY KEY,
                    fecha_aplicada TIMESTAMP DEFAULT NOW()
                );", conexion))
            {
                crear.ExecuteNonQuery();
            }

            bool semillaClientesAplicada;
            using (var verificar = new NpgsqlCommand(
                "SELECT 1 FROM control_semillas WHERE clave = 'clientes_iniciales_luxman_v1' LIMIT 1;", conexion))
            {
                semillaClientesAplicada = verificar.ExecuteScalar() != null;
            }

            if (!semillaClientesAplicada)
            {
                foreach (var (nombreSemilla, sectorSemilla) in ClientesSemilla)
                {
                    using var insertarSemilla = new NpgsqlCommand(@"
                        INSERT INTO clientes (nombre_cliente, sector)
                        SELECT @nombre_cliente, @sector
                        WHERE NOT EXISTS (
                            SELECT 1 FROM clientes
                            WHERE LOWER(TRIM(nombre_cliente)) = LOWER(TRIM(@nombre_cliente))
                        );", conexion);
                    insertarSemilla.Parameters.AddWithValue("nombre_cliente", nombreSemilla);
                    insertarSemilla.Parameters.AddWithValue("sector", sectorSemilla);
                    insertarSemilla.ExecuteNonQuery();
                }

                using var registrarSemilla = new NpgsqlCommand(@"
                    INSERT INTO control_semillas (clave)
                    VALUES ('clientes_iniciales_luxman_v1')
                    ON CONFLICT (clave) DO NOTHING;", conexion);
                registrarSemilla.ExecuteNonQuery();
            }

            // asigna sector inicial a los clientes semilla preexistentes una sola vez si aun tenian 'Otro'
            bool sectoresSemillaAplicados;
            using (var verificarSec = new NpgsqlCommand(
                "SELECT 1 FROM control_semillas WHERE clave = 'clientes_sectores_v1' LIMIT 1;", conexion))
            {
                sectoresSemillaAplicados = verificarSec.ExecuteScalar() != null;
            }

            if (!sectoresSemillaAplicados)
            {
                using var actualizarSectores = new NpgsqlCommand(@"
                    UPDATE clientes SET sector = 'Cosmética'
                    WHERE LOWER(TRIM(nombre_cliente)) = LOWER('Cosméticos Naturales Ideal SA de CV') AND sector = 'Otro';

                    UPDATE clientes SET sector = 'Química'
                    WHERE LOWER(TRIM(nombre_cliente)) = LOWER('Farbe SA de CV') AND sector = 'Otro';

                    UPDATE clientes SET sector = 'Agroalimentaria'
                    WHERE LOWER(TRIM(nombre_cliente)) LIKE 'lacteos del norte%' AND sector = 'Otro';

                    INSERT INTO control_semillas (clave)
                    VALUES ('clientes_sectores_v1')
                    ON CONFLICT (clave) DO NOTHING;", conexion);
                actualizarSectores.ExecuteNonQuery();
            }
        }

        public List<Cliente> Listar()
        {
            var lista = new List<Cliente>();

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTablaYSemilla(conexion);

            using var comando = new NpgsqlCommand(@"
                SELECT id_cliente, nombre_cliente, sector, rfc_cliente, telefono, correo, tiene_descuento, fecha_alta
                FROM clientes
                ORDER BY nombre_cliente ASC;", conexion);

            using var lector = comando.ExecuteReader();
            while (lector.Read())
            {
                lista.Add(Mapear(lector));
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

            string sectorLimpio = NormalizarSector(datos.Sector);
            string? rfcLimpio = string.IsNullOrWhiteSpace(datos.RfcCliente) ? null : datos.RfcCliente.Trim().ToUpperInvariant();
            string? telefonoLimpio = string.IsNullOrWhiteSpace(datos.Telefono) ? null : datos.Telefono.Trim();
            string? correoLimpio = string.IsNullOrWhiteSpace(datos.Correo) ? null : datos.Correo.Trim();

            if (rfcLimpio != null && rfcLimpio.Length > 20)
                throw new ArgumentException("El RFC no puede exceder 20 caracteres.");
            if (telefonoLimpio != null && telefonoLimpio.Length > 30)
                throw new ArgumentException("El teléfono no puede exceder 30 caracteres.");
            if (correoLimpio != null && correoLimpio.Length > 150)
                throw new ArgumentException("El correo no puede exceder 150 caracteres.");

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTablaYSemilla(conexion);

            // si el cliente ya existe por nombre, completa datos faltantes y lo devuelve sin duplicar
            int? idExistente = null;
            using (var buscar = new NpgsqlCommand(@"
                SELECT id_cliente FROM clientes
                WHERE LOWER(TRIM(nombre_cliente)) = LOWER(@nombre_cliente)
                LIMIT 1;", conexion))
            {
                buscar.Parameters.AddWithValue("nombre_cliente", nombreLimpio);
                object? enc = buscar.ExecuteScalar();
                if (enc != null) idExistente = Convert.ToInt32(enc);
            }

            if (idExistente != null)
            {
                using var completar = new NpgsqlCommand(@"
                    UPDATE clientes
                    SET sector = CASE WHEN (sector IS NULL OR sector = 'Otro') AND @sector <> 'Otro' THEN @sector ELSE COALESCE(sector, 'Otro') END,
                        rfc_cliente = COALESCE(NULLIF(rfc_cliente, ''), @rfc_cliente),
                        telefono = COALESCE(NULLIF(telefono, ''), @telefono),
                        correo = COALESCE(NULLIF(correo, ''), @correo)
                    WHERE id_cliente = @id_cliente
                    RETURNING id_cliente, nombre_cliente, sector, rfc_cliente, telefono, correo, tiene_descuento, fecha_alta;", conexion);
                completar.Parameters.AddWithValue("id_cliente", idExistente.Value);
                completar.Parameters.AddWithValue("sector", sectorLimpio);
                completar.Parameters.AddWithValue("rfc_cliente", (object?)rfcLimpio ?? DBNull.Value);
                completar.Parameters.AddWithValue("telefono", (object?)telefonoLimpio ?? DBNull.Value);
                completar.Parameters.AddWithValue("correo", (object?)correoLimpio ?? DBNull.Value);

                using var lectorAct = completar.ExecuteReader();
                lectorAct.Read();
                return Mapear(lectorAct);
            }

            using var insertar = new NpgsqlCommand(@"
                INSERT INTO clientes (nombre_cliente, sector, rfc_cliente, telefono, correo)
                VALUES (@nombre_cliente, @sector, @rfc_cliente, @telefono, @correo)
                RETURNING id_cliente, nombre_cliente, sector, rfc_cliente, telefono, correo, tiene_descuento, fecha_alta;", conexion);

            insertar.Parameters.AddWithValue("nombre_cliente", nombreLimpio);
            insertar.Parameters.AddWithValue("sector", sectorLimpio);
            insertar.Parameters.AddWithValue("rfc_cliente", (object?)rfcLimpio ?? DBNull.Value);
            insertar.Parameters.AddWithValue("telefono", (object?)telefonoLimpio ?? DBNull.Value);
            insertar.Parameters.AddWithValue("correo", (object?)correoLimpio ?? DBNull.Value);

            using var lector = insertar.ExecuteReader();
            lector.Read();
            return Mapear(lector);
        }

        public Cliente? Actualizar(int id_cliente, ClienteRequestDTO datos)
        {
            if (string.IsNullOrWhiteSpace(datos.NombreCliente))
                throw new ArgumentException("El nombre del cliente (nombre_cliente) es obligatorio.");

            string nombreLimpio = datos.NombreCliente.Trim();
            if (nombreLimpio.Length > 150)
                throw new ArgumentException("El nombre del cliente no puede exceder 150 caracteres.");

            string sectorLimpio = NormalizarSector(datos.Sector);
            string? rfcLimpio = string.IsNullOrWhiteSpace(datos.RfcCliente) ? null : datos.RfcCliente.Trim().ToUpperInvariant();
            string? telefonoLimpio = string.IsNullOrWhiteSpace(datos.Telefono) ? null : datos.Telefono.Trim();
            string? correoLimpio = string.IsNullOrWhiteSpace(datos.Correo) ? null : datos.Correo.Trim();

            if (rfcLimpio != null && rfcLimpio.Length > 20)
                throw new ArgumentException("El RFC no puede exceder 20 caracteres.");
            if (telefonoLimpio != null && telefonoLimpio.Length > 30)
                throw new ArgumentException("El teléfono no puede exceder 30 caracteres.");
            if (correoLimpio != null && correoLimpio.Length > 150)
                throw new ArgumentException("El correo no puede exceder 150 caracteres.");

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTablaYSemilla(conexion);

            using var actualizar = new NpgsqlCommand(@"
                UPDATE clientes
                SET nombre_cliente = @nombre_cliente,
                    sector = @sector,
                    rfc_cliente = @rfc_cliente,
                    telefono = @telefono,
                    correo = @correo
                WHERE id_cliente = @id_cliente
                RETURNING id_cliente, nombre_cliente, sector, rfc_cliente, telefono, correo, tiene_descuento, fecha_alta;", conexion);

            actualizar.Parameters.AddWithValue("id_cliente", id_cliente);
            actualizar.Parameters.AddWithValue("nombre_cliente", nombreLimpio);
            actualizar.Parameters.AddWithValue("sector", sectorLimpio);
            actualizar.Parameters.AddWithValue("rfc_cliente", (object?)rfcLimpio ?? DBNull.Value);
            actualizar.Parameters.AddWithValue("telefono", (object?)telefonoLimpio ?? DBNull.Value);
            actualizar.Parameters.AddWithValue("correo", (object?)correoLimpio ?? DBNull.Value);

            using var lector = actualizar.ExecuteReader();
            return lector.Read() ? Mapear(lector) : null;
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

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'proyectos_venta' AND column_name = 'id_cliente'
                    ) THEN
                        UPDATE proyectos_venta SET id_cliente = NULL WHERE id_cliente = " + id_cliente + @";
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

        private static Cliente Mapear(NpgsqlDataReader lector)
        {
            return new Cliente
            {
                IdCliente = lector.GetInt32(0),
                NombreCliente = lector.GetString(1),
                Sector = lector.IsDBNull(2) ? "Otro" : lector.GetString(2),
                RfcCliente = lector.IsDBNull(3) ? null : lector.GetString(3),
                Telefono = lector.IsDBNull(4) ? null : lector.GetString(4),
                Correo = lector.IsDBNull(5) ? null : lector.GetString(5),
                TieneDescuento = !lector.IsDBNull(6) && lector.GetBoolean(6),
                FechaAlta = lector.IsDBNull(7) ? DateTime.Now : lector.GetDateTime(7)
            };
        }
    }
}
