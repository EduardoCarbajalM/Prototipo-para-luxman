-- script para crear las tablas de clientes, cotizaciones, calculos tecnicos, solicitudes, proyectos de venta y actas de entrega

DROP TABLE IF EXISTS actas_entrega;
DROP TABLE IF EXISTS proyectos_venta;
DROP TABLE IF EXISTS calculos_tanques;
DROP TABLE IF EXISTS solicitudes_contacto;
DROP TABLE IF EXISTS cotizaciones;
DROP TABLE IF EXISTS clientes;

-- tabla de clientes con sector industrial
CREATE TABLE clientes (
    id_cliente      SERIAL PRIMARY KEY,
    nombre_cliente  VARCHAR(150) NOT NULL,
    sector          VARCHAR(60) NOT NULL DEFAULT 'Otro',
    rfc_cliente     VARCHAR(20),
    telefono        VARCHAR(30),
    correo          VARCHAR(150),
    tiene_descuento BOOLEAN DEFAULT FALSE,
    fecha_alta      TIMESTAMP DEFAULT NOW()
);

-- tabla donde se guardan las cotizaciones rapidas heredadas
CREATE TABLE cotizaciones (
    id_cotizacion       SERIAL PRIMARY KEY,
    numero_folio        INTEGER NOT NULL DEFAULT 1,
    id_cliente          INTEGER REFERENCES clientes(id_cliente) ON DELETE SET NULL,
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
    eliminado           BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion      TIMESTAMP DEFAULT NOW()
);

-- tabla de la calculadora tecnica interna del Ing. Raul
CREATE TABLE calculos_tanques (
    id_calculo             SERIAL PRIMARY KEY,
    numero_folio           INTEGER NOT NULL DEFAULT 1,
    id_cliente             INTEGER REFERENCES clientes(id_cliente) ON DELETE SET NULL,
    nombre_referencia      VARCHAR(150),
    modo_calculo           VARCHAR(30) NOT NULL DEFAULT 'por_medidas',
    litros_deseados        NUMERIC(14,2) NOT NULL DEFAULT 0,
    radio_m                NUMERIC(10,4) NOT NULL CHECK (radio_m > 0),
    longitud_m             NUMERIC(10,4) NOT NULL CHECK (longitud_m > 0),
    tipo_fondo             VARCHAR(30) NOT NULL CHECK (tipo_fondo IN ('Plano', 'Cónico', 'Toriesférico')),
    diametro_m             NUMERIC(10,4) NOT NULL,
    volumen_cilindro_m3    NUMERIC(12,4) NOT NULL DEFAULT 0,
    volumen_fondo_m3       NUMERIC(12,4) NOT NULL DEFAULT 0,
    volumen_total_m3       NUMERIC(12,4) NOT NULL DEFAULT 0,
    volumen_m3             NUMERIC(12,4) NOT NULL DEFAULT 0,
    litros_tanque          NUMERIC(14,2) NOT NULL,
    perimetro_m            NUMERIC(10,4) NOT NULL,
    area_lamina_m2         NUMERIC(12,4) NOT NULL,
    medida_hoja            VARCHAR(20) NOT NULL CHECK (medida_hoja IN ('1.22x2.44', '1.22x3.05', '1.52x3.05')),
    cantidad_hojas         INTEGER NOT NULL CHECK (cantidad_hojas > 0),
    precio_hoja            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_hoja >= 0),
    costo_total_lamina     NUMERIC(14,2) NOT NULL DEFAULT 0,
    materiales_json        JSONB NOT NULL DEFAULT '[]'::jsonb,
    costo_total_materiales NUMERIC(14,2) NOT NULL DEFAULT 0,
    notas                  TEXT,
    eliminado              BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion         TIMESTAMP DEFAULT NOW()
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

-- tabla central de ventas, cierre comercial y seguimiento de fabricacion (LUX-2026-001)
CREATE TABLE proyectos_venta (
    id_proyecto               SERIAL PRIMARY KEY,
    numero_folio              INTEGER NOT NULL DEFAULT 1,
    id_cliente                INTEGER REFERENCES clientes(id_cliente) ON DELETE SET NULL,
    id_solicitud              INTEGER REFERENCES solicitudes_contacto(id_solicitud) ON DELETE SET NULL,
    id_calculo                INTEGER REFERENCES calculos_tanques(id_calculo) ON DELETE SET NULL,
    nombre_proyecto           VARCHAR(200) NOT NULL,
    sector                    VARCHAR(60) NOT NULL DEFAULT 'Otro',
    monto_cotizado            NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monto_cotizado >= 0),
    porcentaje_anticipo       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (porcentaje_anticipo >= 0 AND porcentaje_anticipo <= 100),
    monto_anticipo            NUMERIC(14,2) NOT NULL DEFAULT 0,
    rfc_facturacion           VARCHAR(20),
    razon_social_facturacion  VARCHAR(200),
    estado_venta              VARCHAR(20) NOT NULL DEFAULT 'COTIZADO' CHECK (estado_venta IN ('COTIZADO', 'APROBADO', 'RECHAZADO')),
    etapa_fabricacion         VARCHAR(80) NOT NULL DEFAULT 'Cotizado',
    fecha_compromiso_entrega  DATE,
    fecha_creacion            TIMESTAMP DEFAULT NOW(),
    fecha_cierre              TIMESTAMP,
    eliminado                 BOOLEAN NOT NULL DEFAULT FALSE
);

-- tabla de actas de entrega logistica con firma digital en base64 (ACT-2026-001)
CREATE TABLE actas_entrega (
    id_acta          SERIAL PRIMARY KEY,
    numero_folio     INTEGER NOT NULL DEFAULT 1,
    id_proyecto      INTEGER REFERENCES proyectos_venta(id_proyecto) ON DELETE SET NULL,
    nombre_receptor  VARCHAR(150) NOT NULL,
    puesto_receptor  VARCHAR(120),
    observaciones    TEXT,
    firma_base64     TEXT NOT NULL,
    fecha_entrega    TIMESTAMP DEFAULT NOW(),
    eliminado        BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_cotizaciones_cliente ON cotizaciones(id_cliente);
CREATE INDEX idx_calculos_tanques_fecha ON calculos_tanques(fecha_creacion DESC);
CREATE INDEX idx_calculos_tanques_cliente ON calculos_tanques(id_cliente);
CREATE INDEX idx_calculos_tanques_eliminado ON calculos_tanques(eliminado, numero_folio);
CREATE INDEX idx_proyectos_venta_activo ON proyectos_venta(eliminado, numero_folio);
CREATE INDEX idx_proyectos_venta_cliente ON proyectos_venta(id_cliente);
CREATE INDEX idx_actas_entrega_proyecto ON actas_entrega(id_proyecto);

-- clientes iniciales precargados para el Ing. Raul con su sector real
INSERT INTO clientes (nombre_cliente, sector, rfc_cliente, telefono, correo, tiene_descuento) VALUES
    ('Cosméticos Naturales Ideal SA de CV', 'Cosmética', NULL, NULL, NULL, FALSE),
    ('Farbe SA de CV', 'Química', NULL, NULL, NULL, FALSE),
    ('Lacteos del Norte SA de CV', 'Agroalimentaria', 'LNO010101ABC', '8112345678', 'compras@lacteosdelnorte.com', TRUE);
