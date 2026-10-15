import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import FormularioCotizacion from './components/FormularioCotizacion';

function App() {
  // Estado para controlar la pantalla actual ('inicio' por defecto)
  const [pantallaActual, setPantallaActual] = useState('inicio');

  return (
    <div>
      {pantallaActual === 'inicio' ? (
        <LandingPage alIrACotizador={() => setPantallaActual('cotizador')} />
      ) : (
        <div className="container mt-5">
          <FormularioCotizacion />
        </div>
      )}
    </div>
  );
}

export default App;