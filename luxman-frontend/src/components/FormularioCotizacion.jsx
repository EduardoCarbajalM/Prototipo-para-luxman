import React, { useState } from "react";
import { motion } from "framer-motion";
import "./LandingPage.css";

// URL base del backend en C#
const URL_BASE_API = "http://localhost:5294/api/cotizacion";

// Precios oficiales de referencia
const PRECIO_LITRO_304 = 45.5;
const PRECIO_LITRO_316 = 68.75;
const COSTO_AGITACION = 8500.0;
const CAPACIDAD_MAXIMA_LITROS = 1000000; // 1 millón de litros

function FormularioCotizacion({ alVolver }) {
  const [litrosTanque, setLitrosTanque] = useState("");
  const [tipoAcero, setTipoAcero] = useState("304");
  const [tieneAgitacion, setTieneAgitacion] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [cotizacionCreada, setCotizacionCreada] = useState(null);
  const [usandoEstimadoOffline, setUsandoEstimadoOffline] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [errorPdf, setErrorPdf] = useState("");

  // Descarga el PDF oficial (generado con QuestPDF en el backend) de una cotizacion
  async function descargarPdfCotizacion(idCotizacion) {
    setDescargandoPdf(true);
    setErrorPdf("");
    try {
      const respuesta = await fetch(`${URL_BASE_API}/${idCotizacion}/pdf`);
      if (!respuesta.ok) {
        const textoError = await respuesta.text();
        throw new Error(textoError || `Error ${respuesta.status} al generar el PDF`);
      }

      // tomamos el nombre del archivo que manda el backend, si no, uno por defecto
      const disposicion = respuesta.headers.get("Content-Disposition") || "";
      const coincidencia = disposicion.match(/filename="?([^";]+)"?/);
      const nombreArchivo = coincidencia
        ? coincidencia[1]
        : `Cotizacion_Luxman_${idCotizacion}.pdf`;

      const blob = await respuesta.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar PDF:", error);
      setErrorPdf("La cotización se guardó, pero no se pudo generar el PDF: " + error.message);
    } finally {
      setDescargandoPdf(false);
    }
  }

  // Formateador de moneda en pesos mexicanos (MXN)
  const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(cantidad || 0);
  };

  // Cálculo de estimación local en tiempo real con validación estricta de no negativos
  const litrosNum = Math.max(0, parseFloat(litrosTanque) || 0);
  const precioUnitarioEstimado =
    tipoAcero === "304" ? PRECIO_LITRO_304 : PRECIO_LITRO_316;
  const precioBaseEstimado = litrosNum * precioUnitarioEstimado;
  const extraAgitacionEstimado = tieneAgitacion ? COSTO_AGITACION : 0;
  const totalEstimado = precioBaseEstimado + extraAgitacionEstimado;

  // Manejo de teclado para bloquear activamente signos negativos y caracteres no numéricos
  function manejarTecladoLitros(evento) {
    if (
      evento.key === "-" ||
      evento.key === "+" ||
      evento.key === "e" ||
      evento.key === "E"
    ) {
      evento.preventDefault();
    }
  }

  // Manejo de cambio de valor para bloquear negativos pegados o ingresados
  function manejarCambioLitros(evento) {
    const valor = evento.target.value;
    if (valor === "") {
      setLitrosTanque("");
      setMensajeError("");
      return;
    }

    const numero = parseFloat(valor);
    // Validación preventiva en tiempo real
    if (numero < 0) {
      setMensajeError("No se permiten capacidades negativas.");
      return;
    }

    if (numero > CAPACIDAD_MAXIMA_LITROS) {
      setMensajeError(
        `La capacidad máxima para cotización automática es de ${CAPACIDAD_MAXIMA_LITROS.toLocaleString()} L.`
      );
    } else {
      setMensajeError("");
    }

    setLitrosTanque(valor);
  }

  // Validación y envío del formulario
  async function manejarEnvioFormulario(evento) {
    evento.preventDefault();

    // 1. Validación de campo vacío o no numérico
    if (!litrosTanque || litrosTanque.trim() === "" || isNaN(litrosNum)) {
      setMensajeError("Por favor ingresa la capacidad del tanque en litros.");
      return;
    }

    // 2. Validación de números negativos o cero
    if (litrosNum <= 0) {
      setMensajeError(
        "La capacidad del tanque debe ser un número mayor a cero (no se permiten valores negativos ni cero)."
      );
      return;
    }

    // 3. Validación de límite máximo
    if (litrosNum > CAPACIDAD_MAXIMA_LITROS) {
      setMensajeError(
        `Para proyectos mayores a ${CAPACIDAD_MAXIMA_LITROS.toLocaleString()} L, se requiere diseño especial con el departamento de ingeniería.`
      );
      return;
    }

    // 4. Validación de tipo de acero
    if (tipoAcero !== "304" && tipoAcero !== "316") {
      setMensajeError("Selecciona un tipo de acero válido (AISI 304 o AISI 316).");
      return;
    }

    setCargando(true);
    setMensajeError("");
    setCotizacionCreada(null);
    setUsandoEstimadoOffline(false);

    // DTO que se envía al backend: no requiere idCliente
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
          textoError ||
          `Error ${respuesta.status}: No se pudo procesar la cotización en el servidor.`
        );
      }

      const datosRespuesta = await respuesta.json();
      setCotizacionCreada(datosRespuesta);

      // en cuanto se guarda la cotizacion, descargamos el PDF oficial
      await descargarPdfCotizacion(datosRespuesta.idCotizacion);
    } catch (error) {
      console.error("Error al crear cotización:", error);

      if (
        error.name === "TypeError" ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        setMensajeError(
          "No se pudo conectar con el backend en http://localhost:5294. Verifica que el contenedor del backend esté corriendo."
        );
      } else {
        setMensajeError(error.message);
      }
    } finally {
      setCargando(false);
    }
  }

  // Activa la cotización en modo offline utilizando la misma lógica del servidor
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

  // Estilo garantizado para tarjeta oscura sin interferencia de Bootstrap .card
  const estiloTarjetaOscura = {
    background: "rgba(10, 16, 28, 0.92)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    color: "#ffffff",
    borderRadius: "1.25rem",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.7)",
  };

  return (
    <div className="fondo-oscuro-gradiente min-vh-100 d-flex flex-column">
      {/* Barra de navegación superior con efecto de cristal */}
      <nav className="navbar navbar-dark sticky-top navbar-cristal py-3">
        <div className="container">
          <span className="navbar-brand fw-bold fs-4 d-flex align-items-center text-white m-0">
            <span className="text-success me-2 fs-5">●</span> LUXMAN
          </span>
          <span className="text-light opacity-75 small d-none d-md-inline">
            Cotizador Industrial de Tanques Inoxidables
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

      {/* Contenido principal */}
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
            <h1 className="h2 fw-bold text-white mb-2">
              Cotizador de Tanques Luxman
            </h1>
            <p className="text-light opacity-75 small mx-auto col-md-10">
              Configura el volumen, grado de aleación y accesorios mecánicos de tu tanque.
              Los precios se calculan automáticamente con validaciones de ingeniería.
            </p>
          </div>

          {/* Formulario Principal */}
          {!cotizacionCreada ? (
            <div className="tarjeta-cristal p-4 p-md-5" style={estiloTarjetaOscura}>
              <form onSubmit={manejarEnvioFormulario}>
                {/* 1. Capacidad en Litros */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label text-white fw-bold mb-0 fs-6">
                      Capacidad del Tanque (Litros) <span className="text-danger">*</span>
                    </label>
                    <span className="text-light opacity-75 small">Capacidades estándar:</span>
                  </div>

                  <div className="input-group mb-2">
                    <input
                      type="number"
                      min="1"
                      max={CAPACIDAD_MAXIMA_LITROS}
                      step="any"
                      className="form-control input-cristal"
                      value={litrosTanque}
                      onKeyDown={manejarTecladoLitros}
                      onChange={manejarCambioLitros}
                      placeholder="Ej. 1000"
                      required
                    />
                    <span className="input-group-text input-group-text-cristal fw-semibold">
                      Litros
                    </span>
                  </div>

                  {/* Botones de selección rápida */}
                  <div className="d-flex flex-wrap gap-2 pt-1">
                    {[500, 1000, 2500, 5000, 10000].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => {
                          setLitrosTanque(preset.toString());
                          setMensajeError("");
                        }}
                        className={`btn btn-preset ${litrosTanque === preset.toString() ? "activo" : ""
                          }`}
                      >
                        {preset.toLocaleString()} L
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Selección de Grado de Acero */}
                <div className="mb-4">
                  <label className="form-label text-white fw-bold mb-2 fs-6">
                    Tipo de Acero Inoxidable
                  </label>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div
                        onClick={() => setTipoAcero("304")}
                        className={`tarjeta-seleccion h-100 ${tipoAcero === "304" ? "seleccionada" : ""
                          }`}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-bold text-white fs-5">Acero AISI 304</span>
                          <span className="badge bg-success text-white rounded-pill px-2 py-1 small">
                            Estándar
                          </span>
                        </div>
                        <p className="text-light opacity-75 small mb-2">
                          Grado alimenticio y lácteo. Excelente balance precio y resistencia a corrosión general.
                        </p>
                        <span className="text-success fw-bold small">
                          ${PRECIO_LITRO_304.toFixed(2)} MXN / Litro
                        </span>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div
                        onClick={() => setTipoAcero("316")}
                        className={`tarjeta-seleccion h-100 ${tipoAcero === "316" ? "seleccionada" : ""
                          }`}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-bold text-white fs-5">Acero AISI 316</span>
                          <span className="badge bg-info text-dark rounded-pill px-2 py-1 small fw-bold">
                            Químico / Pharma
                          </span>
                        </div>
                        <p className="text-light opacity-75 small mb-2">
                          Con adición de molibdeno. Máxima resistencia a ácidos, salmuera y corrosión severa.
                        </p>
                        <span className="text-info fw-bold small">
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
                    className={`tarjeta-seleccion d-flex align-items-center justify-content-between ${tieneAgitacion ? "seleccionada" : ""
                      }`}
                  >
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="fw-bold text-white fs-6">
                          Sistema de Agitación Dinámica
                        </span>
                        <span className="badge bg-warning text-dark small fw-bold">
                          + $8,500.00 MXN
                        </span>
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

                {/* Desglose Preliminar en Tiempo Real */}
                {litrosNum > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 mb-4 rounded-3"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px dashed rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center small text-light opacity-75 mb-1">
                      <span>
                        Cálculo base ({litrosNum.toLocaleString()} L × ${precioUnitarioEstimado}/L):
                      </span>
                      <span className="fw-semibold text-white">
                        {formatearMoneda(precioBaseEstimado)}
                      </span>
                    </div>
                    {tieneAgitacion && (
                      <div className="d-flex justify-content-between align-items-center small text-light opacity-75 mb-1">
                        <span>Kit de Motorreductor y Agitación:</span>
                        <span className="fw-semibold text-white">
                          {formatearMoneda(COSTO_AGITACION)}
                        </span>
                      </div>
                    )}
                    <hr className="border-secondary my-2" />
                    <div className="d-flex justify-content-between align-items-center fw-bold text-white">
                      <span>Total Preliminar Estimado:</span>
                      <span className="text-success fs-5">{formatearMoneda(totalEstimado)}</span>
                    </div>
                  </motion.div>
                )}

                {/* Alerta de Mensaje de Error */}
                {mensajeError && (
                  <div className="alerta-cristal-error mb-4">
                    <div className="d-flex align-items-start gap-2">
                      <span className="fs-5">⚠️</span>
                      <div className="flex-grow-1">
                        <strong className="d-block text-white mb-1">Aviso:</strong>
                        <span className="small text-light">{mensajeError}</span>

                        {/* Botón para ver el cálculo offline si el backend está caído */}
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
            /* Vista de Resultado de Cotización Generada */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="tarjeta-cristal p-4 p-md-5"
              style={estiloTarjetaOscura}
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
                  Cotización{" "}
                  {cotizacionCreada.idCotizacion !== "DEMO-ESTIMADO"
                    ? `#${cotizacionCreada.idCotizacion}`
                    : "Estimada"}
                </h2>
                <p className="text-light opacity-75 small">
                  {usandoEstimadoOffline
                    ? "Cálculo generado localmente con los coeficientes oficiales de Luxman."
                    : "Guardada con éxito en la base de datos de Luxman ERP."}
                </p>
              </div>

              {/* Ficha técnica de especificaciones */}
              <div
                className="p-4 rounded-3 mb-4"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                <h5 className="text-white fw-bold mb-3 border-bottom border-secondary pb-2">
                  Especificaciones Técnicas del Tanque
                </h5>

                <div className="row g-3 small">
                  <div className="col-sm-6">
                    <span className="text-white-50 d-block">Capacidad Volumétrica:</span>
                    <strong className="text-white fs-6">
                      {parseFloat(cotizacionCreada.litrosTanque).toLocaleString()} Litros
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-white-50 d-block">Material de Fabricación:</span>
                    <strong className="text-white fs-6">
                      Acero Inoxidable AISI {cotizacionCreada.tipoAcero}
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-white-50 d-block">Sistema de Agitación:</span>
                    <strong className="text-white fs-6">
                      {cotizacionCreada.tieneAgitacion
                        ? "Sí (Motorreductor trifásico + Flecha)"
                        : "No (Tanque estático)"}
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

              {errorPdf && (
                <div className="alerta-cristal-error mb-3 small">⚠️ {errorPdf}</div>
              )}

              {/* Botones de acción */}
              <div className="d-flex flex-column flex-sm-row gap-3">
                {cotizacionCreada.idCotizacion !== "DEMO-ESTIMADO" && (
                  <button
                    type="button"
                    onClick={() => descargarPdfCotizacion(cotizacionCreada.idCotizacion)}
                    disabled={descargandoPdf}
                    className="btn btn-outline-light rounded-pill py-2 px-4 flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                  >
                    {descargandoPdf ? (
                      <>
                        <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                        Generando PDF...
                      </>
                    ) : (
                      <>
                        <span>📄</span> Descargar Cotización en PDF
                      </>
                    )}
                  </button>
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
