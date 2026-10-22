-- funcion y trigger para calcular el precio del tanque antes de hacer el insert

DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS plpython3u;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'plpython3u no disponible, se usara plpgsql';
    END;
END $$;

-- si esta instalado python en postgres usamos plpython3u y si no usamos plpgsql normal
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'plpython3u') THEN
        EXECUTE $py$
            CREATE OR REPLACE FUNCTION fn_calcular_precio_cotizacion()
            RETURNS trigger AS $func$
                precio_litro_304 = 45.50
                precio_litro_316 = 68.75

                litros = float(TD["new"]["litros_tanque"])
                tipo_acero = TD["new"]["tipo_acero"]
                tiene_agitacion = TD["new"]["tiene_agitacion"]

                if litros <= 0:
                    plpy.error("Los litros del tanque deben ser mayores a cero")

                if tipo_acero == '304':
                    precio_base = litros * precio_litro_304
                elif tipo_acero == '316':
                    precio_base = litros * precio_litro_316
                else:
                    plpy.error("Tipo de acero no valido, solo 304 o 316")

                extra_agitacion = 8500.00 if tiene_agitacion else 0.0
                TD["new"]["precio_base"] = precio_base
                TD["new"]["precio_final"] = precio_base + extra_agitacion
                return "MODIFY"
            $func$ LANGUAGE plpython3u;
        $py$;
    ELSE
        EXECUTE $sql$
            CREATE OR REPLACE FUNCTION fn_calcular_precio_cotizacion()
            RETURNS trigger AS $func$
            DECLARE
                precio_litro NUMERIC;
                extra_agitacion NUMERIC := 0.0;
            BEGIN
                IF NEW.litros_tanque <= 0 THEN
                    RAISE EXCEPTION 'Los litros del tanque deben ser mayores a cero';
                END IF;

                IF NEW.tipo_acero = '304' THEN
                    precio_litro := 45.50;
                ELSIF NEW.tipo_acero = '316' THEN
                    precio_litro := 68.75;
                ELSE
                    RAISE EXCEPTION 'Tipo de acero no valido, solo 304 o 316';
                END IF;

                IF NEW.tiene_agitacion THEN
                    extra_agitacion := 8500.00;
                END IF;

                NEW.precio_base := NEW.litros_tanque * precio_litro;
                NEW.precio_final := NEW.precio_base + extra_agitacion;
                RETURN NEW;
            END;
            $func$ LANGUAGE plpgsql;
        $sql$;
    END IF;
END $$;

DROP TRIGGER IF EXISTS trg_calcular_precio ON cotizaciones;

CREATE TRIGGER trg_calcular_precio
    BEFORE INSERT ON cotizaciones
    FOR EACH ROW
    EXECUTE FUNCTION fn_calcular_precio_cotizacion();
