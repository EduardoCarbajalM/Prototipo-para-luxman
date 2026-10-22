import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import FormularioCotizacion from './components/FormularioCotizacion';
import ChatMemebretes from './components/ChatMemebretes';

function App() {
  // guardamos en que vista estamos para cambiar entre el catalogo y la calculadora
  const [pantallaActual, setPantallaActual] = useState('inicio');

  // si entran con #/memebretes mostramos el chat de cotizaciones
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
