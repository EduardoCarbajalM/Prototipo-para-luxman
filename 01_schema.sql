-- script para crear las tablas de clientes, cotizaciones, calculos tecnicos y solicitudes de contacto

DROP TABLE IF EXISTS calculos_tanques;
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

-- tabla donde se guardan las cotizaciones de venta
CREATE TABLE cotizaciones (
    id_cotizacion       SERIAL PRIMARY KEY,
    id_cliente          INTEGER REFERENCES clientes(id_cliente),
    radio_m             NUMERIC(10,4) DEFAULT 0,
    longitud_m          NUMERIC(10,4) DEFAULT 0,
    tipo_fondo          VARCHAR(30) DEFAULT 'Plano',
    diametro_m          NUMERIC(10,4) DEFAULT 0,
    volumen_m3          NUMERIC(12,4) DEFAULT 0,
    litros_tanque       NUMERIC(14,2) NOT NULL CHECK (litros_tanque > 0),
    perimetro_m         NUMERIC(10,4) DEFAULT 0,
    area_lamina_m2      NUMERIC(12,4) DEFAULT 0,
    tipo_acero          VARCHAR(5) NOT NULL CHECK (tipo_acero IN ('304', '316')),
    tiene_agitacion     BOOLEAN DEFAULT FALSE,
    precio_base         NUMERIC(14,2),
    precio_final        NUMERIC(14,2),
    cotizacion_aprobada BOOLEAN DEFAULT FALSE,
    fecha_creacion      TIMESTAMP DEFAULT NOW()
);

-- tabla de la calculadora tecnica interna del Ing. Raul (dimensionamiento y estimacion de lamina)
CREATE TABLE calculos_tanques (
    id_calculo         SERIAL PRIMARY KEY,
    nombre_referencia  VARCHAR(150),
    radio_m            NUMERIC(10,4) NOT NULL CHECK (radio_m > 0),
    longitud_m         NUMERIC(10,4) NOT NULL CHECK (longitud_m > 0),
    tipo_fondo         VARCHAR(30) NOT NULL CHECK (tipo_fondo IN ('Plano', 'Cónico', 'Toriesférico')),
    medida_hoja        VARCHAR(20) NOT NULL CHECK (medida_hoja IN ('1.22x2.44', '1.22x3.05', '1.52x3.05')),
    precio_hoja        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_hoja >= 0),
    diametro_m         NUMERIC(10,4) NOT NULL,
    volumen_m3         NUMERIC(12,4) NOT NULL,
    litros_tanque      NUMERIC(14,2) NOT NULL,
    perimetro_m        NUMERIC(10,4) NOT NULL,
    area_lamina_m2     NUMERIC(12,4) NOT NULL,
    cantidad_hojas     INTEGER NOT NULL CHECK (cantidad_hojas > 0),
    costo_total_lamina NUMERIC(14,2) NOT NULL DEFAULT 0,
    fecha_creacion     TIMESTAMP DEFAULT NOW()
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
CREATE INDEX idx_calculos_tanques_fecha ON calculos_tanques(fecha_creacion DESC);

-- insertamos un cliente de prueba
INSERT INTO clientes (nombre_cliente, rfc_cliente, telefono, correo, tiene_descuento)
VALUES ('Lacteos del Norte SA de CV', 'LNO010101ABC', '8112345678', 'compras@lacteosdelnorte.com', TRUE);
