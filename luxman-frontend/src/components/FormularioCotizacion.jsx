import React, { useState } from "react";

// URL base del backend en C#, aqui hardcodeada para el proyecto
// TODO: sacar esto a un archivo de configuracion/env cuando ya sea version final
const URL_BASE_API = "http://localhost:5294/api/cotizacion";

function FormularioCotizacion() {
  // usamos un state por cada campo del formulario, nada de un solo objeto
  // gigante para que se entienda mas facil que hace cada input
  const [idCliente, setIdCliente] = useState("");
  const [litrosTanque, setLitrosTanque] = useState("");
  const [tipoAcero, setTipoAcero] = useState("304");
  const [tieneAgitacion, setTieneAgitacion] = useState(false);

  // estos states son para mostrarle feedback al usuario mientras se manda el form
  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [cotizacionCreada, setCotizacionCreada] = useState(null);

  // -----------------------------------------------------------------
  // Funcion que se ejecuta cuando el usuario le da submit al formulario
  // -----------------------------------------------------------------
  async function manejarEnvioFormulario(evento) {
    evento.preventDefault(); // para que no se recargue la pagina como en HTML normal

    // validacion bien basica antes de mandar el request, nada elaborado
    if (idCliente === "" || litrosTanque === "") {
      setMensajeError("Faltan datos, revisa el formulario porfa");
      return;
    }

    // si los litros son negativos o cero, mostramos error y no enviamos nada
    if (parseFloat(litrosTanque) <= 0) {
      setMensajeError("Los litros ingresados deben ser un número mayor a cero");
      return;
    }

    setCargando(true);
    setMensajeError("");
    setCotizacionCreada(null);

    // armamos el objetito que se va a mandar al backend, tiene que
    // coincidir con el CotizacionRequestDTO de C#
    const datosParaEnviar = {
      idCliente: parseInt(idCliente),
      litrosTanque: parseFloat(litrosTanque),
      tipoAcero: tipoAcero,
      tieneAgitacion: tieneAgitacion,
    };

    try {
      const respuesta = await fetch(URL_BASE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datosParaEnviar),
      });

      // si el backend regreso un error (400, 500, etc), lo checamos aqui
      if (!respuesta.ok) {
        const textoError = await respuesta.text();
        throw new Error(textoError || "Algo salio mal creando la cotizacion");
      }

      const datosRespuesta = await respuesta.json();
      setCotizacionCreada(datosRespuesta);
    } catch (error) {
      // si el backend en el puerto 5294 esta apagado o falla la red, caemos aqui
      console.log("error al crear cotizacion:", error);
      setMensajeError("Error de conexión con el servidor");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-3">Cotizador de Tanques - Luxman</h2>

      <form onSubmit={manejarEnvioFormulario}>
        {/* campo del id del cliente, en la version final esto seria un select */}
        <div className="mb-3">
          <label className="form-label">ID del Cliente</label>
          <input
            type="number"
            className="form-control"
            value={idCliente}
            onChange={(evento) => setIdCliente(evento.target.value)}
            placeholder="Ej. 1"
          />
        </div>

        {/* litros del tanque */}
        <div className="mb-3">
          <label className="form-label">Litros del tanque</label>
          <input
            type="number"
            className="form-control"
            value={litrosTanque}
            onChange={(evento) => setLitrosTanque(evento.target.value)}
            placeholder="Ej. 1000"
          />
        </div>

        {/* tipo de acero, radio buttons bien simples */}
        <div className="mb-3">
          <label className="form-label d-block">Tipo de acero</label>

          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              name="tipoAcero"
              id="acero304"
              value="304"
              checked={tipoAcero === "304"}
              onChange={(evento) => setTipoAcero(evento.target.value)}
            />
            <label className="form-check-label" htmlFor="acero304">
              304
            </label>
          </div>

          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="radio"
              name="tipoAcero"
              id="acero316"
              value="316"
              checked={tipoAcero === "316"}
              onChange={(evento) => setTipoAcero(evento.target.value)}
            />
            <label className="form-check-label" htmlFor="acero316">
              316
            </label>
          </div>
        </div>

        {/* checkbox de si lleva agitacion */}
        <div className="mb-3 form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id="checkAgitacion"
            checked={tieneAgitacion}
            onChange={(evento) => setTieneAgitacion(evento.target.checked)}
          />
          <label className="form-check-label" htmlFor="checkAgitacion">
            Lleva sistema de agitacion
          </label>
        </div>

        {/* mensaje de error si algo salio mal */}
        {mensajeError !== "" && (
          <div className="alert alert-danger">{mensajeError}</div>
        )}

        <button type="submit" className="btn btn-primary" disabled={cargando}>
          {cargando ? "Cotizando..." : "Generar Cotizacion"}
        </button>
      </form>

      {/* si ya se creo la cotizacion, mostramos el resultado abajito del form */}
      {cotizacionCreada !== null && (
        <div className="alert alert-success mt-4">
          <h4>Cotizacion #{cotizacionCreada.idCotizacion} creada</h4>
          <p>Precio base: ${cotizacionCreada.precioBase}</p>
          <p>
            <strong>Precio final: ${cotizacionCreada.precioFinal}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

export default FormularioCotizacion;
