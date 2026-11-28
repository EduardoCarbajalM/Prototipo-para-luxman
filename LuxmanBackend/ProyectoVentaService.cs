using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using Npgsql;
using NpgsqlTypes;
using Microsoft.Extensions.Configuration;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // servicio central de ventas, cierre comercial, facturacion, etapas de fabricacion y seguimiento publico
    public class ProyectoVentaService
    {
        private readonly string cadenaConexion;
        private const decimal TasaIva = 0.16m;

        public static readonly string[] EtapasValidas =
        {
            "Cotizado",
            "Aprobado / Anticipo Recibido",
            "En Fabricación (Corte y Rolado)",
            "Soldadura y Pulido Sanitario",
            "Listo para Entrega",
            "Entregado"
        };

        public ProyectoVentaService(IConfiguration configuracion)
        {
            cadenaConexion = configuracion.GetConnectionString("DefaultConnection")
                ?? configuracion.GetConnectionString("LuxmanDb")
                ?? throw new InvalidOperationException("No se encontro la cadena de conexion en el appsettings.");
        }

        public static string FormatearCodigoFolio(int numeroFolio, DateTime fechaCreacion)
        {
            int anio = fechaCreacion == default ? 2026 : fechaCreacion.Year;
            return $"LUX-{anio}-{Math.Max(1, numeroFolio):D3}";
        }

        // ejecuta la migracion segura de clientes y proyectos_venta al iniciar o consultar
        public void AsegurarEsquemaInicial()
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);
        }

        public static void AsegurarTabla(NpgsqlConnection conexion)
        {
            ClienteService.AsegurarTablaYSemilla(conexion);

            using var comando = new NpgsqlCommand(@"
                CREATE TABLE IF NOT EXISTS solicitudes_contacto (
                    id_solicitud   SERIAL PRIMARY KEY,
                    nombre         VARCHAR(150) NOT NULL,
                    empresa        VARCHAR(150),
                    correo         VARCHAR(150) NOT NULL,
                    telefono       VARCHAR(30) NOT NULL,
                    tipo_equipo    VARCHAR(100),
                    mensaje        TEXT,
                    atendida       BOOLEAN DEFAULT FALSE,
                    fecha_creacion TIMESTAMP DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS proyectos_venta (
                    id_proyecto               SERIAL PRIMARY KEY,
                    numero_folio              INTEGER NOT NULL DEFAULT 1,
                    id_cliente                INTEGER REFERENCES clientes(id_cliente) ON DELETE SET NULL,
                    id_solicitud              INTEGER REFERENCES solicitudes_contacto(id_solicitud) ON DELETE SET NULL,
                    id_calculo                INTEGER,
                    nombre_proyecto           VARCHAR(200) NOT NULL,
                    sector                    VARCHAR(60) NOT NULL DEFAULT 'Otro',
                    monto_cotizado            NUMERIC(14,2) NOT NULL DEFAULT 0,
                    porcentaje_anticipo       NUMERIC(5,2) NOT NULL DEFAULT 0,
                    monto_anticipo            NUMERIC(14,2) NOT NULL DEFAULT 0,
                    rfc_facturacion           VARCHAR(20),
                    razon_social_facturacion  VARCHAR(200),
                    uso_cfdi                  VARCHAR(120),
                    regimen_fiscal            VARCHAR(140),
                    metodo_pago               VARCHAR(80),
                    forma_pago                VARCHAR(100),
                    subtotal_factura          NUMERIC(14,2) NOT NULL DEFAULT 0,
                    iva_factura               NUMERIC(14,2) NOT NULL DEFAULT 0,
                    total_factura             NUMERIC(14,2) NOT NULL DEFAULT 0,
                    estado_facturacion        VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
                    folio_factura             VARCHAR(30),
                    fecha_facturacion         TIMESTAMP,
                    estado_venta              VARCHAR(20) NOT NULL DEFAULT 'COTIZADO',
                    etapa_fabricacion         VARCHAR(80) NOT NULL DEFAULT 'Cotizado',
                    fecha_compromiso_entrega  DATE,
                    fecha_creacion            TIMESTAMP DEFAULT NOW(),
                    fecha_cierre              TIMESTAMP,
                    eliminado                 BOOLEAN NOT NULL DEFAULT FALSE
                );

                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS numero_folio INTEGER DEFAULT 1;
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS id_cliente INTEGER;
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS id_solicitud INTEGER;
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS id_calculo INTEGER;
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS nombre_proyecto VARCHAR(200) DEFAULT '';
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS sector VARCHAR(60) DEFAULT 'Otro';
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS monto_cotizado NUMERIC(14,2) DEFAULT 0;
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS porcentaje_anticipo NUMERIC(5,2) DEFAULT 0;
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS monto_anticipo NUMERIC(14,2) DEFAULT 0;
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS rfc_facturacion VARCHAR(20);
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS razon_social_facturacion VARCHAR(200);
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS uso_cfdi VARCHAR(120);
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS regimen_fiscal VARCHAR(140);
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(80);
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS forma_pago VARCHAR(100);
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS subtotal_factura NUMERIC(14,2) DEFAULT 0;
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS iva_factura NUMERIC(14,2) DEFAULT 0;
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS total_factura NUMERIC(14,2) DEFAULT 0;
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS estado_facturacion VARCHAR(30) DEFAULT 'PENDIENTE';
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS folio_factura VARCHAR(30);
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS fecha_facturacion TIMESTAMP;
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS estado_venta VARCHAR(20) DEFAULT 'COTIZADO';
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS etapa_fabricacion VARCHAR(80) DEFAULT 'Cotizado';
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS fecha_compromiso_entrega DATE;
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP DEFAULT NOW();
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS fecha_cierre TIMESTAMP;
                ALTER TABLE proyectos_venta ADD COLUMN IF NOT EXISTS eliminado BOOLEAN DEFAULT FALSE;

                UPDATE proyectos_venta SET numero_folio = id_proyecto WHERE numero_folio IS NULL OR numero_folio <= 0;
                UPDATE proyectos_venta SET eliminado = FALSE WHERE eliminado IS NULL;
                UPDATE proyectos_venta SET estado_facturacion = 'PENDIENTE' WHERE estado_facturacion IS NULL OR TRIM(estado_facturacion) = '';
                UPDATE proyectos_venta SET subtotal_factura = 0 WHERE subtotal_factura IS NULL;
                UPDATE proyectos_venta SET iva_factura = 0 WHERE iva_factura IS NULL;
                UPDATE proyectos_venta SET total_factura = 0 WHERE total_factura IS NULL;", conexion);
            comando.ExecuteNonQuery();
        }

        private static int ObtenerMenorFolioDisponible(NpgsqlConnection conexion, NpgsqlTransaction? transaccion = null)
        {
            var ocupados = new List<int>();
            using var cmd = new NpgsqlCommand(@"
                SELECT DISTINCT numero_folio
                FROM proyectos_venta
                WHERE NOT COALESCE(eliminado, FALSE) AND numero_folio > 0
                ORDER BY numero_folio ASC;", conexion, transaccion);
            using var lector = cmd.ExecuteReader();
            while (lector.Read())
            {
                ocupados.Add(lector.GetInt32(0));
            }
            return CalculoTanqueService.CalcularMenorEnteroDisponible(ocupados);
        }

        // obtiene el menor folio de factura disponible (FAC-YYYY-001) para el año indicado
        private static string ObtenerSiguienteFolioFactura(NpgsqlConnection conexion, int anio, NpgsqlTransaction? transaccion = null)
        {
            string prefijo = $"FAC-{anio}-";
            var ocupados = new List<int>();

            using var cmd = new NpgsqlCommand(@"
                SELECT folio_factura
                FROM proyectos_venta
                WHERE NOT COALESCE(eliminado, FALSE)
                  AND folio_factura IS NOT NULL
                  AND folio_factura LIKE @patron;", conexion, transaccion);
            cmd.Parameters.AddWithValue("patron", prefijo + "%");

            using var lector = cmd.ExecuteReader();
            while (lector.Read())
            {
                string folio = lector.GetString(0);
                string sufijo = folio.Substring(prefijo.Length);
                if (int.TryParse(sufijo, NumberStyles.Integer, CultureInfo.InvariantCulture, out int num) && num > 0)
                {
                    ocupados.Add(num);
                }
            }

            int menor = CalculoTanqueService.CalcularMenorEnteroDisponible(ocupados);
            return $"{prefijo}{menor:D3}";
        }

        private const string SelectBase = @"
            SELECT pv.id_proyecto, pv.numero_folio, pv.id_cliente, cl.nombre_cliente,
                   pv.id_solicitud, pv.id_calculo,
                   pv.nombre_proyecto, pv.sector, pv.monto_cotizado,
                   pv.porcentaje_anticipo, pv.monto_anticipo,
                   pv.rfc_facturacion, pv.razon_social_facturacion,
                   pv.estado_venta, pv.etapa_fabricacion,
                   pv.fecha_compromiso_entrega, pv.fecha_creacion, pv.fecha_cierre, pv.eliminado,
                   (SELECT ct.numero_folio FROM calculos_tanques ct WHERE ct.id_calculo = pv.id_calculo LIMIT 1) AS folio_calculo,
                   pv.uso_cfdi, pv.regimen_fiscal, pv.metodo_pago, pv.forma_pago,
                   pv.subtotal_factura, pv.iva_factura, pv.total_factura,
                   pv.estado_facturacion, pv.folio_factura, pv.fecha_facturacion
            FROM proyectos_venta pv
            LEFT JOIN clientes cl ON cl.id_cliente = pv.id_cliente";

        public List<ProyectoVenta> Listar(bool eliminados = false)
        {
            var lista = new List<ProyectoVenta>();

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using (var asegurarCalc = new NpgsqlCommand(@"
                CREATE TABLE IF NOT EXISTS calculos_tanques (
                    id_calculo SERIAL PRIMARY KEY,
                    numero_folio INTEGER DEFAULT 1,
                    radio_m NUMERIC(10,4) DEFAULT 1,
                    longitud_m NUMERIC(10,4) DEFAULT 1,
                    tipo_fondo VARCHAR(30) DEFAULT 'Plano',
                    diametro_m NUMERIC(10,4) DEFAULT 2,
                    litros_tanque NUMERIC(14,2) DEFAULT 1,
                    perimetro_m NUMERIC(10,4) DEFAULT 1,
                    area_lamina_m2 NUMERIC(12,4) DEFAULT 1,
                    medida_hoja VARCHAR(20) DEFAULT '1.22x2.44',
                    cantidad_hojas INTEGER DEFAULT 1
                );", conexion))
            {
                asegurarCalc.ExecuteNonQuery();
            }

            string orden = eliminados
                ? " ORDER BY pv.fecha_creacion DESC, pv.id_proyecto DESC;"
                : " ORDER BY pv.numero_folio ASC, pv.fecha_creacion DESC;";

            using var comando = new NpgsqlCommand(
                SelectBase + " WHERE COALESCE(pv.eliminado, FALSE) = @eliminado" + orden, conexion);
            comando.Parameters.AddWithValue("eliminado", eliminados);

            using var lector = comando.ExecuteReader();
            while (lector.Read())
            {
                lista.Add(Mapear(lector));
            }

            return lista;
        }

        public ProyectoVenta? ObtenerPorId(int id_proyecto)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var comando = new NpgsqlCommand(
                SelectBase + " WHERE pv.id_proyecto = @id_proyecto;", conexion);
            comando.Parameters.AddWithValue("id_proyecto", id_proyecto);

            using var lector = comando.ExecuteReader();
            return lector.Read() ? Mapear(lector) : null;
        }

        public ProyectoVenta Crear(ProyectoVentaRequestDTO datos)
        {
            if (string.IsNullOrWhiteSpace(datos.NombreProyecto))
                throw new ArgumentException("El nombre del proyecto (nombre_proyecto) es obligatorio.");

            string nombreLimpio = datos.NombreProyecto.Trim();
            if (nombreLimpio.Length > 200)
                throw new ArgumentException("El nombre del proyecto no puede exceder 200 caracteres.");

            if (datos.MontoCotizado < 0)
                throw new ArgumentException("El monto cotizado no puede ser negativo.");

            string sectorLimpio = ClienteService.NormalizarSector(datos.Sector);
            int? idCliente = (datos.IdCliente == null || datos.IdCliente <= 0) ? null : datos.IdCliente;
            int? idSolicitud = (datos.IdSolicitud == null || datos.IdSolicitud <= 0) ? null : datos.IdSolicitud;
            int? idCalculo = (datos.IdCalculo == null || datos.IdCalculo <= 0) ? null : datos.IdCalculo;

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            int idCreado;
            using (var transaccion = conexion.BeginTransaction())
            {
                int folioDisponible = ObtenerMenorFolioDisponible(conexion, transaccion);

                using (var insertar = new NpgsqlCommand(@"
                    INSERT INTO proyectos_venta (
                        numero_folio, id_cliente, id_solicitud, id_calculo,
                        nombre_proyecto, sector, monto_cotizado,
                        estado_facturacion, estado_venta, etapa_fabricacion, eliminado
                    )
                    VALUES (
                        @numero_folio, @id_cliente, @id_solicitud, @id_calculo,
                        @nombre_proyecto, @sector, @monto_cotizado,
                        'PENDIENTE', 'COTIZADO', 'Cotizado', FALSE
                    )
                    RETURNING id_proyecto;", conexion, transaccion))
                {
                    insertar.Parameters.AddWithValue("numero_folio", folioDisponible);

                    var pCliente = insertar.Parameters.AddWithValue("id_cliente", (object?)idCliente ?? DBNull.Value);
                    pCliente.NpgsqlDbType = NpgsqlDbType.Integer;

                    var pSolicitud = insertar.Parameters.AddWithValue("id_solicitud", (object?)idSolicitud ?? DBNull.Value);
                    pSolicitud.NpgsqlDbType = NpgsqlDbType.Integer;

                    var pCalculo = insertar.Parameters.AddWithValue("id_calculo", (object?)idCalculo ?? DBNull.Value);
                    pCalculo.NpgsqlDbType = NpgsqlDbType.Integer;

                    insertar.Parameters.AddWithValue("nombre_proyecto", nombreLimpio);
                    insertar.Parameters.AddWithValue("sector", sectorLimpio);
                    insertar.Parameters.AddWithValue("monto_cotizado", Math.Round(datos.MontoCotizado, 2));

                    idCreado = (int)insertar.ExecuteScalar()!;
                }

                if (idSolicitud != null)
                {
                    using var marcarSol = new NpgsqlCommand(
                        "UPDATE solicitudes_contacto SET atendida = TRUE WHERE id_solicitud = @id_solicitud;",
                        conexion, transaccion);
                    marcarSol.Parameters.AddWithValue("id_solicitud", idSolicitud.Value);
                    marcarSol.ExecuteNonQuery();
                }

                transaccion.Commit();
            }

            return ObtenerPorId(idCreado)!;
        }

        public ProyectoVenta? CerrarVenta(int id_proyecto, CerrarVentaProyectoDTO datos)
        {
            string estado = (datos.EstadoVenta ?? "").Trim().ToUpperInvariant();
            if (estado != "APROBADO" && estado != "RECHAZADO")
                throw new ArgumentException("El estado_venta para cerrar debe ser APROBADO o RECHAZADO.");

            var actual = ObtenerPorId(id_proyecto);
            if (actual == null) return null;

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            if (estado == "RECHAZADO")
            {
                using var cmdRechazar = new NpgsqlCommand(@"
                    UPDATE proyectos_venta
                    SET estado_venta = 'RECHAZADO',
                        etapa_fabricacion = 'Cotizado',
                        fecha_cierre = NOW()
                    WHERE id_proyecto = @id_proyecto;", conexion);
                cmdRechazar.Parameters.AddWithValue("id_proyecto", id_proyecto);
                cmdRechazar.ExecuteNonQuery();
                return ObtenerPorId(id_proyecto);
            }

            decimal porcentaje = Math.Round(datos.PorcentajeAnticipo ?? 50m, 2);
            if (porcentaje < 0 || porcentaje > 100)
                throw new ArgumentException("El porcentaje de anticipo debe estar entre 0 y 100.");

            decimal montoAnticipo = Math.Round(actual.MontoCotizado * (porcentaje / 100m), 2);
            string? rfc = string.IsNullOrWhiteSpace(datos.RfcFacturacion)
                ? null
                : datos.RfcFacturacion.Trim().ToUpperInvariant();
            string? razonSocial = string.IsNullOrWhiteSpace(datos.RazonSocialFacturacion)
                ? null
                : datos.RazonSocialFacturacion.Trim();

            if (rfc != null && rfc.Length > 20)
                throw new ArgumentException("El RFC de facturación no puede exceder 20 caracteres.");
            if (razonSocial != null && razonSocial.Length > 200)
                throw new ArgumentException("La razón social no puede exceder 200 caracteres.");

            string? usoCfdi = string.IsNullOrWhiteSpace(datos.UsoCfdi) ? actual.UsoCfdi : datos.UsoCfdi.Trim();
            string? regimenFiscal = string.IsNullOrWhiteSpace(datos.RegimenFiscal) ? actual.RegimenFiscal : datos.RegimenFiscal.Trim();

            DateTime? fechaCompromiso = null;
            if (!string.IsNullOrWhiteSpace(datos.FechaCompromisoEntrega))
            {
                if (!DateTime.TryParseExact(
                        datos.FechaCompromisoEntrega.Trim(),
                        "yyyy-MM-dd",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateTime fechaParseada) &&
                    !DateTime.TryParse(datos.FechaCompromisoEntrega.Trim(), out fechaParseada))
                {
                    throw new ArgumentException("La fecha compromiso de entrega no tiene un formato válido (YYYY-MM-DD).");
                }
                fechaCompromiso = fechaParseada.Date;
            }

            string nuevaEtapa = actual.EtapaFabricacion == "Cotizado" || string.IsNullOrWhiteSpace(actual.EtapaFabricacion)
                ? "Aprobado / Anticipo Recibido"
                : actual.EtapaFabricacion;

            using (var cmdAprobar = new NpgsqlCommand(@"
                UPDATE proyectos_venta
                SET estado_venta = 'APROBADO',
                    etapa_fabricacion = @etapa_fabricacion,
                    porcentaje_anticipo = @porcentaje_anticipo,
                    monto_anticipo = @monto_anticipo,
                    rfc_facturacion = @rfc_facturacion,
                    razon_social_facturacion = @razon_social_facturacion,
                    uso_cfdi = COALESCE(@uso_cfdi, uso_cfdi),
                    regimen_fiscal = COALESCE(@regimen_fiscal, regimen_fiscal),
                    estado_facturacion = COALESCE(NULLIF(estado_facturacion, ''), 'PENDIENTE'),
                    fecha_compromiso_entrega = @fecha_compromiso_entrega,
                    fecha_cierre = COALESCE(fecha_cierre, NOW())
                WHERE id_proyecto = @id_proyecto;", conexion))
            {
                cmdAprobar.Parameters.AddWithValue("id_proyecto", id_proyecto);
                cmdAprobar.Parameters.AddWithValue("etapa_fabricacion", nuevaEtapa);
                cmdAprobar.Parameters.AddWithValue("porcentaje_anticipo", porcentaje);
                cmdAprobar.Parameters.AddWithValue("monto_anticipo", montoAnticipo);
                cmdAprobar.Parameters.AddWithValue("rfc_facturacion", (object?)rfc ?? DBNull.Value);
                cmdAprobar.Parameters.AddWithValue("razon_social_facturacion", (object?)razonSocial ?? DBNull.Value);
                cmdAprobar.Parameters.AddWithValue("uso_cfdi", (object?)usoCfdi ?? DBNull.Value);
                cmdAprobar.Parameters.AddWithValue("regimen_fiscal", (object?)regimenFiscal ?? DBNull.Value);

                var pFecha = cmdAprobar.Parameters.AddWithValue(
                    "fecha_compromiso_entrega",
                    fechaCompromiso.HasValue ? fechaCompromiso.Value : DBNull.Value);
                pFecha.NpgsqlDbType = NpgsqlDbType.Date;

                cmdAprobar.ExecuteNonQuery();
            }

            if (actual.IdCliente != null && !string.IsNullOrWhiteSpace(rfc))
            {
                using var actRfc = new NpgsqlCommand(@"
                    UPDATE clientes
                    SET rfc_cliente = COALESCE(NULLIF(rfc_cliente, ''), @rfc)
                    WHERE id_cliente = @id_cliente;", conexion);
                actRfc.Parameters.AddWithValue("rfc", rfc);
                actRfc.Parameters.AddWithValue("id_cliente", actual.IdCliente.Value);
                actRfc.ExecuteNonQuery();
            }

            return ObtenerPorId(id_proyecto);
        }

        // registra los datos fiscales, calcula Subtotal + IVA (16%) + Total y asigna folio_factura (FAC-YYYY-001)
        public ProyectoVenta? Facturar(int id_proyecto, FacturarProyectoDTO datos)
        {
            var actual = ObtenerPorId(id_proyecto);
            if (actual == null) return null;

            if (!string.Equals(actual.EstadoVenta, "APROBADO", StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Únicamente se pueden facturar proyectos con estado APROBADO.");

            string? rfc = string.IsNullOrWhiteSpace(datos.RfcFacturacion)
                ? actual.RfcFacturacion
                : datos.RfcFacturacion.Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(rfc))
                throw new ArgumentException("El RFC de facturación es obligatorio para emitir la factura.");
            if (rfc.Length > 20)
                throw new ArgumentException("El RFC de facturación no puede exceder 20 caracteres.");

            string? razonSocial = string.IsNullOrWhiteSpace(datos.RazonSocialFacturacion)
                ? (actual.RazonSocialFacturacion ?? actual.NombreCliente)
                : datos.RazonSocialFacturacion.Trim();
            if (string.IsNullOrWhiteSpace(razonSocial))
                throw new ArgumentException("La razón social del receptor es obligatoria para emitir la factura.");
            if (razonSocial.Length > 200)
                throw new ArgumentException("La razón social no puede exceder 200 caracteres.");

            string usoCfdi = string.IsNullOrWhiteSpace(datos.UsoCfdi)
                ? "I08 - Otra maquinaria y equipo"
                : datos.UsoCfdi.Trim();
            if (usoCfdi.Length > 120) usoCfdi = usoCfdi.Substring(0, 120);

            string regimenFiscal = string.IsNullOrWhiteSpace(datos.RegimenFiscal)
                ? "601 - General de Ley Personas Morales"
                : datos.RegimenFiscal.Trim();
            if (regimenFiscal.Length > 140) regimenFiscal = regimenFiscal.Substring(0, 140);

            string metodoEntrada = string.IsNullOrWhiteSpace(datos.MetodoPago)
                ? "PUE"
                : datos.MetodoPago.Trim().ToUpperInvariant();
            string metodoPago = metodoEntrada.StartsWith("PPD", StringComparison.OrdinalIgnoreCase) ? "PPD" : "PUE";

            string formaPago = string.IsNullOrWhiteSpace(datos.FormaPago)
                ? "03 - Transferencia electrónica"
                : datos.FormaPago.Trim();
            if (formaPago.Length > 100) formaPago = formaPago.Substring(0, 100);

            string estadoFacturacion = string.IsNullOrWhiteSpace(datos.EstadoFacturacion)
                ? "FACTURADO_TOTAL"
                : datos.EstadoFacturacion.Trim().ToUpperInvariant();

            if (estadoFacturacion != "ANTICIPO_FACTURADO" && estadoFacturacion != "FACTURADO_TOTAL")
                throw new ArgumentException("El estado_facturacion debe ser ANTICIPO_FACTURADO o FACTURADO_TOTAL.");

            decimal subtotal;
            if (estadoFacturacion == "ANTICIPO_FACTURADO")
            {
                if (actual.MontoAnticipo <= 0m)
                    throw new ArgumentException("Este proyecto no tiene un monto de anticipo mayor a $0. Factura el 100% del proyecto o registra el anticipo.");
                subtotal = Math.Round(actual.MontoAnticipo, 2);
            }
            else
            {
                subtotal = Math.Round(actual.MontoCotizado, 2);
            }

            decimal iva = Math.Round(subtotal * TasaIva, 2);
            decimal total = Math.Round(subtotal + iva, 2);
            DateTime ahora = MemebretePdfService.AhoraMexico();

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using (var transaccion = conexion.BeginTransaction())
            {
                string folioFactura = !string.IsNullOrWhiteSpace(actual.FolioFactura)
                    ? actual.FolioFactura.Trim()
                    : ObtenerSiguienteFolioFactura(conexion, ahora.Year, transaccion);

                using (var cmdFact = new NpgsqlCommand(@"
                    UPDATE proyectos_venta
                    SET rfc_facturacion = @rfc,
                        razon_social_facturacion = @razon_social,
                        uso_cfdi = @uso_cfdi,
                        regimen_fiscal = @regimen_fiscal,
                        metodo_pago = @metodo_pago,
                        forma_pago = @forma_pago,
                        subtotal_factura = @subtotal,
                        iva_factura = @iva,
                        total_factura = @total,
                        estado_facturacion = @estado_facturacion,
                        folio_factura = @folio_factura,
                        fecha_facturacion = @fecha_facturacion
                    WHERE id_proyecto = @id_proyecto;", conexion, transaccion))
                {
                    cmdFact.Parameters.AddWithValue("id_proyecto", id_proyecto);
                    cmdFact.Parameters.AddWithValue("rfc", rfc);
                    cmdFact.Parameters.AddWithValue("razon_social", razonSocial);
                    cmdFact.Parameters.AddWithValue("uso_cfdi", usoCfdi);
                    cmdFact.Parameters.AddWithValue("regimen_fiscal", regimenFiscal);
                    cmdFact.Parameters.AddWithValue("metodo_pago", metodoPago);
                    cmdFact.Parameters.AddWithValue("forma_pago", formaPago);
                    cmdFact.Parameters.AddWithValue("subtotal", subtotal);
                    cmdFact.Parameters.AddWithValue("iva", iva);
                    cmdFact.Parameters.AddWithValue("total", total);
                    cmdFact.Parameters.AddWithValue("estado_facturacion", estadoFacturacion);
                    cmdFact.Parameters.AddWithValue("folio_factura", folioFactura);
                    cmdFact.Parameters.AddWithValue("fecha_facturacion", ahora);
                    cmdFact.ExecuteNonQuery();
                }

                if (actual.IdCliente != null && !string.IsNullOrWhiteSpace(rfc))
                {
                    using var actRfc = new NpgsqlCommand(@"
                        UPDATE clientes
                        SET rfc_cliente = COALESCE(NULLIF(rfc_cliente, ''), @rfc)
                        WHERE id_cliente = @id_cliente;", conexion, transaccion);
                    actRfc.Parameters.AddWithValue("rfc", rfc);
                    actRfc.Parameters.AddWithValue("id_cliente", actual.IdCliente.Value);
                    actRfc.ExecuteNonQuery();
                }

                transaccion.Commit();
            }

            return ObtenerPorId(id_proyecto);
        }

        public ProyectoVenta? ActualizarEtapa(int id_proyecto, string? etapaFabricacion)
        {
            if (string.IsNullOrWhiteSpace(etapaFabricacion))
                throw new ArgumentException("Selecciona una etapa de fabricación válida.");

            string limpia = etapaFabricacion.Trim();
            var etapaExacta = EtapasValidas.FirstOrDefault(
                e => string.Equals(e, limpia, StringComparison.OrdinalIgnoreCase));
            if (etapaExacta == null)
                throw new ArgumentException("La etapa de fabricación indicada no pertenece al catálogo válido.");

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var comando = new NpgsqlCommand(@"
                UPDATE proyectos_venta
                SET etapa_fabricacion = @etapa_fabricacion
                WHERE id_proyecto = @id_proyecto;", conexion);
            comando.Parameters.AddWithValue("etapa_fabricacion", etapaExacta);
            comando.Parameters.AddWithValue("id_proyecto", id_proyecto);

            return comando.ExecuteNonQuery() > 0 ? ObtenerPorId(id_proyecto) : null;
        }

        public bool MoverAPapelera(int id_proyecto)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var cmd = new NpgsqlCommand(@"
                UPDATE proyectos_venta
                SET eliminado = TRUE
                WHERE id_proyecto = @id_proyecto AND NOT COALESCE(eliminado, FALSE);", conexion);
            cmd.Parameters.AddWithValue("id_proyecto", id_proyecto);
            return cmd.ExecuteNonQuery() > 0;
        }

        public ProyectoVenta? Restaurar(int id_proyecto)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using (var transaccion = conexion.BeginTransaction())
            {
                int folioActual;
                using (var cmdLeer = new NpgsqlCommand(@"
                    SELECT COALESCE(numero_folio, 0)
                    FROM proyectos_venta
                    WHERE id_proyecto = @id_proyecto AND COALESCE(eliminado, FALSE) = TRUE;", conexion, transaccion))
                {
                    cmdLeer.Parameters.AddWithValue("id_proyecto", id_proyecto);
                    object? res = cmdLeer.ExecuteScalar();
                    if (res == null) return null;
                    folioActual = Convert.ToInt32(res);
                }

                bool ocupado = folioActual <= 0;
                if (!ocupado)
                {
                    using var cmdOcupado = new NpgsqlCommand(@"
                        SELECT 1 FROM proyectos_venta
                        WHERE NOT COALESCE(eliminado, FALSE)
                          AND numero_folio = @folio
                          AND id_proyecto <> @id_proyecto
                        LIMIT 1;", conexion, transaccion);
                    cmdOcupado.Parameters.AddWithValue("folio", folioActual);
                    cmdOcupado.Parameters.AddWithValue("id_proyecto", id_proyecto);
                    ocupado = cmdOcupado.ExecuteScalar() != null;
                }

                int folioFinal = ocupado ? ObtenerMenorFolioDisponible(conexion, transaccion) : folioActual;

                using (var cmdRest = new NpgsqlCommand(@"
                    UPDATE proyectos_venta
                    SET eliminado = FALSE, numero_folio = @folio_final
                    WHERE id_proyecto = @id_proyecto;", conexion, transaccion))
                {
                    cmdRest.Parameters.AddWithValue("folio_final", folioFinal);
                    cmdRest.Parameters.AddWithValue("id_proyecto", id_proyecto);
                    cmdRest.ExecuteNonQuery();
                }

                transaccion.Commit();
            }

            return ObtenerPorId(id_proyecto);
        }

        public bool EliminarDefinitivo(int id_proyecto)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var cmd = new NpgsqlCommand(
                "DELETE FROM proyectos_venta WHERE id_proyecto = @id_proyecto;", conexion);
            cmd.Parameters.AddWithValue("id_proyecto", id_proyecto);
            return cmd.ExecuteNonQuery() > 0;
        }

        // consulta publica sin datos sensibles aceptando formato LUX-2026-001 o el numero de folio
        public SeguimientoPublicoProyectoDTO? ObtenerSeguimientoPublico(string? folioTexto)
        {
            if (string.IsNullOrWhiteSpace(folioTexto)) return null;
            string limpio = folioTexto.Trim().ToUpperInvariant();

            int? numeroBuscado = null;
            int? anioBuscado = null;

            var matchLux = Regex.Match(limpio, @"^(?:LUX[-_\s]?)?(?<anio>20\d{2})[-_\s](?<num>\d+)$");
            if (matchLux.Success)
            {
                anioBuscado = int.Parse(matchLux.Groups["anio"].Value, CultureInfo.InvariantCulture);
                numeroBuscado = int.Parse(matchLux.Groups["num"].Value, CultureInfo.InvariantCulture);
            }
            else if (int.TryParse(Regex.Replace(limpio, @"\D", ""), out int soloNumero) && soloNumero > 0)
            {
                numeroBuscado = soloNumero;
            }

            if (numeroBuscado == null) return null;

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            string sql = @"
                SELECT numero_folio, nombre_proyecto, etapa_fabricacion, fecha_compromiso_entrega, fecha_creacion
                FROM proyectos_venta
                WHERE NOT COALESCE(eliminado, FALSE)
                  AND numero_folio = @numero_folio"
                + (anioBuscado.HasValue ? " AND EXTRACT(YEAR FROM fecha_creacion) = @anio" : "")
                + " ORDER BY fecha_creacion DESC LIMIT 1;";

            using var cmd = new NpgsqlCommand(sql, conexion);
            cmd.Parameters.AddWithValue("numero_folio", numeroBuscado.Value);
            if (anioBuscado.HasValue)
                cmd.Parameters.AddWithValue("anio", anioBuscado.Value);

            using var lector = cmd.ExecuteReader();
            if (!lector.Read()) return null;

            int numFolio = lector.GetInt32(0);
            string nombreProy = lector.GetString(1);
            string etapa = lector.IsDBNull(2) ? "Cotizado" : lector.GetString(2);
            string? fechaCompromiso = lector.IsDBNull(3)
                ? null
                : lector.GetDateTime(3).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            DateTime fechaCreacion = lector.IsDBNull(4) ? DateTime.Now : lector.GetDateTime(4);

            return new SeguimientoPublicoProyectoDTO
            {
                Folio = FormatearCodigoFolio(numFolio, fechaCreacion),
                NombreProyecto = nombreProy,
                EtapaFabricacion = etapa,
                FechaCompromisoEntrega = fechaCompromiso
            };
        }

        private static ProyectoVenta Mapear(NpgsqlDataReader lector)
        {
            int idProy = lector.GetInt32(0);
            int numFolio = lector.IsDBNull(1) ? idProy : lector.GetInt32(1);
            if (numFolio <= 0) numFolio = idProy;
            DateTime fechaCreacion = lector.IsDBNull(16) ? DateTime.Now : lector.GetDateTime(16);

            return new ProyectoVenta
            {
                IdProyecto = idProy,
                NumeroFolio = numFolio,
                CodigoFolio = FormatearCodigoFolio(numFolio, fechaCreacion),
                IdCliente = lector.IsDBNull(2) ? null : lector.GetInt32(2),
                NombreCliente = lector.IsDBNull(3) ? null : lector.GetString(3),
                IdSolicitud = lector.IsDBNull(4) ? null : lector.GetInt32(4),
                IdCalculo = lector.IsDBNull(5) ? null : lector.GetInt32(5),
                NombreProyecto = lector.IsDBNull(6) ? "" : lector.GetString(6),
                Sector = lector.IsDBNull(7) ? "Otro" : lector.GetString(7),
                MontoCotizado = lector.IsDBNull(8) ? 0m : lector.GetDecimal(8),
                PorcentajeAnticipo = lector.IsDBNull(9) ? 0m : lector.GetDecimal(9),
                MontoAnticipo = lector.IsDBNull(10) ? 0m : lector.GetDecimal(10),
                RfcFacturacion = lector.IsDBNull(11) ? null : lector.GetString(11),
                RazonSocialFacturacion = lector.IsDBNull(12) ? null : lector.GetString(12),
                EstadoVenta = lector.IsDBNull(13) ? "COTIZADO" : lector.GetString(13),
                EtapaFabricacion = lector.IsDBNull(14) ? "Cotizado" : lector.GetString(14),
                FechaCompromisoEntrega = lector.IsDBNull(15)
                    ? null
                    : lector.GetDateTime(15).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                FechaCreacion = fechaCreacion,
                FechaCierre = lector.IsDBNull(17) ? null : lector.GetDateTime(17),
                Eliminado = !lector.IsDBNull(18) && lector.GetBoolean(18),
                FolioCalculo = lector.IsDBNull(19) ? null : lector.GetInt32(19),
                UsoCfdi = lector.IsDBNull(20) ? null : lector.GetString(20),
                RegimenFiscal = lector.IsDBNull(21) ? null : lector.GetString(21),
                MetodoPago = lector.IsDBNull(22) ? null : lector.GetString(22),
                FormaPago = lector.IsDBNull(23) ? null : lector.GetString(23),
                SubtotalFactura = lector.IsDBNull(24) ? 0m : lector.GetDecimal(24),
                IvaFactura = lector.IsDBNull(25) ? 0m : lector.GetDecimal(25),
                TotalFactura = lector.IsDBNull(26) ? 0m : lector.GetDecimal(26),
                EstadoFacturacion = lector.IsDBNull(27) ? "PENDIENTE" : lector.GetString(27),
                FolioFactura = lector.IsDBNull(28) ? null : lector.GetString(28),
                FechaFacturacion = lector.IsDBNull(29) ? null : lector.GetDateTime(29)
            };
        }
    }
}
