using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
using MongoDB.Driver;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // Conecta con MongoDB para guardar, restaurar y reutilizar folios en los PDFs con membrete
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

        // Migra documentos previos y asigna numero_folio inicial a registros antiguos sin folio
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

                // Asigna numero_folio a documentos activos antiguos que aun no lo tengan
                var sinFolio = await coleccion
                    .Find(doc => !doc.Eliminado && doc.NumeroFolio <= 0)
                    .SortBy(doc => doc.FechaCreacion)
                    .Project(doc => doc.IdDocumento)
                    .ToListAsync();

                foreach (string? idDoc in sinFolio)
                {
                    if (string.IsNullOrEmpty(idDoc)) continue;
                    int libre = await ObtenerMenorFolioDisponibleInternoAsync();
                    var act = Builders<MemebretePdf>.Update.Set(d => d.NumeroFolio, libre);
                    await coleccion.UpdateOneAsync(d => d.IdDocumento == idDoc, act);
                }

                esquemaMigrado = true;
            }
            catch
            {
                // Si MongoDB aun esta iniciando, reintentara en la siguiente operacion
            }
        }

        private async Task<int> ObtenerMenorFolioDisponibleInternoAsync()
        {
            var ocupados = await coleccion
                .Find(doc => !doc.Eliminado && doc.NumeroFolio > 0)
                .Project(doc => doc.NumeroFolio)
                .ToListAsync();

            return CalculoTanqueService.CalcularMenorEnteroDisponible(ocupados);
        }

        public async Task<int> ObtenerMenorFolioDisponibleAsync()
        {
            await AsegurarEsquemaAsync();
            return await ObtenerMenorFolioDisponibleInternoAsync();
        }

        public async Task<MemebretePdf> GuardarAsync(MemebretePdf documento)
        {
            await AsegurarEsquemaAsync();
            if (documento.NumeroFolio <= 0)
            {
                documento.NumeroFolio = await ObtenerMenorFolioDisponibleInternoAsync();
            }
            await coleccion.InsertOneAsync(documento);
            return documento;
        }

        public async Task<MemebretePdf?> ObtenerAsync(string id_documento)
        {
            await AsegurarEsquemaAsync();
            return await coleccion.Find(doc => doc.IdDocumento == id_documento).FirstOrDefaultAsync();
        }

        public async Task<List<MemebreteResumen>> ListarAsync()
        {
            await AsegurarEsquemaAsync();
            return await coleccion
                .Find(doc => !doc.Eliminado)
                .SortBy(doc => doc.NumeroFolio)
                .ThenByDescending(doc => doc.FechaCreacion)
                .Project(doc => new MemebreteResumen
                {
                    IdDocumento = doc.IdDocumento!,
                    NumeroFolio = doc.NumeroFolio,
                    FechaCreacion = doc.FechaCreacion,
                    NombreCliente = doc.NombreCliente,
                    Eliminado = doc.Eliminado
                })
                .ToListAsync();
        }

        public async Task<bool> MoverAPapeleraAsync(string id_documento)
        {
            await AsegurarEsquemaAsync();
            var actualizacion = Builders<MemebretePdf>.Update.Set(doc => doc.Eliminado, true);
            var resultado = await coleccion.UpdateOneAsync(doc => doc.IdDocumento == id_documento, actualizacion);
            return resultado.ModifiedCount > 0;
        }

        public async Task<List<MemebreteResumen>> ListarPapeleraAsync()
        {
            await AsegurarEsquemaAsync();
            return await coleccion
                .Find(doc => doc.Eliminado)
                .SortByDescending(doc => doc.FechaCreacion)
                .Project(doc => new MemebreteResumen
                {
                    IdDocumento = doc.IdDocumento!,
                    NumeroFolio = doc.NumeroFolio,
                    FechaCreacion = doc.FechaCreacion,
                    NombreCliente = doc.NombreCliente,
                    Eliminado = doc.Eliminado
                })
                .ToListAsync();
        }

        // Restaura desde la papelera; si su numero_folio ya fue ocupado, reasigna el menor disponible y regenera el PDF
        public async Task<(bool Exito, int NumeroFolio, bool Reasignado)> RestaurarAsync(
            string id_documento,
            MemebretePdfService servicioPdf)
        {
            await AsegurarEsquemaAsync();
            var actual = await coleccion.Find(doc => doc.IdDocumento == id_documento && doc.Eliminado).FirstOrDefaultAsync();
            if (actual == null) return (false, 0, false);

            bool ocupado = actual.NumeroFolio <= 0 || await coleccion
                .Find(doc => !doc.Eliminado && doc.NumeroFolio == actual.NumeroFolio && doc.IdDocumento != id_documento)
                .AnyAsync();

            int folioFinal = ocupado ? await ObtenerMenorFolioDisponibleInternoAsync() : actual.NumeroFolio;
            var constructorUpdate = Builders<MemebretePdf>.Update
                .Set(doc => doc.Eliminado, false)
                .Set(doc => doc.NumeroFolio, folioFinal);

            // Si cambio el folio y tenemos texto_original, actualizamos el folio impreso dentro del PDF
            if (ocupado && !string.IsNullOrWhiteSpace(actual.TextoOriginal))
            {
                var datosTexto = TextoCotizacionParser.Parsear(actual.TextoOriginal);
                byte[] nuevoArchivo = servicioPdf.Generar(datosTexto, actual.FechaCreacion.ToLocalTime(), folioFinal);
                constructorUpdate = constructorUpdate.Set(doc => doc.ArchivoPdf, nuevoArchivo);
            }

            var resultado = await coleccion.UpdateOneAsync(doc => doc.IdDocumento == id_documento, constructorUpdate);
            return (resultado.ModifiedCount > 0, folioFinal, ocupado);
        }

        public async Task<bool> EliminarPermanenteAsync(string id_documento)
        {
            await AsegurarEsquemaAsync();
            var resultado = await coleccion.DeleteOneAsync(doc => doc.IdDocumento == id_documento);
            return resultado.DeletedCount > 0;
        }
    }
}
