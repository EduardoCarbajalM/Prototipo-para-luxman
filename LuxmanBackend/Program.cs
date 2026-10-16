using LuxmanErp.Services;
using QuestPDF.Infrastructure;

// QuestPDF necesita que declaremos la licencia antes de generar cualquier PDF
// (Community es gratis para proyectos escolares / empresas pequeñas)
QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// registramos los controladores normales de la Web API
builder.Services.AddControllers();

// aqui registramos nuestros servicios, bien sencillo, sin interfaces
// porque solo hay una implementacion de cada uno (no se necesita mas para el proyecto)
builder.Services.AddScoped<CotizacionService>();
builder.Services.AddScoped<PdfService>();

// modulo de memebretes (chat -> PDF editable -> historial en MongoDB)
builder.Services.AddSingleton<MemebreteRepository>();
builder.Services.AddSingleton<MemebretePdfService>();

// esto es para que el front de React (que corre en otro puerto) pueda
// pegarle a la API sin que el navegador se queje de CORS
builder.Services.AddCors(opciones =>
{
    opciones.AddPolicy("PermitirFrontendReact", politica =>
    {
        politica.SetIsOriginAllowed(_ => true)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .WithExposedHeaders("Content-Disposition");
    });
});

var app = builder.Build();

app.UseCors("PermitirFrontendReact");
app.UseAuthorization();
app.MapControllers();

app.Run();

// connection string de ejemplo que iria en appsettings.json:
// "ConnectionStrings": {
//   "LuxmanDb": "Host=localhost;Port=5432;Database=luxman_erp;Username=postgres;Password=tu_password"
// }
