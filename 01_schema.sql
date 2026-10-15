-- ===================================================================
-- Base de Datos: Luxman ERP
-- Autor: Estudiante Ing. Sistemas / Mecatronica
-- Nota: esto crea las tablas base, nada muy sofisticado, solo lo
-- necesario para que jale el cotizador
-- ===================================================================

-- primero borramos si ya existian (para poder correr el script varias veces sin bronca)
DROP TABLE IF EXISTS cotizaciones;
DROP TABLE IF EXISTS clientes;

-- ===================================================================
-- TABLA: clientes
-- ===================================================================
CREATE TABLE clientes (
    id_cliente      SERIAL PRIMARY KEY,
    nombre_cliente  VARCHAR(150) NOT NULL,
    rfc_cliente     VARCHAR(20),
    telefono        VARCHAR(20),
    correo          VARCHAR(150),
    tiene_descuento BOOLEAN DEFAULT FALSE, -- TODO: checar si el cliente tiene descuento especial
    fecha_alta      TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- TABLA: cotizaciones
-- aqui guardamos cada cotizacion de tanque que se genera
-- ===================================================================
CREATE TABLE cotizaciones (
    id_cotizacion       SERIAL PRIMARY KEY,
    id_cliente          INTEGER REFERENCES clientes(id_cliente), -- opcional para personas/visitantes sin cuenta
    litros_tanque       NUMERIC(10,2) NOT NULL,
    tipo_acero          VARCHAR(5) NOT NULL, -- puede ser '304' o '316'
    tiene_agitacion     BOOLEAN DEFAULT FALSE,
    precio_base         NUMERIC(12,2), -- esto lo calcula la funcion de python, no se manda desde el back
    precio_final        NUMERIC(12,2), -- precio_base + extras
    is_cotizacion_aprobada BOOLEAN DEFAULT FALSE,
    fecha_creacion      TIMESTAMP DEFAULT NOW()
);

-- indice rapido para buscar cotizaciones de un cliente (para que no se ponga lento el select)
CREATE INDEX idx_cotizaciones_cliente ON cotizaciones(id_cliente);

-- metemos un cliente de prueba para no probar con la tabla vacia
INSERT INTO clientes (nombre_cliente, rfc_cliente, telefono, correo, tiene_descuento)
VALUES ('Lacteos del Norte SA de CV', 'LNO010101ABC', '8112345678', 'compras@lacteosdelnorte.com', TRUE);
