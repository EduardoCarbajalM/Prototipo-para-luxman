using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LuxmanErp.Services;

namespace LuxmanErp.Controllers
{
    public class LoginAdminDTO
    {
        public string? pin { get; set; }
    }

    [ApiController]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private readonly AdminAuthService auth;

        public AdminController(AdminAuthService auth)
        {
            this.auth = auth;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginAdminDTO datos)
        {
            string? token = auth.IniciarSesion(datos?.pin);
            if (token == null)
            {
                // pausa corta para frenar intentos masivos de adivinar el pin
                await Task.Delay(1000);
                return Unauthorized("PIN incorrecto.");
            }

            return Ok(new { token });
        }

        [HttpPost("logout")]
        public IActionResult Logout([FromHeader(Name = "X-Admin-Token")] string? token)
        {
            auth.CerrarSesion(token);
            return NoContent();
        }
    }
}
