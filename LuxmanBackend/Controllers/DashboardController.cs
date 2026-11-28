using System;
using Microsoft.AspNetCore.Mvc;
using LuxmanErp.Services;

namespace LuxmanErp.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    public class DashboardController : ControllerBase
    {
        private readonly DashboardService servicioDashboard;

        public DashboardController(DashboardService servicioDashboard)
        {
            this.servicioDashboard = servicioDashboard;
        }

        [HttpGet("metricas")]
        public IActionResult ObtenerMetricas([FromQuery(Name = "fecha_limite")] string? fecha_limite = null)
        {
            try
            {
                return Ok(servicioDashboard.ObtenerMetricas(fecha_limite));
            }
            catch (Exception error)
            {
                return StatusCode(500, "Error al consultar las métricas del dashboard: " + error.Message);
            }
        }
    }
}
