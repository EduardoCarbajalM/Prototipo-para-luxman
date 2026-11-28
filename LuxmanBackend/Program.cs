using System;
using LuxmanErp.Services;
using QuestPDF.Infrastructure;

// activamos la licencia gratuita de questpdf para que nos deje crear los pdfs
QuestPDF.Settings.License = LicenseType.Community;

var constructor = WebApplication.CreateBuilder(args);

constructor.Services.AddControllers();

// registramos los servicios de postgres, clientes, calculos, ventas, dashboard, actas, seeder y mongo
constructor.Services.AddScoped<ClienteService>();
constructor.Services.AddScoped<CotizacionService>();
constructor.Services.AddScoped<PdfService>();
constructor.Services.AddScoped<CalculoTanqueService>();
constructor.Services.AddScoped<CalculoTanquePdfService>();
constructor.Services.AddScoped<ProyectoVentaService>();
constructor.Services.AddScoped<FacturaPdfService>();
constructor.Services.AddScoped<DashboardService>();
constructor.Services.AddScoped<ActaEntregaService>();
constructor.Services.AddScoped<ActaEntregaPdfService>();
constructor.Services.AddScoped<HistoricoComercialSeeder>();
constructor.Services.AddScoped<SolicitudContactoService>();
constructor.Services.AddSingleton<AdminAuthService>();
constructor.Services.AddSingleton<MemebreteRepository>();
constructor.Services.AddSingleton<MemebretePdfService>();

// damos permiso de cors para que el front en react se pueda conectar sin que marque error
constructor.Services.AddCors(opciones =>
{
    opciones.AddPolicy("PermitirFrontendReact", politica =>
    {
        politica.AllowAnyOrigin()
                .AllowAnyHeader()
                .AllowAnyMethod()
                .WithExposedHeaders("Content-Disposition");
    });
});

var aplicacion = constructor.Build();

// migracion automatica segura y carga idempotente del historico 2024-2026 al arrancar el backend
using (var alcance = aplicacion.Services.CreateScope())
{
    try
    {
        var servicioActas = alcance.ServiceProvider.GetRequiredService<ActaEntregaService>();
        servicioActas.AsegurarEsquemaInicial();

        var seeder = alcance.ServiceProvider.GetRequiredService<HistoricoComercialSeeder>();
        seeder.SembrarSiVacio();
    }
    catch (Exception errorMigracion)
    {
        Console.WriteLine("Aviso al inicializar esquema o historico en arranque: " + errorMigracion.Message);
    }
}

aplicacion.UseCors("PermitirFrontendReact");
aplicacion.UseAuthorization();
aplicacion.MapControllers();

aplicacion.Run();
