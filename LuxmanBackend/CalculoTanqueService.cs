using System;
using System.Collections.Generic;
using Npgsql;
using Microsoft.Extensions.Configuration;
using LuxmanErp.Models;

namespace LuxmanErp.Services
{
    // servicio para persistir y consultar los calculos tecnicos de tanques y hojas comerciales
    public class CalculoTanqueService
    {
        private readonly string cadenaConexion;

        // areas exactas en m2 de las 3 hojas comerciales de acero inoxidable
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

        // migracion automatica segura para crear o actualizar calculos_tanques sin reiniciar volumen
        private static void AsegurarTabla(NpgsqlConnection conexion)
        {
            using var comando = new NpgsqlCommand(@"
                CREATE TABLE IF NOT EXISTS calculos_tanques (
                    id_calculo         SERIAL PRIMARY KEY,
                    nombre_referencia  VARCHAR(150),
                    radio_m            NUMERIC(10,4) NOT NULL,
                    longitud_m         NUMERIC(10,4) NOT NULL,
                    tipo_fondo         VARCHAR(30) NOT NULL DEFAULT 'Plano',
                    medida_hoja        VARCHAR(20) NOT NULL DEFAULT '1.22x2.44',
                    precio_hoja        NUMERIC(12,2) NOT NULL DEFAULT 0,
                    diametro_m         NUMERIC(10,4) NOT NULL,
                    volumen_m3         NUMERIC(12,4) NOT NULL,
                    litros_tanque      NUMERIC(14,2) NOT NULL,
                    perimetro_m        NUMERIC(10,4) NOT NULL,
                    area_lamina_m2     NUMERIC(12,4) NOT NULL,
                    cantidad_hojas     INTEGER NOT NULL DEFAULT 1,
                    costo_total_lamina NUMERIC(14,2) NOT NULL DEFAULT 0,
                    fecha_creacion     TIMESTAMP DEFAULT NOW()
                );

                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS nombre_referencia VARCHAR(150);
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS radio_m NUMERIC(10,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS longitud_m NUMERIC(10,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS tipo_fondo VARCHAR(30) DEFAULT 'Plano';
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS medida_hoja VARCHAR(20) DEFAULT '1.22x2.44';
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS precio_hoja NUMERIC(12,2) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS diametro_m NUMERIC(10,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS volumen_m3 NUMERIC(12,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS litros_tanque NUMERIC(14,2) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS perimetro_m NUMERIC(10,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS area_lamina_m2 NUMERIC(12,4) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS cantidad_hojas INTEGER DEFAULT 1;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS costo_total_lamina NUMERIC(14,2) DEFAULT 0;
                ALTER TABLE calculos_tanques ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP DEFAULT NOW();", conexion);
            comando.ExecuteNonQuery();
        }

        public CalculoTanque Guardar(CalculoTanqueRequestDTO datos)
        {
            if (datos.RadioM <= 0)
                throw new ArgumentException("El radio del tanque (radio_m) debe ser mayor a cero.");

            if (datos.LongitudM <= 0)
                throw new ArgumentException("La longitud del tanque (longitud_m) debe ser mayor a cero.");

            string? fondoNormalizado = NormalizarTipoFondo(datos.TipoFondo);
            if (fondoNormalizado == null)
                throw new ArgumentException("Selecciona un tipo de fondo válido: Plano, Cónico o Toriesférico.");

            string? hojaNormalizada = NormalizarMedidaHoja(datos.MedidaHoja);
            if (hojaNormalizada == null)
                throw new ArgumentException("Selecciona una medida de hoja comercial válida: 1.22x2.44, 1.22x3.05 o 1.52x3.05.");

            decimal precioHoja = Math.Round(datos.PrecioHoja ?? 0m, 2);
            if (precioHoja < 0)
                throw new ArgumentException("El precio por hoja no puede ser negativo.");

            string? referenciaLimpia = string.IsNullOrWhiteSpace(datos.NombreReferencia)
                ? null
                : datos.NombreReferencia.Trim();

            if (referenciaLimpia != null && referenciaLimpia.Length > 150)
                referenciaLimpia = referenciaLimpia.Substring(0, 150);

            // calculos geometricos y de lamina comercial en el servidor
            double radio = (double)datos.RadioM;
            double longitud = (double)datos.LongitudM;
            double diametro = 2.0 * radio;
            double volumen = Math.PI * radio * radio * longitud;
            double litros = volumen * 1000.0;
            double perimetro = Math.PI * diametro;
            double areaLamina = perimetro * longitud;
            double areaHoja = AreasHojasComerciales[hojaNormalizada];
            int cantidadHojas = Math.Max(1, (int)Math.Ceiling(areaLamina / areaHoja));
            decimal costoTotalLamina = Math.Round(cantidadHojas * precioHoja, 2);

            var nuevo = new CalculoTanque
            {
                NombreReferencia = referenciaLimpia,
                RadioM = Math.Round(datos.RadioM, 4),
                LongitudM = Math.Round(datos.LongitudM, 4),
                TipoFondo = fondoNormalizado,
                MedidaHoja = hojaNormalizada,
                PrecioHoja = precioHoja,
                DiametroM = Math.Round((decimal)diametro, 4),
                VolumenM3 = Math.Round((decimal)volumen, 4),
                LitrosTanque = Math.Round((decimal)litros, 2),
                PerimetroM = Math.Round((decimal)perimetro, 4),
                AreaLaminaM2 = Math.Round((decimal)areaLamina, 4),
                CantidadHojas = cantidadHojas,
                CostoTotalLamina = costoTotalLamina
            };

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var comando = new NpgsqlCommand(@"
                INSERT INTO calculos_tanques (
                    nombre_referencia, radio_m, longitud_m, tipo_fondo,
                    medida_hoja, precio_hoja,
                    diametro_m, volumen_m3, litros_tanque, perimetro_m, area_lamina_m2,
                    cantidad_hojas, costo_total_lamina
                )
                VALUES (
                    @nombre_referencia, @radio_m, @longitud_m, @tipo_fondo,
                    @medida_hoja, @precio_hoja,
                    @diametro_m, @volumen_m3, @litros_tanque, @perimetro_m, @area_lamina_m2,
                    @cantidad_hojas, @costo_total_lamina
                )
                RETURNING id_calculo, fecha_creacion;", conexion);

            comando.Parameters.AddWithValue("nombre_referencia", (object?)nuevo.NombreReferencia ?? DBNull.Value);
            comando.Parameters.AddWithValue("radio_m", nuevo.RadioM);
            comando.Parameters.AddWithValue("longitud_m", nuevo.LongitudM);
            comando.Parameters.AddWithValue("tipo_fondo", nuevo.TipoFondo);
            comando.Parameters.AddWithValue("medida_hoja", nuevo.MedidaHoja);
            comando.Parameters.AddWithValue("precio_hoja", nuevo.PrecioHoja);
            comando.Parameters.AddWithValue("diametro_m", nuevo.DiametroM);
            comando.Parameters.AddWithValue("volumen_m3", nuevo.VolumenM3);
            comando.Parameters.AddWithValue("litros_tanque", nuevo.LitrosTanque);
            comando.Parameters.AddWithValue("perimetro_m", nuevo.PerimetroM);
            comando.Parameters.AddWithValue("area_lamina_m2", nuevo.AreaLaminaM2);
            comando.Parameters.AddWithValue("cantidad_hojas", nuevo.CantidadHojas);
            comando.Parameters.AddWithValue("costo_total_lamina", nuevo.CostoTotalLamina);

            using var lector = comando.ExecuteReader();
            if (lector.Read())
            {
                nuevo.IdCalculo = lector.GetInt32(0);
                nuevo.FechaCreacion = lector.GetDateTime(1);
            }

            return nuevo;
        }

        public List<CalculoTanque> Listar()
        {
            var lista = new List<CalculoTanque>();

            using var conexion = new NpgsqlConnection(cadenaConexion);
            conexion.Open();
            AsegurarTabla(conexion);

            using var comando = new NpgsqlCommand(@"
                SELECT id_calculo, nombre_referencia, radio_m, longitud_m, tipo_fondo,
                       medida_hoja, precio_hoja,
                       diametro_m, volumen_m3, litros_tanque, perimetro_m, area_lamina_m2,
                       cantidad_hojas, costo_total_lamina, fecha_creacion
                FROM calculos_tanques
                ORDER BY fecha_creacion DESC, id_calculo DESC;", conexion);

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

            using var comando = new NpgsqlCommand(@"
                SELECT id_calculo, nombre_referencia, radio_m, longitud_m, tipo_fondo,
                       medida_hoja, precio_hoja,
                       diametro_m, volumen_m3, litros_tanque, perimetro_m, area_lamina_m2,
                       cantidad_hojas, costo_total_lamina, fecha_creacion
                FROM calculos_tanques
                WHERE id_calculo = @id_calculo;", conexion);
            comando.Parameters.AddWithValue("id_calculo", id_calculo);

            using var lector = comando.ExecuteReader();
            return lector.Read() ? Mapear(lector) : null;
        }

        private static CalculoTanque Mapear(NpgsqlDataReader lector)
        {
            return new CalculoTanque
            {
                IdCalculo = lector.GetInt32(0),
                NombreReferencia = lector.IsDBNull(1) ? null : lector.GetString(1),
                RadioM = lector.IsDBNull(2) ? 0m : lector.GetDecimal(2),
                LongitudM = lector.IsDBNull(3) ? 0m : lector.GetDecimal(3),
                TipoFondo = lector.IsDBNull(4) ? "Plano" : lector.GetString(4),
                MedidaHoja = lector.IsDBNull(5) ? "1.22x2.44" : lector.GetString(5),
                PrecioHoja = lector.IsDBNull(6) ? 0m : lector.GetDecimal(6),
                DiametroM = lector.IsDBNull(7) ? 0m : lector.GetDecimal(7),
                VolumenM3 = lector.IsDBNull(8) ? 0m : lector.GetDecimal(8),
                LitrosTanque = lector.IsDBNull(9) ? 0m : lector.GetDecimal(9),
                PerimetroM = lector.IsDBNull(10) ? 0m : lector.GetDecimal(10),
                AreaLaminaM2 = lector.IsDBNull(11) ? 0m : lector.GetDecimal(11),
                CantidadHojas = lector.IsDBNull(12) ? 1 : lector.GetInt32(12),
                CostoTotalLamina = lector.IsDBNull(13) ? 0m : lector.GetDecimal(13),
                FechaCreacion = lector.IsDBNull(14) ? DateTime.Now : lector.GetDateTime(14)
            };
        }
    }
}
