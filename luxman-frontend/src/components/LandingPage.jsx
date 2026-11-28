import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Layers,
  Award,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Send,
  SendHorizontal,
  Sparkles,
  ShieldCheck,
  Clock,
  Calendar,
  Settings2,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import './LandingPage.css';
import { URL_BASE } from '../api';

const URL_SOLICITUDES = `${URL_BASE}/api/solicitudes`;
const URL_SEGUIMIENTO = `${URL_BASE}/api/proyectos_venta/seguimiento`;

const DATOS_CONTACTO = {
  correo: 'equipos@luxman.tech',
  telefono: '+52 1 55 3027 9919',
  whatsapp_numero: '5215530279919',
  ubicacion: 'Av. Guadiana 203, Valle de Aragón 3A Sección, Ecatepec, Estado de México',
  cp: 'C.P. 55280',
};

const URL_MAPA =
  'https://www.google.com/maps?q=Av.+Guadiana+203,+Valle+de+Arag%C3%B3n+3a+Secc,+55280+Ecatepec+de+Morelos,+M%C3%A9x.&output=embed';

const METRICAS_HERO = [
  {
    codigo: 'MAT-01',
    titulo: 'AISI 304 / 316L',
    detalle: 'Acero inoxidable austenítico con trazabilidad certificada de colada.',
  },
  {
    codigo: 'SAN-02',
    titulo: 'Acabado Sanitario Ra ≤ 0.8 µm',
    detalle: 'Pulido espejo interior libre de poros para validación CIP / SIP.',
  },
  {
    codigo: 'CAD-03',
    titulo: 'Diseño Paramétrico CAD 1:1',
    detalle: 'Desarrollo geométrico exacto de virolas y fondos planos, cónicos o toriesféricos.',
  },
  {
    codigo: 'FAB-04',
    titulo: 'Fabricación a la Medida',
    detalle: 'Chaquetas térmicas dimple/media caña, agitación dinámica y soldadura TIG.',
  },
];

// Showcase editorial técnico de los 5 sectores industriales clave
const SECTORES_INDUSTRIALES = [
  {
    numero: '01',
    sector: 'Agroalimentaria',
    subtitulo: 'Procesamiento lácteo, bebidas, salsas, jarabes y derivados alimentarios',
    norma_acabado:
      'NOM-251-SSA1 / Criterios 3-A Sanitary • Pulido sanitario interior Ra ≤ 0.8 µm con cordones TIG decapados y pasivados aptos para lavado CIP.',
    aleacion: 'AISI 304 Grado Alimenticio / AISI 316L (productos ácidos o salmueras)',
    equipos_tipicos: [
      'Tanques pasteurizadores enchaquetados con fondo cónico',
      'Marmitas de cocción y volteo sanitario (vapor o gas)',
      'Tinas queseras, tanques isotérmicos y mezcladoras horizontales',
      'Tanques de recepción, maduración de crema y preparación de jarabes',
    ],
    capacidades_habituales: '200 L a 10,000 L',
  },
  {
    numero: '02',
    sector: 'Farmacéutica',
    subtitulo: 'Formulaciones estériles, soluciones parenterales, jarabes y biotecnología',
    norma_acabado:
      'NOM-059-SSA1 (BPF) / Lineamientos ASME BPE • Acabado espejo sanitario Ra ≤ 0.4 – 0.6 µm sin zonas muertas, conexiones Clamp sanitarias y dossier de materiales.',
    aleacion: 'AISI 316L Bajo Carbono Certificado',
    equipos_tipicos: [
      'Biorreactores y reactores sanitarios con fondo toriesférico',
      'Tanques de preparación estéril con agitación magnética o sello mecánico',
      'Tanques móviles presurizados de transferencia sanitaria',
      'Recipientes colectores para agua grado farmacéutico (PW / WFI)',
    ],
    capacidades_habituales: '100 L a 3,000 L',
  },
  {
    numero: '03',
    sector: 'Cosmética',
    subtitulo: 'Emulsiones, cremas, geles, shampoos, serums y dermocosmética botánica',
    norma_acabado:
      'ISO 22716 (GMP Cosmética) • Acabado interior espejo sanitario Ra ≤ 0.8 µm, raspadores de teflón perimetrales y homogeneización sin incorporación de aire.',
    aleacion: 'AISI 304 / AISI 316L en contacto con activos cosméticos',
    equipos_tipicos: [
      'Tanques emulsionadores enchaquetados con agitación tipo áncora/turbina',
      'Marmitas fundidoras de ceras y fases oleosas con control térmico',
      'Mezcladoras de geles de alta viscosidad con bola rociadora CIP',
      'Tanques pulmón para almacenamiento de glicerina, bases e hidrolatos',
    ],
    capacidades_habituales: '200 L a 5,000 L',
  },
  {
    numero: '04',
    sector: 'Química',
    subtitulo: 'Resinas, polímeros, agroquímicos, recubrimientos y especialidades reactivas',
    norma_acabado:
      'Diseño mecánico industrial reforzado / Soldadura TIG con penetración completa • Alta resistencia a ataques químicos, corrosión por cloruros y ciclos térmicos.',
    aleacion: 'AISI 316 / AISI 316L Grado Químico Anticorrosivo',
    equipos_tipicos: [
      'Reactores químicos con chaqueta de calentamiento/enfriamiento y fondo toriesférico',
      'Tanques de neutralización ácida/alcalina y dosificación de reactivos',
      'Tanques buffer para solventes, emulsiones y formulaciones industriales',
      'Sistemas de agitación de turbina axial/radial para fluidos pesados',
    ],
    capacidades_habituales: '500 L a 10,000 L',
  },
  {
    numero: '05',
    sector: 'Tratamiento de Aguas',
    subtitulo: 'Ósmosis inversa, agua purificada industrial, filtración y cloración',
    norma_acabado:
      'NOM-127-SSA1 / Estándares higiénicos para agua de proceso • Pasivado integral de soldaduras para máxima resistencia frente a ozono, hipoclorito y sales.',
    aleacion: 'AISI 304 (agua osmotizada) / AISI 316 (contacto con cloro o salmuera)',
    equipos_tipicos: [
      'Tanques pulmón verticales para agua purificada y osmotizada',
      'Tanques de contacto para cloración y ozonización industrial',
      'Carcasas y filtros multimedia o de carbón activado en acero inoxidable',
      'Tanques dosificadores y rompedores de presión para plantas industriales',
    ],
    capacidades_habituales: '1,000 L a 15,000 L',
  },
];

