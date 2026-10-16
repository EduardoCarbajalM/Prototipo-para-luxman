using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // Repositorio de la coleccion NoSQL "MemebretesPDF".
    // MongoClient es thread-safe, por eso se registra como singleton.
    public class MemebreteRepository
    {
        public const string NombreColeccion = "MemebretesPDF";

        private readonly IMongoCollection<MemebretePdf> _coleccion;

        public MemebreteRepository(IConfiguration configuration)
        {
            string cadena = configuration.GetConnectionString("MongoDb") ?? "mongodb://localhost:27017";
            string baseDatos = configuration["Mongo:Database"] ?? "luxman";

            var cliente = new MongoClient(cadena);
            _coleccion = cliente.GetDatabase(baseDatos).GetCollection<MemebretePdf>(NombreColeccion);
        }

        public async Task<MemebretePdf> GuardarAsync(MemebretePdf documento)
        {
            await _coleccion.InsertOneAsync(documento);
            return documento;
        }

        public async Task<MemebretePdf?> ObtenerAsync(string id)
        {
            return await _coleccion.Find(x => x.Id == id).FirstOrDefaultAsync();
        }

        // Historial: solo Id, Fecha y NombreCliente (no se trae el binario)
        public async Task<List<MemebreteResumen>> ListarAsync()
        {
            return await _coleccion
                .Find(FilterDefinition<MemebretePdf>.Empty)
                .SortByDescending(x => x.Fecha)
                .Project(x => new MemebreteResumen
                {
                    Id = x.Id!,
                    Fecha = x.Fecha,
                    NombreCliente = x.NombreCliente
                })
                .ToListAsync();
        }
    }
}
