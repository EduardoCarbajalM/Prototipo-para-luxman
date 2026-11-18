import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import FormularioCotizacion from './FormularioCotizacion';
import ChatMemebretes from './ChatMemebretes';

// ---------- DATOS TEMPORALES DEL LEAD SCORING ----------
const LISTA_LEADS = [
  { empresa: 'Lácteos del Norte SA de CV', region: 'Norte', sector: 'Alimenticia', probabilidad: 92 },
  { empresa: 'Laboratorios Farmex', region: 'Centro', sector: 'Farmacéutica', probabilidad: 85 },
  { empresa: 'Químicos del Bajío', region: 'Bajío', sector: 'Química', probabilidad: 78 },
  { empresa: 'Cosméticos Aurora', region: 'Occidente', sector: 'Cosmética', probabilidad: 64 },
  { empresa: 'Aguas Tratadas del Sur', region: 'Sur', sector: 'Tratamiento de Aguas', probabilidad: 55 },
  { empresa: 'Petroquímica del Golfo', region: 'Golfo', sector: 'Petroquímica', probabilidad: 48 },
  { empresa: 'Lácteos La Pradera', region: 'Centro', sector: 'Alimenticia', probabilidad: 71 },
  { empresa: 'Farmacéutica Andina MX', region: 'Norte', sector: 'Farmacéutica', probabilidad: 33 },
];

const LISTA_REGIONES = ['Todas', 'Norte', 'Centro', 'Bajío', 'Occidente', 'Sur', 'Golfo'];
const LISTA_SECTORES = [
  'Todos',
  'Farmacéutica',
  'Alimenticia',
  'Química',
  'Cosmética',
  'Tratamiento de Aguas',
  'Petroquímica',
];

// Devuelve el color de Bootstrap según la probabilidad
const obtenerColor = (probabilidad) => {
  if (probabilidad >= 75) return 'success';
  if (probabilidad >= 50) return 'warning';
  return 'danger';
};

const obtenerNivel = (probabilidad) => {
  if (probabilidad >= 75) return 'Alta';
  if (probabilidad >= 50) return 'Media';
  return 'Baja';
};

