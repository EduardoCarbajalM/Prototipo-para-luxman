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

        // devuelve los calculos activos (no eliminados)
        [HttpGet]
        public IActionResult Listar()
        {
            try
            {
                return Ok(servicioCalculos.Listar(eliminados: false));
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al consultar el historial de medidas: " + error.Message);
            }
        }

        // devuelve los calculos en la papelera de reciclaje
        [HttpGet("papelera")]
        public IActionResult ListarPapelera()
        {
            try
            {
                return Ok(servicioCalculos.Listar(eliminados: true));
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al consultar la papelera de medidas: " + error.Message);
            }
        }

        // guarda las medidas y materiales asignando el menor folio positivo disponible
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

        // mueve un calculo a la papelera (borrado logico)
        [HttpPatch("{id_calculo}/eliminar")]
        public IActionResult MoverAPapelera(int id_calculo)
        {
            try
            {
                bool exito = servicioCalculos.MoverAPapelera(id_calculo);
                if (!exito)
                    return NotFound("No se encontró el cálculo especificado.");
                return Ok(new RespuestaMensajeDTO { Mensaje = "Registro movido a la papelera." });
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al mover el registro a la papelera: " + error.Message);
            }
        }

        // restaura un calculo desde la papelera (reasignando folio si el anterior fue ocupado)
        [HttpPatch("{id_calculo}/restaurar")]
        public IActionResult Restaurar(int id_calculo)
        {
            try
            {
                var restaurado = servicioCalculos.Restaurar(id_calculo);
                if (restaurado == null)
                    return NotFound("No se encontró el registro en la papelera.");
                return Ok(restaurado);
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al restaurar el registro: " + error.Message);
            }
        }

        // elimina un calculo de forma permanente en postgres
        [HttpDelete("{id_calculo}")]
        public IActionResult EliminarDefinitivo(int id_calculo)
        {
            try
            {
                bool exito = servicioCalculos.EliminarDefinitivo(id_calculo);
                if (!exito)
                    return NotFound("No se encontró el registro a eliminar.");
                return Ok(new RespuestaMensajeDTO { Mensaje = "Registro eliminado permanentemente." });
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al eliminar el registro: " + error.Message);
            }
        }

        // genera y descarga la ficha tecnica de medidas y materiales en pdf
        [HttpGet("{id_calculo}/pdf")]
        public IActionResult DescargarPdf(int id_calculo)
        {
            try
            {
                var calculo = servicioCalculos.ObtenerPorId(id_calculo);
                if (calculo == null)
                    return NotFound($"No existe el registro de medidas #{id_calculo}.");

                int numFolio = calculo.NumeroFolio > 0 ? calculo.NumeroFolio : calculo.IdCalculo;
                byte[] bytesPdf = servicioPdf.GenerarPdfMedidas(calculo);
                return File(bytesPdf, "application/pdf", $"Ficha_Medidas_Luxman_CALC-{numFolio:D5}.pdf");
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al generar el PDF de medidas: " + error.Message);
            }
        }
    }
}
