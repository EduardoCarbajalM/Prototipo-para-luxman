import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Calculator,
  Layers,
  Award,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import './LandingPage.css';

// Sub-componente independiente para manejar el carrusel de cada tarjeta
const CarruselImagenes = ({ imagenes }) => {
  const [indiceActual, setIndiceActual] = useState(0);

  const irSiguiente = (e) => {
    e.stopPropagation(); // Evita que otros clics interfieran
    setIndiceActual((prev) => (prev === imagenes.length - 1 ? 0 : prev + 1));
  };

  const irAnterior = (e) => {
    e.stopPropagation();
    setIndiceActual((prev) => (prev === 0 ? imagenes.length - 1 : prev - 1));
  };

  return (
    <div className="contenedor-carrusel">
      <img
        src={imagenes[indiceActual]}
        alt="Equipo Inoxidable Luxman"
        className="imagen-carrusel"
      />

      {/* Solo muestra los botones si hay más de 1 imagen */}
      {imagenes.length > 1 && (
        <>
          <button
            type="button"
            className="btn-carrusel btn-prev"
            onClick={irAnterior}
            aria-label="Imagen anterior"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className="btn-carrusel btn-next"
            onClick={irSiguiente}
            aria-label="Imagen siguiente"
          >
            <ChevronRight size={18} strokeWidth={2.2} />
          </button>
          <div className="indicadores-carrusel">
            {imagenes.map((_, idx) => (
              <span
                key={idx}
                className={`punto-carrusel ${idx === indiceActual ? 'activo' : ''}`}
              ></span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

function LandingPage({ alIrACotizador }) {
  // Lista de productos actualizada con las rutas correctas hacia public/img/equipos/
  const listaProductos = [
    {
      titulo: 'Marmitas Industriales',
      material: 'Acero Grado 304 y 316',
      descripcion:
        'Sistemas diseñados para cocción uniforme, mezclado dinámico y calentamiento controlado en la industria alimenticia y química.',
      imagenes: ['/img/equipos/1.jpg', '/img/equipos/11.jpg', '/img/equipos/16.jpg'],
    },
    {
      titulo: 'Reactores Químicos',
      material: 'Acero Grado 316L',
      descripcion:
        'Construcción de alta resistencia para trabajar con presión y temperatura extremas, bajo estrictos estándares de seguridad.',
      imagenes: ['/img/equipos/12.jpg', '/img/equipos/18.jpg', '/img/equipos/19.jpg'],
    },
    {
      titulo: 'Mezcladoras de Doble Listón',
      material: 'Acero Grado 304',
      descripcion:
        'Homogeneización rápida y continua para mezclas sólidas y polvos secos, minimizando tiempos de producción.',
      imagenes: [
        '/img/equipos/7.jpg',
        '/img/equipos/13.jpg',
        '/img/equipos/14.jpg',
        '/img/equipos/15.jpg',
        '/img/equipos/17.jpg',
      ],
    },
    {
      titulo: 'Tanques de Proceso y Almacén',
      material: 'Acero Grado 304 y 316',
      descripcion:
        'Acabados sanitarios pulidos espejo que previenen la acumulación bacteriana y facilitan protocolos de limpieza CIP.',
      imagenes: [
        '/img/equipos/3.jpg',
        '/img/equipos/4.jpg',
        '/img/equipos/5.jpg',
        '/img/equipos/6.jpg',
      ],
    },
    {
      titulo: 'Tanques Enchaquetados',
      material: 'Acero Grado 304 y 316',
      descripcion:
        'Aislamiento térmico y chaqueta externa para recirculación de vapor o salmuera, ideal para fermentación y enfriamiento.',
      imagenes: ['/img/equipos/20.jpg'],
    },
    {
      titulo: 'Agitadores Industriales',
      material: 'Acero Grado 316',
      descripcion:
        'Impulsores tipo turbina, áncora o hélice marina, calibrados según la viscosidad y reología de tu formulación.',
      imagenes: [
        '/img/equipos/2.jpg',
        '/img/equipos/8.jpg',
        '/img/equipos/9.jpg',
        '/img/equipos/10.jpg',
      ],
    },
  ];

  const listaSectores = [
    'Farmacéutica',
    'Alimenticia',
    'Química',
    'Cosmética',
    'Tratamiento de Aguas',
    'Petroquímica',
  ];

  const variantesContenedor = {
    oculto: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
  };

  const variantesTarjeta = {
    oculto: { opacity: 0, y: 35 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  function manejarBotonCotizador() {
    if (alIrACotizador) {
      alIrACotizador();
    }
  }

  return (
    <div className="fondo-oscuro-gradiente">
      <nav className="navbar sticky-top navbar-cristal py-3">
        <div className="container">
          <span className="navbar-brand fw-bold fs-4 d-flex align-items-center text-dark m-0 gap-2">
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-3 text-white"
              style={{
                width: '36px',
                height: '36px',
                background: 'linear-gradient(135deg, #1e293b 0%, #2563eb 100%)',
              }}
            >
              <Building2 size={18} strokeWidth={2.2} />
            </span>
            LUXMAN
          </span>
          <span className="text-secondary small d-none d-md-inline fw-medium">
            Equipos Inoxidables • Maestría Industrial
          </span>
          <button
            onClick={manejarBotonCotizador}
            className="btn btn-secundario-claro btn-sm rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2"
          >
            <Calculator size={16} strokeWidth={2} />
            <span>Acceso Cotizador</span>
          </button>
        </div>
      </nav>

      <div className="container py-5">
        <motion.section
          className="text-center py-5 my-2"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="mx-auto col-lg-10">
            <span className="badge insignia-cristal text-uppercase px-3 py-2 mb-3 rounded-pill d-inline-flex align-items-center gap-2">
              <Award size={15} strokeWidth={2} className="text-primary" />
              <span>Ingeniería de Grado Superior</span>
            </span>
            <h1 className="display-4 fw-bold text-dark mb-3 tracking-tight">
              Equipos Inoxidables Luxman
            </h1>
            <p className="lead text-secondary mx-auto mb-4 col-md-9 fs-5">
              Empresa mexicana con más de <strong className="text-dark">40 años de trayectoria</strong> en el diseño,
              ingeniería y fabricación de tanques y sistemas de proceso en acero inoxidable 304 y 316.
            </p>
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={manejarBotonCotizador}
                className="btn btn-verde-esmeralda btn-lg px-4 rounded-pill d-inline-flex align-items-center gap-2"
              >
                <Calculator size={18} strokeWidth={2} />
                <span>Cotizar Tanque Ahora</span>
              </button>
              <a
                href="#catalogo"
                className="btn btn-secundario-claro btn-lg px-4 rounded-pill d-inline-flex align-items-center gap-2"
              >
                <Layers size={18} strokeWidth={2} />
                <span>Ver Catálogo</span>
              </a>
            </div>
          </div>
        </motion.section>

        <section id="catalogo" className="my-5 pt-3">
          <div className="text-center mb-5">
            <h2 className="display-6 fw-bold text-dark">Catálogo de Equipos</h2>
            <p className="text-secondary">
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
              <motion.div className="col-md-4" key={indice} variants={variantesTarjeta}>
                <div className="card tarjeta-cristal h-100 overflow-hidden text-start">
                  <CarruselImagenes imagenes={producto.imagenes} />

                  <div className="card-body d-flex flex-column p-4">
                    <span className="badge insignia-cristal align-self-start mb-2 px-2 py-1 small rounded-pill">
                      {producto.material}
                    </span>
                    <h5 className="card-title fw-bold text-dark mb-2">{producto.titulo}</h5>
                    <p className="card-text text-secondary small flex-grow-1">
                      {producto.descripcion}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <motion.section
          className="my-5 py-5 tarjeta-cristal text-center p-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="fw-bold text-dark mb-2">Sectores Industriales</h2>
          <p className="text-secondary mb-4 mx-auto col-md-8">
            Diseñamos soluciones especializadas para cumplir con las normativas sanitarias y químicas de cada sector.
          </p>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            {listaSectores.map((sector, indice) => (
              <span
                key={indice}
                className="badge insignia-cristal fs-6 px-4 py-2 rounded-pill d-inline-flex align-items-center gap-2"
              >
                <CheckCircle2 size={15} strokeWidth={2} className="text-primary" />
                <span>{sector}</span>
              </span>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="text-center my-5 py-5 tarjeta-cristal p-4"
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="display-6 fw-bold text-dark mb-3">
            ¿Requieres una cotización inmediata?
          </h2>
          <p className="lead text-secondary mx-auto col-md-8 mb-4 fs-5">
            Ingresa a nuestra plataforma interna y obtén un estimado ajustado a los litros,
            tipo de acero y requerimientos de agitación de tu empresa.
          </p>
          <button
            onClick={manejarBotonCotizador}
            className="btn btn-verde-esmeralda btn-lg rounded-pill mt-2 px-5 py-3 fs-5 fw-bold d-inline-flex align-items-center gap-2"
          >
            <span>Ir al Cotizador Interno</span>
            <ArrowRight size={20} strokeWidth={2.2} />
          </button>
        </motion.section>
      </div>
    </div>
  );
}

export default LandingPage;