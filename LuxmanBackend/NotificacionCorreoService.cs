using System;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Net.Security;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // envia notificaciones automaticas por correo SMTP (compatible con SSL implicito puerto 465 de Hostinger y STARTTLS 587)
    public class NotificacionCorreoService
    {
        private readonly IConfiguration configuracion;

        public NotificacionCorreoService(IConfiguration configuracion)
        {
            this.configuracion = configuracion;
        }

        private string? LeerVariable(string clave)
        {
            string? valorEnv = Environment.GetEnvironmentVariable(clave);
            if (!string.IsNullOrWhiteSpace(valorEnv)) return valorEnv.Trim();
            string? valorConf = configuracion[clave];
            return string.IsNullOrWhiteSpace(valorConf) ? null : valorConf.Trim();
        }

        public async Task EnviarNotificacionNuevaSolicitudAsync(int idSolicitud, SolicitudContactoDTO datos)
        {
            try
            {
                string host = LeerVariable("SMTP_HOST") ?? "smtp.hostinger.com";
                int puerto = int.TryParse(LeerVariable("SMTP_PORT"), out int p) && p > 0 ? p : 465;
                string? usuario = LeerVariable("SMTP_USER");
                string? contrasena = LeerVariable("SMTP_PASS");
                string destino = LeerVariable("SMTP_DESTINO") ?? usuario ?? "equipos@luxman.tech";
                string appBaseUrl = (LeerVariable("APP_BASE_URL") ?? "https://luxman.tech").TrimEnd('/');

                if (string.IsNullOrWhiteSpace(usuario) || string.IsNullOrWhiteSpace(contrasena))
                {
                    Console.WriteLine(
                        $"[SMTP Aviso] Credenciales SMTP_USER / SMTP_PASS no configuradas en el entorno. " +
                        $"La solicitud #{idSolicitud} se guardo en PostgreSQL sin enviar correo.");
                    return;
                }

                string urlDirectivo = $"{appBaseUrl}/directivo";
                string asunto = $"Nuevo Prospecto #{idSolicitud} • {datos.Empresa ?? datos.Nombre} — Luxman ERP";
                string cuerpoHtml = ConstruirHtmlCorreo(idSolicitud, datos, urlDirectivo);

                if (puerto == 465)
                {
                    await EnviarPorSslImplicito465Async(host, puerto, usuario, contrasena, destino, asunto, cuerpoHtml);
                }
                else
                {
                    await EnviarPorSmtpEstandarAsync(host, puerto, usuario, contrasena, destino, asunto, cuerpoHtml);
                }

                Console.WriteLine($"[SMTP OK] Notificacion de solicitud #{idSolicitud} enviada a {destino}.");
            }
            catch (Exception error)
            {
                Console.WriteLine(
                    $"[SMTP Advertencia] No se pudo enviar el correo de la solicitud #{idSolicitud}: {error.Message}");
            }
        }

        // cliente RFC 5321 sobre SslStream directo para el puerto 465 SSL implicito de Hostinger
        private static async Task EnviarPorSslImplicito465Async(
            string host,
            int puerto,
            string usuario,
            string contrasena,
            string destino,
            string asunto,
            string cuerpoHtml)
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            using var clienteTcp = new TcpClient();
            await clienteTcp.ConnectAsync(host, puerto, cts.Token);

            using var flujoSsl = new SslStream(clienteTcp.GetStream(), leaveInnerStreamOpen: false);
            await flujoSsl.AuthenticateAsClientAsync(host);

            var utf8SinBom = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);
            using var lector = new StreamReader(flujoSsl, Encoding.ASCII, detectEncodingFromByteOrderMarks: false, bufferSize: 1024, leaveOpen: true);
            using var escritor = new StreamWriter(flujoSsl, utf8SinBom, bufferSize: 1024, leaveOpen: true)
            {
                NewLine = "\r\n",
                AutoFlush = true
            };

            await EsperarRespuestaSmtpAsync(lector, 220);

            await escritor.WriteLineAsync("EHLO luxman.tech");
            await EsperarRespuestaSmtpAsync(lector, 250);

            await escritor.WriteLineAsync("AUTH LOGIN");
            await EsperarRespuestaSmtpAsync(lector, 334);

            await escritor.WriteLineAsync(Convert.ToBase64String(Encoding.UTF8.GetBytes(usuario)));
            await EsperarRespuestaSmtpAsync(lector, 334);

            await escritor.WriteLineAsync(Convert.ToBase64String(Encoding.UTF8.GetBytes(contrasena)));
            await EsperarRespuestaSmtpAsync(lector, 235);

            await escritor.WriteLineAsync($"MAIL FROM:<{usuario}>");
            await EsperarRespuestaSmtpAsync(lector, 250);

            await escritor.WriteLineAsync($"RCPT TO:<{destino}>");
            await EsperarRespuestaSmtpAsync(lector, 250);

            await escritor.WriteLineAsync("DATA");
            await EsperarRespuestaSmtpAsync(lector, 354);

            string asuntoCodificado = "=?UTF-8?B?" + Convert.ToBase64String(Encoding.UTF8.GetBytes(asunto)) + "?=";
            string htmlBase64 = Convert.ToBase64String(
                Encoding.UTF8.GetBytes(cuerpoHtml),
                Base64FormattingOptions.InsertLineBreaks);

            var mensajeMime = new StringBuilder();
            mensajeMime.Append($"From: \"Equipos Inoxidables Luxman\" <{usuario}>\r\n");
            mensajeMime.Append($"To: <{destino}>\r\n");
            mensajeMime.Append($"Subject: {asuntoCodificado}\r\n");
            mensajeMime.Append($"Date: {DateTimeOffset.UtcNow:R}\r\n");
            mensajeMime.Append($"Message-ID: <{Guid.NewGuid():N}@luxman.tech>\r\n");
            mensajeMime.Append("MIME-Version: 1.0\r\n");
            mensajeMime.Append("Content-Type: text/html; charset=UTF-8\r\n");
            mensajeMime.Append("Content-Transfer-Encoding: base64\r\n");
            mensajeMime.Append("\r\n");
            mensajeMime.Append(htmlBase64);
            mensajeMime.Append("\r\n.");

            await escritor.WriteLineAsync(mensajeMime.ToString());
            await EsperarRespuestaSmtpAsync(lector, 250);

            await escritor.WriteLineAsync("QUIT");
        }

        private static async Task EsperarRespuestaSmtpAsync(StreamReader lector, int codigoEsperado)
        {
            string? ultimaLinea = null;
            while (true)
            {
                string? linea = await lector.ReadLineAsync();
                if (linea == null)
                    throw new IOException("El servidor SMTP cerro la conexion inesperadamente.");

                ultimaLinea = linea;
                // en SMTP las respuestas multilinea llevan guion en la posicion 3 (ej. "250-AUTH LOGIN")
                if (linea.Length < 4 || linea[3] != '-')
                    break;
            }

            if (ultimaLinea == null ||
                ultimaLinea.Length < 3 ||
                !int.TryParse(ultimaLinea.Substring(0, 3), out int codigoReal) ||
                codigoReal != codigoEsperado)
            {
                throw new InvalidOperationException($"Respuesta SMTP inesperada (esperado {codigoEsperado}): {ultimaLinea}");
            }
        }

        private static async Task EnviarPorSmtpEstandarAsync(
            string host,
            int puerto,
            string usuario,
            string contrasena,
            string destino,
            string asunto,
            string cuerpoHtml)
        {
            using var mensaje = new MailMessage
            {
                From = new MailAddress(usuario, "Equipos Inoxidables Luxman"),
                Subject = asunto,
                SubjectEncoding = Encoding.UTF8,
                Body = cuerpoHtml,
                BodyEncoding = Encoding.UTF8,
                IsBodyHtml = true
            };
            mensaje.To.Add(destino);

            using var cliente = new SmtpClient(host, puerto)
            {
                EnableSsl = puerto == 587 || puerto == 465,
                Credentials = new NetworkCredential(usuario, contrasena),
                Timeout = 15000
            };

            await cliente.SendMailAsync(mensaje);
        }

        private static string ConstruirHtmlCorreo(int idSolicitud, SolicitudContactoDTO datos, string urlDirectivo)
        {
            DateTime ahora = MemebretePdfService.AhoraMexico();
            string nombre = WebUtility.HtmlEncode(datos.Nombre?.Trim() ?? "Prospecto Web");
            string empresa = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(datos.Empresa) ? "No especificada" : datos.Empresa.Trim());
            string telefono = WebUtility.HtmlEncode(datos.Telefono?.Trim() ?? "—");
            string correo = WebUtility.HtmlEncode(datos.Correo?.Trim() ?? "—");
            string sector = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(datos.Sector) ? "Por definir" : datos.Sector.Trim());
            string equipo = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(datos.TipoEquipo) ? "Equipo en acero inoxidable" : datos.TipoEquipo.Trim());
            string capacidad = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(datos.CapacidadLitros) ? "Por definir en asesoría" : datos.CapacidadLitros.Trim());
            string especificaciones = WebUtility.HtmlEncode(
                !string.IsNullOrWhiteSpace(datos.Especificaciones)
                    ? datos.Especificaciones.Trim()
                    : (!string.IsNullOrWhiteSpace(datos.Mensaje) ? datos.Mensaje.Trim() : "Sin especificaciones adicionales"));
            string urlSegura = WebUtility.HtmlEncode(urlDirectivo);

            return $@"<!DOCTYPE html>
