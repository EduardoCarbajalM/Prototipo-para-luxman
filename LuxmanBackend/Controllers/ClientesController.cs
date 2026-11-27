using System;
using Microsoft.AspNetCore.Mvc;
using LuxmanErp.Models;
using LuxmanErp.Services;

namespace LuxmanErp.Controllers
{
    [ApiController]
    [Route("api/clientes")]
    public class ClientesController : ControllerBase
    {
        private readonly ClienteService servicioClientes;

        public ClientesController(ClienteService servicioClientes)
        {
            this.servicioClientes = servicioClientes;
        }

        [HttpGet]
        public IActionResult Listar()
        {
            try
            {
                return Ok(servicioClientes.Listar());
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al consultar los clientes: " + error.Message);
            }
        }

        [HttpPost]
        public IActionResult Crear([FromBody] ClienteRequestDTO datos)
        {
            if (datos == null)
                return BadRequest("No se recibieron los datos del cliente.");

            try
            {
                var creado = servicioClientes.Crear(datos);
                return Ok(creado);
            }
            catch (ArgumentException errorValidacion)
            {
                return BadRequest(errorValidacion.Message);
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al guardar el cliente: " + error.Message);
            }
        }

        [HttpDelete("{id_cliente}")]
        public IActionResult Eliminar(int id_cliente)
        {
            try
            {
                bool eliminado = servicioClientes.Eliminar(id_cliente);
                if (!eliminado)
                    return NotFound("No se encontró el cliente especificado.");
                return Ok(new RespuestaMensajeDTO { Mensaje = "Cliente eliminado correctamente." });
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al eliminar el cliente: " + error.Message);
            }
        }
    }
}
