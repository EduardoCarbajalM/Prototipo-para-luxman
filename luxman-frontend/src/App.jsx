import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import FormularioCotizacion from './components/FormularioCotizacion';
import ChatMemebretes from './components/ChatMemebretes';
import AccesoAdmin from './components/AccesoAdmin';
import PanelRaul from './components/PanelRaul';

// Orquestador: con el estado "vistaActual" simulamos el enrutamiento (sin react-router-dom)
// Valores posibles: 'inicio', 'cotizador', 'acceso', 'panel', 'memebretes'
function App() {
  const [vistaActual, setVistaActual] = useState('inicio');
  const [adminAutenticado, setAdminAutenticado] = useState(false);

  // Se conserva la ruta interna #/memebretes que ya existía en el proyecto
  useEffect(() => {
    const revisarHash = () => {
      if (window.location.hash === '#/memebretes') {
        setVistaActual('memebretes');
      }
    };

    revisarHash();
    window.addEventListener('hashchange', revisarHash);
    return () => window.removeEventListener('hashchange', revisarHash);
  }, []);

  // Se ejecuta cuando AccesoAdmin valida el PIN correcto
  const manejarAccesoCorrecto = () => {
    setAdminAutenticado(true);
    setVistaActual('panel');
  };

  // Cierra la sesión del ingeniero y regresa a la landing
  const manejarCerrarSesion = () => {
    setAdminAutenticado(false);
    setVistaActual('inicio');
  };

  if (vistaActual === 'memebretes') {
    return <ChatMemebretes />;
  }

  if (vistaActual === 'cotizador') {
    return <FormularioCotizacion alVolver={() => setVistaActual('inicio')} />;
  }

  if (vistaActual === 'acceso') {
    return (
      <AccesoAdmin
        alAccesoCorrecto={manejarAccesoCorrecto}
        alVolver={() => setVistaActual('inicio')}
      />
    );
  }

  // El panel solo se muestra si ya se pasó el PIN
  if (vistaActual === 'panel' && adminAutenticado) {
    return <PanelRaul alCerrarSesion={manejarCerrarSesion} />;
  }

  // Vista por defecto
  return (
    <LandingPage
      alIrACotizador={() => setVistaActual('cotizador')}
      alIrAAccesoAdmin={() => setVistaActual('acceso')}
    />
  );
}

export default App;
