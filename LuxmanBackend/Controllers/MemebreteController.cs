using System;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LuxmanErp.Models;
using LuxmanErp.Services;

namespace LuxmanErp.Controllers
{
    public class RespuestaMensajeDTO
    {
        [JsonPropertyName("mensaje")]
        public string Mensaje { get; set; } = "";
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

        // Recibe el mensaje del chat, revisa si es corrección o texto nuevo y arma el pdf
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

                // Checamos si el usuario pidió corregir algo del documento anterior
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
                    FechaCreacion = DateTime.UtcNow,
                    NombreCliente = datosTexto.NombreCliente,
                    ArchivoPdf = bytesPdf,
                    TextoOriginal = textoFinal
                });

                return Ok(new RespuestaMemebreteDTO
                {
                    IdDocumento = docGuardado.IdDocumento,
                    NombreCliente = docGuardado.NombreCliente,
                    FechaCreacion = docGuardado.FechaCreacion,
                    NombreArchivo = ArmarNombreArchivo(docGuardado.NombreCliente, fechaActual),
                    Corregido = fueCorregido,
                    Mensaje = respuestaChat
                });
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al generar el PDF: " + error.Message);
            }
        }

        // Devuelve la lista de documentos activos guardados en mongo
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

        // Devuelve el archivo pdf por su id de mongo
        [HttpGet("{id_documento}/pdf")]
        public async Task<IActionResult> ObtenerPdf(string id_documento, [FromQuery] bool descargar = false)
        {
            try
            {
                var documento = await repositorio.ObtenerAsync(id_documento);
                if (documento == null) return NotFound("No existe ese documento.");

                string nombre = ArmarNombreArchivo(documento.NombreCliente, documento.FechaCreacion.ToLocalTime());
                return descargar
                    ? File(documento.ArchivoPdf, "application/pdf", nombre)
                    : File(documento.ArchivoPdf, "application/pdf");
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

        // Mueve una cotización a la papelera (Soft Delete)
        [HttpDelete("{id_documento}")]
        public async Task<IActionResult> MoverAPapelera(string id_documento)
        {
            try
            {
                bool exito = await repositorio.MoverAPapeleraAsync(id_documento);
                if (!exito) return NotFound("No se encontró el documento especificado.");
                return Ok(new RespuestaMensajeDTO { Mensaje = "Cotización movida a la papelera." });
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al mover a la papelera: " + error.Message);
            }
        }

        // Lista los documentos que están en la papelera
        [HttpGet("papelera")]
        public async Task<IActionResult> ListarPapelera()
        {
            try
            {
                return Ok(await repositorio.ListarPapeleraAsync());
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al consultar la papelera: " + error.Message);
            }
        }

        // Restaura un documento desde la papelera al historial activo
        [HttpPost("{id_documento}/restaurar")]
        public async Task<IActionResult> Restaurar(string id_documento)
        {
            try
            {
                bool exito = await repositorio.RestaurarAsync(id_documento);
                if (!exito) return NotFound("No se encontró el documento especificado en la papelera.");
                return Ok(new RespuestaMensajeDTO { Mensaje = "Cotización restaurada exitosamente." });
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al restaurar la cotización: " + error.Message);
            }
        }

        // Elimina definitivamente un documento de la base de datos
        [HttpDelete("{id_documento}/permanente")]
        public async Task<IActionResult> EliminarPermanente(string id_documento)
        {
            try
            {
                bool exito = await repositorio.EliminarPermanenteAsync(id_documento);
                if (!exito) return NotFound("No se encontró el documento a eliminar.");
                return Ok(new RespuestaMensajeDTO { Mensaje = "Cotización eliminada permanentemente." });
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al eliminar la cotización: " + error.Message);
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
