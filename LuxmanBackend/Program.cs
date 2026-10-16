using LuxmanErp.Services;
using QuestPDF.Infrastructure;

// QuestPDF necesita que declaremos la licencia antes de generar cualquier PDF
QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// registramos los controladores normales de la Web API
builder.Services.AddControllers();

// aqui registramos nuestros servicios, bien sencillo, sin interfaces
builder.Services.AddScoped<CotizacionService>();
builder.Services.AddScoped<PdfService>();

<<<<<<< Updated upstream
// modulo de memebretes (chat -> PDF editable -> historial en MongoDB)
builder.Services.AddSingleton<MemebreteRepository>();
builder.Services.AddSingleton<MemebretePdfService>();

// esto es para que el front de React (que corre en otro puerto) pueda
// pegarle a la API sin que el navegador se queje de CORS
=======
// CORRECCIÓN: Configuración de CORS universal para que React conecte sin errores
>>>>>>> Stashed changes
builder.Services.AddCors(opciones =>
{
    opciones.AddPolicy("PermitirFrontendReact", politica =>
    {
        politica.AllowAnyOrigin()
                .AllowAnyHeader()
                .AllowAnyMethod()
                .WithExposedHeaders("Content-Disposition");
    });
});

var app = builder.Build();

// El orden es vital: CORS debe ir antes de Authorization y Controllers
app.UseCors("PermitirFrontendReact");

app.UseAuthorization();
app.MapControllers();

app.Run();