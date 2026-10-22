using System;

namespace LuxmanErp.Models
{
    // modelo que representa la tabla cotizaciones de postgres
    public class Cotizacion
    {
        public int idCotizacion { get; set; }
        public int? idCliente { get; set; }
        public decimal litrosTanque { get; set; }
        public string? tipoAcero { get; set; }
        public bool tieneAgitacion { get; set; }
        public decimal precioBase { get; set; }
        public decimal precioFinal { get; set; }
        public bool isCotizacionAprobada { get; set; }
        public DateTime fechaCreacion { get; set; }
    }

    // clase para recibir los datos que manda el usuario desde el formulario
    public class CotizacionRequestDTO
    {
        public int? idCliente { get; set; }
        public decimal litrosTanque { get; set; }
        public string? tipoAcero { get; set; }
        public bool tieneAgitacion { get; set; }
    }
}
