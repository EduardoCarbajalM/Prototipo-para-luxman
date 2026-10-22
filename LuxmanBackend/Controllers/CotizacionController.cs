using System;
using Microsoft.AspNetCore.Mvc;
using LuxmanErp.Models;
using LuxmanErp.Services;

namespace LuxmanErp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CotizacionController : ControllerBase
    {
        private readonly CotizacionService servicioCotizacion;
        private readonly PdfService servicioPdf;

        public CotizacionController(CotizacionService servicioCotizacion, PdfService servicioPdf)
        {
            this.servicioCotizacion = servicioCotizacion;
            this.servicioPdf = servicioPdf;
        }

        // endpoint para guardar la cotizacion que mandan desde react
        [HttpPost]
        public IActionResult CrearCotizacion([FromBody] CotizacionRequestDTO datos)
        {
            if (datos == null)
                return BadRequest("No llegaron los datos de la cotización.");

            if (datos.litrosTanque <= 0)
                return BadRequest("Los litros del tanque tienen que ser mayores a cero.");

            if (datos.tipoAcero != "304" && datos.tipoAcero != "316")
                return BadRequest("El tipo de acero solo puede ser 304 o 316.");

            try
            {
                var nueva = servicioCotizacion.CrearCotizacion(datos);
                return Ok(nueva);
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al crear la cotización: " + error.Message);
            }
        }

        // obtiene el historial de cotizaciones de un cliente
        [HttpGet("cliente/{idCliente}")]
        public IActionResult ObtenerPorCliente(int idCliente)
        {
            return Ok(servicioCotizacion.ObtenerCotizacionesPorCliente(idCliente));
        }

        // genera y regresa el archivo pdf de la cotizacion
        [HttpGet("{idCotizacion}/pdf")]
        public IActionResult DescargarPdf(int idCotizacion)
        {
            try
            {
                var (cotizacion, nombreCliente) = servicioCotizacion.ObtenerCotizacionPorId(idCotizacion);
                if (cotizacion == null)
                    return NotFound($"No existe la cotización #{idCotizacion}");

                byte[] archivoPdf = servicioPdf.GenerarPdfCotizacion(cotizacion, nombreCliente);
                return File(archivoPdf, "application/pdf", $"Cotizacion_Luxman_COT-{idCotizacion:D5}.pdf");
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error con el PDF de la cotización: " + error.Message);
            }
        }
    }
}
