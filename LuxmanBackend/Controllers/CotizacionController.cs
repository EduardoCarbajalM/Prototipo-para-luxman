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

        // endpoint para guardar la cotizacion tecnica que manda el panel de ingenieria
        [HttpPost]
        public IActionResult CrearCotizacion([FromBody] CotizacionRequestDTO datos)
        {
            if (datos == null)
                return BadRequest("No llegaron los datos de la cotización.");

            if (datos.RadioM <= 0)
                return BadRequest("El radio del tanque (radio_m) tiene que ser mayor a cero.");

            if (datos.LongitudM <= 0)
                return BadRequest("La longitud del tanque (longitud_m) tiene que ser mayor a cero.");

            if (CotizacionService.NormalizarTipoFondo(datos.TipoFondo) == null)
                return BadRequest("El tipo de fondo solo puede ser Plano, Cónico o Toriesférico.");

            if (datos.TipoAcero != "304" && datos.TipoAcero != "316")
                return BadRequest("El tipo de acero solo puede ser 304 o 316.");

            try
            {
                var nueva = servicioCotizacion.CrearCotizacion(datos);
                return Ok(nueva);
            }
            catch (ArgumentException errorValidacion)
            {
                return BadRequest(errorValidacion.Message);
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al crear la cotización: " + error.Message);
            }
        }

        // obtiene el historial de cotizaciones de un cliente
        [HttpGet("cliente/{id_cliente}")]
        public IActionResult ObtenerPorCliente(int id_cliente)
        {
            return Ok(servicioCotizacion.ObtenerCotizacionesPorCliente(id_cliente));
        }

        // genera y regresa el archivo pdf de la cotizacion
        [HttpGet("{id_cotizacion}/pdf")]
        public IActionResult DescargarPdf(int id_cotizacion)
        {
            try
            {
                var (cotizacion, nombreCliente) = servicioCotizacion.ObtenerCotizacionPorId(id_cotizacion);
                if (cotizacion == null)
                    return NotFound($"No existe la cotización #{id_cotizacion}");

                int numFolio = cotizacion.NumeroFolio > 0 ? cotizacion.NumeroFolio : cotizacion.IdCotizacion;
                byte[] archivoPdf = servicioPdf.GenerarPdfCotizacion(cotizacion, nombreCliente);
                return File(archivoPdf, "application/pdf", $"Cotizacion_Luxman_COT-{numFolio:D5}.pdf");
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error con el PDF de la cotización: " + error.Message);
            }
        }
    }
}