// Catálogo fotográfico real de equipos fabricados en taller Luxman
const LISTA_PRODUCTOS = [
  {
    titulo: 'Marmitas Industriales',
    equipo_chatbot: 'Marmita',
    material: 'AISI 304 / 316L',
    descripcion:
      'Sistemas diseñados para cocción uniforme, mezclado dinámico y transferencia térmica controlada en la industria agroalimentaria, cosmética y química.',
    imagenes: ['/img/equipos/1.jpg', '/img/equipos/11.jpg', '/img/equipos/16.jpg'],
  },
  {
    titulo: 'Reactores y Biorreactores',
    equipo_chatbot: 'Reactor/Biorreactor',
    material: 'AISI 316L Certificado',
    descripcion:
      'Construcción de alta integridad estructural con fondos toriesféricos o cónicos para procesos térmicos exigentes y formulaciones especializadas.',
    imagenes: ['/img/equipos/12.jpg', '/img/equipos/18.jpg', '/img/equipos/19.jpg'],
  },
  {
    titulo: 'Mezcladoras Horizontales',
    equipo_chatbot: 'Otro',
    material: 'AISI 304 / 316',
    descripcion:
      'Homogeneización rápida y continua de doble listón para sólidos, polvos y granulados industriales, minimizando tiempos muertos de lote.',
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
    equipo_chatbot: 'Tanque de almacenamiento',
    material: 'AISI 304 / 316L',
    descripcion:
      'Acabados sanitarios pulido espejo Ra ≤ 0.8 µm que evitan acumulación microbiológica y agilizan protocolos de limpieza CIP en planta.',
    imagenes: [
      '/img/equipos/3.jpg',
      '/img/equipos/4.jpg',
      '/img/equipos/5.jpg',
      '/img/equipos/6.jpg',
    ],
  },
  {
    titulo: 'Tanques Enchaquetados con Agitación',
    equipo_chatbot: 'Tanque enchaquetado con agitación',
    material: 'AISI 304 / 316L',
    descripcion:
      'Aislamiento térmico y chaqueta exterior para recirculación de vapor, agua helada o glicol en pasteurización, emulsión y maduración.',
    imagenes: ['/img/equipos/20.jpg'],
  },
  {
    titulo: 'Sistemas de Agitación Industrial',
    equipo_chatbot: 'Tanque enchaquetado con agitación',
    material: 'AISI 316',
    descripcion:
      'Impulsores tipo turbina Rushton, áncora con raspadores o hélice marina, dimensionados según la viscosidad y reología del producto.',
    imagenes: [
      '/img/equipos/2.jpg',
      '/img/equipos/8.jpg',
      '/img/equipos/9.jpg',
      '/img/equipos/10.jpg',
    ],
  },
];

const OPCIONES_SECTOR_CHAT = [
  'Agroalimentaria',
  'Farmacéutica',
  'Cosmética',
  'Química',
  'Tratamiento de Aguas',
  'Otro',
];

const OPCIONES_EQUIPO_CHAT = [
  'Tanque de almacenamiento',
  'Tanque enchaquetado con agitación',
  'Reactor/Biorreactor',
  'Marmita',
  'Otro',
];

const CAPACIDADES_RAPIDAS = ['500 L', '1,000 L', '2,000 L', '5,000 L', '10,000 L'];
const FONDOS_SUGERIDOS = ['Plano', 'Cónico', 'Toriesférico', 'Por definir con ingeniería'];

const ETAPAS_RASTREO = [
  'Aprobado / Anticipo Recibido',
  'En Fabricación (Corte y Rolado)',
  'Soldadura y Pulido Sanitario',
  'Listo para Entrega',
  'Entregado',
];

function formatearFechaLargaMx(fechaIso) {
  if (!fechaIso) return 'Por confirmar con ingeniería';
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaIso)) {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    const meses = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return `${String(dia).padStart(2, '0')} de ${meses[mes - 1]} de ${anio}`;
  }
  return fechaIso;
}

