import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Layers,
  Award,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Send,
} from 'lucide-react';
import './LandingPage.css';
import FormularioContacto from './FormularioContacto';

// componente para pasar las fotos de cada equipo en las tarjetas
const CarruselImagenes = ({ imagenes }) => {
  const [indiceActual, setIndiceActual] = useState(0);

  const irSiguiente = (evento) => {
    evento.stopPropagation();
    setIndiceActual((anterior) => (anterior === imagenes.length - 1 ? 0 : anterior + 1));
  };

  const irAnterior = (evento) => {
    evento.stopPropagation();
    setIndiceActual((anterior) => (anterior === 0 ? imagenes.length - 1 : anterior - 1));
  };

  return (
    <div className="contenedor-carrusel">
      <img
        src={imagenes[indiceActual]}
        alt="Equipo Inoxidable Luxman"
        className="imagen-carrusel"
      />

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
            {imagenes.map((_, indice) => (
              <span
                key={indice}
                className={`punto-carrusel ${indice === indiceActual ? 'activo' : ''}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// datos de los equipos que se muestran en el catalogo
const LISTA_PRODUCTOS = [
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

const LISTA_SECTORES = [
  'Farmacéutica',
  'Alimenticia',
  'Química',
  'Cosmética',
  'Tratamiento de Aguas',
  'Petroquímica',
];

// Datos de contacto y dirección oficial || Agregado por Dani
const DATOS_CONTACTO = {
  correo: 'equipos@luxman.tech',
  telefono: '+52 1 55 3027 9919',
  ubicacion: 'Av. Guadiana 203, Valle de Aragón 3A Sección, Ecatepec, Estado de México, C.P. 55280',
};

// Ubicación exacta en Google Maps
const URL_MAPA =
  'https://www.google.com/maps?q=Av.+Guadiana+203,+Valle+de+Arag%C3%B3n+3a+Secc,+55280+Ecatepec+de+Morelos,+M%C3%A9x.&output=embed';

const VARIANTES_CONTENEDOR = {
  oculto: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const VARIANTES_TARJETA = {
  oculto: { opacity: 0, y: 35 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

function LandingPage() {
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
              <a
                href="#catalogo"
                className="btn btn-secundario-claro btn-lg px-4 rounded-pill d-inline-flex align-items-center gap-2"
              >
                <Layers size={18} strokeWidth={2} />
                <span>Ver Catálogo</span>
              </a>
              <a
                href="#solicitar-contacto"
                className="btn btn-verde-esmeralda btn-lg px-4 rounded-pill d-inline-flex align-items-center gap-2"
              >
                <Send size={18} strokeWidth={2} />
                <span>Solicitar Cotización</span>
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
            variants={VARIANTES_CONTENEDOR}
            initial="oculto"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {LISTA_PRODUCTOS.map((producto, indice) => (
              <motion.div className="col-md-4" key={indice} variants={VARIANTES_TARJETA}>
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
            {LISTA_SECTORES.map((sector, indice) => (
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

        <FormularioContacto />

        {/* ===== SECCIÓN DE CONTACTO: grid de Bootstrap (mitad texto, mitad mapa) ===== */}
        <motion.section
          id="contacto"
          className="my-5 tarjeta-cristal overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="row g-0">
            {/* Mitad izquierda: información de contacto */}
            <div className="col-md-6 p-4 p-lg-5 d-flex flex-column justify-content-center">
              <span className="badge insignia-cristal align-self-start text-uppercase px-3 py-2 mb-3 rounded-pill">
                Contacto
              </span>
              <h2 className="display-6 fw-bold text-dark mb-2">Hablemos de tu proyecto</h2>
              <p className="text-secondary mb-4">
                Nuestro equipo de ingeniería está listo para asesorarte en el diseño y
                fabricación de tu equipo en acero inoxidable.
              </p>

              <div className="d-flex align-items-start gap-3 mb-3">
                <Mail size={22} strokeWidth={2} className="text-primary flex-shrink-0 mt-1" />
                <div>
                  <h6 className="fw-bold text-dark mb-0">Correo</h6>
                  <a
                    href={`mailto:${DATOS_CONTACTO.correo}`}
                    className="text-secondary text-decoration-none text-break"
                  >
                    {DATOS_CONTACTO.correo}
                  </a>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3 mb-3">
                <Phone size={22} strokeWidth={2} className="text-primary flex-shrink-0 mt-1" />
                <div>
                  <h6 className="fw-bold text-dark mb-0">Teléfono</h6>
                  <span className="text-secondary">{DATOS_CONTACTO.telefono}</span>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3">
                <MapPin size={22} strokeWidth={2} className="text-primary flex-shrink-0 mt-1" />
                <div>
                  <h6 className="fw-bold text-dark mb-0">Ubicación de la planta</h6>
                  <span className="text-secondary">{DATOS_CONTACTO.ubicacion}</span>
                </div>
              </div>
            </div>

            {/* Mitad derecha: mapa de Google Maps */}
            <div className="col-md-6">
              <iframe
                title="Ubicación de la planta Luxman"
                src={URL_MAPA}
                className="w-100 h-100 border-0"
                style={{ minHeight: '380px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </motion.section>
      </div>

      {/* ===== FOOTER PÚBLICO ===== */}
      <footer className="border-top py-4">
        <div className="container text-center">
          <small className="text-secondary">
            © 2026 Equipos Inoxidables Luxman. Todos los derechos reservados.
          </small>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
