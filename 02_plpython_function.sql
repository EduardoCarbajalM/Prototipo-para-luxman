-- ===================================================================
-- Funcion en PL/Python que calcula el precio de la cotizacion
-- ANTES de que se inserte en la tabla (trigger BEFORE INSERT)
--
-- IMPORTANTE: hay que tener activada la extension plpython3u
-- en la base de datos, si no, truena feo
-- ===================================================================

DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS plpython3u;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'plpython3u no está disponible en este entorno, se utilizará fallback PL/pgSQL';
    END;
END $$;

-- ===================================================================
-- FUNCION: fn_calcular_precio_cotizacion
-- Si plpython3u está instalado, usamos PL/Python como pide el proyecto.
-- Si no está disponible en el contenedor, se usa PL/pgSQL como respaldo seguro.
-- ===================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'plpython3u') THEN
        EXECUTE $py$
            CREATE OR REPLACE FUNCTION fn_calcular_precio_cotizacion()
            RETURNS trigger AS $func$
                # ---------------------------------------------------------------
                # Precios por litro segun el tipo de acero (PL/Python)
                # ---------------------------------------------------------------
                precio_litro_304 = 45.50
                precio_litro_316 = 68.75  # el 316 es mas caro porque aguanta mas la corrosion

                litros = float(TD["new"]["litros_tanque"])
                tipo_acero = TD["new"]["tipo_acero"]
                tiene_agitacion = TD["new"]["tiene_agitacion"]

                if tipo_acero == '304':
                    precio_base = litros * precio_litro_304
                elif tipo_acero == '316':
                    precio_base = litros * precio_litro_316
                else:
                    plpy.error("Tipo de acero no valido, solo se aceptan 304 o 316")

                costo_extra_agitacion = 8500.00 if tiene_agitacion else 0.0
                precio_final = precio_base + costo_extra_agitacion

                TD["new"]["precio_base"] = precio_base
                TD["new"]["precio_final"] = precio_final
                return "MODIFY"
            $func$ LANGUAGE plpython3u;
        $py$;
    ELSE
        EXECUTE $sql$
            CREATE OR REPLACE FUNCTION fn_calcular_precio_cotizacion()
            RETURNS trigger AS $func$
            DECLARE
                v_precio_litro NUMERIC;
                v_costo_agitacion NUMERIC := 0.0;
            BEGIN
                IF NEW.tipo_acero = '304' THEN
                    v_precio_litro := 45.50;
                ELSIF NEW.tipo_acero = '316' THEN
                    v_precio_litro := 68.75;
                ELSE
                    RAISE EXCEPTION 'Tipo de acero no valido, solo se aceptan 304 o 316';
                END IF;

                IF NEW.tiene_agitacion THEN
                    v_costo_agitacion := 8500.00;
                END IF;

                NEW.precio_base := NEW.litros_tanque * v_precio_litro;
                NEW.precio_final := NEW.precio_base + v_costo_agitacion;
                RETURN NEW;
            END;
            $func$ LANGUAGE plpgsql;
        $sql$;
    END IF;
END $$;


-- ===================================================================
-- TRIGGER: se dispara antes de insertar una fila en cotizaciones
-- ===================================================================
DROP TRIGGER IF EXISTS trg_calcular_precio ON cotizaciones;

CREATE TRIGGER trg_calcular_precio
    BEFORE INSERT ON cotizaciones
    FOR EACH ROW
    EXECUTE FUNCTION fn_calcular_precio_cotizacion();

-- ===================================================================
-- prueba rapida (comentada, se puede descomentar para probar a mano)
-- ===================================================================
-- INSERT INTO cotizaciones (id_cliente, litros_tanque, tipo_acero, tiene_agitacion)
-- VALUES (1, 1000, '316', TRUE);
-- SELECT * FROM cotizaciones; -- aqui ya deberia salir el precio_base y precio_final calculados
