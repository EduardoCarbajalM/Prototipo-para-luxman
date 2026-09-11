using System;

namespace LuxmanErp.Models
{
    // clase sencilla que representa una cotizacion, sin mucha magia
    // esto se mapea directo con la tabla de postgres
    public class Cotizacion
    {
        public int idCotizacion { get; set; }
        public int idCliente { get; set; }
        public decimal litrosTanque { get; set; }
        public string tipoAcero { get; set; } // "304" o "316"
        public bool tieneAgitacion { get; set; }

        // estos dos no los manda el front, los calcula la funcion de PL/Python en la BD
        public decimal precioBase { get; set; }
        public decimal precioFinal { get; set; }

        public bool isCotizacionAprobada { get; set; }
        public DateTime fechaCreacion { get; set; }
    }

    // este DTO es el que en verdad llega desde React, solo trae lo que el usuario captura
    public class CotizacionRequestDTO
    {
        public int idCliente { get; set; }
        public decimal litrosTanque { get; set; }
        public string tipoAcero { get; set; }
        public bool tieneAgitacion { get; set; }
    }
}