// ---------- SUBMÓDULO 1: DIRECTORIO CRM ----------
function DirectorioCRM() {
  const [regionElegida, setRegionElegida] = useState('Todas');
  const [sectorElegido, setSectorElegido] = useState('Todos');

  const leadsFiltrados = LISTA_LEADS.filter((lead) => {
    const cumpleRegion = regionElegida === 'Todas' || lead.region === regionElegida;
    const cumpleSector = sectorElegido === 'Todos' || lead.sector === sectorElegido;
    return cumpleRegion && cumpleSector;
  }).sort((a, b) => b.probabilidad - a.probabilidad);

  return (
    <div className="p-4">
      <h3 className="fw-bold mb-1">Directorio CRM</h3>
      <p className="text-secondary mb-4">
        Lead Scoring: probabilidad de compra por región y sector.
      </p>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <label className="form-label fw-semibold">Región</label>
          <select
            className="form-select"
            value={regionElegida}
            onChange={(e) => setRegionElegida(e.target.value)}
          >
            {LISTA_REGIONES.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Sector</label>
          <select
            className="form-select"
            value={sectorElegido}
            onChange={(e) => setSectorElegido(e.target.value)}
          >
            {LISTA_SECTORES.map((sector) => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Empresa</th>
                <th>Región</th>
                <th>Sector</th>
                <th style={{ minWidth: '200px' }}>Probabilidad de compra</th>
                <th>Nivel</th>
              </tr>
            </thead>
            <tbody>
              {leadsFiltrados.map((lead, indice) => (
                <tr key={lead.empresa}>
                  <td>{indice + 1}</td>
                  <td className="fw-semibold">{lead.empresa}</td>
                  <td>{lead.region}</td>
                  <td>{lead.sector}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="progress flex-grow-1" style={{ height: '10px' }}>
                        <div
                          className={`progress-bar bg-${obtenerColor(lead.probabilidad)}`}
                          style={{ width: `${lead.probabilidad}%` }}
                        />
                      </div>
                      <span className="fw-bold small">{lead.probabilidad}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge text-bg-${obtenerColor(lead.probabilidad)}`}>
                      {obtenerNivel(lead.probabilidad)}
                    </span>
                  </td>
                </tr>
              ))}
              {leadsFiltrados.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-secondary py-4">
                    No hay leads con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------- SUBMÓDULO 3: ACTA DE ENTREGA LOGÍSTICA ----------
function ActaEntrega() {
  const lienzoRef = useRef(null);
  const [dibujando, setDibujando] = useState(false);
  const [hayFirma, setHayFirma] = useState(false);

  const [cliente, setCliente] = useState('');
  const [nombreRecibe, setNombreRecibe] = useState('');
  const [equipo, setEquipo] = useState('Tanque de Proceso y Almacén');
  const [observaciones, setObservaciones] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [actaRegistrada, setActaRegistrada] = useState(null);

  // Calcula la posición del dedo/mouse dentro del canvas
  const obtenerPosicion = (evento) => {
    const lienzo = lienzoRef.current;
    const caja = lienzo.getBoundingClientRect();
    return {
      x: (evento.clientX - caja.left) * (lienzo.width / caja.width),
      y: (evento.clientY - caja.top) * (lienzo.height / caja.height),
    };
  };

  const empezarFirma = (evento) => {
    const contexto = lienzoRef.current.getContext('2d');
    const posicion = obtenerPosicion(evento);
    contexto.lineWidth = 3;
    contexto.lineCap = 'round';
    contexto.strokeStyle = '#0f172a';
    contexto.beginPath();
    contexto.moveTo(posicion.x, posicion.y);
    setDibujando(true);
  };

  const dibujarFirma = (evento) => {
    if (!dibujando) return;
    const contexto = lienzoRef.current.getContext('2d');
    const posicion = obtenerPosicion(evento);
    contexto.lineTo(posicion.x, posicion.y);
    contexto.stroke();
    setHayFirma(true);
  };

  const terminarFirma = () => setDibujando(false);

  const limpiarFirma = () => {
    const lienzo = lienzoRef.current;
    lienzo.getContext('2d').clearRect(0, 0, lienzo.width, lienzo.height);
    setHayFirma(false);
  };

  const registrarActa = (evento) => {
    evento.preventDefault();

    if (!cliente.trim() || !nombreRecibe.trim()) {
      setMensajeError('Completa el cliente y el nombre de quien recibe.');
      return;
    }
    if (!hayFirma) {
      setMensajeError('Falta la firma digital de recepción.');
      return;
    }

    setMensajeError('');
    setActaRegistrada({
      folio: 'ACTA-' + Date.now().toString().slice(-6),
      fecha: new Date().toLocaleString('es-MX'),
      cliente,
      nombreRecibe,
      equipo,
      observaciones,
      firma: lienzoRef.current.toDataURL('image/png'),
    });
  };

  const nuevaActa = () => {
    setActaRegistrada(null);
    setCliente('');
    setNombreRecibe('');
    setObservaciones('');
    setHayFirma(false);
  };

  // Vista cuando el acta ya fue firmada
  if (actaRegistrada) {
    return (
      <div className="p-4">
        <h3 className="fw-bold mb-3">Acta de Entrega Logística</h3>
        <div className="alert alert-success">
          Acta <strong>{actaRegistrada.folio}</strong> registrada correctamente el {actaRegistrada.fecha}.
        </div>
        <div className="card shadow-sm">
          <div className="card-body">
            <p className="mb-1"><strong>Cliente:</strong> {actaRegistrada.cliente}</p>
            <p className="mb-1"><strong>Recibe:</strong> {actaRegistrada.nombreRecibe}</p>
            <p className="mb-1"><strong>Equipo entregado:</strong> {actaRegistrada.equipo}</p>
            <p className="mb-3"><strong>Observaciones:</strong> {actaRegistrada.observaciones || 'Sin observaciones'}</p>
            <p className="fw-semibold mb-1">Firma de recepción:</p>
            <img
              src={actaRegistrada.firma}
              alt="Firma de recepción"
              className="border rounded bg-white img-fluid"
              style={{ maxWidth: '400px' }}
            />
          </div>
        </div>
        <button className="btn btn-primary mt-3" onClick={nuevaActa}>
          Nueva acta
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="fw-bold mb-1">Acta de Entrega Logística</h3>
      <p className="text-secondary mb-4">
        Simulador de firma digital de recepción del equipo.
      </p>

      <form onSubmit={registrarActa} className="card shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Cliente</label>
              <input
                type="text"
                className="form-control"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Ej. Lácteos del Norte SA de CV"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Nombre de quien recibe</label>
              <input
                type="text"
                className="form-control"
                value={nombreRecibe}
                onChange={(e) => setNombreRecibe(e.target.value)}
                placeholder="Nombre completo"
              />
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold">Equipo entregado</label>
              <select
                className="form-select"
                value={equipo}
                onChange={(e) => setEquipo(e.target.value)}
              >
                <option>Tanque de Proceso y Almacén</option>
                <option>Tanque Enchaquetado</option>
                <option>Marmita Industrial</option>
                <option>Reactor Químico</option>
                <option>Mezcladora de Doble Listón</option>
                <option>Agitador Industrial</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold">Observaciones</label>
              <textarea
                className="form-control"
                rows="2"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Estado del equipo, detalles de la entrega..."
              />
            </div>

            <div className="col-12">
              <label className="form-label fw-semibold">Firma digital (dibuja con el mouse o el dedo)</label>
              <canvas
                ref={lienzoRef}
                width="600"
                height="200"
                className="border border-2 rounded bg-white w-100"
                style={{ touchAction: 'none', cursor: 'crosshair' }}
                onPointerDown={empezarFirma}
                onPointerMove={dibujarFirma}
                onPointerUp={terminarFirma}
                onPointerLeave={terminarFirma}
              />
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm mt-2"
                onClick={limpiarFirma}
              >
                Limpiar firma
              </button>
            </div>
          </div>

          {mensajeError && (
            <div className="alert alert-danger mt-3 mb-0">{mensajeError}</div>
          )}

          <button type="submit" className="btn btn-success btn-lg mt-3">
            Registrar entrega
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- CONTENEDOR PRINCIPAL DEL PANEL ----------
function PanelRaul({ alCerrarSesion }) {
  // Estado simple para elegir el submódulo (igual que vistaActual en App.jsx)
  const [submoduloActual, setSubmoduloActual] = useState('crm');

  const opcionesMenu = [
    { id: 'crm', texto: 'Directorio CRM' },
    { id: 'cotizador', texto: 'Cotizador Técnico' },
    { id: 'acta', texto: 'Acta de Entrega Logística' },
    { id: 'memebretes', texto: 'Generador de Membretes (Regex)' },
  ];

  return (
    <div className="row g-0 min-vh-100">
      {/* ===== SIDEBAR ===== */}
      <aside className="col-12 col-md-3 col-lg-2 bg-dark text-white d-flex flex-column p-3">
        <h5 className="fw-bold mb-0">LUXMAN ERP</h5>
        <small className="text-secondary mb-4">Panel del Ing. Raúl Romero</small>

        <ul className="nav nav-pills flex-column gap-1 mb-4">
          {opcionesMenu.map((opcion) => (
            <li className="nav-item" key={opcion.id}>
              <button
                type="button"
                onClick={() => setSubmoduloActual(opcion.id)}
                className={`nav-link w-100 text-start ${
                  submoduloActual === opcion.id ? 'active' : 'text-white'
                }`}
              >
                {opcion.texto}
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={alCerrarSesion}
          className="btn btn-outline-light btn-sm mt-md-auto"
        >
          Cerrar sesión
        </button>
      </aside>

      {/* ===== CONTENIDO ===== */}
      <main className="col bg-light overflow-auto">
        <motion.div
          key={submoduloActual}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {submoduloActual === 'crm' && <DirectorioCRM />}
          {submoduloActual === 'cotizador' && <FormularioCotizacion />}
          {submoduloActual === 'acta' && <ActaEntrega />}
          {submoduloActual === 'memebretes' && <ChatMemebretes />}
        </motion.div>
      </main>
    </div>
  );
}

export default PanelRaul;
