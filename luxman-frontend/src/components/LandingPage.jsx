import React from 'react';
import { motion } from 'framer-motion';
import './LandingPage.css';

function LandingPage({ alIrACotizador }) {
  // Lista de productos para el catálogo
  const listaProductos = [
    {
      titulo: 'Marmitas Industriales',
      material: 'Acero Grado 304 y 316',
      descripcion:
        'Sistemas diseñados para cocción uniforme, mezclado dinámico y calentamiento controlado en la industria alimenticia y química.',
    },
    {
      titulo: 'Reactores Químicos',
      material: 'Acero Grado 316L',
      descripcion:
        'Construcción de alta resistencia para trabajar con presión y temperatura extremas, bajo estrictos estándares de seguridad.',
    },
    {
      titulo: 'Mezcladoras de Doble Listón',
      material: 'Acero Grado 304',
      descripcion:
        'Homogeneización rápida y continua para mezclas sólidas y polvos secos, minimizando tiempos de producción.',
    },
    {
      titulo: 'Tanques de Proceso y Almacén',
      material: 'Acero Grado 304 y 316',
      descripcion:
        'Acabados sanitarios pulidos espejo que previenen la acumulación bacteriana y facilitan protocolos de limpieza CIP.',
    },
    {
      titulo: 'Tanques Enchaquetados',
      material: 'Acero Grado 304 y 316',
      descripcion:
        'Aislamiento térmico y chaqueta externa para recirculación de vapor o salmuera, ideal para fermentación y enfriamiento.',
    },
    {
      titulo: 'Agitadores Industriales',
      material: 'Acero Grado 316',
      descripcion:
        'Impulsores tipo turbina, áncora o hélice marina, calibrados según la viscosidad y reología de tu formulación.',
    },
  ];

  // Lista de sectores industriales atendidos
  const listaSectores = [
    'Farmacéutica',
    'Alimenticia',
    'Química',
    'Cosmética',
    'Tratamiento de Aguas',
    'Petroquímica',
  ];

  // Variantes para animación en cascada de las tarjetas con framer-motion
  const variantesContenedor = {
    oculto: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  const variantesTarjeta = {
    oculto: { opacity: 0, y: 35 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  // Función para manejar el clic y disparar la navegación al cotizador
  function manejarBotonCotizador() {
    if (alIrACotizador) {
      alIrACotizador();
    }
  }

  return (
    <div className="fondo-oscuro-gradiente">
      {/* 1. Navbar con estilo Glassmorphism */}
      <nav className="navbar navbar-dark sticky-top navbar-cristal py-3">
        <div className="container">
          <span className="navbar-brand fw-bold fs-4 d-flex align-items-center text-white m-0">
            <span className="text-success me-2 fs-5">●</span> LUXMAN
          </span>
          <span className="text-light opacity-75 small d-none d-md-inline">
            Equipos Inoxidables • Maestría Industrial
          </span>
          <button
            onClick={manejarBotonCotizador}
            className="btn btn-outline-light btn-sm rounded-pill px-3"
          >
            Acceso Cotizador
          </button>
        </div>
      </nav>

      <div className="container py-5">
        {/* 2. Hero Section con efecto fade-in desde abajo */}
        <motion.section
          className="text-center py-5 my-4"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="mx-auto col-lg-10">
            <span className="badge insignia-cristal text-uppercase px-3 py-2 mb-3 rounded-pill fs-6">
              Ingeniería de Grado Superior
            </span>
            <h1 className="display-3 fw-bold text-white mb-3 tracking-tight">
              Equipos Inoxidables Luxman
            </h1>
            <p className="lead text-light opacity-75 mx-auto mb-4 col-md-9 fs-4">
              Empresa mexicana con más de <strong>40 años de trayectoria</strong> en el diseño,
              ingeniería y fabricación de tanques y sistemas de proceso en acero inoxidable 304 y 316.
            </p>

            <div className="d-flex justify-content-center gap-3">
              <a
                href="#catalogo"
                className="btn btn-outline-light btn-lg px-4 rounded-pill"
              >
                Ver Catálogo
              </a>
            </div>
          </div>
        </motion.section>

        {/* 3. Catálogo de Productos con animación en cascada */}
        <section id="catalogo" className="my-5 pt-4">
          <div className="text-center mb-5">
            <h2 className="display-6 fw-bold text-white">Catálogo de Equipos</h2>
            <p className="text-light opacity-75">
              Fabricación en acero inoxidable con acabados sanitarios y de alta precisión.
            </p>
          </div>

          <motion.div
            className="row g-4"
            variants={variantesContenedor}
            initial="oculto"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {listaProductos.map((producto, indice) => (
              <motion.div
                className="col-md-4"
                key={indice}
                variants={variantesTarjeta}
              >
                <div className="card tarjeta-cristal h-100 overflow-hidden text-start">
                  {/* Div gris simulando el espacio de la imagen del tanque */}
                  <div className="espacio-imagen-tanque d-flex flex-column align-items-center justify-content-center text-center p-3">
                    <span className="text-white-50 fw-semibold">[ Espacio de Imagen ]</span>
                    <small className="text-white-50">({producto.titulo})</small>
                  </div>

                  <div className="card-body d-flex flex-column p-4">
                    <span className="badge insignia-cristal align-self-start mb-2 px-2 py-1 small">
                      {producto.material}
                    </span>
                    <h5 className="card-title fw-bold text-white mb-2">{producto.titulo}</h5>
                    <p className="card-text text-light opacity-75 small flex-grow-1">
                      {producto.descripcion}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* 4. Sectores Industriales Atendidos */}
        <motion.section
          className="my-5 py-5 tarjeta-cristal text-center p-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="fw-bold text-white mb-2">Sectores Industriales</h2>
          <p className="text-light opacity-75 mb-4 mx-auto col-md-8">
            Diseñamos soluciones especializadas para cumplir con las normativas sanitarias y químicas de cada sector.
          </p>

          <div className="d-flex flex-wrap justify-content-center gap-2">
            {listaSectores.map((sector, indice) => (
              <span
                key={indice}
                className="badge insignia-cristal fs-6 px-4 py-2 rounded-pill shadow-sm"
              >
                {sector}
              </span>
            ))}
          </div>
        </motion.section>

        {/* 5. Llamado a la Acción (CTA) */}
        <motion.section
          className="text-center my-5 py-5 tarjeta-cristal p-4"
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="display-6 fw-bold text-white mb-3">
            ¿Requieres una cotización inmediata?
          </h2>
          <p className="lead text-light opacity-75 mx-auto col-md-8 mb-4 fs-5">
            Ingresa a nuestra plataforma interna y obtén un estimado ajustado a los litros,
            tipo de acero y requerimientos de agitación de tu empresa.
          </p>

          <button
            onClick={manejarBotonCotizador}
            className="btn btn-verde-esmeralda btn-lg shadow rounded-pill mt-3 px-5 py-3 fs-3 fw-bold"
          >
            Ir al Cotizador Interno
          </button>
        </motion.section>
      </div>
    </div>
  );
}

export default LandingPage;
