using System;
using System.Collections.Generic;
using System.Globalization;
using Npgsql;
using NpgsqlTypes;
using Microsoft.Extensions.Configuration;

namespace LuxmanErp.Services
{
    // inicializa y migra de forma idempotente el catalogo de 10 clientes y el historico comercial 2025-2026
    // deja exactamente 1 proyecto APROBADO activo en taller (entrega 2026-12-28) y 16 entregados con acta (10 en 2025 + 6 en 2026)
    public class HistoricoComercialSeeder
    {
        private readonly string cadenaConexion;
        private const decimal TasaIva = 0.16m;

        // firma digital PNG valida para las actas de entrega historicas (2025-2026)
        private const string FirmaHistoricaBase64 =
            "data:image/png;base64,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";

        private record SemillaCliente(string Nombre, string Sector, string Rfc, string Telefono, string Correo, bool Descuento);

        private record SemillaProyecto(
            int Folio,
            string ClienteClave,
            string NombreProyecto,
            string Sector,
            decimal MontoCotizado,
            string EstadoVenta,
            string EtapaFabricacion,
            decimal PorcentajeAnticipo,
            string FechaCreacion,
            string? FechaCierre,
            string? FechaCompromiso,
            string EstadoFacturacion = "PENDIENTE",
            string? FolioFactura = null,
            string? MetodoPago = null,
            string? FechaFacturacion = null,
            string? ReceptorActa = null,
            string? PuestoActa = null,
            string? ObservacionesActa = null
        );

        private record AjusteEntrega2026(
            string NombreProyecto,
            string FechaCreacion,
            string FechaCierre,
            string FechaEntrega,
            string FolioFacturaPreferido,
            string ReceptorActa,
            string PuestoActa,
            string ObservacionesActa
        );

        public HistoricoComercialSeeder(IConfiguration configuracion)
        {
            cadenaConexion = configuracion.GetConnectionString("DefaultConnection")
                ?? configuracion.GetConnectionString("LuxmanDb")
                ?? throw new InvalidOperationException("No se encontro la cadena de conexion en el appsettings.");
        }

        public void SembrarSiVacio()
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();

            ActaEntregaService.AsegurarTabla(conexion);

            long totalExistentes;
            long registros2024;
            using (var cmdEstado = new NpgsqlCommand(@"
                SELECT
                    COUNT(*),
                    COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM fecha_creacion) < 2025)
                FROM proyectos_venta;", conexion))
            {
                using var lector = cmdEstado.ExecuteReader();
                lector.Read();
                totalExistentes = lector.GetInt64(0);
                registros2024 = lector.GetInt64(1);
            }

            // si la base ya cuenta con el historico 2025-2026 (sin registros 2024),
            // verificamos si aun tiene los 4 pedidos activos anteriores para migrarlos de forma segura a 1 solo activo
            if (totalExistentes > 0 && registros2024 == 0)
            {
                MigrarCuatroActivosAUnoSiAplica(conexion);
                return;
            }

            using var transaccion = conexion.BeginTransaction();

