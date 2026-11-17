using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // Conecta con MongoDB para guardar y leer los PDFs que se hacen en el chat
    public class MemebreteRepository
    {
        public const string NombreColeccion = "MemebretesPDF";
        private readonly IMongoCollection<MemebretePdf> coleccion;

        public MemebreteRepository(IConfiguration configuracion)
        {
            string cadena = configuracion.GetConnectionString("MongoDb") ?? "mongodb://localhost:27017";
            string nombreBd = configuracion["Mongo:Database"] ?? "luxman";

            var clienteMongo = new MongoClient(cadena);
            coleccion = clienteMongo.GetDatabase(nombreBd).GetCollection<MemebretePdf>(NombreColeccion);
        }

        public async Task<MemebretePdf> GuardarAsync(MemebretePdf documento)
        {
            await coleccion.InsertOneAsync(documento);
            return documento;
        }

        public async Task<MemebretePdf?> ObtenerAsync(string id)
        {
            return await coleccion.Find(doc => doc.Id == id).FirstOrDefaultAsync();
        }

        // Saca el historial activo (no eliminados) ordenado del más reciente al más viejo
        public async Task<List<MemebreteResumen>> ListarAsync()
        {
            return await coleccion
                .Find(doc => !doc.Eliminado)
                .SortByDescending(doc => doc.Fecha)
                .Project(doc => new MemebreteResumen
                {
                    Id = doc.Id!,
                    Fecha = doc.Fecha,
                    NombreCliente = doc.NombreCliente,
                    Eliminado = doc.Eliminado
                })
                .ToListAsync();
        }

        // Marca una cotización como eliminada (Soft Delete)
        public async Task<bool> MoverAPapeleraAsync(string id)
        {
            var actualizacion = Builders<MemebretePdf>.Update.Set(doc => doc.Eliminado, true);
            var resultado = await coleccion.UpdateOneAsync(doc => doc.Id == id, actualizacion);
            return resultado.ModifiedCount > 0;
        }

        // Devuelve la lista de elementos en la papelera de reciclaje
        public async Task<List<MemebreteResumen>> ListarPapeleraAsync()
        {
            return await coleccion
                .Find(doc => doc.Eliminado)
                .SortByDescending(doc => doc.Fecha)
                .Project(doc => new MemebreteResumen
                {
                    Id = doc.Id!,
                    Fecha = doc.Fecha,
                    NombreCliente = doc.NombreCliente,
                    Eliminado = doc.Eliminado
                })
                .ToListAsync();
        }

        // Restaura un documento de la papelera al historial activo
        public async Task<bool> RestaurarAsync(string id)
        {
            var actualizacion = Builders<MemebretePdf>.Update.Set(doc => doc.Eliminado, false);
            var resultado = await coleccion.UpdateOneAsync(doc => doc.Id == id, actualizacion);
            return resultado.ModifiedCount > 0;
        }

        // Elimina el documento de forma definitiva en MongoDB
        public async Task<bool> EliminarPermanenteAsync(string id)
        {
            var resultado = await coleccion.DeleteOneAsync(doc => doc.Id == id);
            return resultado.DeletedCount > 0;
        }
    }
}