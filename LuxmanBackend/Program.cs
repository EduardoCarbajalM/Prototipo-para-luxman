using LuxmanErp.Services;

var builder = WebApplication.CreateBuilder(args);

// registramos los controladores normales de la Web API
builder.Services.AddControllers();

// aqui registramos nuestros servicios, bien sencillo, sin interfaces
// porque solo hay una implementacion de cada uno (no se necesita mas para el proyecto)
builder.Services.AddScoped<CotizacionService>();
builder.Services.AddScoped<PdfService>();

// esto es para que el front de React (que corre en otro puerto) pueda
// pegarle a la API sin que el navegador se queje de CORS
builder.Services.AddCors(opciones =>
{
    opciones.AddPolicy("PermitirFrontendReact", politica =>
    {
        politica.WithOrigins("http://localhost:5173") // puerto default de Vite
                .AllowAnyHeader()
                .AllowAnyMethod();
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
