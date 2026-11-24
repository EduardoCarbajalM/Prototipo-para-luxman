import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { URL_BASE, guardarTokenAdmin } from '../api';

function AccesoAdmin({ alAccesoCorrecto, alVolver }) {
  const [pin, setPin] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [validando, setValidando] = useState(false);
  const mostrarError = mensajeError !== '';

  // Solo deja escribir números y máximo 5 dígitos
  const manejarCambioPin = (evento) => {
    const soloNumeros = evento.target.value.replace(/\D/g, '').slice(0, 5);
    setPin(soloNumeros);
    setMensajeError('');
  };

  // El PIN se valida en el servidor, que devuelve un token de sesión
  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    setValidando(true);

    try {
      const respuesta = await fetch(`${URL_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (respuesta.status === 401) {
        setMensajeError('PIN incorrecto. Inténtalo de nuevo.');
        setPin('');
      } else if (!respuesta.ok) {
        setMensajeError('Error del servidor. Inténtalo más tarde.');
      } else {
        const { token } = await respuesta.json();
        guardarTokenAdmin(token);
        // Le avisa a App.jsx que cambie el estado para mostrar el Panel
        alAccesoCorrecto();
      }
    } catch {
      setMensajeError('No se pudo conectar con el servidor.');
    } finally {
      setValidando(false);
    }
  };

  return (
    <div
      className="bg-dark text-white min-vh-100 d-flex align-items-center justify-content-center p-3"
      data-bs-theme="dark"
    >
      <motion.div
        className="card bg-black border-secondary shadow-lg w-100"
        style={{ maxWidth: '420px' }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="card-body p-4 p-md-5 text-center">
          <span className="badge text-bg-primary text-uppercase px-3 py-2 mb-3">
            Zona Restringida
          </span>
          <h2 className="fw-bold mb-1">Acceso Administrativo</h2>
          <p className="text-secondary mb-4">
            Ing. Raúl Romero, ingresa tu PIN de 5 dígitos.
          </p>

          <form onSubmit={manejarEnvio}>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              maxLength={5}
              value={pin}
              onChange={manejarCambioPin}
              placeholder="•••••"
              aria-label="PIN de 5 dígitos"
              className="form-control form-control-lg bg-dark text-white border-secondary text-center fs-1 fw-bold mb-3"
              style={{ letterSpacing: '0.6rem' }}
            />

            {mostrarError && (
              <motion.div
                className="alert alert-danger py-2"
                role="alert"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {mensajeError}
              </motion.div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-100 fw-bold mb-2"
              disabled={pin.length !== 5 || validando}
            >
              {validando ? 'Validando...' : 'Ingresar'}
            </button>

            <button
              type="button"
              onClick={alVolver}
              className="btn btn-link text-secondary text-decoration-none w-100"
            >
              ← Volver al inicio
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default AccesoAdmin;
