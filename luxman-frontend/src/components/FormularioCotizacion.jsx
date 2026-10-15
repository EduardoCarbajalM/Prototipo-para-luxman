import React, { useState } from "react";
import { motion } from "framer-motion";
import "./LandingPage.css";

// URL base del backend en C#
const URL_BASE_API = "http://localhost:5294/api/cotizacion";

// Precios de referencia para la vista previa en vivo
const PRECIO_LITRO_304 = 45.5;
const PRECIO_LITRO_316 = 68.75;
const COSTO_AGITACION = 8500.0;

function FormularioCotizacion({ alVolver }) {
  const [litrosTanque, setLitrosTanque] = useState("");
  const [tipoAcero, setTipoAcero] = useState("304");
  const [tieneAgitacion, setTieneAgitacion] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [cotizacionCreada, setCotizacionCreada] = useState(null);
  const [usandoEstimadoOffline, setUsandoEstimadoOffline] = useState(false);

  // Formateador de moneda en pesos mexicanos
  const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(cantidad || 0);
  };

  // Cálculo de estimación local en tiempo real
  const litrosNum = parseFloat(litrosTanque) || 0;
  const precioUnitarioEstimado =
    tipoAcero === "304" ? PRECIO_LITRO_304 : PRECIO_LITRO_316;
  const precioBaseEstimado = litrosNum * precioUnitarioEstimado;
  const extraAgitacionEstimado = tieneAgitacion ? COSTO_AGITACION : 0;
  const totalEstimado = precioBaseEstimado + extraAgitacionEstimado;

  async function manejarEnvioFormulario(evento) {
    evento.preventDefault();

    if (litrosTanque === "" || isNaN(litrosNum)) {
      setMensajeError("Por favor ingresa la capacidad del tanque en litros.");
      return;
    }

    if (litrosNum <= 0) {
      setMensajeError("La capacidad del tanque debe ser un número mayor a cero.");
      return;
    }

    setCargando(true);
    setMensajeError("");
    setCotizacionCreada(null);
    setUsandoEstimadoOffline(false);

    // Solo enviamos los datos del tanque. No se requiere ID de cliente.
    const datosParaEnviar = {
      litrosTanque: litrosNum,
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

      if (!respuesta.ok) {
        const textoError = await respuesta.text();
        throw new Error(
          textoError || `Error ${respuesta.status}: No se pudo procesar la cotización en el servidor.`
        );
      }

      const datosRespuesta = await respuesta.json();
      setCotizacionCreada(datosRespuesta);
    } catch (error) {
      console.error("Error al crear cotización:", error);

      // Si fue una falla de conexión / servidor apagado
      if (
        error.name === "TypeError" ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        setMensajeError(
          "No se pudo conectar con el servidor backend en http://localhost:5294. Verifica que el backend esté encendido (en Docker o con 'dotnet run')."
        );
      } else {
        // Mostramos el mensaje exacto que devolvió el backend
        setMensajeError(error.message);
      }
    } finally {
      setCargando(false);
    }
  }

  // Permite activar la vista de estimado si el servidor está apagado
  function activarEstimadoOffline() {
    setCotizacionCreada({
      idCotizacion: "DEMO-ESTIMADO",
      litrosTanque: litrosNum,
      tipoAcero: tipoAcero,
      tieneAgitacion: tieneAgitacion,
      precioBase: precioBaseEstimado,
      precioFinal: totalEstimado,
    });
    setUsandoEstimadoOffline(true);
    setMensajeError("");
  }

  function reiniciarCotizacion() {
    setCotizacionCreada(null);
    setUsandoEstimadoOffline(false);
    setLitrosTanque("");
    setTieneAgitacion(false);
    setMensajeError("");
  }

  return (
    <div className="fondo-oscuro-gradiente min-vh-100 d-flex flex-column">
      {/* Navbar Glassmorphism */}
      <nav className="navbar navbar-dark sticky-top navbar-cristal py-3">
        <div className="container">
          <span className="navbar-brand fw-bold fs-4 d-flex align-items-center text-white m-0">
            <span className="text-success me-2 fs-5">●</span> LUXMAN
          </span>
          <span className="text-light opacity-75 small d-none d-md-inline">
            Cotizador Industrial de Tanques
          </span>
          {alVolver && (
            <button
              type="button"
              onClick={alVolver}
              className="btn btn-outline-light btn-sm rounded-pill px-3"
            >
              ← Volver al Catálogo
            </button>
          )}
        </div>
      </nav>

      {/* Contenido Principal */}
      <div className="container py-5 flex-grow-1">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto"
          style={{ maxWidth: "800px" }}
        >
          {/* Encabezado */}
          <div className="text-center mb-4">
            <span className="badge insignia-cristal text-uppercase px-3 py-2 mb-2 rounded-pill small">
              Cálculo Inmediato • Sin Registro Requerido
            </span>
            <h1 className="h2 fw-bold text-white mb-2">Cotizador de Tanques Luxman</h1>
            <p className="text-light opacity-75 small mx-auto col-md-10">
              Configura las especificaciones técnicas del tanque para calcular el costo de
              fabricación en acero inoxidable según el volumen y grado de aleación.
            </p>
          </div>

          {/* Formulario / Tarjeta Principal */}
          {!cotizacionCreada ? (
            <div className="card tarjeta-cristal p-4 p-md-5">
              <form onSubmit={manejarEnvioFormulario}>
                {/* 1. Capacidad en Litros */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label text-white fw-semibold mb-0">
                      Capacidad del Tanque (Litros) <span className="text-danger">*</span>
                    </label>
                    <span className="text-light opacity-50 small">Capacidades comunes:</span>
                  </div>

                  <div className="input-group mb-2">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      className="form-control input-cristal"
                      value={litrosTanque}
                      onChange={(e) => setLitrosTanque(e.target.value)}
                      placeholder="Ej. 1000"
                      required
                    />
                    <span className="input-group-text bg-transparent text-white-50 border-secondary">
                      Litros
                    </span>
                  </div>

                  {/* Botones de capacidades estándar */}
                  <div className="d-flex flex-wrap gap-2 pt-1">
                    {[500, 1000, 2500, 5000, 10000].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setLitrosTanque(preset.toString())}
                        className={`btn btn-preset ${
                          litrosTanque === preset.toString() ? "activo" : ""
                        }`}
                      >
                        {preset.toLocaleString()} L
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Grado de Acero Inoxidable */}
                <div className="mb-4">
                  <label className="form-label text-white fw-semibold mb-2">
                    Tipo de Acero Inoxidable
                  </label>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div
                        onClick={() => setTipoAcero("304")}
                        className={`tarjeta-seleccion h-100 ${
                          tipoAcero === "304" ? "seleccionada" : ""
                        }`}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-bold text-white fs-5">Acero AISI 304</span>
                          <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
                            Estándar
                          </span>
                        </div>
                        <p className="text-light opacity-75 small mb-2">
                          Grado alimenticio y lácteo. Excelente balance precio/resistencia química.
                        </p>
                        <span className="text-white-50 small fw-semibold">
                          ${PRECIO_LITRO_304.toFixed(2)} MXN / Litro
                        </span>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div
                        onClick={() => setTipoAcero("316")}
                        className={`tarjeta-seleccion h-100 ${
                          tipoAcero === "316" ? "seleccionada" : ""
                        }`}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-bold text-white fs-5">Acero AISI 316</span>
                          <span className="badge bg-info-subtle text-info border border-info-subtle rounded-pill">
                            Químico / Pharma
                          </span>
                        </div>
                        <p className="text-light opacity-75 small mb-2">
                          Con adición de molibdeno. Máxima resistencia a ácidos, salmuera y corrosión severa.
                        </p>
                        <span className="text-white-50 small fw-semibold">
                          ${PRECIO_LITRO_316.toFixed(2)} MXN / Litro
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Sistema de Agitación Mecánica */}
                <div className="mb-4">
                  <div
                    onClick={() => setTieneAgitacion(!tieneAgitacion)}
                    className={`tarjeta-seleccion d-flex align-items-center justify-content-between ${
                      tieneAgitacion ? "seleccionada" : ""
                    }`}
                  >
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="fw-bold text-white">Sistema de Agitación Dinámica</span>
                        <span className="badge insignia-cristal small">+ $8,500.00 MXN</span>
                      </div>
                      <p className="text-light opacity-75 small mb-0">
                        Incluye motorreductor trifásico, flecha de acero inoxidable y propela/áncora
                        calibrada para mezclado homogéneo.
                      </p>
                    </div>
                    <div className="form-check form-switch ms-3">
                      <input
                        className="form-check-input fs-4"
                        type="checkbox"
                        role="switch"
                        checked={tieneAgitacion}
                        onChange={(e) => setTieneAgitacion(e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>

                {/* Barra de Estimación Preliminar en Vivo */}
                {litrosNum > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 mb-4 rounded-3"
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px dashed rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center small text-light opacity-75 mb-1">
                      <span>Cálculo base ({litrosNum.toLocaleString()} L × ${precioUnitarioEstimado}/L):</span>
                      <span>{formatearMoneda(precioBaseEstimado)}</span>
                    </div>
                    {tieneAgitacion && (
                      <div className="d-flex justify-content-between align-items-center small text-light opacity-75 mb-1">
                        <span>Kit de Motor y Agitación:</span>
                        <span>{formatearMoneda(COSTO_AGITACION)}</span>
                      </div>
                    )}
                    <hr className="border-secondary my-2" />
                    <div className="d-flex justify-content-between align-items-center fw-bold text-white">
                      <span>Estimado Preliminar:</span>
                      <span className="text-success fs-5">{formatearMoneda(totalEstimado)}</span>
                    </div>
                  </motion.div>
                )}

                {/* Mensaje de Error */}
                {mensajeError && (
                  <div className="alerta-cristal-error mb-4">
                    <div className="d-flex align-items-start gap-2">
                      <span className="fs-5">⚠️</span>
                      <div className="flex-grow-1">
                        <strong className="d-block text-white">Aviso:</strong>
                        <span className="small">{mensajeError}</span>

                        {/* Botón de escape: ver estimado offline si el backend está apagado */}
                        {litrosNum > 0 &&
                          mensajeError.includes("http://localhost:5294") && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={activarEstimadoOffline}
                                className="btn btn-sm btn-outline-light rounded-pill px-3"
                              >
                                ⚡ Ver cálculo estimado en modo offline
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón de Envío */}
                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className="btn btn-verde-esmeralda btn-lg py-3 rounded-pill fw-bold"
                    disabled={cargando}
                  >
                    {cargando ? (
                      <span className="d-flex align-items-center justify-content-center gap-2">
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Calculando en el servidor...
                      </span>
                    ) : (
                      "Generar Cotización Oficial"
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Vista de Cotización Generada con Éxito */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="card tarjeta-cristal p-4 p-md-5"
            >
              <div className="text-center mb-4">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                  style={{
                    width: "65px",
                    height: "65px",
                    background: "rgba(16, 185, 129, 0.2)",
                    border: "2px solid #10b981",
                  }}
                >
                  <span className="text-success fs-2">✓</span>
                </div>
                <h2 className="text-white fw-bold mb-1">
                  Cotización {cotizacionCreada.idCotizacion !== "DEMO-ESTIMADO" ? `#${cotizacionCreada.idCotizacion}` : "Estimada"}
                </h2>
                <p className="text-light opacity-75 small">
                  {usandoEstimadoOffline
                    ? "Cálculo generado localmente con los coeficientes oficiales de Luxman."
                    : "Guardada con éxito en la base de datos de Luxman ERP."}
                </p>
              </div>

              {/* Ficha de Detalles */}
              <div
                className="p-4 rounded-3 mb-4"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <h5 className="text-white fw-bold mb-3 border-bottom border-secondary pb-2">
                  Especificaciones del Tanque
                </h5>

                <div className="row g-3 small">
                  <div className="col-sm-6">
                    <span className="text-white-50 d-block">Capacidad:</span>
                    <strong className="text-white fs-6">
                      {parseFloat(cotizacionCreada.litrosTanque).toLocaleString()} Litros
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-white-50 d-block">Material:</span>
                    <strong className="text-white fs-6">
                      Acero Inoxidable Grado {cotizacionCreada.tipoAcero}
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-white-50 d-block">Sistema de Agitación:</span>
                    <strong className="text-white fs-6">
                      {cotizacionCreada.tieneAgitacion ? "Sí (Incluye Motorreductor)" : "No"}
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-white-50 d-block">Precio Base Material:</span>
                    <strong className="text-white fs-6">
                      {formatearMoneda(cotizacionCreada.precioBase)}
                    </strong>
                  </div>
                </div>

                <hr className="border-secondary my-3" />

                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-white fs-5 fw-bold">Precio Final:</span>
                  <span className="text-success display-6 fw-bold">
                    {formatearMoneda(cotizacionCreada.precioFinal)}
                  </span>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="d-flex flex-column flex-sm-row gap-3">
                {cotizacionCreada.idCotizacion !== "DEMO-ESTIMADO" && (
                  <a
                    href={`http://localhost:5294/api/cotizacion/${cotizacionCreada.idCotizacion}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-light rounded-pill py-2 px-4 flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                  >
                    <span>📄</span> Descargar Ficha en PDF
                  </a>
                )}
                <button
                  type="button"
                  onClick={reiniciarCotizacion}
                  className="btn btn-verde-esmeralda rounded-pill py-2 px-4 flex-grow-1"
                >
                  Cotizar Otro Tanque
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default FormularioCotizacion;
