using System;
using System.Collections.Generic;
using Npgsql;
using Microsoft.Extensions.Configuration;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // gestiona las actas de entrega logistica y actualiza automaticamente el proyecto a Entregado
    public class ActaEntregaService
    {
        private readonly string cadenaConexion;

        public ActaEntregaService(IConfiguration configuracion)
        {
            cadenaConexion = configuracion.GetConnectionString("DefaultConnection")
                ?? configuracion.GetConnectionString("LuxmanDb")
                ?? throw new InvalidOperationException("No se encontro la cadena de conexion en el appsettings.");
        }

        public static string FormatearCodigoActa(int numeroFolio, DateTime fechaEntrega)
        {
            int anio = fechaEntrega == default ? 2026 : fechaEntrega.Year;
            return $"ACT-{anio}-{Math.Max(1, numeroFolio):D3}";
        }

        public void AsegurarEsquemaInicial()
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);
        }

        public static void AsegurarTabla(NpgsqlConnection conexion)
        {
            ProyectoVentaService.AsegurarTabla(conexion);

            using var cmd = new NpgsqlCommand(@"
                CREATE TABLE IF NOT EXISTS actas_entrega (
                    id_acta          SERIAL PRIMARY KEY,
                    numero_folio     INTEGER NOT NULL DEFAULT 1,
                    id_proyecto      INTEGER REFERENCES proyectos_venta(id_proyecto) ON DELETE SET NULL,
                    nombre_receptor  VARCHAR(150) NOT NULL,
                    puesto_receptor  VARCHAR(120),
                    observaciones    TEXT,
                    firma_base64     TEXT NOT NULL,
                    fecha_entrega    TIMESTAMP DEFAULT NOW(),
                    eliminado        BOOLEAN NOT NULL DEFAULT FALSE
                );

                ALTER TABLE actas_entrega ADD COLUMN IF NOT EXISTS numero_folio INTEGER DEFAULT 1;
                ALTER TABLE actas_entrega ADD COLUMN IF NOT EXISTS id_proyecto INTEGER;
                ALTER TABLE actas_entrega ADD COLUMN IF NOT EXISTS nombre_receptor VARCHAR(150) DEFAULT '';
                ALTER TABLE actas_entrega ADD COLUMN IF NOT EXISTS puesto_receptor VARCHAR(120);
                ALTER TABLE actas_entrega ADD COLUMN IF NOT EXISTS observaciones TEXT;
                ALTER TABLE actas_entrega ADD COLUMN IF NOT EXISTS firma_base64 TEXT DEFAULT '';
                ALTER TABLE actas_entrega ADD COLUMN IF NOT EXISTS fecha_entrega TIMESTAMP DEFAULT NOW();
                ALTER TABLE actas_entrega ADD COLUMN IF NOT EXISTS eliminado BOOLEAN DEFAULT FALSE;

                UPDATE actas_entrega SET numero_folio = id_acta WHERE numero_folio IS NULL OR numero_folio <= 0;
                UPDATE actas_entrega SET eliminado = FALSE WHERE eliminado IS NULL;", conexion);
            cmd.ExecuteNonQuery();
        }

        private static int ObtenerMenorFolioDisponible(NpgsqlConnection conexion, NpgsqlTransaction? transaccion = null)
        {
            var ocupados = new List<int>();
            using var cmd = new NpgsqlCommand(@"
                SELECT DISTINCT numero_folio
                FROM actas_entrega
                WHERE NOT COALESCE(eliminado, FALSE) AND numero_folio > 0
                ORDER BY numero_folio ASC;", conexion, transaccion);
            using var lector = cmd.ExecuteReader();
            while (lector.Read())
            {
                ocupados.Add(lector.GetInt32(0));
            }
            return CalculoTanqueService.CalcularMenorEnteroDisponible(ocupados);
        }

        private const string SelectBase = @"
            SELECT ae.id_acta, ae.numero_folio, ae.id_proyecto,
                   pv.numero_folio AS num_folio_proy, pv.fecha_creacion AS fecha_proy,
                   pv.nombre_proyecto,
                   COALESCE(cl.nombre_cliente, pv.razon_social_facturacion, 'Sin cliente asignado') AS nombre_cliente,
                   ae.nombre_receptor, ae.puesto_receptor, ae.observaciones,
                   ae.firma_base64, ae.fecha_entrega, ae.eliminado
            FROM actas_entrega ae
            LEFT JOIN proyectos_venta pv ON pv.id_proyecto = ae.id_proyecto
            LEFT JOIN clientes cl ON cl.id_cliente = pv.id_cliente";

        public List<ActaEntrega> Listar()
        {
            var lista = new List<ActaEntrega>();

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var cmd = new NpgsqlCommand(
                SelectBase + " WHERE NOT COALESCE(ae.eliminado, FALSE) ORDER BY ae.fecha_entrega DESC, ae.id_acta DESC;",
                conexion);

            using var lector = cmd.ExecuteReader();
            while (lector.Read())
            {
                lista.Add(Mapear(lector));
            }

            return lista;
        }

        public ActaEntrega? ObtenerPorId(int id_acta)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var cmd = new NpgsqlCommand(SelectBase + " WHERE ae.id_acta = @id_acta;", conexion);
            cmd.Parameters.AddWithValue("id_acta", id_acta);

            using var lector = cmd.ExecuteReader();
            return lector.Read() ? Mapear(lector) : null;
        }

        public ActaEntrega Crear(ActaEntregaRequestDTO datos)
        {
            if (datos.IdProyecto <= 0)
                throw new ArgumentException("Selecciona un proyecto válido (id_proyecto) para registrar el acta.");

            if (string.IsNullOrWhiteSpace(datos.NombreReceptor))
                throw new ArgumentException("El nombre de quien recibe el equipo (nombre_receptor) es obligatorio.");

            if (string.IsNullOrWhiteSpace(datos.FirmaBase64) || !datos.FirmaBase64.StartsWith("data:image/"))
                throw new ArgumentException("La firma digital de recepción (firma_base64) es obligatoria.");

            string receptorLimpio = datos.NombreReceptor.Trim();
            if (receptorLimpio.Length > 150)
                throw new ArgumentException("El nombre del receptor no puede exceder 150 caracteres.");

            string? puestoLimpio = string.IsNullOrWhiteSpace(datos.PuestoReceptor)
                ? null
                : datos.PuestoReceptor.Trim();
            if (puestoLimpio != null && puestoLimpio.Length > 120)
                throw new ArgumentException("El puesto del receptor no puede exceder 120 caracteres.");

            string? observacionesLimpias = string.IsNullOrWhiteSpace(datos.Observaciones)
                ? null
                : datos.Observaciones.Trim();

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            int idActaCreada;
            using (var transaccion = conexion.BeginTransaction())
            {
                // verificamos que el proyecto exista
                using (var cmdExiste = new NpgsqlCommand(
                    "SELECT 1 FROM proyectos_venta WHERE id_proyecto = @id_proyecto AND NOT COALESCE(eliminado, FALSE);",
                    conexion, transaccion))
                {
                    cmdExiste.Parameters.AddWithValue("id_proyecto", datos.IdProyecto);
                    if (cmdExiste.ExecuteScalar() == null)
                        throw new ArgumentException("El proyecto seleccionado no existe o fue eliminado.");
                }

                int folioDisponible = ObtenerMenorFolioDisponible(conexion, transaccion);

                using (var cmdInsert = new NpgsqlCommand(@"
                    INSERT INTO actas_entrega (
                        numero_folio, id_proyecto, nombre_receptor, puesto_receptor,
                        observaciones, firma_base64, eliminado
                    )
                    VALUES (
                        @numero_folio, @id_proyecto, @nombre_receptor, @puesto_receptor,
                        @observaciones, @firma_base64, FALSE
                    )
                    RETURNING id_acta;", conexion, transaccion))
                {
                    cmdInsert.Parameters.AddWithValue("numero_folio", folioDisponible);
                    cmdInsert.Parameters.AddWithValue("id_proyecto", datos.IdProyecto);
                    cmdInsert.Parameters.AddWithValue("nombre_receptor", receptorLimpio);
                    cmdInsert.Parameters.AddWithValue("puesto_receptor", (object?)puestoLimpio ?? DBNull.Value);
                    cmdInsert.Parameters.AddWithValue("observaciones", (object?)observacionesLimpias ?? DBNull.Value);
                    cmdInsert.Parameters.AddWithValue("firma_base64", datos.FirmaBase64.Trim());

                    idActaCreada = (int)cmdInsert.ExecuteScalar()!;
                }

                // actualiza automaticamente el proyecto vinculado a la etapa final 'Entregado'
                using (var cmdActualizarProy = new NpgsqlCommand(@"
                    UPDATE proyectos_venta
                    SET etapa_fabricacion = 'Entregado'
                    WHERE id_proyecto = @id_proyecto;", conexion, transaccion))
                {
                    cmdActualizarProy.Parameters.AddWithValue("id_proyecto", datos.IdProyecto);
                    cmdActualizarProy.ExecuteNonQuery();
                }

                transaccion.Commit();
            }

            return ObtenerPorId(idActaCreada)!;
        }

        private static ActaEntrega Mapear(NpgsqlDataReader lector)
        {
            int idActa = lector.GetInt32(0);
            int numFolioActa = lector.IsDBNull(1) ? idActa : lector.GetInt32(1);
            if (numFolioActa <= 0) numFolioActa = idActa;
            DateTime fechaEntrega = lector.IsDBNull(11) ? DateTime.Now : lector.GetDateTime(11);

            string? folioProy = null;
            if (!lector.IsDBNull(3))
            {
                int numProy = lector.GetInt32(3);
                DateTime fechaProy = lector.IsDBNull(4) ? fechaEntrega : lector.GetDateTime(4);
                folioProy = ProyectoVentaService.FormatearCodigoFolio(numProy, fechaProy);
            }

            return new ActaEntrega
            {
                IdActa = idActa,
                NumeroFolio = numFolioActa,
                CodigoFolio = FormatearCodigoActa(numFolioActa, fechaEntrega),
                IdProyecto = lector.IsDBNull(2) ? null : lector.GetInt32(2),
                FolioProyecto = folioProy,
                NombreProyecto = lector.IsDBNull(5) ? null : lector.GetString(5),
                NombreCliente = lector.IsDBNull(6) ? null : lector.GetString(6),
                NombreReceptor = lector.IsDBNull(7) ? "" : lector.GetString(7),
                PuestoReceptor = lector.IsDBNull(8) ? null : lector.GetString(8),
                Observaciones = lector.IsDBNull(9) ? null : lector.GetString(9),
                FirmaBase64 = lector.IsDBNull(10) ? "" : lector.GetString(10),
                FechaEntrega = fechaEntrega,
                Eliminado = !lector.IsDBNull(12) && lector.GetBoolean(12)
            };
        }
    }
}
