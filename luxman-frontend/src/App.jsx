import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import FormularioCotizacion from './components/FormularioCotizacion';
import ChatMemebretes from './components/ChatMemebretes';

function App() {
  // Estado para controlar la pantalla actual ('inicio' por defecto)
  const [pantallaActual, setPantallaActual] = useState('inicio');

  // Sistema interno del CEO: se abre con http://localhost:5173/#/memebretes
  if (window.location.hash === '#/memebretes') {
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