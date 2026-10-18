import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  ArrowLeft,
  Calculator,
  AlertTriangle,
  Zap,
  CheckCircle2,
  FileDown,
  RotateCcw,
  ShieldCheck,
  Settings2,
  Loader2,
} from "lucide-react";
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

  // Estilo garantizado para tarjeta elevada en Modo Claro (60-30-10)
  const estiloTarjetaElevada = {
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: "1.25rem",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)",
  };

  return (
    <div className="fondo-oscuro-gradiente min-vh-100 d-flex flex-column">
      {/* Barra de navegación superior limpia */}
      <nav className="navbar sticky-top navbar-cristal py-3">
        <div className="container">
          <span className="navbar-brand fw-bold fs-4 d-flex align-items-center text-dark m-0 gap-2">
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-3 text-white"
              style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #1e293b 0%, #2563eb 100%)",
              }}
            >
              <Building2 size={18} strokeWidth={2.2} />
            </span>
            LUXMAN
          </span>
          <span className="text-secondary small d-none d-md-inline fw-medium">
            Cotizador Industrial de Tanques Inoxidables
          </span>
          {alVolver && (
            <button
              type="button"
              onClick={alVolver}
              className="btn btn-secundario-claro btn-sm rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2"
            >
              <ArrowLeft size={16} strokeWidth={2} />
              <span>Volver al Catálogo</span>
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
            <span className="badge insignia-cristal text-uppercase px-3 py-2 mb-2 rounded-pill small d-inline-flex align-items-center gap-2">
              <Calculator size={14} strokeWidth={2} className="text-primary" />
              <span>Cálculo Inmediato • Sin Registro Requerido</span>
            </span>
            <h1 className="h2 fw-bold text-dark mb-2">
              Cotizador de Tanques Luxman
            </h1>
            <p className="text-secondary small mx-auto col-md-10">
              Configura el volumen, grado de aleación y accesorios mecánicos de tu tanque.
              Los precios se calculan automáticamente con validaciones de ingeniería.
            </p>
          </div>

          {/* Formulario Principal */}
          {!cotizacionCreada ? (
            <div className="tarjeta-cristal p-4 p-md-5" style={estiloTarjetaElevada}>
              <form onSubmit={manejarEnvioFormulario}>
                {/* 1. Capacidad en Litros */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label text-dark fw-bold mb-0 fs-6">
                      Capacidad del Tanque (Litros) <span className="text-danger">*</span>
                    </label>
                    <span className="text-secondary small">Capacidades estándar:</span>
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
                        className={`btn btn-preset ${
                          litrosTanque === preset.toString() ? "activo" : ""
                        }`}
                      >
                        {preset.toLocaleString()} L
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Selección de Grado de Acero */}
                <div className="mb-4">
                  <label className="form-label text-dark fw-bold mb-2 fs-6 d-flex align-items-center gap-2">
                    <ShieldCheck size={18} strokeWidth={2} className="text-primary" />
                    <span>Tipo de Acero Inoxidable</span>
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
                          <span className="fw-bold text-dark fs-5">Acero AISI 304</span>
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1 small fw-semibold">
                            Estándar
                          </span>
                        </div>
                        <p className="text-secondary small mb-2">
                          Grado alimenticio y lácteo. Excelente balance precio y resistencia a corrosión general.
                        </p>
                        <span className="text-primary fw-bold small">
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
                          <span className="fw-bold text-dark fs-5">Acero AISI 316</span>
                          <span className="badge bg-indigo-subtle text-dark border rounded-pill px-2 py-1 small fw-semibold" style={{ background: "#e0e7ff", color: "#3730a3" }}>
                            Químico / Pharma
                          </span>
                        </div>
                        <p className="text-secondary small mb-2">
                          Con adición de molibdeno. Máxima resistencia a ácidos, salmuera y corrosión severa.
                        </p>
                        <span className="fw-bold small" style={{ color: "#4338ca" }}>
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
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <Settings2 size={18} strokeWidth={2} className="text-primary" />
                        <span className="fw-bold text-dark fs-6">
                          Sistema de Agitación Dinámica
                        </span>
                        <span className="badge rounded-pill small fw-semibold" style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
                          + $8,500.00 MXN
                        </span>
                      </div>
                      <p className="text-secondary small mb-0">
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
                      background: "#f8fafc",
                      border: "1px dashed #cbd5e1",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center small text-secondary mb-1">
                      <span>
                        Cálculo base ({litrosNum.toLocaleString()} L × ${precioUnitarioEstimado}/L):
                      </span>
                      <span className="fw-semibold text-dark">
                        {formatearMoneda(precioBaseEstimado)}
                      </span>
                    </div>
                    {tieneAgitacion && (
                      <div className="d-flex justify-content-between align-items-center small text-secondary mb-1">
                        <span>Kit de Motorreductor y Agitación:</span>
                        <span className="fw-semibold text-dark">
                          {formatearMoneda(COSTO_AGITACION)}
                        </span>
                      </div>
                    )}
                    <hr className="border-secondary-subtle my-2" />
                    <div className="d-flex justify-content-between align-items-center fw-bold text-dark">
                      <span>Total Preliminar Estimado:</span>
                      <span className="text-primary fs-5">{formatearMoneda(totalEstimado)}</span>
                    </div>
                  </motion.div>
                )}

                {/* Alerta de Mensaje de Error */}
                {mensajeError && (
                  <div className="alerta-cristal-error mb-4">
                    <div className="d-flex align-items-start gap-2">
                      <AlertTriangle size={20} strokeWidth={2} className="flex-shrink-0 mt-1" />
                      <div className="flex-grow-1">
                        <strong className="d-block mb-1">Aviso:</strong>
                        <span className="small">{mensajeError}</span>

                        {/* Botón para ver el cálculo offline si el backend está caído */}
                        {litrosNum > 0 &&
                          mensajeError.includes("http://localhost:5294") && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={activarEstimadoOffline}
                                className="btn btn-sm btn-secundario-claro rounded-pill px-3 py-1 d-inline-flex align-items-center gap-2"
                              >
                                <Zap size={14} strokeWidth={2} />
                                <span>Ver cálculo estimado en modo offline</span>
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
                    className="btn btn-verde-esmeralda btn-lg py-3 rounded-pill fw-bold d-inline-flex align-items-center justify-content-center gap-2"
                    disabled={cargando}
                  >
                    {cargando ? (
                      <>
                        <Loader2 size={20} strokeWidth={2} className="mb-spinner" />
                        <span>Calculando en el servidor...</span>
                      </>
                    ) : (
                      <>
                        <Calculator size={20} strokeWidth={2} />
                        <span>Generar Cotización Oficial</span>
                      </>
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
              style={estiloTarjetaElevada}
            >
              <div className="text-center mb-4">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                  style={{
                    width: "64px",
                    height: "64px",
                    background: "rgba(37, 99, 235, 0.1)",
                    border: "2px solid #2563eb",
                    color: "#2563eb",
                  }}
                >
                  <CheckCircle2 size={32} strokeWidth={2.2} />
                </div>
                <h2 className="text-dark fw-bold mb-1">
                  Cotización{" "}
                  {cotizacionCreada.idCotizacion !== "DEMO-ESTIMADO"
                    ? `#${cotizacionCreada.idCotizacion}`
                    : "Estimada"}
                </h2>
                <p className="text-secondary small">
                  {usandoEstimadoOffline
                    ? "Cálculo generado localmente con los coeficientes oficiales de Luxman."
                    : "Guardada con éxito en la base de datos de Luxman ERP."}
                </p>
              </div>

              {/* Ficha técnica de especificaciones */}
              <div
                className="p-4 rounded-4 mb-4"
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <h5 className="text-dark fw-bold mb-3 border-bottom pb-2">
                  Especificaciones Técnicas del Tanque
                </h5>

                <div className="row g-3 small">
                  <div className="col-sm-6">
                    <span className="text-secondary d-block">Capacidad Volumétrica:</span>
                    <strong className="text-dark fs-6">
                      {parseFloat(cotizacionCreada.litrosTanque).toLocaleString()} Litros
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-secondary d-block">Material de Fabricación:</span>
                    <strong className="text-dark fs-6">
                      Acero Inoxidable AISI {cotizacionCreada.tipoAcero}
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-secondary d-block">Sistema de Agitación:</span>
                    <strong className="text-dark fs-6">
                      {cotizacionCreada.tieneAgitacion
                        ? "Sí (Motorreductor trifásico + Flecha)"
                        : "No (Tanque estático)"}
                    </strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-secondary d-block">Precio Base Material:</span>
                    <strong className="text-dark fs-6">
                      {formatearMoneda(cotizacionCreada.precioBase)}
                    </strong>
                  </div>
                </div>

                <hr className="border-secondary-subtle my-3" />

                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-dark fs-5 fw-bold">Precio Final:</span>
                  <span className="text-primary display-6 fw-bold">
                    {formatearMoneda(cotizacionCreada.precioFinal)}
                  </span>
                </div>
              </div>

              {errorPdf && (
                <div className="alerta-cristal-error mb-3 small d-flex align-items-center gap-2">
                  <AlertTriangle size={18} strokeWidth={2} />
                  <span>{errorPdf}</span>
                </div>
              )}

              {/* Botones de acción */}
              <div className="d-flex flex-column flex-sm-row gap-3">
                {cotizacionCreada.idCotizacion !== "DEMO-ESTIMADO" && (
                  <button
                    type="button"
                    onClick={() => descargarPdfCotizacion(cotizacionCreada.idCotizacion)}
                    disabled={descargandoPdf}
                    className="btn btn-secundario-claro rounded-pill py-2 px-4 flex-grow-1 d-inline-flex align-items-center justify-content-center gap-2"
                  >
                    {descargandoPdf ? (
                      <>
                        <Loader2 size={18} strokeWidth={2} className="mb-spinner" />
                        <span>Generando PDF...</span>
                      </>
                    ) : (
                      <>
                        <FileDown size={18} strokeWidth={2} />
                        <span>Descargar Cotización en PDF</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={reiniciarCotizacion}
                  className="btn btn-verde-esmeralda rounded-pill py-2 px-4 flex-grow-1 d-inline-flex align-items-center justify-content-center gap-2"
                >
                  <RotateCcw size={18} strokeWidth={2} />
                  <span>Cotizar Otro Tanque</span>
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