            // si venimos de una base con registros de 2024, limpiamos unicamente la semilla antigua sin tocar calculos_tanques ni MongoDB
            if (registros2024 > 0)
            {
                using (var limpiarActasAntiguas = new NpgsqlCommand(@"
                    DELETE FROM actas_entrega
                    WHERE id_proyecto IN (
                        SELECT id_proyecto
                        FROM proyectos_venta
                        WHERE id_solicitud IS NULL
                          AND id_calculo IS NULL
                          AND (EXTRACT(YEAR FROM fecha_creacion) < 2025 OR fecha_creacion <= '2026-11-26 23:59:59')
                    );", conexion, transaccion))
                {
                    limpiarActasAntiguas.ExecuteNonQuery();
                }

                using (var limpiarProyectosAntiguos = new NpgsqlCommand(@"
                    DELETE FROM proyectos_venta
                    WHERE id_solicitud IS NULL
                      AND id_calculo IS NULL
                      AND (EXTRACT(YEAR FROM fecha_creacion) < 2025 OR fecha_creacion <= '2026-11-26 23:59:59');", conexion, transaccion))
                {
                    limpiarProyectosAntiguos.ExecuteNonQuery();
                }
            }

            // normalizamos posible variante sin tilde del cliente semilla original
            using (var normLacteos = new NpgsqlCommand(@"
                UPDATE clientes
                SET nombre_cliente = 'Lácteos del Norte SA de CV'
                WHERE LOWER(TRIM(nombre_cliente)) = 'lacteos del norte sa de cv';", conexion, transaccion))
            {
                normLacteos.ExecuteNonQuery();
            }

            // 1. Catalogo completo de 10 clientes mexicanos realistas
            var catalogoClientes = new SemillaCliente[]
            {
                new("Cosméticos Naturales Ideal SA de CV", "Cosmética", "CNI1405228H4", "55 5389 4120", "compras@cosmeticosideal.com.mx", false),
                new("Farbe SA de CV", "Química", "FAR081113K92", "55 5714 8830", "ingenieria@farbemexico.com", false),
                new("Lácteos del Norte SA de CV", "Agroalimentaria", "LNO010101ABC", "81 1234 5678", "compras@lacteosdelnorte.com", true),
                new("Laboratorios BioFarma del Bajío SA de CV", "Farmacéutica", "LBB160309M41", "477 718 9045", "planta@biofarmabajio.mx", false),
                new("Alimentos y Derivados La Huasteca SA de CV", "Agroalimentaria", "ADL120817P76", "444 824 6310", "proyectos@lahuastecaalimentos.com", false),
                new("Dermocosmética Botánica de Occidente SA de CV", "Cosmética", "DBO190225T18", "33 3615 7420", "adquisiciones@dermobotanica.mx", false),
                new("Especialidades Químicas Ecatepec SA de CV", "Química", "EQE110704R53", "55 5836 2291", "gerencia.planta@equimecatepec.com.mx", false),
                new("Ingeniería en Aguas Industriales del Centro SA de CV", "Tratamiento de Aguas", "IAI150930V69", "442 215 4870", "operaciones@aguasdelcentro.mx", false),
                new("Farmacéutica Sanitaria Metropolitana SA de CV", "Farmacéutica", "FSM130412J85", "55 5547 9302", "mantenimiento@farmametropolitana.com", false),
                new("Procesadora Agroindustrial de Puebla SA de CV", "Agroalimentaria", "PAP171019L34", "222 248 5190", "compras@agropuebla.com.mx", false),
            };

            var idsPorCliente = new Dictionary<string, (int Id, string Rfc)>(StringComparer.OrdinalIgnoreCase);

            foreach (var cl in catalogoClientes)
            {
                int? idExistente = null;
                using (var cmdBuscar = new NpgsqlCommand(@"
                    SELECT id_cliente FROM clientes
                    WHERE LOWER(TRIM(nombre_cliente)) = LOWER(@nombre)
                    LIMIT 1;", conexion, transaccion))
                {
                    cmdBuscar.Parameters.AddWithValue("nombre", cl.Nombre);
                    object? res = cmdBuscar.ExecuteScalar();
                    if (res != null) idExistente = Convert.ToInt32(res);
                }

                if (idExistente.HasValue)
                {
                    using var cmdActualizar = new NpgsqlCommand(@"
                        UPDATE clientes
                        SET sector = @sector,
                            rfc_cliente = COALESCE(NULLIF(rfc_cliente, ''), @rfc),
                            telefono = COALESCE(NULLIF(telefono, ''), @telefono),
                            correo = COALESCE(NULLIF(correo, ''), @correo),
                            fecha_alta = CASE WHEN EXTRACT(YEAR FROM fecha_alta) < 2025 THEN TIMESTAMP '2025-01-08 09:00:00' ELSE fecha_alta END
                        WHERE id_cliente = @id;", conexion, transaccion);
                    cmdActualizar.Parameters.AddWithValue("id", idExistente.Value);
                    cmdActualizar.Parameters.AddWithValue("sector", cl.Sector);
                    cmdActualizar.Parameters.AddWithValue("rfc", cl.Rfc);
                    cmdActualizar.Parameters.AddWithValue("telefono", cl.Telefono);
                    cmdActualizar.Parameters.AddWithValue("correo", cl.Correo);
                    cmdActualizar.ExecuteNonQuery();

                    idsPorCliente[cl.Nombre] = (idExistente.Value, cl.Rfc);
                }
                else
                {
                    using var cmdInsertar = new NpgsqlCommand(@"
                        INSERT INTO clientes (nombre_cliente, sector, rfc_cliente, telefono, correo, tiene_descuento, fecha_alta)
                        VALUES (@nombre, @sector, @rfc, @telefono, @correo, @descuento, '2025-01-08 09:00:00')
                        RETURNING id_cliente;", conexion, transaccion);
                    cmdInsertar.Parameters.AddWithValue("nombre", cl.Nombre);
                    cmdInsertar.Parameters.AddWithValue("sector", cl.Sector);
                    cmdInsertar.Parameters.AddWithValue("rfc", cl.Rfc);
                    cmdInsertar.Parameters.AddWithValue("telefono", cl.Telefono);
                    cmdInsertar.Parameters.AddWithValue("correo", cl.Correo);
                    cmdInsertar.Parameters.AddWithValue("descuento", cl.Descuento);

                    int nuevoId = (int)cmdInsertar.ExecuteScalar()!;
                    idsPorCliente[cl.Nombre] = (nuevoId, cl.Rfc);
                }
            }

            // 2. Historico comercial 2025-2026 (40 proyectos: 17 APROBADO [42.5% cierre], 19 RECHAZADO, 4 COTIZADO)
            //    - 2025: 10 APROBADO (todos Entregado con acta) + 12 RECHAZADO
            //    - 2026: 7 APROBADO (6 Entregado feb-nov 2026 con acta + 1 unico activo en taller entrega 2026-12-28) + 7 RECHAZADO + 4 COTIZADO
            //    - Todos los montos entre $80,000 y $160,000 MXN (< $200,000 MXN)
            var historico = new SemillaProyecto[]
            {
                // ===== 2025 (22 proyectos: 10 APROBADO Entregado + 12 RECHAZADO) =====
                new(1, "Lácteos del Norte SA de CV", "Tanque de Recepción Sanitario 1,500 L Fondo Cónico", "Agroalimentaria", 124000m,
                    "APROBADO", "Entregado", 50m, "2025-01-10 10:15:00", "2025-01-15 16:30:00", "2025-02-14",
                    "FACTURADO_TOTAL", "FAC-2025-001", "PUE", "2025-02-14 14:10:00",
                    "Ing. Gerardo Villarreal", "Jefe de Planta Láctea", "Tanque sanitario AISI 304 recibido con pruebas hidrostáticas aprobadas."),

                new(2, "Dermocosmética Botánica de Occidente SA de CV", "Marmita Fundidora de Ceras 300 L AISI 304", "Cosmética", 96000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-01-22 11:20:00", "2025-02-04 13:00:00", null),

                new(3, "Cosméticos Naturales Ideal SA de CV", "Marmita Enchaquetada con Agitación 500 L", "Cosmética", 142000m,
                    "APROBADO", "Entregado", 50m, "2025-02-05 09:45:00", "2025-02-11 17:10:00", "2025-03-18",
                    "FACTURADO_TOTAL", "FAC-2025-002", "PUE", "2025-03-18 14:15:00",
                    "Ing. Claudia Mondragón", "Gerente de Producción Cosmética", "Marmita recibida con chaqueta térmica y acabado espejo interior."),

                new(4, "Especialidades Químicas Ecatepec SA de CV", "Tanque Dosificador de Reactivos 800 L AISI 316", "Química", 118000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-02-18 12:00:00", "2025-03-03 10:30:00", null),

                new(5, "Laboratorios BioFarma del Bajío SA de CV", "Tanque de Preparación Estéril 600 L Fondo Toriesférico", "Farmacéutica", 156000m,
                    "APROBADO", "Entregado", 50m, "2025-03-04 11:30:00", "2025-03-10 15:20:00", "2025-04-15",
                    "FACTURADO_TOTAL", "FAC-2025-003", "PUE", "2025-04-15 14:00:00",
                    "QFB Mariana Solís", "Aseguramiento de Calidad", "Equipo validado en sitio con rugosidad sanitaria conforme a especificación."),

                new(6, "Alimentos y Derivados La Huasteca SA de CV", "Tina Quesera Sanitaria 600 L Fondo Plano", "Agroalimentaria", 84000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-03-19 15:40:00", "2025-04-02 11:15:00", null),

                new(7, "Ingeniería en Aguas Industriales del Centro SA de CV", "Tanque Pulmón de Agua Osmotizada 2,000 L", "Tratamiento de Aguas", 132000m,
                    "APROBADO", "Entregado", 50m, "2025-04-03 09:30:00", "2025-04-09 18:00:00", "2025-05-16",
                    "FACTURADO_TOTAL", "FAC-2025-004", "PUE", "2025-05-16 14:30:00",
                    "Ing. Héctor Domínguez", "Coordinador de Operaciones", "Tanque vertical de 2,000 L instalado y conectado a red de agua purificada."),

                new(8, "Farmacéutica Sanitaria Metropolitana SA de CV", "Tanque Colector Sanitario 1,000 L AISI 316L", "Farmacéutica", 158000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-04-17 16:15:00", "2025-05-02 11:40:00", null),

                new(9, "Farbe SA de CV", "Tanque Mezclador Químico 1,200 L AISI 316", "Química", 148000m,
                    "APROBADO", "Entregado", 60m, "2025-05-06 10:30:00", "2025-05-12 16:45:00", "2025-06-19",
                    "FACTURADO_TOTAL", "FAC-2025-005", "PUE", "2025-06-19 14:20:00",
                    "Ing. Arturo Peñaloza", "Superintendente de Ingeniería", "Entrega conforme con dossier de soldadura TIG y certificado de material 316."),

                new(10, "Procesadora Agroindustrial de Puebla SA de CV", "Tanque Mezclador de Jarabes 1,000 L", "Agroalimentaria", 112000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-05-21 13:10:00", "2025-06-04 12:30:00", null),

                new(11, "Alimentos y Derivados La Huasteca SA de CV", "Mezcladora Horizontal Inoxidable 500 L", "Agroalimentaria", 138000m,
                    "APROBADO", "Entregado", 50m, "2025-06-09 11:00:00", "2025-06-16 15:45:00", "2025-07-22",
                    "FACTURADO_TOTAL", "FAC-2025-006", "PUE", "2025-07-22 14:00:00",
                    "Ing. Rubén Castellanos", "Jefe de Mantenimiento", "Mezcladora horizontal entregada con motorreductor trifásico y guarda de seguridad."),

                new(12, "Cosméticos Naturales Ideal SA de CV", "Tanque Almacenamiento Glicerina 1,500 L", "Cosmética", 108000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-06-25 10:50:00", "2025-07-09 13:25:00", null),

                new(13, "Farmacéutica Sanitaria Metropolitana SA de CV", "Tanque Móvil Sanitario 400 L Acabado Espejo", "Farmacéutica", 115000m,
                    "APROBADO", "Entregado", 50m, "2025-07-11 10:20:00", "2025-07-17 16:00:00", "2025-08-25",
                    "FACTURADO_TOTAL", "FAC-2025-007", "PUE", "2025-08-25 14:10:00",
                    "Ing. Gabriela Morales", "Jefa de Validación Sanitaria", "Tanque móvil sanitario recibido con rodajas grado farmacéutico y tapa hermética."),

                new(14, "Farbe SA de CV", "Sistema de Agitación Turbina Inoxidable 1,500 L", "Química", 82000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-07-28 12:40:00", "2025-08-11 10:00:00", null),

                new(15, "Procesadora Agroindustrial de Puebla SA de CV", "Marmita de Volteo Sanitaria 400 L AISI 304", "Agroalimentaria", 119000m,
                    "APROBADO", "Entregado", 50m, "2025-08-12 09:40:00", "2025-08-18 17:00:00", "2025-09-24",
                    "FACTURADO_TOTAL", "FAC-2025-008", "PUE", "2025-09-24 14:30:00",
                    "Ing. Mauricio Téllez", "Gerente de Planta", "Marmita de volteo entregada de conformidad y probada en línea de cocción."),

                new(16, "Ingeniería en Aguas Industriales del Centro SA de CV", "Filtro Multimedia en Acero Inoxidable 304 de 1,500 L", "Tratamiento de Aguas", 129000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-08-27 14:20:00", "2025-09-10 16:10:00", null),

                new(17, "Dermocosmética Botánica de Occidente SA de CV", "Tanque Emulsionador Cosmético 500 L", "Cosmética", 136000m,
                    "APROBADO", "Entregado", 50m, "2025-09-11 10:15:00", "2025-09-17 16:20:00", "2025-10-27",
                    "FACTURADO_TOTAL", "FAC-2025-009", "PUE", "2025-10-27 14:15:00",
                    "Lic. Valeria Ochoa", "Directora de Operaciones", "Equipo recibido con registro sanitario y férulas Clamp completas."),

                new(18, "Lácteos del Norte SA de CV", "Tanque Isotérmico de Crema 1,200 L", "Agroalimentaria", 145000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-09-29 11:05:00", "2025-10-13 12:15:00", null),

                new(19, "Especialidades Químicas Ecatepec SA de CV", "Tanque de Neutralización 1,500 L AISI 316", "Química", 152000m,
                    "APROBADO", "Entregado", 50m, "2025-10-15 10:25:00", "2025-10-21 17:05:00", "2025-11-28",
                    "FACTURADO_TOTAL", "FAC-2025-010", "PUE", "2025-11-28 14:20:00",
                    "Ing. Fernando Alcántara", "Gerente de Planta", "Tanque de neutralización entregado y recibido de conformidad en planta Ecatepec."),

                new(20, "Laboratorios BioFarma del Bajío SA de CV", "Recipiente Presurizado Sanitario 250 L AISI 316L", "Farmacéutica", 134000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-10-30 15:10:00", "2025-11-14 11:30:00", null),

                new(21, "Alimentos y Derivados La Huasteca SA de CV", "Tolva Cónica Dosificadora Inoxidable 800 L", "Agroalimentaria", 88000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-11-18 10:30:00", "2025-12-02 14:00:00", null),

                new(22, "Dermocosmética Botánica de Occidente SA de CV", "Tanque Pulmón de Hidrolatos 1,000 L", "Cosmética", 98000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-12-04 12:15:00", "2025-12-18 16:30:00", null),

                // ===== 2026 (18 proyectos: 6 Entregado [feb-nov 2026] + 1 activo en taller + 7 RECHAZADO + 4 COTIZADO) =====
                new(23, "Lácteos del Norte SA de CV", "Tanque Pasteurizador Lácteo 1,000 L Fondo Cónico", "Agroalimentaria", 146000m,
                    "APROBADO", "Entregado", 50m, "2026-01-14 10:15:00", "2026-01-20 15:40:00", "2026-02-27",
                    "FACTURADO_TOTAL", "FAC-2026-001", "PUE", "2026-02-27 14:15:00",
                    "Ing. Gerardo Villarreal", "Jefe de Planta Láctea", "Tanque pasteurizador recibido con chaqueta térmica y válvulas sanitarias."),

                new(24, "Procesadora Agroindustrial de Puebla SA de CV", "Tanque de Salmuera Inoxidable 1,200 L AISI 316", "Agroalimentaria", 114000m,
                    "RECHAZADO", "Cotizado", 0m, "2026-02-04 10:15:00", "2026-02-18 12:00:00", null),

                new(25, "Ingeniería en Aguas Industriales del Centro SA de CV", "Tanque de Agua Purificada 2,500 L AISI 304", "Tratamiento de Aguas", 139000m,
                    "APROBADO", "Entregado", 50m, "2026-03-03 09:40:00", "2026-03-09 16:20:00", "2026-04-17",
                    "FACTURADO_TOTAL", "FAC-2026-002", "PUE", "2026-04-17 14:20:00",
                    "Ing. Héctor Domínguez", "Coordinador de Operaciones", "Tanque de agua purificada 2,500 L entregado y validado en sitio."),

                new(26, "Cosméticos Naturales Ideal SA de CV", "Marmita Mezcladora de Cremas 300 L", "Cosmética", 105000m,
                    "RECHAZADO", "Cotizado", 0m, "2026-03-25 13:30:00", "2026-04-08 11:10:00", null),

                new(27, "Laboratorios BioFarma del Bajío SA de CV", "Tanque de Soluciones Estériles 500 L AISI 316L", "Farmacéutica", 154000m,
                    "APROBADO", "Entregado", 50m, "2026-04-21 10:25:00", "2026-04-28 17:05:00", "2026-06-08",
                    "FACTURADO_TOTAL", "FAC-2026-003", "PUE", "2026-06-08 14:10:00",
                    "QFB Mariana Solís", "Aseguramiento de Calidad", "Tanque estéril AISI 316L recibido con certificado de calidad y acabado sanitario."),

                new(28, "Especialidades Químicas Ecatepec SA de CV", "Tanque Buffer para Solventes 1,000 L AISI 316", "Química", 126000m,
                    "RECHAZADO", "Cotizado", 0m, "2026-05-19 11:40:00", "2026-06-02 14:20:00", null),

                new(29, "Farmacéutica Sanitaria Metropolitana SA de CV", "Tanque Móvil de Transferencia Sanitaria 250 L", "Farmacéutica", 86000m,
                    "RECHAZADO", "Cotizado", 0m, "2026-06-23 15:00:00", "2026-07-07 10:30:00", null),

                new(30, "Ingeniería en Aguas Industriales del Centro SA de CV", "Tanque Dosificador de Hipoclorito 1,500 L AISI 316", "Tratamiento de Aguas", 135000m,
                    "RECHAZADO", "Cotizado", 0m, "2026-07-29 12:10:00", "2026-08-12 16:45:00", null),

                new(31, "Alimentos y Derivados La Huasteca SA de CV", "Tanque Cocedor de Salsas 600 L Fondo Cónico", "Agroalimentaria", 122000m,
                    "RECHAZADO", "Cotizado", 0m, "2026-08-26 10:05:00", "2026-09-09 13:15:00", null),

                new(32, "Farbe SA de CV", "Tanque Pulmón de Emulsiones 1,200 L AISI 304", "Química", 109000m,
                    "RECHAZADO", "Cotizado", 0m, "2026-09-22 14:30:00", "2026-10-06 11:50:00", null),

                new(33, "Procesadora Agroindustrial de Puebla SA de CV", "Tanque Enchaquetado Pasteurizador 1,200 L Fondo Cónico", "Agroalimentaria", 149000m,
                    "APROBADO", "Entregado", 50m, "2026-07-08 10:00:00", "2026-07-14 14:30:00", "2026-08-21",
                    "FACTURADO_TOTAL", "FAC-2026-004", "PUE", "2026-08-21 14:15:00",
                    "Ing. Mauricio Téllez", "Gerente de Planta", "Tanque enchaquetado pasteurizador entregado con pruebas de presión en chaqueta aprobadas."),

                new(34, "Farmacéutica Sanitaria Metropolitana SA de CV", "Reactor Sanitario 500 L Fondo Toriesférico AISI 316L", "Farmacéutica", 160000m,
                    "APROBADO", "Entregado", 60m, "2026-08-19 11:45:00", "2026-08-25 16:00:00", "2026-10-02",
                    "FACTURADO_TOTAL", "FAC-2026-005", "PUE", "2026-10-02 14:20:00",
                    "Ing. Gabriela Morales", "Jefa de Validación Sanitaria", "Reactor sanitario AISI 316L entregado con dossier de pulido sanitario y certificados de colada."),

                new(35, "Farbe SA de CV", "Reactor de Resinas 1,500 L Acero Inoxidable 316L", "Química", 158000m,
                    "APROBADO", "Entregado", 50m, "2026-09-30 12:10:00", "2026-10-05 17:30:00", "2026-11-13",
                    "FACTURADO_TOTAL", "FAC-2026-006", "PUE", "2026-11-13 14:10:00",
                    "Ing. Arturo Peñaloza", "Superintendente de Ingeniería", "Reactor de resinas 316L entregado en planta y recibido de entera conformidad."),

                // --- UNICO proyecto APROBADO activo actualmente en taller (entrega 28/12/2026) ---
                new(36, "Cosméticos Naturales Ideal SA de CV", "Tanque de Formulaciones Cosméticas 1,000 L con Agitación", "Cosmética", 138000m,
                    "APROBADO", "Soldadura y Pulido Sanitario", 50m, "2026-11-12 09:50:00", "2026-11-17 13:15:00", "2026-12-28"),

                // --- 4 proyectos COTIZADO pendientes de cierre (noviembre 2026) ---
                new(37, "Lácteos del Norte SA de CV", "Tanque de Crema Maduradora 800 L Fondo Cónico", "Agroalimentaria", 128000m,
                    "COTIZADO", "Cotizado", 0m, "2026-11-19 10:20:00", null, null),

                new(38, "Laboratorios BioFarma del Bajío SA de CV", "Tanque Móvil Estéril 200 L AISI 316L", "Farmacéutica", 80000m,
                    "COTIZADO", "Cotizado", 0m, "2026-11-21 15:10:00", null, null),

                new(39, "Ingeniería en Aguas Industriales del Centro SA de CV", "Tanque de Contacto Cloración 2,000 L AISI 316", "Tratamiento de Aguas", 144000m,
                    "COTIZADO", "Cotizado", 0m, "2026-11-24 11:05:00", null, null),

                new(40, "Dermocosmética Botánica de Occidente SA de CV", "Marmita Mezcladora de Geles 600 L con Bola CIP", "Cosmética", 151000m,
                    "COTIZADO", "Cotizado", 0m, "2026-11-26 16:40:00", null, null),
            };

            var foliosOcupadosProy = new HashSet<int>();
            using (var cmdOcc = new NpgsqlCommand("SELECT DISTINCT numero_folio FROM proyectos_venta WHERE NOT COALESCE(eliminado, FALSE);", conexion, transaccion))
            {
                using var r = cmdOcc.ExecuteReader();
                while (r.Read()) foliosOcupadosProy.Add(r.GetInt32(0));
            }

            var foliosOcupadosActa = new HashSet<int>();
            using (var cmdOccA = new NpgsqlCommand("SELECT DISTINCT numero_folio FROM actas_entrega WHERE NOT COALESCE(eliminado, FALSE);", conexion, transaccion))
            {
                using var r = cmdOccA.ExecuteReader();
                while (r.Read()) foliosOcupadosActa.Add(r.GetInt32(0));
            }

            int folioActaCursor = 1;
            foreach (var p in historico)
            {
                int folioAsignado = p.Folio;
                while (foliosOcupadosProy.Contains(folioAsignado)) folioAsignado++;
                foliosOcupadosProy.Add(folioAsignado);

                var infoCliente = idsPorCliente[p.ClienteClave];
                decimal montoAnticipo = p.EstadoVenta == "APROBADO"
                    ? Math.Round(p.MontoCotizado * (p.PorcentajeAnticipo / 100m), 2)
                    : 0m;

                bool estaFacturado = p.EstadoFacturacion == "FACTURADO_TOTAL" || p.EstadoFacturacion == "ANTICIPO_FACTURADO";
                decimal subtotalFactura = 0m;
                decimal ivaFactura = 0m;
                decimal totalFactura = 0m;

                if (estaFacturado)
                {
                    subtotalFactura = p.EstadoFacturacion == "ANTICIPO_FACTURADO" ? montoAnticipo : p.MontoCotizado;
                    ivaFactura = Math.Round(subtotalFactura * TasaIva, 2);
                    totalFactura = Math.Round(subtotalFactura + ivaFactura, 2);
                }

                DateTime fechaCreacion = DateTime.Parse(p.FechaCreacion, CultureInfo.InvariantCulture);
                DateTime? fechaCierre = p.FechaCierre != null ? DateTime.Parse(p.FechaCierre, CultureInfo.InvariantCulture) : null;
                DateTime? fechaCompromiso = p.FechaCompromiso != null ? DateTime.Parse(p.FechaCompromiso, CultureInfo.InvariantCulture).Date : null;
                DateTime? fechaFacturacion = p.FechaFacturacion != null ? DateTime.Parse(p.FechaFacturacion, CultureInfo.InvariantCulture) : null;

                int idProyectoInsertado;
                using (var cmdProy = new NpgsqlCommand(@"
                    INSERT INTO proyectos_venta (
                        numero_folio, id_cliente, nombre_proyecto, sector,
                        monto_cotizado, porcentaje_anticipo, monto_anticipo,
                        rfc_facturacion, razon_social_facturacion,
                        uso_cfdi, regimen_fiscal, metodo_pago, forma_pago,
                        subtotal_factura, iva_factura, total_factura,
                        estado_facturacion, folio_factura, fecha_facturacion,
                        estado_venta, etapa_fabricacion,
                        fecha_compromiso_entrega, fecha_creacion, fecha_cierre, eliminado
                    )
                    VALUES (
                        @folio, @id_cliente, @nombre, @sector,
                        @monto_cotizado, @pct_anticipo, @monto_anticipo,
                        @rfc, @razon,
                        @uso_cfdi, @regimen_fiscal, @metodo_pago, @forma_pago,
                        @subtotal, @iva, @total,
                        @estado_facturacion, @folio_factura, @fecha_facturacion,
                        @estado, @etapa,
                        @fecha_comp, @fecha_creacion, @fecha_cierre, FALSE
                    )
                    RETURNING id_proyecto;", conexion, transaccion))
                {
                    cmdProy.Parameters.AddWithValue("folio", folioAsignado);
                    cmdProy.Parameters.AddWithValue("id_cliente", infoCliente.Id);
                    cmdProy.Parameters.AddWithValue("nombre", p.NombreProyecto);
                    cmdProy.Parameters.AddWithValue("sector", p.Sector);
                    cmdProy.Parameters.AddWithValue("monto_cotizado", p.MontoCotizado);
                    cmdProy.Parameters.AddWithValue("pct_anticipo", p.PorcentajeAnticipo);
                    cmdProy.Parameters.AddWithValue("monto_anticipo", montoAnticipo);
                    cmdProy.Parameters.AddWithValue("rfc", p.EstadoVenta == "APROBADO" ? (object)infoCliente.Rfc : DBNull.Value);
                    cmdProy.Parameters.AddWithValue("razon", p.EstadoVenta == "APROBADO" ? (object)p.ClienteClave : DBNull.Value);

                    cmdProy.Parameters.AddWithValue("uso_cfdi", estaFacturado ? (object)"I08 - Otra maquinaria y equipo" : DBNull.Value);
                    cmdProy.Parameters.AddWithValue("regimen_fiscal", estaFacturado ? (object)"601 - General de Ley Personas Morales" : DBNull.Value);
                    cmdProy.Parameters.AddWithValue("metodo_pago", estaFacturado ? (object)(p.MetodoPago ?? "PUE") : DBNull.Value);
                    cmdProy.Parameters.AddWithValue("forma_pago", estaFacturado ? (object)"03 - Transferencia electrónica" : DBNull.Value);
                    cmdProy.Parameters.AddWithValue("subtotal", subtotalFactura);
                    cmdProy.Parameters.AddWithValue("iva", ivaFactura);
                    cmdProy.Parameters.AddWithValue("total", totalFactura);
                    cmdProy.Parameters.AddWithValue("estado_facturacion", p.EstadoFacturacion);
                    cmdProy.Parameters.AddWithValue("folio_factura", (object?)p.FolioFactura ?? DBNull.Value);
                    cmdProy.Parameters.AddWithValue("fecha_facturacion", fechaFacturacion.HasValue ? fechaFacturacion.Value : DBNull.Value);

                    cmdProy.Parameters.AddWithValue("estado", p.EstadoVenta);
                    cmdProy.Parameters.AddWithValue("etapa", p.EtapaFabricacion);

                    var pComp = cmdProy.Parameters.AddWithValue("fecha_comp", fechaCompromiso.HasValue ? fechaCompromiso.Value : DBNull.Value);
                    pComp.NpgsqlDbType = NpgsqlDbType.Date;

                    cmdProy.Parameters.AddWithValue("fecha_creacion", fechaCreacion);
                    cmdProy.Parameters.AddWithValue("fecha_cierre", fechaCierre.HasValue ? fechaCierre.Value : DBNull.Value);

                    idProyectoInsertado = (int)cmdProy.ExecuteScalar()!;
                }

                if (p.EtapaFabricacion == "Entregado" && p.ReceptorActa != null && fechaCompromiso.HasValue)
                {
                    while (foliosOcupadosActa.Contains(folioActaCursor)) folioActaCursor++;
                    int folioActaAsignado = folioActaCursor++;
                    foliosOcupadosActa.Add(folioActaAsignado);

                    DateTime fechaEntregaReal = fechaCompromiso.Value.AddHours(13).AddMinutes(30);
                    using var cmdActa = new NpgsqlCommand(@"
                        INSERT INTO actas_entrega (
                            numero_folio, id_proyecto, nombre_receptor, puesto_receptor,
                            observaciones, firma_base64, fecha_entrega, eliminado
                        )
                        VALUES (
                            @folio_acta, @id_proyecto, @receptor, @puesto,
                            @obs, @firma, @fecha_entrega, FALSE
                        );", conexion, transaccion);
                    cmdActa.Parameters.AddWithValue("folio_acta", folioActaAsignado);
                    cmdActa.Parameters.AddWithValue("id_proyecto", idProyectoInsertado);
                    cmdActa.Parameters.AddWithValue("receptor", p.ReceptorActa);
                    cmdActa.Parameters.AddWithValue("puesto", (object?)p.PuestoActa ?? DBNull.Value);
                    cmdActa.Parameters.AddWithValue("obs", (object?)p.ObservacionesActa ?? DBNull.Value);
                    cmdActa.Parameters.AddWithValue("firma", FirmaHistoricaBase64);
                    cmdActa.Parameters.AddWithValue("fecha_entrega", fechaEntregaReal);
                    cmdActa.ExecuteNonQuery();
                }
            }

            transaccion.Commit();
        }

        // si la base ya tenia los 4 proyectos activos en taller del corte anterior,
        // pasa 3 a Entregado (con su acta firmada) y ajusta el unico activo de Cosmeticos Naturales Ideal al 2026-12-28
        private static void MigrarCuatroActivosAUnoSiAplica(NpgsqlConnection conexion)
        {
            var entregasPorCerrar = new AjusteEntrega2026[]
            {
                new(
                    "Tanque Enchaquetado Pasteurizador 1,200 L Fondo Cónico",
                    "2026-07-08 10:00:00",
                    "2026-07-14 14:30:00",
                    "2026-08-21",
                    "FAC-2026-004",
                    "Ing. Mauricio Téllez",
                    "Gerente de Planta",
                    "Tanque enchaquetado pasteurizador entregado con pruebas de presión en chaqueta aprobadas."
                ),
                new(
                    "Reactor Sanitario 500 L Fondo Toriesférico AISI 316L",
                    "2026-08-19 11:45:00",
                    "2026-08-25 16:00:00",
                    "2026-10-02",
                    "FAC-2026-005",
                    "Ing. Gabriela Morales",
                    "Jefa de Validación Sanitaria",
                    "Reactor sanitario AISI 316L entregado con dossier de pulido sanitario y certificados de colada."
                ),
                new(
                    "Reactor de Resinas 1,500 L Acero Inoxidable 316L",
                    "2026-09-30 12:10:00",
                    "2026-10-05 17:30:00",
                    "2026-11-13",
                    "FAC-2026-006",
                    "Ing. Arturo Peñaloza",
                    "Superintendente de Ingeniería",
                    "Reactor de resinas 316L entregado en planta y recibido de entera conformidad."
                )
            };

            long pendientesDeMigrar;
            using (var cmdCheck = new NpgsqlCommand(@"
                SELECT COUNT(*)
                FROM proyectos_venta
                WHERE NOT COALESCE(eliminado, FALSE)
                  AND estado_venta = 'APROBADO'
                  AND etapa_fabricacion <> 'Entregado'
                  AND nombre_proyecto IN (
                      'Tanque Enchaquetado Pasteurizador 1,200 L Fondo Cónico',
                      'Reactor Sanitario 500 L Fondo Toriesférico AISI 316L',
                      'Reactor de Resinas 1,500 L Acero Inoxidable 316L'
                  );", conexion))
            {
                pendientesDeMigrar = Convert.ToInt64(cmdCheck.ExecuteScalar());
            }

            // si ya fueron migrados previamente, no modificamos nada para respetar cualquier cambio posterior del usuario
            if (pendientesDeMigrar == 0)
            {
                return;
            }

            using var transaccion = conexion.BeginTransaction();

            var foliosActaOcupados = new List<int>();
            using (var cmdFoliosActa = new NpgsqlCommand(@"
                SELECT DISTINCT numero_folio
                FROM actas_entrega
                WHERE NOT COALESCE(eliminado, FALSE) AND numero_folio > 0
                ORDER BY numero_folio ASC;", conexion, transaccion))
            {
                using var r = cmdFoliosActa.ExecuteReader();
                while (r.Read()) foliosActaOcupados.Add(r.GetInt32(0));
            }

            var foliosFacturaOcupados = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var cmdFoliosFac = new NpgsqlCommand(@"
                SELECT folio_factura
                FROM proyectos_venta
                WHERE NOT COALESCE(eliminado, FALSE) AND folio_factura IS NOT NULL;", conexion, transaccion))
            {
                using var r = cmdFoliosFac.ExecuteReader();
                while (r.Read()) foliosFacturaOcupados.Add(r.GetString(0));
            }

            foreach (var aj in entregasPorCerrar)
            {
                int? idProy = null;
                decimal montoCotizado = 0m;
                string? folioFacActual = null;

                using (var cmdBuscar = new NpgsqlCommand(@"
                    SELECT id_proyecto, monto_cotizado, folio_factura
                    FROM proyectos_venta
                    WHERE NOT COALESCE(eliminado, FALSE)
                      AND estado_venta = 'APROBADO'
                      AND nombre_proyecto = @nombre
                    ORDER BY id_proyecto ASC
                    LIMIT 1;", conexion, transaccion))
                {
                    cmdBuscar.Parameters.AddWithValue("nombre", aj.NombreProyecto);
                    using var r = cmdBuscar.ExecuteReader();
                    if (r.Read())
                    {
                        idProy = r.GetInt32(0);
                        montoCotizado = r.IsDBNull(1) ? 0m : r.GetDecimal(1);
                        folioFacActual = r.IsDBNull(2) ? null : r.GetString(2);
                    }
                }

                if (!idProy.HasValue) continue;

                string folioFacFinal = !string.IsNullOrWhiteSpace(folioFacActual)
                    ? folioFacActual
                    : AsignarFolioFactura2026(aj.FolioFacturaPreferido, foliosFacturaOcupados);
                foliosFacturaOcupados.Add(folioFacFinal);

                decimal subtotal = Math.Round(montoCotizado, 2);
                decimal iva = Math.Round(subtotal * TasaIva, 2);
                decimal total = Math.Round(subtotal + iva, 2);

                DateTime fechaCreacion = DateTime.Parse(aj.FechaCreacion, CultureInfo.InvariantCulture);
                DateTime fechaCierre = DateTime.Parse(aj.FechaCierre, CultureInfo.InvariantCulture);
                DateTime fechaEntregaDate = DateTime.Parse(aj.FechaEntrega, CultureInfo.InvariantCulture).Date;
                DateTime fechaFacturacion = fechaEntregaDate.AddHours(14).AddMinutes(15);
                DateTime fechaActa = fechaEntregaDate.AddHours(13).AddMinutes(30);

                using (var cmdUpd = new NpgsqlCommand(@"
                    UPDATE proyectos_venta
                    SET etapa_fabricacion = 'Entregado',
                        fecha_creacion = @fecha_creacion,
                        fecha_cierre = @fecha_cierre,
                        fecha_compromiso_entrega = @fecha_entrega,
                        uso_cfdi = COALESCE(NULLIF(uso_cfdi, ''), 'I08 - Otra maquinaria y equipo'),
                        regimen_fiscal = COALESCE(NULLIF(regimen_fiscal, ''), '601 - General de Ley Personas Morales'),
                        metodo_pago = 'PUE',
                        forma_pago = COALESCE(NULLIF(forma_pago, ''), '03 - Transferencia electrónica'),
                        subtotal_factura = @subtotal,
                        iva_factura = @iva,
                        total_factura = @total,
                        estado_facturacion = 'FACTURADO_TOTAL',
                        folio_factura = @folio_factura,
                        fecha_facturacion = @fecha_facturacion
                    WHERE id_proyecto = @id_proyecto;", conexion, transaccion))
                {
                    cmdUpd.Parameters.AddWithValue("id_proyecto", idProy.Value);
                    cmdUpd.Parameters.AddWithValue("fecha_creacion", fechaCreacion);
                    cmdUpd.Parameters.AddWithValue("fecha_cierre", fechaCierre);

                    var pFechaEnt = cmdUpd.Parameters.AddWithValue("fecha_entrega", fechaEntregaDate);
                    pFechaEnt.NpgsqlDbType = NpgsqlDbType.Date;

                    cmdUpd.Parameters.AddWithValue("subtotal", subtotal);
                    cmdUpd.Parameters.AddWithValue("iva", iva);
                    cmdUpd.Parameters.AddWithValue("total", total);
                    cmdUpd.Parameters.AddWithValue("folio_factura", folioFacFinal);
                    cmdUpd.Parameters.AddWithValue("fecha_facturacion", fechaFacturacion);
                    cmdUpd.ExecuteNonQuery();
                }

                bool tieneActa;
                using (var cmdExisteActa = new NpgsqlCommand(
                    "SELECT 1 FROM actas_entrega WHERE id_proyecto = @id_proyecto AND NOT COALESCE(eliminado, FALSE) LIMIT 1;",
                    conexion, transaccion))
                {
                    cmdExisteActa.Parameters.AddWithValue("id_proyecto", idProy.Value);
                    tieneActa = cmdExisteActa.ExecuteScalar() != null;
                }

                if (!tieneActa)
                {
                    int nuevoFolioActa = CalculoTanqueService.CalcularMenorEnteroDisponible(foliosActaOcupados);
                    foliosActaOcupados.Add(nuevoFolioActa);

                    using var cmdInsActa = new NpgsqlCommand(@"
                        INSERT INTO actas_entrega (
                            numero_folio, id_proyecto, nombre_receptor, puesto_receptor,
                            observaciones, firma_base64, fecha_entrega, eliminado
                        )
                        VALUES (
                            @numero_folio, @id_proyecto, @receptor, @puesto,
                            @obs, @firma, @fecha_entrega, FALSE
                        );", conexion, transaccion);
                    cmdInsActa.Parameters.AddWithValue("numero_folio", nuevoFolioActa);
                    cmdInsActa.Parameters.AddWithValue("id_proyecto", idProy.Value);
                    cmdInsActa.Parameters.AddWithValue("receptor", aj.ReceptorActa);
                    cmdInsActa.Parameters.AddWithValue("puesto", aj.PuestoActa);
                    cmdInsActa.Parameters.AddWithValue("obs", aj.ObservacionesActa);
                    cmdInsActa.Parameters.AddWithValue("firma", FirmaHistoricaBase64);
                    cmdInsActa.Parameters.AddWithValue("fecha_entrega", fechaActa);
                    cmdInsActa.ExecuteNonQuery();
                }
            }

            // ajustamos el unico pedido activo restante en taller con los datos exactos solicitados
            using (var cmdUnicoActivo = new NpgsqlCommand(@"
                UPDATE proyectos_venta
                SET etapa_fabricacion = 'Soldadura y Pulido Sanitario',
                    sector = 'Cosmética',
                    monto_cotizado = CASE WHEN monto_cotizado < 80000 OR monto_cotizado > 160000 THEN 138000.00 ELSE monto_cotizado END,
                    fecha_compromiso_entrega = DATE '2026-12-28'
                WHERE NOT COALESCE(eliminado, FALSE)
                  AND estado_venta = 'APROBADO'
                  AND etapa_fabricacion <> 'Entregado'
                  AND nombre_proyecto = 'Tanque de Formulaciones Cosméticas 1,000 L con Agitación';", conexion, transaccion))
            {
                cmdUnicoActivo.ExecuteNonQuery();
            }

            transaccion.Commit();
        }

        private static string AsignarFolioFactura2026(string preferido, HashSet<string> ocupados)
        {
            if (!ocupados.Contains(preferido)) return preferido;
            int n = 1;
            while (ocupados.Contains($"FAC-2026-{n:D3}")) n++;
            return $"FAC-2026-{n:D3}";
        }
    }
}
