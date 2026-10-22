using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LuxmanErp.Models;
using LuxmanErp.Services;

namespace LuxmanErp.Controllers
{
    // datos que manda el chat desde el front
    public class PeticionMemebrete
    {
        public string Mensaje { get; set; } = "";
        public string? IdDocumentoActual { get; set; }
    }

    [ApiController]
    [Route("api/memebretes")]
    public class MemebreteController : ControllerBase
    {
        private readonly MemebretePdfService servicioPdf;
        private readonly MemebreteRepository repositorio;

        public MemebreteController(MemebretePdfService servicioPdf, MemebreteRepository repositorio)
        {
            this.servicioPdf = servicioPdf;
            this.repositorio = repositorio;
        }

        // recibe el mensaje del chat, revisa si es correccion o texto nuevo y arma el pdf
        [HttpPost("procesar")]
        public async Task<IActionResult> Procesar([FromBody] PeticionMemebrete peticion)
        {
            if (peticion == null || string.IsNullOrWhiteSpace(peticion.Mensaje))
                return BadRequest("Escribe el texto de la cotización.");

            try
            {
                string textoFinal = peticion.Mensaje;
                string respuestaChat = "Listo, aquí está tu cotización en PDF. Los textos son editables directamente sobre el documento.";
                bool fueCorregido = false;

                // checamos si el usuario pidio corregir algo del documento anterior
                if (TextoCotizacionParser.EsCorreccion(peticion.Mensaje))
                {
                    if (string.IsNullOrWhiteSpace(peticion.IdDocumentoActual))
                        return BadRequest("Primero genera un PDF para poder corregirlo.");

                    var docAnterior = await repositorio.ObtenerAsync(peticion.IdDocumentoActual);
                    if (docAnterior == null)
                        return NotFound("No encontré el documento a corregir.");

                    var resultadoCorreccion = TextoCotizacionParser.AplicarCorreccion(docAnterior.TextoOriginal, peticion.Mensaje);
                    if (!resultadoCorreccion.Aplicada)
                        return UnprocessableEntity(resultadoCorreccion.Mensaje);

                    textoFinal = resultadoCorreccion.TextoNuevo;
                    respuestaChat = resultadoCorreccion.Mensaje;
                    fueCorregido = true;
                }

                var datosTexto = TextoCotizacionParser.Parsear(textoFinal);
                DateTime fechaActual = MemebretePdfService.AhoraMexico();
                byte[] bytesPdf = servicioPdf.Generar(datosTexto, fechaActual);

                var docGuardado = await repositorio.GuardarAsync(new MemebretePdf
                {
                    Fecha = DateTime.UtcNow,
                    NombreCliente = datosTexto.NombreCliente,
                    Archivo = bytesPdf,
                    TextoOriginal = textoFinal
                });

                return Ok(new
                {
                    id = docGuardado.Id,
                    nombreCliente = docGuardado.NombreCliente,
                    fecha = docGuardado.Fecha,
                    nombreArchivo = ArmarNombreArchivo(docGuardado.NombreCliente, fechaActual),
                    corregido = fueCorregido,
                    mensaje = respuestaChat
                });
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al generar el PDF: " + error.Message);
            }
        }

        // devuelve la lista de documentos guardados en mongo
        [HttpGet]
        public async Task<IActionResult> Historial()
        {
            try
            {
                return Ok(await repositorio.ListarAsync());
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al consultar el historial: " + error.Message);
            }
        }

        // devuelve el archivo pdf por su id de mongo
        [HttpGet("{id}/pdf")]
        public async Task<IActionResult> ObtenerPdf(string id, [FromQuery] bool descargar = false)
        {
            try
            {
                var documento = await repositorio.ObtenerAsync(id);
                if (documento == null) return NotFound("No existe ese documento.");

                string nombre = ArmarNombreArchivo(documento.NombreCliente, documento.Fecha.ToLocalTime());
                return descargar
                    ? File(documento.Archivo, "application/pdf", nombre)
                    : File(documento.Archivo, "application/pdf");
            }
            catch (FormatException)
            {
                return NotFound("Identificador inválido.");
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al obtener el PDF: " + error.Message);
            }
        }

        private static string ArmarNombreArchivo(string cliente, DateTime fecha)
        {
            string limpio = new string(cliente.Where(c => char.IsLetterOrDigit(c) || c == ' ').ToArray())
                .Trim().Replace(' ', '_');
            if (limpio.Length == 0) limpio = "Cliente";
            return $"Cotizacion_{limpio}_{fecha:yyyyMMdd}.pdf";
        }
    }
}
