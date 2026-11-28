using System;
using Microsoft.AspNetCore.Mvc;
using LuxmanErp.Models;
using LuxmanErp.Services;

namespace LuxmanErp.Controllers
{
    [ApiController]
    [Route("api/proyectos_venta")]
    public class ProyectoVentaController : ControllerBase
    {
        private readonly ProyectoVentaService servicioProyectos;
        private readonly FacturaPdfService servicioFacturaPdf;

        public ProyectoVentaController(
            ProyectoVentaService servicioProyectos,
            FacturaPdfService servicioFacturaPdf)
        {
            this.servicioProyectos = servicioProyectos;
            this.servicioFacturaPdf = servicioFacturaPdf;
        }

        [HttpGet]
        public IActionResult Listar()
        {
            try
            {
                return Ok(servicioProyectos.Listar(eliminados: false));
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al consultar los proyectos de venta: " + error.Message);
            }
        }

        [HttpGet("papelera")]
        public IActionResult ListarPapelera()
        {
            try
            {
                return Ok(servicioProyectos.Listar(eliminados: true));
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al consultar la papelera de proyectos: " + error.Message);
            }
        }

        // endpoint publico sin autenticacion (solo expone folio, proyecto, etapa y fecha estimada)
        [HttpGet("seguimiento/{folio}")]
        public IActionResult SeguimientoPublico(string folio)
        {
            try
            {
                var info = servicioProyectos.ObtenerSeguimientoPublico(folio);
                if (info == null)
                    return NotFound("No se encontró ningún proyecto activo con ese folio.");
                return Ok(info);
            }
            catch (Exception)
            {
                return StatusCode(500, "No se pudo consultar el seguimiento del proyecto.");
            }
        }

        [HttpPost]
        public IActionResult Crear([FromBody] ProyectoVentaRequestDTO datos)
        {
            if (datos == null)
                return BadRequest("No se recibieron los datos del proyecto.");

            try
            {
                var creado = servicioProyectos.Crear(datos);
                return Ok(creado);
            }
            catch (ArgumentException errorValidacion)
            {
                return BadRequest(errorValidacion.Message);
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al crear el proyecto: " + error.Message);
            }
        }

        [HttpPatch("{id_proyecto}/cerrar-venta")]
        public IActionResult CerrarVenta(int id_proyecto, [FromBody] CerrarVentaProyectoDTO datos)
        {
            if (datos == null)
                return BadRequest("No se recibieron los datos del cierre de venta.");

            try
            {
                var actualizado = servicioProyectos.CerrarVenta(id_proyecto, datos);
                if (actualizado == null)
                    return NotFound("No se encontró el proyecto especificado.");
                return Ok(actualizado);
            }
            catch (ArgumentException errorValidacion)
            {
                return BadRequest(errorValidacion.Message);
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al procesar el cierre de venta: " + error.Message);
            }
        }

        [HttpPatch("{id_proyecto}/facturar")]
        public IActionResult Facturar(int id_proyecto, [FromBody] FacturarProyectoDTO datos)
        {
            if (datos == null)
                return BadRequest("No se recibieron los datos fiscales para facturar.");

            try
            {
                var facturado = servicioProyectos.Facturar(id_proyecto, datos);
                if (facturado == null)
                    return NotFound("No se encontró el proyecto especificado.");
                return Ok(facturado);
            }
            catch (ArgumentException errorValidacion)
            {
                return BadRequest(errorValidacion.Message);
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al generar la facturación del proyecto: " + error.Message);
            }
        }

        [HttpGet("{id_proyecto}/factura-pdf")]
        public IActionResult DescargarFacturaPdf(int id_proyecto)
        {
            try
            {
                var proyecto = servicioProyectos.ObtenerPorId(id_proyecto);
                if (proyecto == null)
                    return NotFound("No se encontró el proyecto especificado.");

                if (string.IsNullOrWhiteSpace(proyecto.EstadoFacturacion) ||
                    string.Equals(proyecto.EstadoFacturacion, "PENDIENTE", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest("Este proyecto aún no ha sido facturado.");
                }

                byte[] bytesPdf = servicioFacturaPdf.GenerarPdfFactura(proyecto);
                string nombreArchivo = string.IsNullOrWhiteSpace(proyecto.FolioFactura)
                    ? $"Factura_{proyecto.CodigoFolio}.pdf"
                    : $"{proyecto.FolioFactura}.pdf";

                return File(bytesPdf, "application/pdf", nombreArchivo);
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al generar el PDF de la factura: " + error.Message);
            }
        }

        [HttpPatch("{id_proyecto}/etapa")]
        public IActionResult ActualizarEtapa(int id_proyecto, [FromBody] ActualizarEtapaProyectoDTO datos)
        {
            if (datos == null)
                return BadRequest("No se recibió la etapa de fabricación.");

            try
            {
                var actualizado = servicioProyectos.ActualizarEtapa(id_proyecto, datos.EtapaFabricacion);
                if (actualizado == null)
                    return NotFound("No se encontró el proyecto especificado.");
                return Ok(actualizado);
            }
            catch (ArgumentException errorValidacion)
            {
                return BadRequest(errorValidacion.Message);
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al actualizar la etapa de fabricación: " + error.Message);
            }
        }

        [HttpPatch("{id_proyecto}/eliminar")]
        public IActionResult MoverAPapelera(int id_proyecto)
        {
            try
            {
                bool exito = servicioProyectos.MoverAPapelera(id_proyecto);
                if (!exito)
                    return NotFound("No se encontró el proyecto especificado.");
                return Ok(new RespuestaMensajeDTO { Mensaje = "Proyecto movido a la papelera." });
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al mover el proyecto a la papelera: " + error.Message);
            }
        }

        [HttpPatch("{id_proyecto}/restaurar")]
        public IActionResult Restaurar(int id_proyecto)
        {
            try
            {
                var restaurado = servicioProyectos.Restaurar(id_proyecto);
                if (restaurado == null)
                    return NotFound("No se encontró el proyecto en la papelera.");
                return Ok(restaurado);
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al restaurar el proyecto: " + error.Message);
            }
        }

        [HttpDelete("{id_proyecto}")]
        public IActionResult EliminarDefinitivo(int id_proyecto)
        {
            try
            {
                bool exito = servicioProyectos.EliminarDefinitivo(id_proyecto);
                if (!exito)
                    return NotFound("No se encontró el proyecto a eliminar.");
                return Ok(new RespuestaMensajeDTO { Mensaje = "Proyecto eliminado permanentemente." });
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al eliminar el proyecto: " + error.Message);
            }
        }
    }
}
