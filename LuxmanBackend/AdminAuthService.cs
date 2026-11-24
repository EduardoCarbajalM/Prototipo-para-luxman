using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace LuxmanErp.Services
{
    // valida el pin del ingeniero en el servidor y entrega tokens de sesion en memoria
    public class AdminAuthService
    {
        private static readonly TimeSpan DuracionSesion = TimeSpan.FromHours(8);
        private readonly string pinCorrecto;
        private readonly ConcurrentDictionary<string, DateTime> sesiones = new();

        public AdminAuthService(IConfiguration configuracion)
        {
            // se puede cambiar con la variable de entorno AdminPin
            pinCorrecto = configuracion["AdminPin"] ?? "12345";
        }

        // regresa un token si el pin es correcto, si no regresa null
        public string? IniciarSesion(string? pin)
        {
            bool correcto = pin != null && CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(pin), Encoding.UTF8.GetBytes(pinCorrecto));

            if (!correcto)
                return null;

            // limpiamos sesiones vencidas
            foreach (var vencida in sesiones.Where(s => s.Value < DateTime.UtcNow).Select(s => s.Key).ToList())
                sesiones.TryRemove(vencida, out _);

            string token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
            sesiones[token] = DateTime.UtcNow.Add(DuracionSesion);
            return token;
        }

        public bool TokenValido(string? token)
        {
            return token != null && sesiones.TryGetValue(token, out var vence) && vence > DateTime.UtcNow;
        }

        public void CerrarSesion(string? token)
        {
            if (token != null) sesiones.TryRemove(token, out _);
        }
    }
}
