using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using Npgsql;
using NpgsqlTypes;
using Microsoft.Extensions.Configuration;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // servicio para persistir los calculos geometricos, materiales, papelera y reutilizacion de folios
    public class CalculoTanqueService
    {
        private readonly string cadenaConexion;

        public static readonly IReadOnlyDictionary<string, double> AreasHojasComerciales =
            new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase)
            {
                ["1.22x2.44"] = 1.22 * 2.44, // 2.9768 m2 (4' x 8')
                ["1.22x3.05"] = 1.22 * 3.05, // 3.7210 m2 (4' x 10')
                ["1.52x3.05"] = 1.52 * 3.05  // 4.6360 m2 (5' x 10')
            };

        public CalculoTanqueService(IConfiguration configuracion)
        {
            cadenaConexion = configuracion.GetConnectionString("DefaultConnection")
                ?? configuracion.GetConnectionString("LuxmanDb")
                ?? throw new InvalidOperationException("No se encontro la cadena de conexion en el appsettings.");
        }

        public static string? NormalizarTipoFondo(string? tipoFondo) =>
            CotizacionService.NormalizarTipoFondo(tipoFondo);

        public static string? NormalizarMedidaHoja(string? medidaHoja)
        {
            if (string.IsNullOrWhiteSpace(medidaHoja)) return null;
            string limpia = medidaHoja.Trim().ToLowerInvariant().Replace("×", "x").Replace(" ", "");
            return AreasHojasComerciales.ContainsKey(limpia) ? limpia : null;
        }

        public static double ObtenerAreaHoja(string medidaHoja)
        {
            string? normalizada = NormalizarMedidaHoja(medidaHoja);
            return normalizada != null && AreasHojasComerciales.TryGetValue(normalizada, out double area)
                ? area
                : 1.22 * 2.44;
        }

        public static double CalcularVolumenFondoM3(string tipoFondo, double radio, double diametro)
        {
            if (tipoFondo == "Cónico")
            {
                double alturaCono = 0.25 * diametro;
                return (1.0 / 3.0) * Math.PI * radio * radio * alturaCono;
            }

            if (tipoFondo == "Toriesférico")
            {
                return 0.0847 * Math.Pow(diametro, 3);
            }

            return 0.0;
        }

        // encuentra el menor entero positivo (>= 1) que no este ocupado entre una lista ordenada de folios activos
        public static int CalcularMenorEnteroDisponible(IEnumerable<int> foliosOcupados)
        {
            int candidato = 1;
            foreach (int folio in foliosOcupados.Where(f => f > 0).Distinct().OrderBy(f => f))
            {
                if (folio == candidato)
                    candidato++;
                else if (folio > candidato)
                    break;
            }
            return candidato;
        }

        private static int ObtenerMenorFolioDisponible(NpgsqlConnection conexion)
        {
            var ocupados = new List<int>();
            using var comando = new NpgsqlCommand(@"
                SELECT DISTINCT numero_folio
                FROM calculos_tanques
                WHERE NOT COALESCE(eliminado, FALSE) AND numero_folio > 0
                ORDER BY numero_folio ASC;", conexion);

            using var lector = comando.ExecuteReader();
            while (lector.Read())
            {
                ocupados.Add(lector.GetInt32(0));
            }
            return CalcularMenorEnteroDisponible(ocupados);
        }

        // migracion automatica segura en caliente para bases existentes en el VPS
        private static void AsegurarTabla(NpgsqlConnection conexion)
        {
            ClienteService.AsegurarTablaYSemilla(conexion);

            using var comando = new NpgsqlCommand(@"
                CREATE TABLE IF NOT EXISTS calculos_tanques (
                    id_calculo             SERIAL PRIMARY KEY,
                    numero_folio           INTEGER NOT NULL DEFAULT 1,
                    id_cliente             INTEGER REFERENCES clientes(id_cliente),
                    nombre_referencia      VARCHAR(150),
                    modo_calculo           VARCHAR(30) NOT NULL DEFAULT 'por_medidas',
                    litros_deseados        NUMERIC(14,2) NOT NULL DEFAULT 0,
                    radio_m                NUMERIC(10,4) NOT NULL,
                    longitud_m             NUMERIC(10,4) NOT NULL,
                    tipo_fondo             VARCHAR(30) NOT NULL DEFAULT 'Plano',
                    diametro_m             NUMERIC(10,4) NOT NULL,
                    volumen_cilindro_m3    NUMERIC(12,4) NOT NULL DEFAULT 0,
                    volumen_fondo_m3       NUMERIC(12,4) NOT NULL DEFAULT 0,
                    volumen_total_m3       NUMERIC(12,4) NOT NULL DEFAULT 0,
                    volumen_m3             NUMERIC(12,4) NOT NULL DEFAULT 0,
                    litros_tanque          NUMERIC(14,2) NOT NULL,
                    perimetro_m            NUMERIC(10,4) NOT NULL,
                    area_lamina_m2         NUMERIC(12,4) NOT NULL,
                    medida_hoja            VARCHAR(20) NOT NULL DEFAULT '1.22x2.44',
                    cantidad_hojas         INTEGER NOT NULL DEFAULT 1,
                    precio_hoja            NUMERIC(12,2) NOT NULL DEFAULT 0,
                    costo_total_lamina     NUMERIC(14,2) NOT NULL DEFAULT 0,
                    materiales_json        JSONB NOT NULL DEFAULT '[]'::jsonb,
                    costo_total_materiales NUMERIC(14,2) NOT NULL DEFAULT 0,
                    notas                  TEXT,
                    eliminado              BOOLEAN NOT NULL DEFAULT FALSE,
                    fecha_creacion         TIMESTAMP DEFAULT NOW()
                );

                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS numero_folio INTEGER;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS id_cliente INTEGER REFERENCES clientes(id_cliente);
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS nombre_referencia VARCHAR(150);
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS modo_calculo VARCHAR(30) DEFAULT 'por_medidas';
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS litros_deseados NUMERIC(14,2) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS radio_m NUMERIC(10,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS longitud_m NUMERIC(10,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS tipo_fondo VARCHAR(30) DEFAULT 'Plano';
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS diametro_m NUMERIC(10,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS volumen_cilindro_m3 NUMERIC(12,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS volumen_fondo_m3 NUMERIC(12,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS volumen_total_m3 NUMERIC(12,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS volumen_m3 NUMERIC(12,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS litros_tanque NUMERIC(14,2) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS perimetro_m NUMERIC(10,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS area_lamina_m2 NUMERIC(12,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS medida_hoja VARCHAR(20) DEFAULT '1.22x2.44';
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS cantidad_hojas INTEGER DEFAULT 1;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS precio_hoja NUMERIC(12,2) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS costo_total_lamina NUMERIC(14,2) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS materiales_json JSONB DEFAULT '[]'::jsonb;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS costo_total_materiales NUMERIC(14,2) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS notas TEXT;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS eliminado BOOLEAN DEFAULT FALSE;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP DEFAULT NOW();

                UPDATE calculos_tanques SET numero_folio = id_calculo WHERE numero_folio IS NULL OR numero_folio <= 0;
                UPDATE calculos_tanques SET eliminado = FALSE WHERE eliminado IS NULL;", conexion);
            comando.ExecuteNonQuery();
        }

        public CalculoTanque Guardar(CalculoTanqueRequestDTO datos)
        {
            if (datos.LongitudM <= 0)
                throw new ArgumentException("La longitud/altura del tanque (longitud_m) debe ser mayor a cero.");

            string modo = datos.ModoCalculo == "por_capacidad" ? "por_capacidad" : "por_medidas";
            double longitud = (double)datos.LongitudM;
            double radio;

            decimal litrosDeseados = Math.Round(datos.LitrosDeseados ?? 0m, 2);
            if (modo == "por_capacidad")
            {
                if (litrosDeseados <= 0)
                    throw new ArgumentException("Ingresa los litros deseados mayores a cero.");
                double volumenDeseadoM3 = (double)litrosDeseados / 1000.0;
                radio = Math.Sqrt(volumenDeseadoM3 / (Math.PI * longitud));
            }
            else
            {
                if (datos.RadioM <= 0)
                    throw new ArgumentException("El radio del tanque (radio_m) debe ser mayor a cero.");
                radio = (double)datos.RadioM;
            }

            string? fondoNormalizado = NormalizarTipoFondo(datos.TipoFondo);
            if (fondoNormalizado == null)
                throw new ArgumentException("Selecciona un tipo de fondo válido: Plano, Cónico o Toriesférico.");

            string? hojaNormalizada = NormalizarMedidaHoja(datos.MedidaHoja);
            if (hojaNormalizada == null)
                throw new ArgumentException("Selecciona una medida de hoja comercial válida: 1.22x2.44, 1.22x3.05 o 1.52x3.05.");

            double diametro = 2.0 * radio;
            double volumenCilindro = Math.PI * radio * radio * longitud;
            double volumenFondo = CalcularVolumenFondoM3(fondoNormalizado, radio, diametro);
            double volumenTotal = volumenCilindro + volumenFondo;
            double litrosTotales = volumenTotal * 1000.0;
            double perimetro = Math.PI * diametro;
            double areaLamina = perimetro * longitud;
            double areaHoja = AreasHojasComerciales[hojaNormalizada];
            int cantidadHojas = Math.Max(1, (int)Math.Ceiling(areaLamina / areaHoja));

            var materialesLimpios = new List<MaterialCalculoItem>();
            foreach (var item in datos.MaterialesJson ?? Enumerable.Empty<MaterialCalculoItem>())
            {
                if (string.IsNullOrWhiteSpace(item.Concepto)) continue;
                decimal cant = item.Clave == "lamina_inoxidable"
                    ? cantidadHojas
                    : Math.Max(0m, Math.Round(item.Cantidad, 2));
                if (cant <= 0) continue;

                decimal unitario = Math.Max(0m, Math.Round(item.PrecioUnitario, 2));
                decimal subtotal = Math.Round(cant * unitario, 2);

                materialesLimpios.Add(new MaterialCalculoItem
                {
                    Clave = string.IsNullOrWhiteSpace(item.Clave) ? "otro" : item.Clave.Trim(),
                    Concepto = item.Concepto.Trim(),
                    Unidad = string.IsNullOrWhiteSpace(item.Unidad) ? "pza" : item.Unidad.Trim(),
                    Cantidad = cant,
                    PrecioUnitario = unitario,
                    Subtotal = subtotal
                });
            }

            var itemLamina = materialesLimpios.FirstOrDefault(m => m.Clave == "lamina_inoxidable");
            decimal precioHoja = itemLamina != null
                ? itemLamina.PrecioUnitario
                : Math.Max(0m, Math.Round(datos.PrecioHoja ?? 0m, 2));
            decimal costoTotalLamina = itemLamina != null
                ? itemLamina.Subtotal
                : Math.Round(cantidadHojas * precioHoja, 2);
            decimal costoTotalMateriales = materialesLimpios.Sum(m => m.Subtotal);

            int? idClienteLimpio = (datos.IdCliente == null || datos.IdCliente <= 0) ? null : datos.IdCliente;
            string? notasLimpias = string.IsNullOrWhiteSpace(datos.Notas) ? null : datos.Notas.Trim();
            string? referenciaLimpia = string.IsNullOrWhiteSpace(datos.NombreReferencia) ? null : datos.NombreReferencia.Trim();

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var transaccion = conexion.BeginTransaction();
            int folioDisponible = ObtenerMenorFolioDisponible(conexion);

            var nuevo = new CalculoTanque
            {
                NumeroFolio = folioDisponible,
                IdCliente = idClienteLimpio,
                NombreReferencia = referenciaLimpia,
                ModoCalculo = modo,
                LitrosDeseados = litrosDeseados,
                RadioM = Math.Round((decimal)radio, 4),
                LongitudM = Math.Round(datos.LongitudM, 4),
                TipoFondo = fondoNormalizado,
                DiametroM = Math.Round((decimal)diametro, 4),
                VolumenCilindroM3 = Math.Round((decimal)volumenCilindro, 4),
                VolumenFondoM3 = Math.Round((decimal)volumenFondo, 4),
                VolumenTotalM3 = Math.Round((decimal)volumenTotal, 4),
                VolumenM3 = Math.Round((decimal)volumenTotal, 4),
                LitrosTanque = Math.Round((decimal)litrosTotales, 2),
                PerimetroM = Math.Round((decimal)perimetro, 4),
                AreaLaminaM2 = Math.Round((decimal)areaLamina, 4),
                MedidaHoja = hojaNormalizada,
                CantidadHojas = cantidadHojas,
                PrecioHoja = precioHoja,
                CostoTotalLamina = costoTotalLamina,
                MaterialesJson = materialesLimpios,
                CostoTotalMateriales = costoTotalMateriales,
                Notas = notasLimpias,
                Eliminado = false
            };

            string jsonMateriales = JsonSerializer.Serialize(nuevo.MaterialesJson);

            using (var comando = new NpgsqlCommand(@"
                INSERT INTO calculos_tanques (
                    numero_folio, id_cliente, nombre_referencia, modo_calculo, litros_deseados,
                    radio_m, longitud_m, tipo_fondo,
                    diametro_m, volumen_cilindro_m3, volumen_fondo_m3, volumen_total_m3, volumen_m3,
                    litros_tanque, perimetro_m, area_lamina_m2,
                    medida_hoja, cantidad_hojas, precio_hoja, costo_total_lamina,
                    materiales_json, costo_total_materiales, notas, eliminado
                )
                VALUES (
                    @numero_folio, @id_cliente, @nombre_referencia, @modo_calculo, @litros_deseados,
                    @radio_m, @longitud_m, @tipo_fondo,
                    @diametro_m, @volumen_cilindro_m3, @volumen_fondo_m3, @volumen_total_m3, @volumen_m3,
                    @litros_tanque, @perimetro_m, @area_lamina_m2,
                    @medida_hoja, @cantidad_hojas, @precio_hoja, @costo_total_lamina,
                    @materiales_json, @costo_total_materiales, @notas, FALSE
                )
                RETURNING id_calculo, fecha_creacion;", conexion, transaccion))
            {
                comando.Parameters.AddWithValue("numero_folio", nuevo.NumeroFolio);

                var paramCliente = comando.Parameters.AddWithValue("id_cliente", (object?)nuevo.IdCliente ?? DBNull.Value);
                paramCliente.NpgsqlDbType = NpgsqlDbType.Integer;

                comando.Parameters.AddWithValue("nombre_referencia", (object?)nuevo.NombreReferencia ?? DBNull.Value);
                comando.Parameters.AddWithValue("modo_calculo", nuevo.ModoCalculo);
                comando.Parameters.AddWithValue("litros_deseados", nuevo.LitrosDeseados);
                comando.Parameters.AddWithValue("radio_m", nuevo.RadioM);
                comando.Parameters.AddWithValue("longitud_m", nuevo.LongitudM);
                comando.Parameters.AddWithValue("tipo_fondo", nuevo.TipoFondo);
                comando.Parameters.AddWithValue("diametro_m", nuevo.DiametroM);
                comando.Parameters.AddWithValue("volumen_cilindro_m3", nuevo.VolumenCilindroM3);
                comando.Parameters.AddWithValue("volumen_fondo_m3", nuevo.VolumenFondoM3);
                comando.Parameters.AddWithValue("volumen_total_m3", nuevo.VolumenTotalM3);
                comando.Parameters.AddWithValue("volumen_m3", nuevo.VolumenM3);
                comando.Parameters.AddWithValue("litros_tanque", nuevo.LitrosTanque);
                comando.Parameters.AddWithValue("perimetro_m", nuevo.PerimetroM);
                comando.Parameters.AddWithValue("area_lamina_m2", nuevo.AreaLaminaM2);
                comando.Parameters.AddWithValue("medida_hoja", nuevo.MedidaHoja);
                comando.Parameters.AddWithValue("cantidad_hojas", nuevo.CantidadHojas);
                comando.Parameters.AddWithValue("precio_hoja", nuevo.PrecioHoja);
                comando.Parameters.AddWithValue("costo_total_lamina", nuevo.CostoTotalLamina);

                var paramJson = comando.Parameters.AddWithValue("materiales_json", jsonMateriales);
                paramJson.NpgsqlDbType = NpgsqlDbType.Jsonb;

                comando.Parameters.AddWithValue("costo_total_materiales", nuevo.CostoTotalMateriales);
                comando.Parameters.AddWithValue("notas", (object?)nuevo.Notas ?? DBNull.Value);

                using var lector = comando.ExecuteReader();
                if (lector.Read())
                {
                    nuevo.IdCalculo = lector.GetInt32(0);
                    nuevo.FechaCreacion = lector.GetDateTime(1);
                }
            }

            if (nuevo.IdCliente != null)
            {
                using var cmdCliente = new NpgsqlCommand(
                    "SELECT nombre_cliente FROM clientes WHERE id_cliente = @id_cliente;", conexion, transaccion);
                cmdCliente.Parameters.AddWithValue("id_cliente", nuevo.IdCliente.Value);
                nuevo.NombreCliente = cmdCliente.ExecuteScalar() as string;
            }

            transaccion.Commit();
            return nuevo;
        }

        private const string SelectColumnas = @"
            SELECT ct.id_calculo, ct.id_cliente, cl.nombre_cliente, ct.nombre_referencia,
                   ct.modo_calculo, ct.litros_deseados,
                   ct.radio_m, ct.longitud_m, ct.tipo_fondo,
                   ct.diametro_m, ct.volumen_cilindro_m3, ct.volumen_fondo_m3, ct.volumen_total_m3, ct.volumen_m3,
                   ct.litros_tanque, ct.perimetro_m, ct.area_lamina_m2,
                   ct.medida_hoja, ct.cantidad_hojas, ct.precio_hoja, ct.costo_total_lamina,
                   ct.materiales_json, ct.costo_total_materiales, ct.notas, ct.fecha_creacion,
                   ct.numero_folio, ct.eliminado
            FROM calculos_tanques ct
            LEFT JOIN clientes cl ON cl.id_cliente = ct.id_cliente";

        public List<CalculoTanque> Listar(bool eliminados = false)
        {
            var lista = new List<CalculoTanque>();

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var comando = new NpgsqlCommand(
                SelectColumnas + " WHERE COALESCE(ct.eliminado, FALSE) = @eliminado ORDER BY ct.numero_folio ASC, ct.fecha_creacion DESC;",
                conexion);
            comando.Parameters.AddWithValue("eliminado", eliminados);

            using var lector = comando.ExecuteReader();
            while (lector.Read())
            {
                lista.Add(Mapear(lector));
            }

            return lista;
        }

        public CalculoTanque? ObtenerPorId(int id_calculo)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var comando = new NpgsqlCommand(
                SelectColumnas + " WHERE ct.id_calculo = @id_calculo;", conexion);
            comando.Parameters.AddWithValue("id_calculo", id_calculo);

            using var lector = comando.ExecuteReader();
            return lector.Read() ? Mapear(lector) : null;
        }

        public bool MoverAPapelera(int id_calculo)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var comando = new NpgsqlCommand(@"
                UPDATE calculos_tanques
                SET eliminado = TRUE
                WHERE id_calculo = @id_calculo AND NOT COALESCE(eliminado, FALSE);", conexion);
            comando.Parameters.AddWithValue("id_calculo", id_calculo);
            return comando.ExecuteNonQuery() > 0;
        }

        // restaura un registro desde la papelera; si su numero_folio ya fue ocupado, le reasigna el menor disponible
        public CalculoTanque? Restaurar(int id_calculo)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var transaccion = conexion.BeginTransaction();

            int folioActual;
            using (var cmdLeer = new NpgsqlCommand(@"
                SELECT COALESCE(numero_folio, 0)
                FROM calculos_tanques
                WHERE id_calculo = @id_calculo AND COALESCE(eliminado, FALSE) = TRUE;", conexion, transaccion))
            {
                cmdLeer.Parameters.AddWithValue("id_calculo", id_calculo);
                object? res = cmdLeer.ExecuteScalar();
                if (res == null) return null;
                folioActual = Convert.ToInt32(res);
            }

            bool ocupado = folioActual <= 0;
            if (!ocupado)
            {
                using var cmdOcupado = new NpgsqlCommand(@"
                    SELECT 1 FROM calculos_tanques
                    WHERE NOT COALESCE(eliminado, FALSE)
                      AND numero_folio = @folio
                      AND id_calculo <> @id_calculo
                    LIMIT 1;", conexion, transaccion);
                cmdOcupado.Parameters.AddWithValue("folio", folioActual);
                cmdOcupado.Parameters.AddWithValue("id_calculo", id_calculo);
                ocupado = cmdOcupado.ExecuteScalar() != null;
            }

            int folioFinal = ocupado ? ObtenerMenorFolioDisponible(conexion) : folioActual;

            using (var cmdRestaurar = new NpgsqlCommand(@"
                UPDATE calculos_tanques
                SET eliminado = FALSE, numero_folio = @folio_final
                WHERE id_calculo = @id_calculo;", conexion, transaccion))
            {
                cmdRestaurar.Parameters.AddWithValue("folio_final", folioFinal);
                cmdRestaurar.Parameters.AddWithValue("id_calculo", id_calculo);
                cmdRestaurar.ExecuteNonQuery();
            }

            transaccion.Commit();
            return ObtenerPorId(id_calculo);
        }

        public bool EliminarDefinitivo(int id_calculo)
        {
            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var comando = new NpgsqlCommand(
                "DELETE FROM calculos_tanques WHERE id_calculo = @id_calculo;", conexion);
            comando.Parameters.AddWithValue("id_calculo", id_calculo);
            return comando.ExecuteNonQuery() > 0;
        }

        private static CalculoTanque Mapear(NpgsqlDataReader lector)
        {
            int idCalculo = lector.GetInt32(0);
            decimal volCilindro = lector.IsDBNull(10) ? 0m : lector.GetDecimal(10);
            decimal volFondo = lector.IsDBNull(11) ? 0m : lector.GetDecimal(11);
            decimal volTotal = lector.IsDBNull(12) ? 0m : lector.GetDecimal(12);
            decimal volLegacy = lector.IsDBNull(13) ? 0m : lector.GetDecimal(13);

            if (volTotal <= 0m && volLegacy > 0m)
            {
                volTotal = volLegacy;
                if (volCilindro <= 0m) volCilindro = volLegacy;
            }

            var materiales = new List<MaterialCalculoItem>();
            if (!lector.IsDBNull(21))
            {
                try
                {
                    string crudo = lector.GetString(21);
                    if (!string.IsNullOrWhiteSpace(crudo))
                    {
                        materiales = JsonSerializer.Deserialize<List<MaterialCalculoItem>>(crudo) ?? new();
                    }
                }
                catch
                {
                    materiales = new();
                }
            }

            decimal costoLamina = lector.IsDBNull(20) ? 0m : lector.GetDecimal(20);
            decimal costoTotalMat = lector.IsDBNull(22) ? 0m : lector.GetDecimal(22);
            if (costoTotalMat <= 0m && materiales.Count == 0 && costoLamina > 0m)
            {
                costoTotalMat = costoLamina;
            }

            int numeroFolio = lector.IsDBNull(25) ? idCalculo : lector.GetInt32(25);
            if (numeroFolio <= 0) numeroFolio = idCalculo;

            return new CalculoTanque
            {
                IdCalculo = idCalculo,
                NumeroFolio = numeroFolio,
                IdCliente = lector.IsDBNull(1) ? null : lector.GetInt32(1),
                NombreCliente = lector.IsDBNull(2) ? null : lector.GetString(2),
                NombreReferencia = lector.IsDBNull(3) ? null : lector.GetString(3),
                ModoCalculo = lector.IsDBNull(4) ? "por_medidas" : lector.GetString(4),
                LitrosDeseados = lector.IsDBNull(5) ? 0m : lector.GetDecimal(5),
                RadioM = lector.IsDBNull(6) ? 0m : lector.GetDecimal(6),
                LongitudM = lector.IsDBNull(7) ? 0m : lector.GetDecimal(7),
                TipoFondo = lector.IsDBNull(8) ? "Plano" : lector.GetString(8),
                DiametroM = lector.IsDBNull(9) ? 0m : lector.GetDecimal(9),
                VolumenCilindroM3 = volCilindro,
                VolumenFondoM3 = volFondo,
                VolumenTotalM3 = volTotal,
                VolumenM3 = volTotal,
                LitrosTanque = lector.IsDBNull(14) ? 0m : lector.GetDecimal(14),
                PerimetroM = lector.IsDBNull(15) ? 0m : lector.GetDecimal(15),
                AreaLaminaM2 = lector.IsDBNull(16) ? 0m : lector.GetDecimal(16),
                MedidaHoja = lector.IsDBNull(17) ? "1.22x2.44" : lector.GetString(17),
                CantidadHojas = lector.IsDBNull(18) ? 1 : lector.GetInt32(18),
                PrecioHoja = lector.IsDBNull(19) ? 0m : lector.GetDecimal(19),
                CostoTotalLamina = costoLamina,
                MaterialesJson = materiales,
                CostoTotalMateriales = costoTotalMat,
                Notas = lector.IsDBNull(23) ? null : lector.GetString(23),
                FechaCreacion = lector.IsDBNull(24) ? DateTime.Now : lector.GetDateTime(24),
                Eliminado = !lector.IsDBNull(26) && lector.GetBoolean(26)
            };
        }
    }
}
