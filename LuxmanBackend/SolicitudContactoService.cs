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
                VALUES (@nombre, @empresa, @correo, @telefono, @tipo_equipo, @mensaje)
                RETURNING id_solicitud;", conexion);

            comando.Parameters.AddWithValue("nombre", datos.Nombre!.Trim());
            comando.Parameters.AddWithValue("empresa", (object?)datos.Empresa?.Trim() ?? DBNull.Value);
            comando.Parameters.AddWithValue("correo", datos.Correo!.Trim());
            comando.Parameters.AddWithValue("telefono", datos.Telefono!.Trim());
            comando.Parameters.AddWithValue("tipo_equipo", (object?)datos.TipoEquipo?.Trim() ?? DBNull.Value);
            comando.Parameters.AddWithValue("mensaje", (object?)datos.Mensaje?.Trim() ?? DBNull.Value);

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
                    IdSolicitud = lector.GetInt32(0),
                    Nombre = lector.GetString(1),
                    Empresa = lector.IsDBNull(2) ? null : lector.GetString(2),
                    Correo = lector.GetString(3),
                    Telefono = lector.GetString(4),
                    TipoEquipo = lector.IsDBNull(5) ? null : lector.GetString(5),
                    Mensaje = lector.IsDBNull(6) ? null : lector.GetString(6),
                    Atendida = !lector.IsDBNull(7) && lector.GetBoolean(7),
                    FechaCreacion = lector.GetDateTime(8)
                });
            }
            return lista;
        }

        // marca o desmarca una solicitud como atendida
        public bool MarcarAtendida(int id_solicitud, bool atendida)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var comando = new NpgsqlCommand(
                "UPDATE solicitudes_contacto SET atendida = @atendida WHERE id_solicitud = @id_solicitud;", conexion);
            comando.Parameters.AddWithValue("atendida", atendida);
            comando.Parameters.AddWithValue("id_solicitud", id_solicitud);
            return comando.ExecuteNonQuery() > 0;
        }
    }
}