<html lang=""es"">
<head>
  <meta charset=""UTF-8"">
  <title>Nueva Solicitud de Cotización — Luxman</title>
</head>
<body style=""margin:0;padding:24px;background-color:#070D1F;font-family:'Segoe UI',Arial,sans-serif;color:#E2E8F0;"">
  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""max-width:620px;margin:0 auto;background-color:#0B152E;border:1px solid #1E3A5F;border-radius:14px;overflow:hidden;"">
    <tr>
      <td style=""background:linear-gradient(135deg,#070D1F 0%,#112240 100%);padding:24px 28px;border-bottom:2px solid #2563EB;"">
        <div style=""font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#38BDF8;font-weight:700;"">
          EQUIPOS INOXIDABLES LUXMAN • ASISTENTE DE PROSPECCIÓN
        </div>
        <h2 style=""margin:8px 0 4px 0;font-size:21px;color:#FFFFFF;"">
          Nueva Solicitud Comercial #{idSolicitud}
        </h2>
        <div style=""font-size:13px;color:#94A3B8;"">
          Recibida el {ahora:dd/MM/yyyy} a las {ahora:HH:mm} hrs (Tiempo del Centro de México)
        </div>
      </td>
    </tr>
    <tr>
      <td style=""padding:24px 28px;"">
        <p style=""margin:0 0 16px 0;font-size:14.5px;color:#CBD5E1;line-height:1.5;"">
          Estimado <strong>Ing. Raúl Romero</strong>, un nuevo prospecto completó el flujo guiado de cotización en el portal público:
        </p>

        <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" style=""border-collapse:collapse;background-color:#112240;border-radius:10px;overflow:hidden;border:1px solid rgba(148,163,184,0.2);"">
          <tr>
            <td style=""padding:10px 14px;font-size:12.5px;color:#94A3B8;border-bottom:1px solid rgba(148,163,184,0.14);width:36%;"">Contacto</td>
            <td style=""padding:10px 14px;font-size:14px;color:#FFFFFF;font-weight:600;border-bottom:1px solid rgba(148,163,184,0.14);"">{nombre}</td>
          </tr>
          <tr>
            <td style=""padding:10px 14px;font-size:12.5px;color:#94A3B8;border-bottom:1px solid rgba(148,163,184,0.14);"">Empresa</td>
            <td style=""padding:10px 14px;font-size:14px;color:#F8FAFC;border-bottom:1px solid rgba(148,163,184,0.14);"">{empresa}</td>
          </tr>
          <tr>
            <td style=""padding:10px 14px;font-size:12.5px;color:#94A3B8;border-bottom:1px solid rgba(148,163,184,0.14);"">Teléfono</td>
            <td style=""padding:10px 14px;font-size:14px;color:#38BDF8;border-bottom:1px solid rgba(148,163,184,0.14);"">{telefono}</td>
          </tr>
          <tr>
            <td style=""padding:10px 14px;font-size:12.5px;color:#94A3B8;border-bottom:1px solid rgba(148,163,184,0.14);"">Correo electrónico</td>
            <td style=""padding:10px 14px;font-size:14px;color:#38BDF8;border-bottom:1px solid rgba(148,163,184,0.14);"">{correo}</td>
          </tr>
          <tr>
            <td style=""padding:10px 14px;font-size:12.5px;color:#94A3B8;border-bottom:1px solid rgba(148,163,184,0.14);"">Sector industrial</td>
            <td style=""padding:10px 14px;font-size:14px;color:#FFFFFF;font-weight:600;border-bottom:1px solid rgba(148,163,184,0.14);"">{sector}</td>
          </tr>
          <tr>
            <td style=""padding:10px 14px;font-size:12.5px;color:#94A3B8;border-bottom:1px solid rgba(148,163,184,0.14);"">Equipo requerido</td>
            <td style=""padding:10px 14px;font-size:14px;color:#FFFFFF;font-weight:600;border-bottom:1px solid rgba(148,163,184,0.14);"">{equipo}</td>
          </tr>
          <tr>
            <td style=""padding:10px 14px;font-size:12.5px;color:#94A3B8;border-bottom:1px solid rgba(148,163,184,0.14);"">Capacidad estimada</td>
            <td style=""padding:10px 14px;font-size:14px;color:#F8FAFC;border-bottom:1px solid rgba(148,163,184,0.14);"">{capacidad}</td>
          </tr>
          <tr>
            <td style=""padding:12px 14px;font-size:12.5px;color:#94A3B8;vertical-align:top;"">Especificaciones y detalles</td>
            <td style=""padding:12px 14px;font-size:13.5px;color:#E2E8F0;line-height:1.5;white-space:pre-line;"">{especificaciones}</td>
          </tr>
        </table>

        <div style=""text-align:center;margin:26px 0 10px 0;"">
          <a href=""{urlSegura}"" target=""_blank"" rel=""noopener noreferrer""
             style=""display:inline-block;background-color:#2563EB;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:13px 28px;border-radius:8px;"">
            Abrir Panel Directivo
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style=""padding:14px 28px;background-color:#070D1F;border-top:1px solid rgba(148,163,184,0.15);text-align:center;font-size:11.5px;color:#64748B;"">
        Notificación automática de Equipos Inoxidables Luxman • Av. Guadiana 203, Ecatepec, Estado de México
      </td>
    </tr>
  </table>
</body>
</html>";
        }
    }
}
