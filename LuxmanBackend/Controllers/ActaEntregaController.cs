using System;
using Microsoft.AspNetCore.Mvc;
using LuxmanErp.Models;
using LuxmanErp.Services;

namespace LuxmanErp.Controllers
{
    [ApiController]
    [Route("api/actas_entrega")]
    public class ActaEntregaController : ControllerBase
    {
        private readonly ActaEntregaService servicioActas;
        private readonly ActaEntregaPdfService servicioPdf;

        public ActaEntregaController(ActaEntregaService servicioActas, ActaEntregaPdfService servicioPdf)
        {
            this.servicioActas = servicioActas;
            this.servicioPdf = servicioPdf;
        }

        [HttpGet]
        public IActionResult Listar()
        {
            try
            {
                return Ok(servicioActas.Listar());
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al consultar las actas de entrega: " + error.Message);
            }
        }

        [HttpPost]
        public IActionResult Crear([FromBody] ActaEntregaRequestDTO datos)
        {
            if (datos == null)
                return BadRequest("No se recibieron los datos del acta de entrega.");

            try
            {
                var creada = servicioActas.Crear(datos);
                return Ok(creada);
            }
            catch (ArgumentException errorValidacion)
            {
                return BadRequest(errorValidacion.Message);
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al registrar el acta de entrega: " + error.Message);
            }
        }

        [HttpGet("{id_acta}/pdf")]
        public IActionResult DescargarPdf(int id_acta)
        {
            try
            {
                var acta = servicioActas.ObtenerPorId(id_acta);
                if (acta == null)
                    return NotFound($"No existe el acta #{id_acta}.");

                byte[] bytesPdf = servicioPdf.GenerarPdfActa(acta);
                return File(bytesPdf, "application/pdf", $"Acta_Entrega_Luxman_{acta.CodigoFolio}.pdf");
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al generar el PDF del acta: " + error.Message);
            }
        }
    }
}
