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

// direccion del backend para guardar las cotizaciones
const URL_API = "http://localhost:5294/api/cotizacion";

// costos por litro y limite del tanque
const PRECIO_LITRO_304 = 45.5;
const PRECIO_LITRO_316 = 68.75;
const COSTO_AGITACION = 8500.0;
const CAPACIDAD_MAXIMA = 1000000;

const ESTILO_TARJETA = {
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: "1.25rem",
  border: "1px solid rgba(226, 232, 240, 0.9)",
  boxShadow: "0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)",
};

const formatearMoneda = (cantidad) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cantidad || 0);

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

  // calculamos el aproximado en vivo mientras el usuario escribe
  const litrosNumero = Math.max(0, parseFloat(litrosTanque) || 0);
  const precioPorLitro = tipoAcero === "304" ? PRECIO_LITRO_304 : PRECIO_LITRO_316;
  const precioBaseEstimado = litrosNumero * precioPorLitro;
  const totalEstimado = precioBaseEstimado + (tieneAgitacion ? COSTO_AGITACION : 0);

  // pide el pdf al backend y fuerza la descarga en el navegador
  async function descargarPdfCotizacion(idCotizacion) {
    setDescargandoPdf(true);
    setErrorPdf("");
    try {
      const respuesta = await fetch(`${URL_API}/${idCotizacion}/pdf`);
      if (!respuesta.ok) {
        const texto = await respuesta.text();
        throw new Error(texto || `Error ${respuesta.status} al generar el PDF`);
      }

      const cabecera = respuesta.headers.get("Content-Disposition") || "";
      const coincidencia = cabecera.match(/filename="?([^";]+)"?/);
      const nombreArchivo = coincidencia ? coincidencia[1] : `Cotizacion_Luxman_${idCotizacion}.pdf`;

      const archivoBlob = await respuesta.blob();
      const urlTemporal = URL.createObjectURL(archivoBlob);
      const enlace = document.createElement("a");
      enlace.href = urlTemporal;
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(urlTemporal);
    } catch (error) {
      setErrorPdf("La cotización se guardó, pero no se pudo generar el PDF: " + error.message);
    } finally {
      setDescargandoPdf(false);
    }
  }

  // evita que metan signos raros o negativos en el input
  function bloquearTeclasInvalidas(evento) {
    if (["-", "+", "e", "E"].includes(evento.key)) {
      evento.preventDefault();
    }
  }

  function manejarCambioLitros(evento) {
    const valor = evento.target.value;
    if (valor === "") {
      setLitrosTanque("");
      setMensajeError("");
      return;
    }

    const numero = parseFloat(valor);
    if (numero < 0) {
      setMensajeError("No se permiten capacidades negativas.");
      return;
    }

    if (numero > CAPACIDAD_MAXIMA) {
      setMensajeError(`La capacidad máxima para cotización automática es de ${CAPACIDAD_MAXIMA.toLocaleString()} L.`);
    } else {
      setMensajeError("");
    }

    setLitrosTanque(valor);
  }

  // valida los datos y los manda por post al servidor
  async function manejarEnvioFormulario(evento) {
    evento.preventDefault();

    if (!litrosTanque || litrosTanque.trim() === "" || isNaN(litrosNumero)) {
      setMensajeError("Por favor ingresa la capacidad del tanque en litros.");
      return;
    }

    if (litrosNumero <= 0) {
      setMensajeError("La capacidad del tanque debe ser un número mayor a cero (no se permiten valores negativos ni cero).");
      return;
    }

    if (litrosNumero > CAPACIDAD_MAXIMA) {
      setMensajeError(`Para proyectos mayores a ${CAPACIDAD_MAXIMA.toLocaleString()} L, se requiere diseño especial con el departamento de ingeniería.`);
      return;
    }

    if (tipoAcero !== "304" && tipoAcero !== "316") {
      setMensajeError("Selecciona un tipo de acero válido (AISI 304 o AISI 316).");
      return;
    }

    setCargando(true);
    setMensajeError("");
    setCotizacionCreada(null);
    setUsandoEstimadoOffline(false);

    try {
      const respuesta = await fetch(URL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          litrosTanque: litrosNumero,
          tipoAcero,
          tieneAgitacion,
        }),
      });

      if (!respuesta.ok) {
        const textoError = await respuesta.text();
        throw new Error(textoError || `Error ${respuesta.status}: No se pudo procesar la cotización.`);
      }

      const datosGuardados = await respuesta.json();
      setCotizacionCreada(datosGuardados);
      await descargarPdfCotizacion(datosGuardados.idCotizacion);
    } catch (error) {
      if (
        error.name === "TypeError" ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        setMensajeError("No se pudo conectar con el backend en http://localhost:5294. Verifica que el contenedor del backend esté corriendo.");
      } else {
        setMensajeError(error.message);
      }
    } finally {
      setCargando(false);
    }
  }

  // por si el servidor esta apagado mostramos el calculo local
  function activarEstimadoOffline() {
    setCotizacionCreada({
      idCotizacion: "DEMO-ESTIMADO",
      litrosTanque: litrosNumero,
      tipoAcero,
      tieneAgitacion,
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

      <div className="container py-5 flex-grow-1">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto"
          style={{ maxWidth: "800px" }}
        >
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

          {!cotizacionCreada ? (
            <div className="tarjeta-cristal p-4 p-md-5" style={ESTILO_TARJETA}>
              <form onSubmit={manejarEnvioFormulario}>
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
                      max={CAPACIDAD_MAXIMA}
                      step="any"
                      className="form-control input-cristal"
                      value={litrosTanque}
                      onKeyDown={bloquearTeclasInvalidas}
                      onChange={manejarCambioLitros}
                      placeholder="Ej. 1000"
                      required
                    />
                    <span className="input-group-text input-group-text-cristal fw-semibold">
                      Litros
                    </span>
                  </div>

                  <div className="d-flex flex-wrap gap-2 pt-1">
                    {[500, 1000, 2500, 5000, 10000].map((opcionLitros) => (
                      <button
                        type="button"
                        key={opcionLitros}
                        onClick={() => {
                          setLitrosTanque(opcionLitros.toString());
                          setMensajeError("");
                        }}
                        className={`btn btn-preset ${
                          litrosTanque === opcionLitros.toString() ? "activo" : ""
                        }`}
                      >
                        {opcionLitros.toLocaleString()} L
                      </button>
                    ))}
                  </div>
                </div>

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
                        onChange={(evento) => setTieneAgitacion(evento.target.checked)}
                        onClick={(evento) => evento.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>

                {litrosNumero > 0 && (
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
                        Cálculo base ({litrosNumero.toLocaleString()} L × ${precioPorLitro}/L):
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

                {mensajeError && (
                  <div className="alerta-cristal-error mb-4">
                    <div className="d-flex align-items-start gap-2">
                      <AlertTriangle size={20} strokeWidth={2} className="flex-shrink-0 mt-1" />
                      <div className="flex-grow-1">
                        <strong className="d-block mb-1">Aviso:</strong>
                        <span className="small">{mensajeError}</span>

                        {litrosNumero > 0 &&
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
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="tarjeta-cristal p-4 p-md-5"
              style={ESTILO_TARJETA}
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
