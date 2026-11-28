using System;
using System.Collections.Generic;
using Npgsql;
using NpgsqlTypes;
using Microsoft.Extensions.Configuration;

namespace LuxmanErp.Services
{
    // inicializa de forma idempotente el catalogo de 10 clientes y el historico comercial 2024-2026
    // se ejecuta una sola vez unicamente cuando proyectos_venta esta vacia
    public class HistoricoComercialSeeder
    {
        private readonly string cadenaConexion;

        // firma digital PNG valida para las actas de entrega historicas (2024-2026)
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
            string? ReceptorActa = null,
            string? PuestoActa = null,
            string? ObservacionesActa = null
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

            // verificacion estricta de idempotencia: si proyectos_venta ya tiene datos, no duplica nada
            using (var verificar = new NpgsqlCommand("SELECT COUNT(*) FROM proyectos_venta;", conexion))
            {
                long existentes = Convert.ToInt64(verificar.ExecuteScalar());
                if (existentes > 0) return;
            }

            using var transaccion = conexion.BeginTransaction();

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
                            correo = COALESCE(NULLIF(correo, ''), @correo)
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
                        VALUES (@nombre, @sector, @rfc, @telefono, @correo, @descuento, '2024-01-15 09:00:00')
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

            // 2. Historico de 28 proyectos_venta (2024, 2025 y 2026) -> 12 APROBADO (42.9% tasa cierre), 12 RECHAZADO, 4 COTIZADO
            var historico = new SemillaProyecto[]
            {
                // ===== 2024 (8 registros: 3 aprobados entregados, 5 rechazados) =====
                new(1, "Lácteos del Norte SA de CV", "Tanque de Proceso Sanitario 2,000 L Fondo Cónico", "Agroalimentaria", 168000m,
                    "APROBADO", "Entregado", 50m, "2024-02-12 10:15:00", "2024-02-19 16:30:00", "2024-03-25",
                    "Ing. Gerardo Villarreal", "Jefe de Planta Láctea", "Tanque sanitario AISI 304 recibido con pruebas hidrostáticas aprobadas."),

                new(2, "Especialidades Químicas Ecatepec SA de CV", "Tanque de Almacenamiento Ácido 1,500 L AISI 316", "Química", 195000m,
                    "RECHAZADO", "Cotizado", 0m, "2024-03-08 11:20:00", "2024-03-22 13:00:00", null),

                new(3, "Cosméticos Naturales Ideal SA de CV", "Marmita Enchaquetada con Agitación 1,000 L", "Cosmética", 245000m,
                    "APROBADO", "Entregado", 50m, "2024-05-09 09:45:00", "2024-05-15 17:10:00", "2024-06-20",
                    "Ing. Claudia Mondragón", "Gerente de Producción Cosmética", "Marmita recibida con chaqueta térmica y acabado espejo interior."),

                new(4, "Alimentos y Derivados La Huasteca SA de CV", "Tina Quesera Sanitaria 800 L Fondo Plano", "Agroalimentaria", 92000m,
                    "RECHAZADO", "Cotizado", 0m, "2024-06-18 12:00:00", "2024-07-02 10:30:00", null),

                new(5, "Laboratorios BioFarma del Bajío SA de CV", "Reactor Farmacéutico 500 L Acabado Espejo", "Farmacéutica", 268000m,
                    "RECHAZADO", "Cotizado", 0m, "2024-08-05 15:40:00", "2024-08-21 11:15:00", null),

                new(6, "Farbe SA de CV", "Reactor Químico AISI 316L de 3,000 L Fondo Toriesférico", "Química", 420000m,
                    "APROBADO", "Entregado", 60m, "2024-09-12 10:30:00", "2024-09-18 16:45:00", "2024-11-08",
                    "Ing. Arturo Peñaloza", "Superintendente de Ingeniería", "Entrega conforme con dossier de soldadura TIG y certificado de material 316L."),

                new(7, "Ingeniería en Aguas Industriales del Centro SA de CV", "Tanque Pulmón de Agua Osmotizada 5,000 L", "Tratamiento de Aguas", 218000m,
                    "RECHAZADO", "Cotizado", 0m, "2024-10-24 09:20:00", "2024-11-07 14:00:00", null),

                new(8, "Procesadora Agroindustrial de Puebla SA de CV", "Tanque Mezclador de Jarabes 1,200 L", "Agroalimentaria", 136000m,
                    "RECHAZADO", "Cotizado", 0m, "2024-11-28 13:10:00", "2024-12-12 12:30:00", null),

                // ===== 2025 (8 registros: 3 aprobados entregados, 5 rechazados) =====
                new(9, "Dermocosmética Botánica de Occidente SA de CV", "Tanque Fundidor de Ceras 600 L Enchaquetado", "Cosmética", 148000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-01-14 10:05:00", "2025-01-29 17:00:00", null),

                new(10, "Laboratorios BioFarma del Bajío SA de CV", "Tanque de Preparación Estéril 1,500 L Toriesférico", "Farmacéutica", 315000m,
                    "APROBADO", "Entregado", 50m, "2025-02-06 11:30:00", "2025-02-12 15:20:00", "2025-03-24",
                    "QFB Mariana Solís", "Aseguramiento de Calidad", "Equipo validado en sitio con rugosidad sanitaria conforme a especificación."),

                new(11, "Farmacéutica Sanitaria Metropolitana SA de CV", "Tanque Colector WFI 2,000 L AISI 316L", "Farmacéutica", 362000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-03-19 16:15:00", "2025-04-04 11:40:00", null),

                new(12, "Cosméticos Naturales Ideal SA de CV", "Tanque Almacenamiento Glicerina 3,000 L", "Cosmética", 174000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-04-28 10:50:00", "2025-05-12 13:25:00", null),

                new(13, "Ingeniería en Aguas Industriales del Centro SA de CV", "Sistema de Almacenamiento de Agua Purificada 10,000 L", "Tratamiento de Aguas", 385000m,
                    "APROBADO", "Entregado", 50m, "2025-05-22 09:30:00", "2025-05-28 18:00:00", "2025-07-15",
                    "Ing. Héctor Domínguez", "Coordinador de Operaciones", "Tanque vertical de 10,000 L instalado y anclado sobre cimentación de planta."),

                new(14, "Farbe SA de CV", "Agitador Industrial de Turbina para Reactor 2,000 L", "Química", 89000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-07-17 12:40:00", "2025-08-01 10:00:00", null),

                new(15, "Lácteos del Norte SA de CV", "Silo Isotérmico de Recepción 8,000 L", "Agroalimentaria", 410000m,
                    "RECHAZADO", "Cotizado", 0m, "2025-08-25 14:20:00", "2025-09-09 16:10:00", null),

                new(16, "Alimentos y Derivados La Huasteca SA de CV", "Mezcladora de Doble Listón Inoxidable 1,200 L", "Agroalimentaria", 278000m,
                    "APROBADO", "Entregado", 50m, "2025-09-18 11:00:00", "2025-09-25 15:45:00", "2025-11-06",
                    "Ing. Rubén Castellanos", "Jefe de Mantenimiento", "Mezcladora de polvos entregada con motorreductor trifásico y guarda de seguridad."),

                // ===== 2026 (12 registros: 2 entregados, 4 activos en taller, 2 rechazados, 4 cotizados pendientes) =====
                new(17, "Procesadora Agroindustrial de Puebla SA de CV", "Marmita de Volteo Manual 500 L AISI 304", "Agroalimentaria", 118000m,
                    "RECHAZADO", "Cotizado", 0m, "2026-01-20 10:15:00", "2026-02-03 12:00:00", null),

                new(18, "Dermocosmética Botánica de Occidente SA de CV", "Tanque Emulsionador Cosmético 800 L Fondo Toriesférico", "Cosmética", 192000m,
                    "APROBADO", "Entregado", 50m, "2026-02-11 09:40:00", "2026-02-17 16:20:00", "2026-03-30",
                    "Lic. Valeria Ochoa", "Directora de Operaciones", "Equipo recibido con registro hombre sanitario y férulas Clamp completas."),

                new(19, "Ingeniería en Aguas Industriales del Centro SA de CV", "Filtro de Carbón Activado en Acero 304 de 2,500 L", "Tratamiento de Aguas", 164000m,
                    "RECHAZADO", "Cotizado", 0m, "2026-04-09 13:30:00", "2026-04-24 11:10:00", null),

                new(20, "Especialidades Químicas Ecatepec SA de CV", "Tanque de Neutralización Química 5,000 L AISI 316", "Química", 348000m,
                    "APROBADO", "Entregado", 50m, "2026-05-14 10:25:00", "2026-05-20 17:05:00", "2026-07-06",
                    "Ing. Fernando Alcántara", "Gerente de Planta", "Tanque entregado y recibido de conformidad en planta Ecatepec."),

                // --- 4 proyectos APROBADO activos actualmente en taller (entregas dic 2026 - ene 2027) ---
                new(21, "Procesadora Agroindustrial de Puebla SA de CV", "Tanque Pasteurizador Enchaquetado 2,500 L Fondo Cónico", "Agroalimentaria", 296000m,
                    "APROBADO", "Listo para Entrega", 50m, "2026-10-08 10:00:00", "2026-10-14 14:30:00", "2026-12-03"),

                new(22, "Farmacéutica Sanitaria Metropolitana SA de CV", "Biorreactor Sanitario 1,500 L Fondo Toriesférico AISI 316L", "Farmacéutica", 465000m,
                    "APROBADO", "Soldadura y Pulido Sanitario", 60m, "2026-10-22 11:45:00", "2026-10-27 16:00:00", "2026-12-18"),

                new(23, "Cosméticos Naturales Ideal SA de CV", "Tanque de Formulaciones Cosméticas 2,000 L con Agitación", "Cosmética", 234000m,
                    "APROBADO", "En Fabricación (Corte y Rolado)", 50m, "2026-11-05 09:50:00", "2026-11-10 13:15:00", "2027-01-09"),

                new(24, "Farbe SA de CV", "Reactor de Resinas 4,000 L Acero Inoxidable 316L", "Química", 480000m,
                    "APROBADO", "Aprobado / Anticipo Recibido", 50m, "2026-11-16 12:10:00", "2026-11-20 17:30:00", "2027-01-24"),

                // --- 4 proyectos COTIZADO pendientes de cierre (noviembre 2026) ---
                new(25, "Lácteos del Norte SA de CV", "Tanque de Crema Maduradora 1,000 L Fondo Cónico", "Agroalimentaria", 154000m,
                    "COTIZADO", "Cotizado", 0m, "2026-11-19 10:20:00", null, null),

                new(26, "Laboratorios BioFarma del Bajío SA de CV", "Tanque Móvil de Transferencia Estéril 300 L", "Farmacéutica", 85000m,
                    "COTIZADO", "Cotizado", 0m, "2026-11-21 15:10:00", null, null),

                new(27, "Ingeniería en Aguas Industriales del Centro SA de CV", "Tanque de Contacto Cloración 6,000 L AISI 316", "Tratamiento de Aguas", 262000m,
                    "COTIZADO", "Cotizado", 0m, "2026-11-24 11:05:00", null, null),

                new(28, "Dermocosmética Botánica de Occidente SA de CV", "Marmita Mezcladora de Geles 1,500 L con Bola CIP", "Cosmética", 289000m,
                    "COTIZADO", "Cotizado", 0m, "2026-11-26 16:40:00", null, null),
            };

            int folioActa = 1;
            foreach (var p in historico)
            {
                var infoCliente = idsPorCliente[p.ClienteClave];
                decimal montoAnticipo = p.EstadoVenta == "APROBADO"
                    ? Math.Round(p.MontoCotizado * (p.PorcentajeAnticipo / 100m), 2)
                    : 0m;

                DateTime fechaCreacion = DateTime.Parse(p.FechaCreacion);
                DateTime? fechaCierre = p.FechaCierre != null ? DateTime.Parse(p.FechaCierre) : null;
                DateTime? fechaCompromiso = p.FechaCompromiso != null ? DateTime.Parse(p.FechaCompromiso).Date : null;

                int idProyectoInsertado;
                using (var cmdProy = new NpgsqlCommand(@"
                    INSERT INTO proyectos_venta (
                        numero_folio, id_cliente, nombre_proyecto, sector,
                        monto_cotizado, porcentaje_anticipo, monto_anticipo,
                        rfc_facturacion, razon_social_facturacion,
                        estado_venta, etapa_fabricacion,
                        fecha_compromiso_entrega, fecha_creacion, fecha_cierre, eliminado
                    )
                    VALUES (
                        @folio, @id_cliente, @nombre, @sector,
                        @monto_cotizado, @pct_anticipo, @monto_anticipo,
                        @rfc, @razon,
                        @estado, @etapa,
                        @fecha_comp, @fecha_creacion, @fecha_cierre, FALSE
                    )
                    RETURNING id_proyecto;", conexion, transaccion))
                {
                    cmdProy.Parameters.AddWithValue("folio", p.Folio);
                    cmdProy.Parameters.AddWithValue("id_cliente", infoCliente.Id);
                    cmdProy.Parameters.AddWithValue("nombre", p.NombreProyecto);
                    cmdProy.Parameters.AddWithValue("sector", p.Sector);
                    cmdProy.Parameters.AddWithValue("monto_cotizado", p.MontoCotizado);
                    cmdProy.Parameters.AddWithValue("pct_anticipo", p.PorcentajeAnticipo);
                    cmdProy.Parameters.AddWithValue("monto_anticipo", montoAnticipo);
                    cmdProy.Parameters.AddWithValue("rfc", p.EstadoVenta == "APROBADO" ? (object)infoCliente.Rfc : DBNull.Value);
                    cmdProy.Parameters.AddWithValue("razon", p.EstadoVenta == "APROBADO" ? (object)p.ClienteClave : DBNull.Value);
                    cmdProy.Parameters.AddWithValue("estado", p.EstadoVenta);
                    cmdProy.Parameters.AddWithValue("etapa", p.EtapaFabricacion);

                    var pComp = cmdProy.Parameters.AddWithValue("fecha_comp", fechaCompromiso.HasValue ? fechaCompromiso.Value : DBNull.Value);
                    pComp.NpgsqlDbType = NpgsqlDbType.Date;

                    cmdProy.Parameters.AddWithValue("fecha_creacion", fechaCreacion);
                    cmdProy.Parameters.AddWithValue("fecha_cierre", fechaCierre.HasValue ? fechaCierre.Value : DBNull.Value);

                    idProyectoInsertado = (int)cmdProy.ExecuteScalar()!;
                }

                // si el proyecto historico ya fue entregado, generamos su acta de entrega firmada
                if (p.EtapaFabricacion == "Entregado" && p.ReceptorActa != null && fechaCompromiso.HasValue)
                {
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
                    cmdActa.Parameters.AddWithValue("folio_acta", folioActa++);
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
    }
}
