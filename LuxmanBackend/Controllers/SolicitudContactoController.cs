using System;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LuxmanErp.Models;
using LuxmanErp.Services;

namespace LuxmanErp.Controllers
{
    public class RespuestaSolicitudCreadaDTO
    {
        [JsonPropertyName("id_solicitud")]
        public int IdSolicitud { get; set; }
    }

    [ApiController]
    [Route("api/solicitudes")]
    public class SolicitudContactoController : ControllerBase
    {
        private readonly SolicitudContactoService servicio;
        private readonly AdminAuthService auth;
        private readonly NotificacionCorreoService notificadorCorreo;

        public SolicitudContactoController(
            SolicitudContactoService servicio,
            AdminAuthService auth,
            NotificacionCorreoService notificadorCorreo)
        {
            this.servicio = servicio;
            this.auth = auth;
            this.notificadorCorreo = notificadorCorreo;
        }

        // solo el panel del ingeniero (con token de sesion) puede ver los datos de los interesados
        [HttpGet]
        public IActionResult Listar([FromHeader(Name = "X-Admin-Token")] string? token)
        {
            if (!auth.TokenValido(token))
                return Unauthorized("Sesión no válida.");

            try
            {
                return Ok(servicio.Listar());
            }
            catch (Exception)
            {
                return StatusCode(500, "No se pudieron consultar las solicitudes.");
            }
        }

        [HttpPatch("{id_solicitud}/atendida")]
        public IActionResult MarcarAtendida(int id_solicitud, [FromBody] MarcarAtendidaDTO datos,
            [FromHeader(Name = "X-Admin-Token")] string? token)
        {
            if (!auth.TokenValido(token))
                return Unauthorized("Sesión no válida.");

            try
            {
                return servicio.MarcarAtendida(id_solicitud, datos.Atendida) ? NoContent() : NotFound();
            }
            catch (Exception)
            {
                return StatusCode(500, "No se pudo actualizar la solicitud.");
            }
        }

        // recibe las solicitudes del asistente conversacional de la landing page
        [HttpPost]
        public IActionResult Crear([FromBody] SolicitudContactoDTO datos)
        {
            if (datos == null)
                return BadRequest("No llegaron los datos de la solicitud.");

            if (string.IsNullOrWhiteSpace(datos.Nombre) || datos.Nombre.Length > 150)
                return BadRequest("El nombre es obligatorio.");

            if (string.IsNullOrWhiteSpace(datos.Correo) || datos.Correo.Length > 150
                || !Regex.IsMatch(datos.Correo, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                return BadRequest("El correo no es válido.");

            if (string.IsNullOrWhiteSpace(datos.Telefono) || datos.Telefono.Length > 30
                || Regex.Replace(datos.Telefono, @"\D", "").Length < 8)
                return BadRequest("El teléfono no es válido.");

            if ((datos.Empresa?.Length ?? 0) > 150 || (datos.TipoEquipo?.Length ?? 0) > 100
                || (datos.Mensaje?.Length ?? 0) > 2000)
                return BadRequest("Alguno de los campos excede la longitud permitida.");

            try
            {
                int id = servicio.Guardar(datos);

                // disparo asincrono no bloqueante: nunca retrasa ni hace fallar el guardado en PostgreSQL
                _ = Task.Run(() => notificadorCorreo.EnviarNotificacionNuevaSolicitudAsync(id, datos));

                return Ok(new RespuestaSolicitudCreadaDTO { IdSolicitud = id });
            }
            catch (Exception)
            {
                return StatusCode(500, "No se pudo guardar tu solicitud. Intenta de nuevo más tarde.");
            }
        }
    }
}
