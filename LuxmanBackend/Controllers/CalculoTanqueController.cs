using System;
using Microsoft.AspNetCore.Mvc;
using LuxmanErp.Models;
using LuxmanErp.Services;

namespace LuxmanErp.Controllers
{
    [ApiController]
    [Route("api/calculos_tanques")]
    public class CalculoTanqueController : ControllerBase
    {
        private readonly CalculoTanqueService servicioCalculos;
        private readonly CalculoTanquePdfService servicioPdf;

        public CalculoTanqueController(CalculoTanqueService servicioCalculos, CalculoTanquePdfService servicioPdf)
        {
            this.servicioCalculos = servicioCalculos;
            this.servicioPdf = servicioPdf;
        }

        // devuelve el historial de medidas guardadas por el director
        [HttpGet]
        public IActionResult Listar()
        {
            try
            {
                return Ok(servicioCalculos.Listar());
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al consultar el historial de medidas: " + error.Message);
            }
        }

        // guarda las medidas geometricas y el calculo de hojas comerciales en postgres
        [HttpPost]
        public IActionResult Guardar([FromBody] CalculoTanqueRequestDTO datos)
        {
            if (datos == null)
                return BadRequest("No se recibieron los datos del cálculo.");

            try
            {
                var guardado = servicioCalculos.Guardar(datos);
                return Ok(guardado);
            }
            catch (ArgumentException errorValidacion)
            {
                return BadRequest(errorValidacion.Message);
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al guardar las medidas: " + error.Message);
            }
        }

        // genera y descarga la ficha tecnica de medidas y desarrollo de lamina en pdf
        [HttpGet("{id_calculo}/pdf")]
        public IActionResult DescargarPdf(int id_calculo)
        {
            try
            {
                var calculo = servicioCalculos.ObtenerPorId(id_calculo);
                if (calculo == null)
                    return NotFound($"No existe el registro de medidas #{id_calculo}.");

                byte[] bytesPdf = servicioPdf.GenerarPdfMedidas(calculo);
                return File(bytesPdf, "application/pdf", $"Ficha_Medidas_Luxman_CALC-{id_calculo:D5}.pdf");
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al generar el PDF de medidas: " + error.Message);
            }
        }
    }
}
