-- ===================================================================
-- Funcion en PL/Python que calcula el precio de la cotizacion
-- ANTES de que se inserte en la tabla (trigger BEFORE INSERT)
--
-- IMPORTANTE: hay que tener activada la extension plpython3u
-- en la base de datos, si no, truena feo
-- ===================================================================

CREATE EXTENSION IF NOT EXISTS plpython3u;

-- ===================================================================
-- FUNCION: fn_calcular_precio_cotizacion
-- aqui calculamos el precio base dependiendo del tipo de acero
-- y le sumamos costo extra si el tanque lleva agitacion
-- ===================================================================
CREATE OR REPLACE FUNCTION fn_calcular_precio_cotizacion()
RETURNS trigger AS $$

    # ---------------------------------------------------------------
    # aqui definimos los precios por litro segun el tipo de acero
    # esto en teoria deberia venir de una tabla de precios pero
    # para el proyecto lo dejamos hardcodeado, ahi se puede mejorar despues
    # ---------------------------------------------------------------
    precio_litro_304 = 45.50
    precio_litro_316 = 68.75  # el 316 es mas caro porque aguanta mas la corrosion

    litros = TD["new"]["litros_tanque"]
    tipo_acero = TD["new"]["tipo_acero"]
    tiene_agitacion = TD["new"]["tiene_agitacion"]

    # convertimos litros a float por si acaso llega como Decimal raro
    litros = float(litros)

    precio_base = 0.0

    # aqui va la logica principal, nada de diccionarios raros, todo con if/else
    # para que se entienda facil
    if tipo_acero == '304':
        precio_base = litros * precio_litro_304
    elif tipo_acero == '316':
        precio_base = litros * precio_litro_316
    else:
        # si mandan un tipo de acero raro, truena el insert para que se den cuenta
        plpy.error("Tipo de acero no valido, solo se aceptan 304 o 316")

    # costo extra si el tanque necesita motor de agitacion
    costo_extra_agitacion = 0.0
    if tiene_agitacion:
        costo_extra_agitacion = 8500.00  # precio fijo del kit de agitacion, ya con motor y flecha

    precio_final = precio_base + costo_extra_agitacion

    # guardamos los valores calculados en el registro que se va a insertar
    TD["new"]["precio_base"] = precio_base
    TD["new"]["precio_final"] = precio_final

    # devolvemos MODIFY para que postgres use los valores nuevos que acabamos de calcular
    return "MODIFY"

$$ LANGUAGE plpython3u;


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
