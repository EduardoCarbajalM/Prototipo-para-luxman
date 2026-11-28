import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import ChatMemebretes from './components/ChatMemebretes';
import AccesoAdmin from './components/AccesoAdmin';
import PanelRaul from './components/PanelRaul';
import {
  URL_BASE,
  obtenerTokenAdmin,
  tieneSesionDirectivoActiva,
  borrarTokenAdmin,
} from './api';

function detectarRutaActual() {
  const ruta = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  if (ruta.toLowerCase() === '/directivo') return 'directivo';
  if (window.location.hash === '#/memebretes') return 'memebretes';
  return 'inicio';
}

function App() {
  const [rutaActual, setRutaActual] = useState(detectarRutaActual);
  const [adminAutenticado, setAdminAutenticado] = useState(() => tieneSesionDirectivoActiva());

  const sincronizarRutaYSesion = useCallback(() => {
    setRutaActual(detectarRutaActual());
    setAdminAutenticado(tieneSesionDirectivoActiva());
  }, []);

  useEffect(() => {
    window.addEventListener('popstate', sincronizarRutaYSesion);
    window.addEventListener('hashchange', sincronizarRutaYSesion);
    window.addEventListener('storage', sincronizarRutaYSesion);
    return () => {
      window.removeEventListener('popstate', sincronizarRutaYSesion);
      window.removeEventListener('hashchange', sincronizarRutaYSesion);
      window.removeEventListener('storage', sincronizarRutaYSesion);
    };
  }, [sincronizarRutaYSesion]);

  const irARuta = (nuevaRuta) => {
    window.history.pushState({}, '', nuevaRuta);
    setRutaActual(detectarRutaActual());
  };

  // Se ejecuta cuando AccesoAdmin valida el PIN correcto en /directivo
  const manejarAccesoCorrecto = () => {
    setAdminAutenticado(true);
    if (detectarRutaActual() !== 'directivo') {
      irARuta('/directivo');
    }
  };

  // Solo se limpia la sesión al presionar Cerrar sesión (o expiración explícita en servidor)
  const manejarCerrarSesion = () => {
    const tokenActual = obtenerTokenAdmin();
    if (tokenActual) {
      fetch(`${URL_BASE}/api/admin/logout`, {
        method: 'POST',
        headers: { 'X-Admin-Token': tokenActual },
      }).catch(() => {});
    }
    borrarTokenAdmin();
    setAdminAutenticado(false);
  };

  if (rutaActual === 'memebretes') {
    return <ChatMemebretes />;
  }

  if (rutaActual === 'directivo') {
    if (adminAutenticado) {
      return <PanelRaul alCerrarSesion={manejarCerrarSesion} />;
    }
    return (
      <AccesoAdmin
        alAccesoCorrecto={manejarAccesoCorrecto}
        alVolver={() => irARuta('/')}
      />
    );
  }

  // Ruta pública (/) sin ningún enlace al panel directivo
  return <LandingPage />;
}

export default App;
