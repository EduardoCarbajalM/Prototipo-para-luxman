using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // conecta con mongodb para guardar y leer los pdfs que se hacen en el chat
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

        // saca el historial ordenado del mas reciente al mas viejo
        public async Task<List<MemebreteResumen>> ListarAsync()
        {
            return await coleccion
                .Find(FilterDefinition<MemebretePdf>.Empty)
                .SortByDescending(doc => doc.Fecha)
                .Project(doc => new MemebreteResumen
                {
                    Id = doc.Id!,
                    Fecha = doc.Fecha,
                    NombreCliente = doc.NombreCliente
                })
                .ToListAsync();
        }
    }
}
