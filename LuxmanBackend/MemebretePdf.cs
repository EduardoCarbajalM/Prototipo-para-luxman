using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace LuxmanErp.Models
{
    // Documento que se guarda en la coleccion NoSQL "MemebretesPDF" (MongoDB)
    public class MemebretePdf
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        // Fecha de generacion (UTC en la base, se convierte al mostrar)
        public DateTime Fecha { get; set; }

        // Nombre del cliente extraido del texto (primera linea)
        public string NombreCliente { get; set; } = "";

        // PDF fisico guardado como binario (Mongo lo maneja como BinData)
        public byte[] Archivo { get; set; } = Array.Empty<byte>();

        // Texto con el que se genero; sirve para aplicar correcciones puntuales despues
        public string TextoOriginal { get; set; } = "";
    }

    // Version ligera para el historial (sin el binario del PDF)
    public class MemebreteResumen
    {
        public string Id { get; set; } = "";
        public DateTime Fecha { get; set; }
        public string NombreCliente { get; set; } = "";
    }
}
