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

    public class RespuestaRestaurarMemebreteDTO
    {
        [JsonPropertyName("mensaje")]
        public string Mensaje { get; set; } = "";

        [JsonPropertyName("numero_folio")]
        public int NumeroFolio { get; set; }
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

        // Recibe el mensaje del chat, revisa si es corrección o texto nuevo y arma el pdf con el menor folio libre
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

                int folioDisponible = await repositorio.ObtenerMenorFolioDisponibleAsync();
                var datosTexto = TextoCotizacionParser.Parsear(textoFinal);
                DateTime fechaActual = MemebretePdfService.AhoraMexico();
                byte[] bytesPdf = servicioPdf.Generar(datosTexto, fechaActual, folioDisponible);

                var docGuardado = await repositorio.GuardarAsync(new MemebretePdf
                {
                    NumeroFolio = folioDisponible,
                    FechaCreacion = DateTime.UtcNow,
                    NombreCliente = datosTexto.NombreCliente,
                    ArchivoPdf = bytesPdf,
                    TextoOriginal = textoFinal
                });

                return Ok(new RespuestaMemebreteDTO
                {
                    IdDocumento = docGuardado.IdDocumento,
                    NumeroFolio = docGuardado.NumeroFolio,
                    NombreCliente = docGuardado.NombreCliente,
                    FechaCreacion = docGuardado.FechaCreacion,
                    NombreArchivo = ArmarNombreArchivo(docGuardado.NumeroFolio, docGuardado.NombreCliente, fechaActual),
                    Corregido = fueCorregido,
                    Mensaje = $"{respuestaChat} (Folio MEM-{docGuardado.NumeroFolio:D5})"
                });
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al generar el PDF: " + error.Message);
            }
        }

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

        [HttpGet("{id_documento}/pdf")]
        public async Task<IActionResult> ObtenerPdf(string id_documento, [FromQuery] bool descargar = false)
        {
            try
            {
                var documento = await repositorio.ObtenerAsync(id_documento);
                if (documento == null) return NotFound("No existe ese documento.");

                string nombre = ArmarNombreArchivo(
                    Math.Max(1, documento.NumeroFolio),
                    documento.NombreCliente,
                    documento.FechaCreacion.ToLocalTime());
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

        [HttpPost("{id_documento}/restaurar")]
        public async Task<IActionResult> Restaurar(string id_documento)
        {
            try
            {
                var (exito, folioAsignado, reasignado) = await repositorio.RestaurarAsync(id_documento, servicioPdf);
                if (!exito) return NotFound("No se encontró el documento especificado en la papelera.");

                string msg = reasignado
                    ? $"Cotización restaurada con el nuevo folio disponible MEM-{folioAsignado:D5}."
                    : $"Cotización MEM-{folioAsignado:D5} restaurada exitosamente.";

                return Ok(new RespuestaRestaurarMemebreteDTO
                {
                    Mensaje = msg,
                    NumeroFolio = folioAsignado
                });
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al restaurar la cotización: " + error.Message);
            }
        }

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

        private static string ArmarNombreArchivo(int folio, string cliente, DateTime fecha)
        {
            string limpio = new string(cliente.Where(c => char.IsLetterOrDigit(c) || c == ' ').ToArray())
                .Trim().Replace(' ', '_');
            if (limpio.Length == 0) limpio = "Cliente";
            return $"Cotizacion_MEM-{Math.Max(1, folio):D5}_{limpio}_{fecha:yyyyMMdd}.pdf";
        }
    }
}
