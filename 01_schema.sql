-- script para crear las tablas de clientes y cotizaciones

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

-- tabla donde se guardan las cotizaciones de los tanques
CREATE TABLE cotizaciones (
    id_cotizacion          SERIAL PRIMARY KEY,
    id_cliente             INTEGER REFERENCES clientes(id_cliente),
    litros_tanque          NUMERIC(10,2) NOT NULL CHECK (litros_tanque > 0),
    tipo_acero             VARCHAR(5) NOT NULL CHECK (tipo_acero IN ('304', '316')),
    tiene_agitacion        BOOLEAN DEFAULT FALSE,
    precio_base            NUMERIC(12,2),
    precio_final           NUMERIC(12,2),
    is_cotizacion_aprobada BOOLEAN DEFAULT FALSE,
    fecha_creacion         TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cotizaciones_cliente ON cotizaciones(id_cliente);

-- insertamos un cliente de prueba
INSERT INTO clientes (nombre_cliente, rfc_cliente, telefono, correo, tiene_descuento)
VALUES ('Lacteos del Norte SA de CV', 'LNO010101ABC', '8112345678', 'compras@lacteosdelnorte.com', TRUE);
