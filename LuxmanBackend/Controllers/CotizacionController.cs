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
        // metemos los servicios por el constructor, inyeccion de dependencias
        // basica, nada de interfaces de mas porque solo tenemos una implementacion
        private readonly CotizacionService _cotizacionService;
        private readonly PdfService _pdfService;

        public CotizacionController(CotizacionService cotizacionService, PdfService pdfService)
        {
            _cotizacionService = cotizacionService;
            _pdfService = pdfService;
        }

        // ===============================================================
        // POST api/cotizacion
        // Este es el endpoint principal, recibe los datos del formulario
        // de React y crea la cotizacion en la base de datos
        // ===============================================================
        [HttpPost]
        public IActionResult CrearCotizacion([FromBody] CotizacionRequestDTO datosCotizacion)
        {
            // primero validamos que no venga vacio o con datos raros
            if (datosCotizacion == null)
            {
                return BadRequest("No llegaron datos de la cotizacion");
            }

            if (datosCotizacion.litrosTanque <= 0)
            {
                return BadRequest("Los litros del tanque tienen que ser mayor a cero, revisa el formulario");
            }

            // switch basico nada mas para checar que el tipo de acero venga bien
            // antes de mandarlo a la base de datos
            bool tipoAceroValido = false;
            switch (datosCotizacion.tipoAcero)
            {
                case "304":
                    tipoAceroValido = true;
                    break;
                case "316":
                    tipoAceroValido = true;
                    break;
                default:
                    tipoAceroValido = false;
                    break;
            }

            if (tipoAceroValido == false)
            {
                return BadRequest("El tipo de acero solo puede ser 304 o 316");
            }

            // aqui si ya mandamos a crear la cotizacion, la funcion de PL/Python
            // en la base de datos hace la chamba de calcular el precio
            Cotizacion cotizacionNueva;
            try
            {
                cotizacionNueva = _cotizacionService.CrearCotizacion(datosCotizacion);
            }
            catch (Exception ex)
            {
                // aqui atrapamos cualquier error que truene de la base de datos
                // TODO: mejorar este manejo de errores, esta muy basico todavia
                return StatusCode(500, "Error al crear la cotizacion: " + ex.Message);
            }

            return Ok(cotizacionNueva);
        }

        // ===============================================================
        // GET api/cotizacion/cliente/5
        // Trae todas las cotizaciones de un cliente en especifico
        // ===============================================================
        [HttpGet("cliente/{idCliente}")]
        public IActionResult ObtenerPorCliente(int idCliente)
        {
            var listaCotizaciones = _cotizacionService.ObtenerCotizacionesPorCliente(idCliente);
            return Ok(listaCotizaciones);
        }

        // ===============================================================
        // GET api/cotizacion/5/pdf
        // Genera y descarga el PDF de una cotizacion (metodo mock/demo
        // para mostrar como se conecta el PdfService)
        // ===============================================================
        [HttpGet("{idCotizacion}/pdf")]
        public IActionResult DescargarPdf(int idCotizacion)
        {
            // OJO: esto es un mock nada mas para mostrar la estructura,
            // en la version final aqui habria que consultar la cotizacion real
            // de la base de datos usando el idCotizacion
            Cotizacion cotizacionDeEjemplo = new Cotizacion
            {
                idCotizacion = idCotizacion,
                litrosTanque = 1000,
                tipoAcero = "316",
                tieneAgitacion = true,
                precioBase = 68750.00m,
                precioFinal = 77250.00m,
                fechaCreacion = DateTime.Now
            };

            byte[] pdfBytes = _pdfService.GenerarPdfCotizacion(cotizacionDeEjemplo, "Cliente de Ejemplo SA de CV");

            // regresamos el pdf como archivo descargable
            return File(pdfBytes, "application/pdf", $"cotizacion_{idCotizacion}.pdf");
        }
    }
}
