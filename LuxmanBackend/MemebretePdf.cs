using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace LuxmanErp.Models
{
    // modelo para guardar el pdf con membrete en la coleccion de mongodb
    public class MemebretePdf
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }
        public DateTime Fecha { get; set; }
        public string NombreCliente { get; set; } = "";
        public byte[] Archivo { get; set; } = Array.Empty<byte>();
        public string TextoOriginal { get; set; } = "";
    }

    // clase ligera para mostrar la lista en el historial sin cargar todos los bytes del pdf
    public class MemebreteResumen
    {
        public string Id { get; set; } = "";
        public DateTime Fecha { get; set; }
        public string NombreCliente { get; set; } = "";
    }
}
