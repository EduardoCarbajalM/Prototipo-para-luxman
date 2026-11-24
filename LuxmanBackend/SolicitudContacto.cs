using System;

namespace LuxmanErp.Models
{
    // registro guardado en la tabla solicitudes_contacto
    public class SolicitudContacto
    {
        public int idSolicitud { get; set; }
        public string nombre { get; set; } = "";
        public string? empresa { get; set; }
        public string correo { get; set; } = "";
        public string telefono { get; set; } = "";
        public string? tipoEquipo { get; set; }
        public string? mensaje { get; set; }
        public bool atendida { get; set; }
        public DateTime fechaCreacion { get; set; }
    }

    // datos que manda el formulario de la landing page para que ventas contacte al interesado
    public class SolicitudContactoDTO
    {
        public string? nombre { get; set; }
        public string? empresa { get; set; }
        public string? correo { get; set; }
        public string? telefono { get; set; }
        public string? tipoEquipo { get; set; }
        public string? mensaje { get; set; }
    }
}
