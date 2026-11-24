import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import './LandingPage.css';
import { URL_BASE } from '../api';

const URL_API = `${URL_BASE}/api/solicitudes`;

const TIPOS_EQUIPO = [
  'Tanque de almacenamiento',
  'Tanque con agitación',
  'Sistema de proceso',
  'Mesas y estructuras',
  'Otro / No estoy seguro',
];

const FORMULARIO_VACIO = {
  nombre: '',
  empresa: '',
  correo: '',
  telefono: '',
  tipoEquipo: '',
  mensaje: '',
};

function FormularioContacto() {
  const [datos, setDatos] = useState(FORMULARIO_VACIO);
  const [estado, setEstado] = useState('inicial'); // inicial | enviando | exito | error
  const [mensajeError, setMensajeError] = useState('');

  const manejarCambio = (evento) => {
    const { name, value } = evento.target;
    setDatos((anterior) => ({ ...anterior, [name]: value }));
  };

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    setEstado('enviando');
    setMensajeError('');

    try {
      const respuesta = await fetch(URL_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });

      if (!respuesta.ok) {
        const texto = await respuesta.text();
        throw new Error(texto || 'No se pudo enviar tu solicitud.');
      }

      setEstado('exito');
      setDatos(FORMULARIO_VACIO);
    } catch (error) {
      setMensajeError(
        error instanceof TypeError
          ? 'No pudimos conectar con el servidor. Intenta de nuevo o contáctanos por teléfono.'
          : error.message
      );
      setEstado('error');
    }
  };

  return (
    <motion.section
      id="solicitar-contacto"
      className="my-5 tarjeta-cristal overflow-hidden"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="row g-0">
        <div className="col-lg-5 p-4 p-lg-5 d-flex flex-column justify-content-center">
          <span className="badge insignia-cristal align-self-start text-uppercase px-3 py-2 mb-3 rounded-pill">
            Cotización
          </span>
          <h2 className="display-6 fw-bold text-dark mb-2">Solicita tu cotización</h2>
          <p className="text-secondary mb-4">
            Déjanos tus datos y un asesor de Luxman se pondrá en contacto contigo para
            entender tu proyecto y preparar una propuesta a la medida.
          </p>
          <div className="d-flex align-items-center gap-3 mb-3">
            <Clock size={22} strokeWidth={2} className="text-primary flex-shrink-0" />
            <span className="text-secondary">Te contactamos en horario laboral.</span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <ShieldCheck size={22} strokeWidth={2} className="text-primary flex-shrink-0" />
            <span className="text-secondary">Tus datos solo se usan para contactarte.</span>
          </div>
        </div>

        <div className="col-lg-7 p-4 p-lg-5">
          {estado === 'exito' ? (
            <div className="alerta-cristal-exito p-4 text-center h-100 d-flex flex-column justify-content-center align-items-center gap-2">
              <CheckCircle2 size={44} strokeWidth={2} />
              <h4 className="fw-bold mb-1">¡Solicitud enviada!</h4>
              <p className="mb-3">Gracias por tu interés. Un asesor se comunicará contigo muy pronto.</p>
              <button
                type="button"
                className="btn btn-secundario-claro rounded-pill px-4"
                onClick={() => setEstado('inicial')}
              >
                Enviar otra solicitud
              </button>
            </div>
          ) : (
            <form onSubmit={manejarEnvio}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="cf-nombre" className="form-label fw-semibold text-dark">
                    Nombre completo *
                  </label>
                  <input
                    id="cf-nombre"
                    name="nombre"
                    className="form-control input-cristal"
                    value={datos.nombre}
                    onChange={manejarCambio}
                    maxLength={150}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="cf-empresa" className="form-label fw-semibold text-dark">
                    Empresa
                  </label>
                  <input
                    id="cf-empresa"
                    name="empresa"
                    className="form-control input-cristal"
                    value={datos.empresa}
                    onChange={manejarCambio}
                    maxLength={150}
                    autoComplete="organization"
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="cf-correo" className="form-label fw-semibold text-dark">
                    Correo electrónico *
                  </label>
                  <input
                    id="cf-correo"
                    type="email"
                    name="correo"
                    className="form-control input-cristal"
                    value={datos.correo}
                    onChange={manejarCambio}
                    maxLength={150}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="cf-telefono" className="form-label fw-semibold text-dark">
                    Teléfono *
                  </label>
                  <input
                    id="cf-telefono"
                    type="tel"
                    name="telefono"
                    className="form-control input-cristal"
                    value={datos.telefono}
                    onChange={manejarCambio}
                    maxLength={30}
                    minLength={8}
                    required
                    autoComplete="tel"
                  />
                </div>
                <div className="col-12">
                  <label htmlFor="cf-tipo" className="form-label fw-semibold text-dark">
                    ¿Qué equipo te interesa?
                  </label>
                  <select
                    id="cf-tipo"
                    name="tipoEquipo"
                    className="form-select input-cristal"
                    value={datos.tipoEquipo}
                    onChange={manejarCambio}
                  >
                    <option value="">Selecciona una opción</option>
                    {TIPOS_EQUIPO.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label htmlFor="cf-mensaje" className="form-label fw-semibold text-dark">
                    Cuéntanos de tu proyecto
                  </label>
                  <textarea
                    id="cf-mensaje"
                    name="mensaje"
                    rows={3}
                    className="form-control input-cristal"
                    value={datos.mensaje}
                    onChange={manejarCambio}
                    maxLength={2000}
                    placeholder="Capacidad aproximada, tipo de producto, tiempos, etc."
                  />
                </div>

                {estado === 'error' && (
                  <div className="col-12">
                    <div className="alerta-cristal-error p-3 d-flex align-items-start gap-2">
                      <AlertTriangle size={20} className="flex-shrink-0 mt-1" />
                      <span>{mensajeError}</span>
                    </div>
                  </div>
                )}

                <div className="col-12">
                  <button
                    type="submit"
                    disabled={estado === 'enviando'}
                    className="btn btn-verde-esmeralda btn-lg rounded-pill px-5 d-inline-flex align-items-center gap-2"
                  >
                    {estado === 'enviando' ? (
                      <Loader2 size={18} className="spin" />
                    ) : (
                      <Send size={18} strokeWidth={2} />
                    )}
                    <span>{estado === 'enviando' ? 'Enviando...' : 'Enviar solicitud'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </motion.section>
  );
}

export default FormularioContacto;
