using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LuxmanErp.Models;
using LuxmanErp.Services;

namespace LuxmanErp.Controllers
{
    public class ProcesarMemebreteRequest
    {
        public string Mensaje { get; set; } = "";
        // id del ultimo PDF de la conversacion; se usa para las correcciones
        public string? IdDocumentoActual { get; set; }
    }

    [ApiController]
    [Route("api/memebretes")]
    public class MemebreteController : ControllerBase
    {
        private readonly MemebretePdfService _pdf;
        private readonly MemebreteRepository _repo;

        public MemebreteController(MemebretePdfService pdf, MemebreteRepository repo)
        {
            _pdf = pdf;
            _repo = repo;
        }

        // POST api/memebretes/procesar
        // Un solo endpoint para el chat: genera un PDF nuevo o aplica una correccion
        [HttpPost("procesar")]
        public async Task<IActionResult> Procesar([FromBody] ProcesarMemebreteRequest req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.Mensaje))
                return BadRequest("Escribe el texto de la cotización.");

            try
            {
                string textoFinal = req.Mensaje;
                string mensajeIa;
                bool corregido = false;

                if (TextoCotizacionParser.EsCorreccion(req.Mensaje))
                {
                    if (string.IsNullOrWhiteSpace(req.IdDocumentoActual))
                        return BadRequest("Primero genera un PDF para poder corregirlo.");

                    var actual = await _repo.ObtenerAsync(req.IdDocumentoActual);
                    if (actual == null)
                        return NotFound("No encontré el documento a corregir.");

                    var correccion = TextoCotizacionParser.AplicarCorreccion(actual.TextoOriginal, req.Mensaje);
                    if (!correccion.Aplicada)
                        return UnprocessableEntity(correccion.Mensaje);

                    textoFinal = correccion.TextoNuevo;
                    mensajeIa = correccion.Mensaje;
                    corregido = true;
                }
                else
                {
                    mensajeIa = "Listo, aquí está tu cotización en PDF. Los textos son editables directamente sobre el documento.";
                }

                var contenido = TextoCotizacionParser.Parsear(textoFinal);
                DateTime fecha = MemebretePdfService.AhoraMexico();
                byte[] bytes = _pdf.Generar(contenido, fecha);

                var guardado = await _repo.GuardarAsync(new MemebretePdf
                {
                    Fecha = DateTime.UtcNow,
                    NombreCliente = contenido.NombreCliente,
                    Archivo = bytes,
                    TextoOriginal = textoFinal
                });

                return Ok(new
                {
                    id = guardado.Id,
                    nombreCliente = guardado.NombreCliente,
                    fecha = guardado.Fecha,
                    nombreArchivo = NombreArchivo(guardado.NombreCliente, fecha),
                    corregido,
                    mensaje = mensajeIa
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Error al generar el PDF: " + ex.Message);
            }
        }

        // GET api/memebretes  -> historial (sin binarios)
        [HttpGet]
        public async Task<IActionResult> Historial()
        {
            try
            {
                return Ok(await _repo.ListarAsync());
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Error al consultar el historial: " + ex.Message);
            }
        }

        // GET api/memebretes/{id}/pdf[?descargar=true]
        [HttpGet("{id}/pdf")]
        public async Task<IActionResult> ObtenerPdf(string id, [FromQuery] bool descargar = false)
        {
            try
            {
                var doc = await _repo.ObtenerAsync(id);
                if (doc == null) return NotFound("No existe ese documento.");

                string nombre = NombreArchivo(doc.NombreCliente, doc.Fecha.ToLocalTime());
                return descargar
                    ? File(doc.Archivo, "application/pdf", nombre)
                    : File(doc.Archivo, "application/pdf");
            }
            catch (FormatException)
            {
                return NotFound("Identificador inválido.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Error al obtener el PDF: " + ex.Message);
            }
        }

        private static string NombreArchivo(string cliente, DateTime fecha)
        {
            string limpio = new string(cliente.Where(c => char.IsLetterOrDigit(c) || c == ' ').ToArray())
                .Trim().Replace(' ', '_');
            if (limpio.Length == 0) limpio = "Cliente";
            return $"Cotizacion_{limpio}_{fecha:yyyyMMdd}.pdf";
        }
    }
}
