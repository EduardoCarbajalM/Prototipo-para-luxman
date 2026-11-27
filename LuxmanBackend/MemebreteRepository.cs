using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
using MongoDB.Driver;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // Conecta con MongoDB para guardar y leer los PDFs que se hacen en el chat
    public class MemebreteRepository
    {
        public const string NombreColeccion = "MemebretesPDF";
        private readonly IMongoCollection<MemebretePdf> coleccion;
        private readonly IMongoCollection<BsonDocument> coleccionCruda;
        private bool esquemaMigrado = false;

        public MemebreteRepository(IConfiguration configuracion)
        {
            string cadena = configuracion.GetConnectionString("MongoDb") ?? "mongodb://localhost:27017";
            string nombreBd = configuracion["Mongo:Database"] ?? "luxman";

            var baseDatos = new MongoClient(cadena).GetDatabase(nombreBd);
            coleccion = baseDatos.GetCollection<MemebretePdf>(NombreColeccion);
            coleccionCruda = baseDatos.GetCollection<BsonDocument>(NombreColeccion);
        }

        // Migra documentos previos con nombres en PascalCase hacia snake_case si existieran en el servidor
        private async Task AsegurarEsquemaAsync()
        {
            if (esquemaMigrado) return;
            try
            {
                var filtroAntiguo = Builders<BsonDocument>.Filter.Or(
                    Builders<BsonDocument>.Filter.Exists("Fecha"),
                    Builders<BsonDocument>.Filter.Exists("NombreCliente"),
                    Builders<BsonDocument>.Filter.Exists("Archivo"),
                    Builders<BsonDocument>.Filter.Exists("TextoOriginal"),
                    Builders<BsonDocument>.Filter.Exists("Eliminado")
                );
                var renombrar = Builders<BsonDocument>.Update
                    .Rename("Fecha", "fecha_creacion")
                    .Rename("NombreCliente", "nombre_cliente")
                    .Rename("Archivo", "archivo_pdf")
                    .Rename("TextoOriginal", "texto_original")
                    .Rename("Eliminado", "eliminado");

                await coleccionCruda.UpdateManyAsync(filtroAntiguo, renombrar);
                esquemaMigrado = true;
            }
            catch
            {
                // Si la coleccion aun no existe o no requiere migracion, continuamos normalmente
            }
        }

        public async Task<MemebretePdf> GuardarAsync(MemebretePdf documento)
        {
            await AsegurarEsquemaAsync();
            await coleccion.InsertOneAsync(documento);
            return documento;
        }

        public async Task<MemebretePdf?> ObtenerAsync(string id_documento)
        {
            await AsegurarEsquemaAsync();
            return await coleccion.Find(doc => doc.IdDocumento == id_documento).FirstOrDefaultAsync();
        }

        // Saca el historial activo (no eliminados) ordenado del más reciente al más viejo
        public async Task<List<MemebreteResumen>> ListarAsync()
        {
            await AsegurarEsquemaAsync();
            return await coleccion
                .Find(doc => !doc.Eliminado)
                .SortByDescending(doc => doc.FechaCreacion)
                .Project(doc => new MemebreteResumen
                {
                    IdDocumento = doc.IdDocumento!,
                    FechaCreacion = doc.FechaCreacion,
                    NombreCliente = doc.NombreCliente,
                    Eliminado = doc.Eliminado
                })
                .ToListAsync();
        }

        // Marca una cotización como eliminada (Soft Delete)
        public async Task<bool> MoverAPapeleraAsync(string id_documento)
        {
            await AsegurarEsquemaAsync();
            var actualizacion = Builders<MemebretePdf>.Update.Set(doc => doc.Eliminado, true);
            var resultado = await coleccion.UpdateOneAsync(doc => doc.IdDocumento == id_documento, actualizacion);
            return resultado.ModifiedCount > 0;
        }

        // Devuelve la lista de elementos en la papelera de reciclaje
        public async Task<List<MemebreteResumen>> ListarPapeleraAsync()
        {
            await AsegurarEsquemaAsync();
            return await coleccion
                .Find(doc => doc.Eliminado)
                .SortByDescending(doc => doc.FechaCreacion)
                .Project(doc => new MemebreteResumen
                {
                    IdDocumento = doc.IdDocumento!,
                    FechaCreacion = doc.FechaCreacion,
                    NombreCliente = doc.NombreCliente,
                    Eliminado = doc.Eliminado
                })
                .ToListAsync();
        }

        // Restaura un documento de la papelera al historial activo
        public async Task<bool> RestaurarAsync(string id_documento)
        {
            await AsegurarEsquemaAsync();
            var actualizacion = Builders<MemebretePdf>.Update.Set(doc => doc.Eliminado, false);
            var resultado = await coleccion.UpdateOneAsync(doc => doc.IdDocumento == id_documento, actualizacion);
            return resultado.ModifiedCount > 0;
        }

        // Elimina el documento de forma definitiva en MongoDB
        public async Task<bool> EliminarPermanenteAsync(string id_documento)
        {
            await AsegurarEsquemaAsync();
            var resultado = await coleccion.DeleteOneAsync(doc => doc.IdDocumento == id_documento);
            return resultado.DeletedCount > 0;
        }
    }
}