// Carrusel fotográfico oscuro para el catálogo de equipos
function CarruselImagenesIndustrial({ imagenes, titulo }) {
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
    <div className="lx-carrusel">
      <img
        src={imagenes[indiceActual]}
        alt={titulo}
        className="lx-carrusel-img"
        loading="lazy"
      />
      {imagenes.length > 1 && (
        <>
          <button
            type="button"
            className="lx-carrusel-btn lx-prev"
            onClick={irAnterior}
            aria-label="Imagen anterior"
          >
            <ChevronLeft size={17} strokeWidth={2.3} />
          </button>
          <button
            type="button"
            className="lx-carrusel-btn lx-next"
            onClick={irSiguiente}
            aria-label="Imagen siguiente"
          >
            <ChevronRight size={17} strokeWidth={2.3} />
          </button>
          <div className="lx-carrusel-dots">
            {imagenes.map((_, indice) => (
              <span
                key={indice}
                className={`lx-dot ${indice === indiceActual ? 'activo' : ''}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Interfaz conversacional reutilizable (para la sección principal y el widget flotante)
function PanelAsistenteProspeccion({
  paso,
  setPaso,
  datosChat,
  setDatosChat,
  estadoEnvio,
  errorEnvio,
  idSolicitudCreada,
  alEnviarSolicitud,
  alReiniciar,
  compacto = false,
}) {
  const avanzarPaso3 = (e) => {
    e.preventDefault();
    if (!datosChat.capacidad_litros.trim()) return;
    setPaso(4);
  };

  const textoWhatsapp = encodeURIComponent(
    `Hola Ing. Raúl, registré la solicitud #${idSolicitudCreada || ''} en el portal de Equipos Inoxidables Luxman:\n` +
      `• Sector: ${datosChat.sector}\n` +
      `• Equipo: ${datosChat.tipo_equipo}\n` +
      `• Capacidad aprox.: ${datosChat.capacidad_litros}\n` +
      `• Fondo: ${datosChat.tipo_fondo}\n` +
      `• Empresa: ${datosChat.empresa || datosChat.nombre}`
  );

  return (
    <div className={`lx-chatbot-box ${compacto ? 'lx-chatbot-compacto' : ''}`}>
      {/* Cabecera del Asistente */}
      <div className="lx-chatbot-header">
        <div className="d-flex align-items-center gap-2">
          <span className="lx-chatbot-avatar">
            <Sparkles size={16} />
          </span>
          <div>
            <div className="fw-bold text-white small lh-sm">Asistente de Ingeniería Luxman</div>
            <div className="lx-chatbot-status">
              <span className="lx-status-dot" /> Levantamiento técnico sin costo • Sin precios automáticos
            </div>
          </div>
        </div>
        {estadoEnvio !== 'exito' && (
          <span className="lx-step-pill">Paso {paso} de 4</span>
        )}
      </div>

      {/* Historial visual de respuestas ya seleccionadas + paso actual */}
      <div className="lx-chatbot-body">
        <div className="lx-msg-bot">
          Bienvenido a <strong>Equipos Inoxidables Luxman</strong>. Te ayudaré a estructurar los requerimientos técnicos de tu equipo para que el <strong>Ing. Raúl Romero</strong> te envíe una propuesta formal a la medida.
        </div>

        {/* Resumen dinámico de pasos completados */}
        {paso > 1 && datosChat.sector && (
          <div className="lx-msg-pair">
            <div className="lx-msg-label">01 • Sector Industrial</div>
            <div className="lx-msg-user">{datosChat.sector}</div>
          </div>
        )}

        {paso > 2 && datosChat.tipo_equipo && (
          <div className="lx-msg-pair">
            <div className="lx-msg-label">02 • Tipo de Equipo</div>
            <div className="lx-msg-user">{datosChat.tipo_equipo}</div>
          </div>
        )}

        {paso > 3 && datosChat.capacidad_litros && (
          <div className="lx-msg-pair">
            <div className="lx-msg-label">03 • Capacidad y Especificaciones</div>
            <div className="lx-msg-user">
              {datosChat.capacidad_litros} • Fondo {datosChat.tipo_fondo}
              {datosChat.especificaciones ? ` — ${datosChat.especificaciones}` : ''}
            </div>
          </div>
        )}

        {/* ===== CONFIRMACIÓN FINAL ===== */}
        {estadoEnvio === 'exito' ? (
          <div className="lx-confirmacion-chat">
            <div className="d-flex align-items-center gap-2 mb-2 text-info fw-bold">
              <CheckCircle2 size={22} />
              <span>¡Solicitud registrada con folio #{idSolicitudCreada}!</span>
            </div>
            <p className="small text-light opacity-75 mb-3">
              Nuestro equipo de ingeniería ya recibió tu ficha técnica y se pondrá en contacto contigo a la brevedad.
            </p>

            <div className="lx-resumen-ficha mb-3">
              <div>
                <span>Prospecto:</span> <strong>{datosChat.nombre}</strong>
                {datosChat.empresa ? ` (${datosChat.empresa})` : ''}
              </div>
              <div>
                <span>Sector y Equipo:</span>{' '}
                <strong>
                  {datosChat.sector} • {datosChat.tipo_equipo}
                </strong>
              </div>
              <div>
                <span>Capacidad / Fondo:</span>{' '}
                <strong>
                  {datosChat.capacidad_litros} • Fondo {datosChat.tipo_fondo}
                </strong>
              </div>
              {datosChat.especificaciones && (
                <div>
                  <span>Detalles:</span> <strong>{datosChat.especificaciones}</strong>
                </div>
              )}
              <div>
                <span>Contacto:</span>{' '}
                <strong>
                  {datosChat.telefono} • {datosChat.correo}
                </strong>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2">
              <a
                href={`https://wa.me/${DATOS_CONTACTO.whatsapp_numero}?text=${textoWhatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn lx-btn-whatsapp btn-sm px-3 py-2 fw-semibold d-inline-flex align-items-center gap-2"
              >
                <Phone size={15} />
                <span>Abrir WhatsApp Directo</span>
              </a>
              <button
                type="button"
                onClick={alReiniciar}
                className="btn lx-btn-secundario btn-sm px-3 py-2 d-inline-flex align-items-center gap-1"
              >
                <RotateCcw size={14} />
                <span>Nueva solicitud</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* PASO 1: SECTOR INDUSTRIAL */}
            {paso === 1 && (
              <div className="lx-step-card">
                <div className="lx-question-title">
                  1. ¿Para qué sector industrial requieres el equipo?
                </div>
                <div className="lx-options-grid">
                  {OPCIONES_SECTOR_CHAT.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      className={`lx-option-btn ${datosChat.sector === sec ? 'activo' : ''}`}
                      onClick={() => {
                        setDatosChat((prev) => ({ ...prev, sector: sec }));
                        setPaso(2);
                      }}
                    >
                      <span>{sec}</span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASO 2: TIPO DE EQUIPO */}
            {paso === 2 && (
              <div className="lx-step-card">
                <div className="lx-question-title">
                  2. ¿Qué tipo de equipo en acero inoxidable necesitas cotizar?
                </div>
                <div className="lx-options-grid">
                  {OPCIONES_EQUIPO_CHAT.map((eq) => (
                    <button
                      key={eq}
                      type="button"
                      className={`lx-option-btn ${datosChat.tipo_equipo === eq ? 'activo' : ''}`}
                      onClick={() => {
                        setDatosChat((prev) => ({ ...prev, tipo_equipo: eq }));
                        setPaso(3);
                      }}
                    >
                      <span>{eq}</span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="lx-back-link mt-3"
                  onClick={() => setPaso(1)}
                >
                  <ArrowLeft size={14} /> Cambiar sector
                </button>
              </div>
            )}

            {/* PASO 3: CAPACIDAD Y ESPECIFICACIONES CLAVE */}
            {paso === 3 && (
              <form onSubmit={avanzarPaso3} className="lx-step-card">
                <div className="lx-question-title">
                  3. Indica la capacidad aproximada en litros y detalles clave del proceso:
                </div>

                <div className="d-flex flex-wrap gap-2 mb-2">
                  {CAPACIDADES_RAPIDAS.map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() =>
                        setDatosChat((prev) => ({ ...prev, capacidad_litros: cap }))
                      }
                      className={`lx-chip-cap ${
                        datosChat.capacidad_litros === cap ? 'activo' : ''
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                </div>

                <div className="row g-2 mb-2">
                  <div className="col-sm-6">
                    <label className="lx-label">Capacidad aproximada *</label>
                    <input
                      type="text"
                      required
                      maxLength={40}
                      placeholder="Ej. 1,500 L o 2 tanques de 1,000 L"
                      className="form-control lx-input"
                      value={datosChat.capacidad_litros}
                      onChange={(e) =>
                        setDatosChat((prev) => ({
                          ...prev,
                          capacidad_litros: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="lx-label">Tipo de fondo preferido</label>
                    <select
                      className="form-select lx-input"
                      value={datosChat.tipo_fondo}
                      onChange={(e) =>
                        setDatosChat((prev) => ({ ...prev, tipo_fondo: e.target.value }))
                      }
                    >
                      {FONDOS_SUGERIDOS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="lx-label">
                    Producto a procesar, agitación/temperatura y fecha deseada
                  </label>
                  <textarea
                    rows={2}
                    maxLength={1200}
                    placeholder="Ej. Emulsión cosmética viscosa, requiere chaqueta térmica y entrega en enero."
                    className="form-control lx-input"
                    value={datosChat.especificaciones}
                    onChange={(e) =>
                      setDatosChat((prev) => ({
                        ...prev,
                        especificaciones: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <button
                    type="button"
                    className="lx-back-link"
                    onClick={() => setPaso(2)}
                  >
                    <ArrowLeft size={14} /> Anterior
                  </button>
                  <button
                    type="submit"
                    className="btn lx-btn-primario btn-sm px-4 py-2 d-inline-flex align-items-center gap-2"
                  >
                    <span>Continuar a contacto</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* PASO 4: DATOS DE CONTACTO Y ENVÍO REAL */}
            {paso === 4 && (
              <form onSubmit={alEnviarSolicitud} className="lx-step-card">
                <div className="lx-question-title">
                  4. Datos de contacto para enviarte la propuesta formal:
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-sm-6">
                    <label className="lx-label">Nombre completo *</label>
                    <input
                      type="text"
                      required
                      maxLength={150}
                      placeholder="Ing. / Lic. Nombre"
                      className="form-control lx-input"
                      value={datosChat.nombre}
                      onChange={(e) =>
                        setDatosChat((prev) => ({ ...prev, nombre: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="lx-label">Empresa / Planta</label>
                    <input
                      type="text"
                      maxLength={150}
                      placeholder="Razón social o nombre comercial"
                      className="form-control lx-input"
                      value={datosChat.empresa}
                      onChange={(e) =>
                        setDatosChat((prev) => ({ ...prev, empresa: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="lx-label">Teléfono / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      minLength={8}
                      maxLength={30}
                      placeholder="Ej. 55 1234 5678"
                      className="form-control lx-input"
                      value={datosChat.telefono}
                      onChange={(e) =>
                        setDatosChat((prev) => ({ ...prev, telefono: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="lx-label">Correo corporativo *</label>
                    <input
                      type="email"
                      required
                      maxLength={150}
                      placeholder="nombre@empresa.com"
                      className="form-control lx-input"
                      value={datosChat.correo}
                      onChange={(e) =>
                        setDatosChat((prev) => ({ ...prev, correo: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {errorEnvio && (
                  <div className="lx-alert-error mb-3">
                    <AlertTriangle size={16} className="flex-shrink-0 mt-1" />
                    <span>{errorEnvio}</span>
                  </div>
                )}

                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <button
                    type="button"
                    className="lx-back-link"
                    onClick={() => setPaso(3)}
                  >
                    <ArrowLeft size={14} /> Modificar detalles
                  </button>
                  <button
                    type="submit"
                    disabled={estadoEnvio === 'enviando'}
                    className="btn lx-btn-primario px-4 py-2 d-inline-flex align-items-center gap-2"
                  >
                    {estadoEnvio === 'enviando' ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        <span>Registrando solicitud...</span>
                      </>
                    ) : (
                      <>
                        <SendHorizontal size={16} />
                        <span>Enviar Solicitud a Ingeniería</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LandingPage() {
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [indiceSectorActivo, setIndiceSectorActivo] = useState(0);

  // Estado compartido del Asistente Conversacional (sección integrada + botón flotante)
  const [widgetFlotanteAbierto, setWidgetFlotanteAbierto] = useState(false);
  const [pasoChat, setPasoChat] = useState(1);
  const [datosChat, setDatosChat] = useState({
    sector: '',
    tipo_equipo: '',
    capacidad_litros: '',
    tipo_fondo: 'Cónico',
    especificaciones: '',
    nombre: '',
    empresa: '',
    telefono: '',
    correo: '',
  });
  const [estadoEnvioChat, setEstadoEnvioChat] = useState('inicial'); // inicial | enviando | exito | error
  const [errorEnvioChat, setErrorEnvioChat] = useState('');
  const [idSolicitudCreada, setIdSolicitudCreada] = useState(null);

  // Estado del Rastreador Público de Fabricación por Folio
  const [folioBusqueda, setFolioBusqueda] = useState('');
  const [buscandoFolio, setBuscandoFolio] = useState(false);
  const [resultadoRastreo, setResultadoRastreo] = useState(null);
  const [errorRastreo, setErrorRastreo] = useState('');

  const seccionCotizarRef = useRef(null);
  const inputFolioRef = useRef(null);

  const sectorActualObj = SECTORES_INDUSTRIALES[indiceSectorActivo] || SECTORES_INDUSTRIALES[0];

  const desplazarASeccion = (idElemento) => {
    setMenuMovilAbierto(false);
    const nodo = document.getElementById(idElemento);
    if (nodo) {
      nodo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Abre la sección del asistente precargando opcionalmente sector o equipo
  const iniciarCotizacionConContexto = ({ sector, equipo, usarFlotante = false } = {}) => {
    setMenuMovilAbierto(false);
    if (estadoEnvioChat === 'exito') {
      setEstadoEnvioChat('inicial');
      setIdSolicitudCreada(null);
    }

    setDatosChat((prev) => ({
      ...prev,
      sector: sector || prev.sector,
      tipo_equipo: equipo || prev.tipo_equipo,
    }));

    if (sector && equipo) {
      setPasoChat(3);
    } else if (sector) {
      setPasoChat(2);
    } else if (equipo && datosChat.sector) {
      setPasoChat(3);
    } else if (!datosChat.sector) {
      setPasoChat(1);
    }

    if (usarFlotante) {
      setWidgetFlotanteAbierto(true);
    } else {
      setWidgetFlotanteAbierto(false);
      if (seccionCotizarRef.current) {
        seccionCotizarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const reiniciarChatbot = () => {
    setPasoChat(1);
    setEstadoEnvioChat('inicial');
    setErrorEnvioChat('');
    setIdSolicitudCreada(null);
    setDatosChat({
      sector: '',
      tipo_equipo: '',
      capacidad_litros: '',
      tipo_fondo: 'Cónico',
      especificaciones: '',
      nombre: '',
      empresa: '',
      telefono: '',
      correo: '',
    });
  };

  const enviarSolicitudChatbot = async (evento) => {
    evento.preventDefault();
    setEstadoEnvioChat('enviando');
    setErrorEnvioChat('');

    const resumenEquipo = `${datosChat.tipo_equipo || 'Equipo inoxidable'}${
      datosChat.capacidad_litros ? ` (${datosChat.capacidad_litros.trim()})` : ''
    }`.slice(0, 100);

    const lineasMensaje = [
      `Sector: ${datosChat.sector || 'Otro'}`,
      `Capacidad aprox.: ${datosChat.capacidad_litros || 'Por definir'}`,
      `Tipo de fondo: ${datosChat.tipo_fondo || 'Por definir'}`,
    ];
    if (datosChat.especificaciones.trim()) {
      lineasMensaje.push(`Especificaciones: ${datosChat.especificaciones.trim()}`);
    }

    const payload = {
      nombre: datosChat.nombre.trim(),
      empresa: datosChat.empresa.trim() || null,
      correo: datosChat.correo.trim(),
      telefono: datosChat.telefono.trim(),
      sector: datosChat.sector || 'Otro',
      tipo_equipo: resumenEquipo,
      capacidad_litros: datosChat.capacidad_litros.trim(),
      especificaciones: `${ lineFondoYDetalle(datosChat.tipo_fondo, datosChat.especificaciones) }`,
      mensaje: lineasMensaje.join('\n'),
    };

    try {
      const respuesta = await fetch(URL_SOLICITUDES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!respuesta.ok) {
        const msg = await respuesta.text();
        throw new Error(msg || 'No se pudo registrar la solicitud.');
      }

      const data = await respuesta.json();
      setIdSolicitudCreada(data.id_solicitud);
      setEstadoEnvioChat('exito');
    } catch (err) {
      setErrorEnvioChat(
        err instanceof TypeError
          ? 'No fue posible conectar con el servidor. Puedes contactarnos directamente por WhatsApp.'
          : err.message
      );
      setEstadoEnvioChat('error');
    }
  };

  const consultarFolioRastreo = async (evento) => {
    evento.preventDefault();
    const limpio = folioBusqueda.trim();
    if (!limpio) {
      setErrorRastreo('Ingresa el código de folio asignado a tu orden (ej. LUX-2026-036).');
      setResultadoRastreo(null);
      return;
    }

    setBuscandoFolio(true);
    setErrorRastreo('');
    try {
      const respuesta = await fetch(`${URL_SEGUIMIENTO}/${encodeURIComponent(limpio)}`);
      if (respuesta.status === 404) {
        setResultadoRastreo(null);
        setErrorRastreo(
          'No encontramos ningún proyecto activo con ese folio. Verifica el formato (ej. LUX-2026-036).'
        );
        return;
      }
      if (!respuesta.ok) {
        throw new Error('No se pudo consultar el estatus en este momento.');
      }

      const datos = await respuesta.json();
      setResultadoRastreo(datos);
    } catch (err) {
      setResultadoRastreo(null);
      setErrorRastreo(err.message || 'Error de conexión al consultar el seguimiento.');
    } finally {
      setBuscandoFolio(false);
    }
  };

  const indiceEtapaRastreo = resultadoRastreo
    ? ETAPAS_RASTREO.indexOf(resultadoRastreo.etapa_fabricacion)
    : -1;

  return (
    <div className="lx-landing">
      {/* ===== 1. NAVBAR CORPORATIVO STICKY (CERO ENLACES A /directivo) ===== */}
      <header className="lx-navbar sticky-top">
        <div className="container d-flex align-items-center justify-content-between py-3">
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="lx-brand text-decoration-none d-flex align-items-center gap-2"
          >
            <span className="lx-brand-icon">
              <Building2 size={19} strokeWidth={2.2} />
            </span>
            <div>
              <span className="lx-brand-title">LUXMAN</span>
              <span className="lx-brand-sub d-none d-sm-block">EQUIPOS INOXIDABLES</span>
            </div>
          </a>

          <nav className="lx-nav-links d-none d-lg-flex align-items-center gap-4">
            <button
              type="button"
              onClick={() => desplazarASeccion('ingenieria')}
              className="lx-nav-link"
            >
              Ingeniería
            </button>
            <button
              type="button"
              onClick={() => desplazarASeccion('sectores')}
              className="lx-nav-link"
            >
              Sectores
            </button>
            <button
              type="button"
              onClick={() => {
                desplazarASeccion('rastreo');
                setTimeout(() => inputFolioRef.current?.focus(), 450);
              }}
              className="lx-nav-link"
            >
              Rastrear Pedido
            </button>
            <button
              type="button"
              onClick={() => desplazarASeccion('ubicacion')}
              className="lx-nav-link"
            >
              Ubicación
            </button>
          </nav>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              onClick={() => iniciarCotizacionConContexto()}
              className="btn lx-btn-primario btn-sm px-3 py-2 d-none d-sm-inline-flex align-items-center gap-2"
            >
              <Sparkles size={15} />
              <span>Cotizar con Asistente</span>
            </button>

            <button
              type="button"
              className="lx-nav-toggle d-lg-none"
              onClick={() => setMenuMovilAbierto((v) => !v)}
              aria-label="Abrir navegación"
              aria-expanded={menuMovilAbierto}
            >
              {menuMovilAbierto ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Menú desplegable compacto en móvil/tableta */}
        {menuMovilAbierto && (
          <div className="lx-mobile-menu d-lg-none">
            <div className="container py-3 d-flex flex-column gap-2">
              <button
                type="button"
                onClick={() => desplazarASeccion('ingenieria')}
                className="lx-mobile-nav-item"
              >
                Ingeniería y Equipos
              </button>
              <button
                type="button"
                onClick={() => desplazarASeccion('sectores')}
                className="lx-mobile-nav-item"
              >
                Sectores Industriales
              </button>
              <button
                type="button"
                onClick={() => desplazarASeccion('rastreo')}
                className="lx-mobile-nav-item"
              >
                Rastrear Pedido por Folio
              </button>
              <button
                type="button"
                onClick={() => desplazarASeccion('ubicacion')}
                className="lx-mobile-nav-item"
              >
                Ubicación de Planta
              </button>
              <button
                type="button"
                onClick={() => iniciarCotizacionConContexto()}
                className="btn lx-btn-primario w-100 mt-1 d-inline-flex align-items-center justify-content-center gap-2"
              >
                <Sparkles size={16} />
                <span>Cotizar con Asistente</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ===== 2. HERO INDUSTRIAL ASIMÉTRICO DE 2 COLUMNAS ===== */}
      <section id="inicio" className="lx-hero-section">
        <div className="container">
          <div className="row align-items-center g-4 g-xl-5">
            {/* Columna izquierda: Mensaje corporativo de alto impacto */}
            <motion.div
              className="col-lg-7"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
            >
              <div className="lx-kicker mb-3">
                <Award size={15} className="lx-text-accent" />
                <span>MÁS DE 40 AÑOS DE INGENIERÍA EN ACERO INOXIDABLE EN MÉXICO</span>
              </div>

              <h1 className="lx-hero-title mb-3">
                Tanques, Reactores y Sistemas de Proceso de{' '}
                <span className="lx-gradient-text">Grado Sanitario e Industrial</span>
              </h1>

              <p className="lx-hero-lead mb-4">
                Diseñamos y fabricamos equipos en acero inoxidable <strong>AISI 304 y 316L</strong>{' '}
                bajo especificaciones exactas de volumen, transferencia térmica, agitación y normativa
                sanitaria para plantas productivas en toda la República Mexicana.
              </p>

              <div className="d-flex flex-wrap gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => iniciarCotizacionConContexto()}
                  className="btn lx-btn-primario btn-lg px-4 d-inline-flex align-items-center gap-2"
                >
                  <Sparkles size={18} />
                  <span>Iniciar Cotización Guiada</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    desplazarASeccion('rastreo');
                    setTimeout(() => inputFolioRef.current?.focus(), 450);
                  }}
                  className="btn lx-btn-secundario btn-lg px-4 d-inline-flex align-items-center gap-2"
                >
                  <Layers size={18} />
                  <span>Rastrear mi Equipo</span>
                </button>
              </div>

              <div className="lx-hero-trust">
                <span>
                  <ShieldCheck size={16} className="lx-text-accent" /> Soldadura TIG Sanitaria
                </span>
                <span>
                  <CheckCircle2 size={16} className="lx-text-accent" /> Pruebas Hidrostáticas en Planta
                </span>
                <span>
                  <Settings2 size={16} className="lx-text-accent" /> Ingeniería Nacional en Ecatepec, Edo. Méx.
                </span>
              </div>
            </motion.div>

            {/* Columna derecha: Tarjeta visual técnica y métricas de ingeniería */}
            <motion.div
              className="col-lg-5"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.12, ease: 'easeOut' }}
            >
              <div className="lx-tech-panel">
                <div className="lx-tech-panel-header">
                  <span className="lx-mono-tag">ESPECIFICACIÓN DE TALLER • LUXMAN</span>
                  <span className="lx-live-badge">ISO / NOM SANITARIO</span>
                </div>

                <div className="lx-tech-grid">
                  {METRICAS_HERO.map((item) => (
                    <div key={item.codigo} className="lx-tech-metric">
                      <div className="lx-metric-code">{item.codigo}</div>
                      <div className="lx-metric-title">{item.titulo}</div>
                      <p className="lx-metric-desc mb-0">{item.detalle}</p>
                    </div>
                  ))}
                </div>

                <div className="lx-tech-footer">
                  <div>
                    <div className="lx-mono-tag">PLANTA INDUSTRIAL</div>
                    <div className="small text-white fw-semibold">
                      Fabricación Directa sin Intermediarios
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => desplazarASeccion('ingenieria')}
                    className="lx-inline-cta"
                  >
                    Ver equipos →
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== 3. SHOWCASE EDITORIAL ASIMÉTRICO DE SECTORES INDUSTRIALES ===== */}
      <section id="sectores" className="lx-section">
        <div className="container">
          <div className="row justify-content-between align-items-end mb-4 g-3">
            <div className="col-lg-7">
              <div className="lx-section-eyebrow">ESPECIALIZACIÓN SECTORIAL</div>
              <h2 className="lx-section-title mb-2">
                Ingeniería Adaptada a la Normativa de tu Industria
              </h2>
              <p className="lx-section-subtitle mb-0">
                Selecciona tu sector operativo para consultar acabados sanitarios, aleaciones recomendadas
                y líneas de equipos fabricados por Luxman.
              </p>
            </div>
          </div>

          <div className="row g-4 align-items-stretch">
            {/* Columna izquierda: Índice vertical editorial numerado (01 a 05) */}
            <div className="col-lg-5">
              <div className="lx-sector-index" role="tablist" aria-label="Sectores industriales">
                {SECTORES_INDUSTRIALES.map((item, idx) => {
                  const activo = idx === indiceSectorActivo;
                  return (
                    <button
                      key={item.numero}
                      type="button"
                      role="tab"
                      aria-selected={activo}
                      onClick={() => setIndiceSectorActivo(idx)}
                      className={`lx-sector-row ${activo ? 'activo' : ''}`}
                    >
                      <span className="lx-sector-num">{item.numero}</span>
                      <div className="lx-sector-row-text">
                        <span className="lx-sector-name">{item.sector}</span>
                        <span className="lx-sector-brief">{item.subtitulo}</span>
                      </div>
                      <ChevronRight size={18} className="lx-sector-arrow" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Columna derecha: Ficha técnica detallada del sector seleccionado */}
            <div className="col-lg-7">
              <motion.div
                key={sectorActualObj.numero}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="lx-sector-detail h-100 d-flex flex-column justify-content-between"
              >
                <div>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pb-3 mb-3 lx-border-bottom">
                    <div>
                      <span className="lx-mono-tag">
                        FICHA SECTORIAL {sectorActualObj.numero} / 05
                      </span>
                      <h3 className="text-white fw-bold mb-0 mt-1">
                        Industria {sectorActualObj.sector}
                      </h3>
                    </div>
                    <span className="lx-capacity-tag">
                      Rango habitual: {sectorActualObj.capacidades_habituales}
                    </span>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <div className="lx-spec-block h-100">
                        <div className="lx-spec-label">ALEACIÓN RECOMENDADA</div>
                        <div className="lx-spec-value">{sectorActualObj.aleacion}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="lx-spec-block h-100">
                        <div className="lx-spec-label">NORMA Y ACABADO SANITARIO</div>
                        <div className="lx-spec-value small">{sectorActualObj.norma_acabado}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="lx-spec-label mb-2">EQUIPOS TÍPICOS FABRICADOS</div>
                    <div className="row g-2">
                      {sectorActualObj.equipos_tipicos.map((eq, i) => (
                        <div className="col-sm-6" key={i}>
                          <div className="lx-equip-item">
                            <CheckCircle2 size={15} className="lx-text-accent flex-shrink-0 mt-1" />
                            <span>{eq}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 lx-border-top d-flex flex-wrap justify-content-between align-items-center gap-3">
                  <span className="small lx-muted">
                    ¿Tienes requerimientos específicos de presión, chaqueta o agitación?
                  </span>
                  <button
                    type="button"
                    onClick={() => iniciarCotizacionConContexto({ sector: sectorActualObj.sector })}
                    className="lx-sector-cta"
                  >
                    Solicitar cotización para este sector →
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 4. INGENIERÍA Y CATÁLOGO DE EQUIPOS EN ACERO INOXIDABLE ===== */}
      <section id="ingenieria" className="lx-section lx-section-alt">
        <div className="container">
          <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
            <div>
              <div className="lx-section-eyebrow">MANUFACTURA METALMECÁNICA INOXIDABLE</div>
              <h2 className="lx-section-title mb-1">Líneas de Fabricación en Planta</h2>
              <p className="lx-section-subtitle mb-0">
                Equipos construidos en nuestro taller con soldadura sanitaria TIG, corte y rolado de precisión.
              </p>
            </div>
          </div>

          <div className="row g-4">
            {LISTA_PRODUCTOS.map((producto, indice) => (
              <div className="col-md-6 col-lg-4" key={indice}>
                <div className="lx-product-card h-100 d-flex flex-column">
                  <CarruselImagenesIndustrial
                    imagenes={producto.imagenes}
                    titulo={producto.titulo}
                  />
                  <div className="p-4 d-flex flex-column flex-grow-1">
                    <div className="mb-2">
                      <span className="lx-alloy-badge">{producto.material}</span>
                    </div>
                    <h5 className="text-white fw-bold mb-2">{producto.titulo}</h5>
                    <p className="lx-muted small mb-3 flex-grow-1">{producto.descripcion}</p>
                    <button
                      type="button"
                      onClick={() =>
                        iniciarCotizacionConContexto({ equipo: producto.equipo_chatbot })
                      }
                      className="lx-card-action align-self-start"
                    >
                      Cotizar este equipo →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 5. RASTREADOR PÚBLICO DE FABRICACIÓN POR FOLIO ===== */}
      <section id="rastreo" className="lx-section">
        <div className="container">
          <div className="lx-tracker-shell">
            <div className="row g-4 align-items-center">
              <div className="col-lg-5">
                <div className="lx-section-eyebrow">TRANSPARENCIA OPERATIVA EN TALLER</div>
                <h2 className="lx-section-title mb-2">Rastreador de Fabricación por Folio</h2>
                <p className="lx-section-subtitle mb-3">
                  Si ya cuentas con una orden de fabricación activa en Luxman, ingresa tu código de folio
                  para consultar en tiempo real la etapa productiva de tu equipo y su fecha compromiso de entrega.
                </p>

                <form onSubmit={consultarFolioRastreo} className="lx-tracker-form">
                  <div className="lx-tracker-input-group">
                    <input
                      ref={inputFolioRef}
                      type="text"
                      maxLength={30}
                      placeholder="Ej. LUX-2026-036"
                      className="form-control lx-input lx-folio-input"
                      value={folioBusqueda}
                      onChange={(e) => setFolioBusqueda(e.target.value.toUpperCase())}
                    />
                    <button
                      type="submit"
                      disabled={buscandoFolio}
                      className="btn lx-btn-primario px-4 d-inline-flex align-items-center justify-content-center gap-2"
                    >
                      {buscandoFolio ? (
                        <>
                          <Loader2 size={16} className="spin" />
                          <span>Consultando...</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>Consultar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <small className="lx-muted d-block mt-2">
                    Consulta pública protegida: únicamente muestra estatus técnico de taller sin exponer importes ni información fiscal.
                  </small>
                </form>

                {errorRastreo && (
                  <div className="lx-alert-error mt-3">
                    <AlertTriangle size={16} className="flex-shrink-0 mt-1" />
                    <span>{errorRastreo}</span>
                  </div>
                )}
              </div>

              <div className="col-lg-7">
                {resultadoRastreo ? (
                  <motion.div
                    key={resultadoRastreo.folio}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lx-tracker-result"
                  >
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 pb-3 mb-3 lx-border-bottom">
                      <div>
                        <span className="lx-folio-chip">{resultadoRastreo.folio}</span>
                        <h4 className="text-white fw-bold mt-2 mb-1">
                          {resultadoRastreo.nombre_proyecto}
                        </h4>
                      </div>
                      <div className="text-sm-end">
                        <div className="lx-spec-label">FECHA COMPROMISO DE ENTREGA</div>
                        <div className="text-info fw-bold d-inline-flex align-items-center gap-1 mt-1">
                          <Calendar size={15} />
                          <span>
                            {formatearFechaLargaMx(resultadoRastreo.fecha_compromiso_entrega)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {indiceEtapaRastreo < 0 ? (
                      <div className="lx-cotizado-banner">
                        <Clock size={18} className="lx-text-accent flex-shrink-0" />
                        <div>
                          <div className="fw-bold text-white">
                            Estatus actual: {resultadoRastreo.etapa_fabricacion}
                          </div>
                          <div className="small lx-muted">
                            Este folio se encuentra en revisión comercial previa al arranque de manufactura en taller.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="lx-timeline">
                        {ETAPAS_RASTREO.map((etapaNombre, idx) => {
                          const completada = idx < indiceEtapaRastreo || indiceEtapaRastreo === 4;
                          const actual = idx === indiceEtapaRastreo && indiceEtapaRastreo < 4;
                          return (
                            <div
                              key={etapaNombre}
                              className={`lx-timeline-step ${
                                completada ? 'completada' : actual ? 'actual' : 'pendiente'
                              }`}
                            >
                              <div className="lx-timeline-marker">
                                {completada ? <CheckCircle2 size={15} /> : <span>{idx + 1}</span>}
                              </div>
                              <div className="lx-timeline-content">
                                <div className="lx-timeline-title">{etapaNombre}</div>
                                <div className="lx-timeline-state">
                                  {actual
                                    ? 'Etapa actual en planta'
                                    : completada
                                    ? 'Etapa completada'
                                    : 'Siguiente proceso'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="lx-tracker-placeholder">
                    <div className="lx-mono-tag mb-2">MONITOREO DE 5 ETAPAS EN PLANTA</div>
                    <h5 className="text-white fw-bold mb-2">
                      Trazabilidad desde el corte de lámina hasta la entrega final
                    </h5>
                    <p className="lx-muted small mb-3">
                      Cada proyecto aprobado recibe un folio único con visibilidad de avance en:
                    </p>
                    <div className="lx-preview-stages">
                      {ETAPAS_RASTREO.map((etapa, i) => (
                        <div key={etapa} className="lx-preview-stage-item">
                          <span className="lx-preview-stage-num">0{i + 1}</span>
                          <span>{etapa}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 6. SECCIÓN INTEGRADA DEL ASISTENTE CONVERSACIONAL DE PROSPECCIÓN ===== */}
      <section id="cotizar" ref={seccionCotizarRef} className="lx-section lx-section-alt">
        <div className="container">
          <div className="row g-4 g-lg-5 align-items-center">
            <div className="col-lg-5">
              <div className="lx-section-eyebrow">COTIZACIÓN TÉCNICA PERSONALIZADA</div>
              <h2 className="lx-section-title mb-3">
                Configura tu Solicitud con Nuestro Asistente de Ingeniería
              </h2>
              <p className="lx-section-subtitle mb-4">
                Cada tanque y reactor industrial requiere dimensionamiento específico de espesor, tipo de
                fondo, acabado sanitario y transferencia térmica. Completa estos 4 pasos breves y el{' '}
                <strong className="text-white">Ing. Raúl Romero</strong> revisará personalmente tu proyecto.
              </p>

              <div className="d-flex flex-column gap-3">
                <div className="lx-benefit-row">
                  <Clock size={20} className="lx-text-accent flex-shrink-0 mt-1" />
                  <div>
                    <div className="text-white fw-semibold">Atención directa de ingeniería</div>
                    <div className="small lx-muted">
                      Evaluación real de materiales, geometría y tiempos de entrega en taller.
                    </div>
                  </div>
                </div>
                <div className="lx-benefit-row">
                  <ShieldCheck size={20} className="lx-text-accent flex-shrink-0 mt-1" />
                  <div>
                    <div className="text-white fw-semibold">Confidencialidad industrial</div>
                    <div className="small lx-muted">
                      Tus formulaciones y datos de contacto se utilizan exclusivamente para elaborar tu cotización.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-7">
              <PanelAsistenteProspeccion
                paso={pasoChat}
                setPaso={setPasoChat}
                datosChat={datosChat}
                setDatosChat={setDatosChat}
                estadoEnvio={estadoEnvioChat}
                errorEnvio={errorEnvioChat}
                idSolicitudCreada={idSolicitudCreada}
                alEnviarSolicitud={enviarSolicitudChatbot}
                alReiniciar={reiniciarChatbot}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== 7. UBICACIÓN DE PLANTA Y CONTACTO CORPORATIVO ===== */}
      <section id="ubicacion" className="lx-section">
        <div className="container">
          <div className="lx-location-card overflow-hidden">
            <div className="row g-0">
              <div className="col-lg-5 p-4 p-md-5 d-flex flex-column justify-content-center">
                <div className="lx-section-eyebrow">PLANTA Y OFICINAS TÉCNICAS</div>
                <h2 className="lx-section-title mb-3">Visítanos o Contáctanos Directamente</h2>
                <p className="lx-muted small mb-4">
                  Atendemos proyectos industriales para plantas productivas en la Zona Metropolitana y
                  envíos especializados a toda la República Mexicana.
                </p>

                <div className="d-flex align-items-start gap-3 mb-3">
                  <span className="lx-contact-icon">
                    <MapPin size={19} />
                  </span>
                  <div>
                    <div className="text-white fw-semibold small">Dirección de Planta</div>
                    <div className="lx-muted small">
                      {DATOS_CONTACTO.ubicacion}, {DATOS_CONTACTO.cp}
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3 mb-3">
                  <span className="lx-contact-icon">
                    <Phone size={19} />
                  </span>
                  <div>
                    <div className="text-white fw-semibold small">Teléfono y WhatsApp Industrial</div>
                    <a
                      href="tel:+5215530279919"
                      className="lx-contact-link small d-inline-block"
                    >
                      {DATOS_CONTACTO.telefono}
                    </a>
                  </div>
                </div>

                <div className="d-flex align-items-start gap-3">
                  <span className="lx-contact-icon">
                    <Mail size={19} />
                  </span>
                  <div>
                    <div className="text-white fw-semibold small">Correo de Ingeniería y Ventas</div>
                    <a
                      href={`mailto:${DATOS_CONTACTO.correo}`}
                      className="lx-contact-link small text-break d-inline-block"
                    >
                      {DATOS_CONTACTO.correo}
                    </a>
                  </div>
                </div>
              </div>

              <div className="col-lg-7 lx-map-wrapper">
                <iframe
                  title="Ubicación de Planta Equipos Inoxidables Luxman"
                  src={URL_MAPA}
                  className="lx-map-iframe"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 8. FOOTER CORPORATIVO (CERO ENLACES A /directivo) ===== */}
      <footer className="lx-footer">
        <div className="container py-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <span className="lx-brand-icon lx-brand-icon-sm">
                <Building2 size={16} />
              </span>
              <span className="text-white fw-bold small">
                EQUIPOS INOXIDABLES LUXMAN
              </span>
              <span className="lx-muted small d-none d-sm-inline">
                • Ingeniería en Acero Inoxidable 304 y 316L
              </span>
            </div>

            <div className="d-flex flex-wrap justify-content-center gap-3 small">
              <button
                type="button"
                onClick={() => desplazarASeccion('ingenieria')}
                className="lx-footer-link"
              >
                Ingeniería
              </button>
              <button
                type="button"
                onClick={() => desplazarASeccion('sectores')}
                className="lx-footer-link"
              >
                Sectores
              </button>
              <button
                type="button"
                onClick={() => desplazarASeccion('rastreo')}
                className="lx-footer-link"
              >
                Rastrear Pedido
              </button>
              <button
                type="button"
                onClick={() => desplazarASeccion('ubicacion')}
                className="lx-footer-link"
              >
                Ubicación
              </button>
            </div>

            <div className="lx-muted small text-center text-md-end">
              © 2026 Equipos Inoxidables Luxman. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </footer>

      {/* ===== 9. BOTÓN Y WIDGET FLOTANTE DEL ASISTENTE EN ESQUINA INFERIOR DERECHA ===== */}
      <div className="lx-floating-root">
        {widgetFlotanteAbierto && (
          <div className="lx-floating-popover">
            <div className="d-flex justify-content-end mb-1">
              <button
                type="button"
                onClick={() => setWidgetFlotanteAbierto(false)}
                className="lx-floating-close"
                aria-label="Cerrar asistente flotante"
              >
                ✕ Cerrar ventana
              </button>
            </div>
            <PanelAsistenteProspeccion
              paso={pasoChat}
              setPaso={setPasoChat}
              datosChat={datosChat}
              setDatosChat={setDatosChat}
              estadoEnvio={estadoEnvioChat}
              errorEnvio={errorEnvioChat}
              idSolicitudCreada={idSolicitudCreada}
              alEnviarSolicitud={enviarSolicitudChatbot}
              alReiniciar={reiniciarChatbot}
              compacto
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setWidgetFlotanteAbierto((v) => !v)}
          className="lx-floating-fab"
          aria-label="Abrir asistente de cotización"
        >
          <Sparkles size={19} />
          <span className="lx-fab-label">
            {widgetFlotanteAbierto ? 'Ocultar Asistente' : 'Cotizar con Asistente'}
          </span>
        </button>
      </div>
    </div>
  );
}

function lineFondoYDetalle(tipoFondo, especificaciones) {
  const base = `Fondo: ${tipoFondo || 'Por definir'}`;
  return especificaciones && especificaciones.trim()
    ? `${base} | ${especificaciones.trim()}`
    : base;
}

export default LandingPage;
