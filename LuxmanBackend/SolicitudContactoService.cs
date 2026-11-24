using System;
using System.Collections.Generic;
using Npgsql;
using Microsoft.Extensions.Configuration;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // guarda en postgres las solicitudes de contacto que llegan desde la landing page
    public class SolicitudContactoService
    {
        private readonly string cadenaConexion;

        public SolicitudContactoService(IConfiguration configuracion)
        {
            cadenaConexion = configuracion.GetConnectionString("DefaultConnection")
                ?? configuracion.GetConnectionString("LuxmanDb")
                ?? throw new InvalidOperationException("No se encontro la cadena de conexion en el appsettings.");
        }

        public int Guardar(SolicitudContactoDTO datos)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var comando = new NpgsqlCommand(@"
                INSERT INTO solicitudes_contacto (nombre, empresa, correo, telefono, tipo_equipo, mensaje)
                VALUES (@nombre, @empresa, @correo, @telefono, @tipo, @mensaje)
                RETURNING id_solicitud;", conexion);

            comando.Parameters.AddWithValue("nombre", datos.nombre!.Trim());
            comando.Parameters.AddWithValue("empresa", (object?)datos.empresa?.Trim() ?? DBNull.Value);
            comando.Parameters.AddWithValue("correo", datos.correo!.Trim());
            comando.Parameters.AddWithValue("telefono", datos.telefono!.Trim());
            comando.Parameters.AddWithValue("tipo", (object?)datos.tipoEquipo?.Trim() ?? DBNull.Value);
            comando.Parameters.AddWithValue("mensaje", (object?)datos.mensaje?.Trim() ?? DBNull.Value);

            return (int)comando.ExecuteScalar()!;
        }

        // se crea la tabla si no existe para no depender de reiniciar el volumen de la base
        private static void AsegurarTabla(NpgsqlConnection conexion)
        {
            using var crear = new NpgsqlCommand(@"
                CREATE TABLE IF NOT EXISTS solicitudes_contacto (
                    id_solicitud   SERIAL PRIMARY KEY,
                    nombre         VARCHAR(150) NOT NULL,
                    empresa        VARCHAR(150),
                    correo         VARCHAR(150) NOT NULL,
                    telefono       VARCHAR(30) NOT NULL,
                    tipo_equipo    VARCHAR(100),
                    mensaje        TEXT,
                    atendida       BOOLEAN DEFAULT FALSE,
                    fecha_creacion TIMESTAMP DEFAULT NOW()
                );", conexion);
            crear.ExecuteNonQuery();
        }

        // lista todas las solicitudes, las mas recientes primero
        public List<SolicitudContacto> Listar()
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var comando = new NpgsqlCommand(@"
                SELECT id_solicitud, nombre, empresa, correo, telefono, tipo_equipo, mensaje, atendida, fecha_creacion
                FROM solicitudes_contacto
                ORDER BY fecha_creacion DESC;", conexion);

            var lista = new List<SolicitudContacto>();
            using var lector = comando.ExecuteReader();
            while (lector.Read())
            {
                lista.Add(new SolicitudContacto
                {
                    idSolicitud = lector.GetInt32(0),
                    nombre = lector.GetString(1),
                    empresa = lector.IsDBNull(2) ? null : lector.GetString(2),
                    correo = lector.GetString(3),
                    telefono = lector.GetString(4),
                    tipoEquipo = lector.IsDBNull(5) ? null : lector.GetString(5),
                    mensaje = lector.IsDBNull(6) ? null : lector.GetString(6),
                    atendida = !lector.IsDBNull(7) && lector.GetBoolean(7),
                    fechaCreacion = lector.GetDateTime(8)
                });
            }
            return lista;
        }

        // marca o desmarca una solicitud como atendida
        public bool MarcarAtendida(int id, bool atendida)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var comando = new NpgsqlCommand(
                "UPDATE solicitudes_contacto SET atendida = @atendida WHERE id_solicitud = @id;", conexion);
            comando.Parameters.AddWithValue("atendida", atendida);
            comando.Parameters.AddWithValue("id", id);
            return comando.ExecuteNonQuery() > 0;
        }
    }
}
