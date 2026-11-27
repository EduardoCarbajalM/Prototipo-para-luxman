-- script para crear las tablas de clientes, cotizaciones y solicitudes de contacto

DROP TABLE IF EXISTS solicitudes_contacto;
DROP TABLE IF EXISTS cotizaciones;
DROP TABLE IF EXISTS clientes;

-- tabla de clientes
CREATE TABLE clientes (
    id_cliente      SERIAL PRIMARY KEY,
    nombre_cliente  VARCHAR(150) NOT NULL,
    rfc_cliente     VARCHAR(20),
    telefono        VARCHAR(20),
    correo          VARCHAR(150),
    tiene_descuento BOOLEAN DEFAULT FALSE,
    fecha_alta      TIMESTAMP DEFAULT NOW()
);

-- tabla donde se guardan las cotizaciones tecnicas de los tanques
CREATE TABLE cotizaciones (
    id_cotizacion       SERIAL PRIMARY KEY,
    id_cliente          INTEGER REFERENCES clientes(id_cliente),
    radio_m             NUMERIC(10,4) NOT NULL CHECK (radio_m > 0),
    longitud_m          NUMERIC(10,4) NOT NULL CHECK (longitud_m > 0),
    tipo_fondo          VARCHAR(30) NOT NULL DEFAULT 'Plano' CHECK (tipo_fondo IN ('Plano', 'Cónico', 'Toriesférico')),
    diametro_m          NUMERIC(10,4) NOT NULL,
    volumen_m3          NUMERIC(12,4) NOT NULL,
    litros_tanque       NUMERIC(14,2) NOT NULL CHECK (litros_tanque > 0),
    perimetro_m         NUMERIC(10,4) NOT NULL,
    area_lamina_m2      NUMERIC(12,4) NOT NULL,
    tipo_acero          VARCHAR(5) NOT NULL CHECK (tipo_acero IN ('304', '316')),
    tiene_agitacion     BOOLEAN DEFAULT FALSE,
    precio_base         NUMERIC(14,2),
    precio_final        NUMERIC(14,2),
    cotizacion_aprobada BOOLEAN DEFAULT FALSE,
    fecha_creacion      TIMESTAMP DEFAULT NOW()
);

-- tabla donde se guardan los prospectos que llenan el formulario de la landing page
CREATE TABLE solicitudes_contacto (
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

CREATE INDEX idx_cotizaciones_cliente ON cotizaciones(id_cliente);

-- insertamos un cliente de prueba
INSERT INTO clientes (nombre_cliente, rfc_cliente, telefono, correo, tiene_descuento)
VALUES ('Lacteos del Norte SA de CV', 'LNO010101ABC', '8112345678', 'compras@lacteosdelnorte.com', TRUE);
