import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import FormularioCotizacion from './components/FormularioCotizacion';
import ChatMemebretes from './components/ChatMemebretes';

function App() {
  const [pantallaActual, setPantallaActual] = useState('inicio');

  useEffect(() => {
    // Función para actualizar la vista según el hash de la URL
    const procesarHash = () => {
      if (window.location.hash === '#/memebretes') {
        setPantallaActual('memebretes');
      }
    };

    // Verificar el hash al cargar la página
    procesarHash();

    // Escuchar cambios de hash dinámicamente si el usuario edita la URL
    window.addEventListener('hashchange', procesarHash);
    return () => window.removeEventListener('hashchange', procesarHash);
  }, []);

  // Renderizado condicional según el estado de la pantalla
  if (pantallaActual === 'memebretes') {
    return <ChatMemebretes />;
  }

  return (
    <div>
      {pantallaActual === 'inicio' ? (
        <LandingPage alIrACotizador={() => setPantallaActual('cotizador')} />
      ) : (
        <FormularioCotizacion alVolver={() => setPantallaActual('inicio')} />
      )}
    </div>
  );
}

export default App;