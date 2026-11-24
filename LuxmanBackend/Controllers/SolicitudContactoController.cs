using System;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using LuxmanErp.Models;
using LuxmanErp.Services;

namespace LuxmanErp.Controllers
{
    [ApiController]
    [Route("api/solicitudes")]
    public class SolicitudContactoController : ControllerBase
    {
        private readonly SolicitudContactoService servicio;
        private readonly AdminAuthService auth;

        public SolicitudContactoController(SolicitudContactoService servicio, AdminAuthService auth)
        {
            this.servicio = servicio;
            this.auth = auth;
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

        public class MarcarAtendidaDTO
        {
            public bool atendida { get; set; }
        }

        [HttpPatch("{id}/atendida")]
        public IActionResult MarcarAtendida(int id, [FromBody] MarcarAtendidaDTO datos,
            [FromHeader(Name = "X-Admin-Token")] string? token)
        {
            if (!auth.TokenValido(token))
                return Unauthorized("Sesión no válida.");

            try
            {
                return servicio.MarcarAtendida(id, datos.atendida) ? NoContent() : NotFound();
            }
            catch (Exception)
            {
                return StatusCode(500, "No se pudo actualizar la solicitud.");
            }
        }

        // recibe el formulario de la landing page
        [HttpPost]
        public IActionResult Crear([FromBody] SolicitudContactoDTO datos)
        {
            if (datos == null)
                return BadRequest("No llegaron los datos del formulario.");

            if (string.IsNullOrWhiteSpace(datos.nombre) || datos.nombre.Length > 150)
                return BadRequest("El nombre es obligatorio.");

            if (string.IsNullOrWhiteSpace(datos.correo) || datos.correo.Length > 150
                || !Regex.IsMatch(datos.correo, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                return BadRequest("El correo no es válido.");

            if (string.IsNullOrWhiteSpace(datos.telefono) || datos.telefono.Length > 30
                || Regex.Replace(datos.telefono, @"\D", "").Length < 8)
                return BadRequest("El teléfono no es válido.");

            if ((datos.empresa?.Length ?? 0) > 150 || (datos.tipoEquipo?.Length ?? 0) > 100
                || (datos.mensaje?.Length ?? 0) > 2000)
                return BadRequest("Alguno de los campos excede la longitud permitida.");

            try
            {
                int id = servicio.Guardar(datos);
                return Ok(new { idSolicitud = id });
            }
            catch (Exception)
            {
                return StatusCode(500, "No se pudo guardar tu solicitud. Intenta de nuevo más tarde.");
            }
        }
    }
}
