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
  Ruler,
  Cylinder,
} from "lucide-react";
import "./LandingPage.css";
import { URL_BASE } from "../api";

// Ruta relativa para evitar problemas de Mixed Content en HTTPS/Nginx
const URL_API = `${URL_BASE}/api/cotizacion`;

// Costos por litro, accesorios y límites operativos
const PRECIO_LITRO_304 = 45.5;
const PRECIO_LITRO_316 = 68.75;
const COSTO_AGITACION = 8500.0;
const CAPACIDAD_MAXIMA_LITROS = 1000000;

const TIPOS_FONDO = ["Plano", "Cónico", "Toriesférico"];

const PRESETS_GEOMETRICOS = [
  { etiqueta: "R 0.50m × L 1.30m (~1,021 L)", radio_m: "0.5", longitud_m: "1.3" },
  { etiqueta: "R 0.75m × L 1.50m (~2,651 L)", radio_m: "0.75", longitud_m: "1.5" },
  { etiqueta: "R 1.00m × L 2.00m (~6,283 L)", radio_m: "1", longitud_m: "2" },
  { etiqueta: "R 1.25m × L 2.50m (~12,272 L)", radio_m: "1.25", longitud_m: "2.5" },
];

const ESTILO_TARJETA = {
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: "1.25rem",
  border: "1px solid rgba(226, 232, 240, 0.9)",
  boxShadow: "0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)",
};

const formatearMoneda = (cantidad) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cantidad || 0);

const formatearMedida = (valor, decimales = 4) =>
  Number(valor || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimales,
  });

function FormularioCotizacion({ alVolver }) {
  const [radio_m, setRadioM] = useState("");
  const [longitud_m, setLongitudM] = useState("");
  const [tipo_fondo, setTipoFondo] = useState("Plano");
  const [tipo_acero, setTipoAcero] = useState("304");
  const [tiene_agitacion, setTieneAgitacion] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [cotizacionCreada, setCotizacionCreada] = useState(null);
  const [usandoEstimadoOffline, setUsandoEstimadoOffline] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [errorPdf, setErrorPdf] = useState("");

  // Cálculos geométricos y de lámina en tiempo real
  const radioNumero = Math.max(0, parseFloat(radio_m) || 0);
  const longitudNumero = Math.max(0, parseFloat(longitud_m) || 0);
  const hayDimensionesValidas = radioNumero > 0 && longitudNumero > 0;

  const diametro_m = hayDimensionesValidas ? 2 * radioNumero : 0;
  const volumen_m3 = hayDimensionesValidas ? Math.PI * Math.pow(radioNumero, 2) * longitudNumero : 0;
  const litros_tanque = hayDimensionesValidas ? volumen_m3 * 1000 : 0;
  const perimetro_m = hayDimensionesValidas ? Math.PI * diametro_m : 0;
  const area_lamina_m2 = hayDimensionesValidas ? perimetro_m * longitudNumero : 0;

  // Cálculo económico preliminar en vivo
  const precioPorLitro = tipo_acero === "304" ? PRECIO_LITRO_304 : PRECIO_LITRO_316;
  const precioBaseEstimado = Math.round(litros_tanque * precioPorLitro * 100) / 100;
  const totalEstimado = precioBaseEstimado + (tiene_agitacion ? COSTO_AGITACION : 0);

  // Solicita el PDF al backend y fuerza la descarga en el navegador
  async function descargarPdfCotizacion(id_cotizacion) {
    setDescargandoPdf(true);
    setErrorPdf("");
    try {
      const respuesta = await fetch(`${URL_API}/${id_cotizacion}/pdf`);
      if (!respuesta.ok) {
        const texto = await respuesta.text();
        throw new Error(texto || `Error ${respuesta.status} al generar el PDF`);
      }

      const cabecera = respuesta.headers.get("Content-Disposition") || "";
      const coincidencia = cabecera.match(/filename="?([^";]+)"?/);
      const nombreDescarga = coincidencia ? coincidencia[1] : `Cotizacion_Luxman_${id_cotizacion}.pdf`;

      const archivoBlob = await respuesta.blob();
      const urlTemporal = URL.createObjectURL(archivoBlob);
      const enlace = document.createElement("a");
      enlace.href = urlTemporal;
      enlace.download = nombreDescarga;
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

  function bloquearTeclasInvalidas(evento) {
    if (["-", "+", "e", "E"].includes(evento.key)) {
      evento.preventDefault();
    }
  }

  function manejarCambioDimension(setter) {
    return (evento) => {
      const valor = evento.target.value;
      if (valor === "") {
        setter("");
        setMensajeError("");
        return;
      }
      const numero = parseFloat(valor);
      if (numero < 0) {
        setMensajeError("No se permiten dimensiones negativas.");
        return;
      }
      setMensajeError("");
      setter(valor);
    };
  }

  async function manejarEnvioFormulario(evento) {
    evento.preventDefault();

    if (!radio_m || radio_m.trim() === "" || isNaN(radioNumero) || radioNumero <= 0) {
      setMensajeError("Ingresa un radio en metros mayor a cero (radio_m).");
      return;
    }

    if (!longitud_m || longitud_m.trim() === "" || isNaN(longitudNumero) || longitudNumero <= 0) {
      setMensajeError("Ingresa una longitud/altura en metros mayor a cero (longitud_m).");
      return;
    }

    if (!TIPOS_FONDO.includes(tipo_fondo)) {
      setMensajeError("Selecciona un tipo de fondo válido (Plano, Cónico o Toriesférico).");
      return;
    }

    if (litros_tanque > CAPACIDAD_MAXIMA_LITROS) {
      setMensajeError(
        `Las dimensiones ingresadas equivalen a ${formatearMedida(litros_tanque, 2)} L y superan el límite de ${CAPACIDAD_MAXIMA_LITROS.toLocaleString("es-MX")} L para cotización automática.`
      );
      return;
    }

    if (tipo_acero !== "304" && tipo_acero !== "316") {
      setMensajeError("Selecciona un tipo de acero válido (AISI 304 o AISI 316).");
      return;
    }

    setCargando(true);
    setMensajeError("");
    setCotizacionCreada(null);
    setUsandoEstimadoOffline(false);

    const payload = {
      radio_m: Number(radioNumero.toFixed(4)),
      longitud_m: Number(longitudNumero.toFixed(4)),
      tipo_fondo,
      diametro_m: Number(diametro_m.toFixed(4)),
      volumen_m3: Number(volumen_m3.toFixed(4)),
      litros_tanque: Number(litros_tanque.toFixed(2)),
      perimetro_m: Number(perimetro_m.toFixed(4)),
      area_lamina_m2: Number(area_lamina_m2.toFixed(4)),
      tipo_acero,
      tiene_agitacion,
    };

    try {
      const respuesta = await fetch(URL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!respuesta.ok) {
        const textoError = await respuesta.text();
        throw new Error(textoError || `Error ${respuesta.status}: No se pudo procesar la cotización.`);
      }

      const datosGuardados = await respuesta.json();
      setCotizacionCreada(datosGuardados);
      await descargarPdfCotizacion(datosGuardados.id_cotizacion);
    } catch (error) {
      if (
        error.name === "TypeError" ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        setMensajeError("No se pudo conectar con la API de Luxman. Verifica que el servicio del backend esté activo.");
      } else {
        setMensajeError(error.message);
      }
    } finally {
      setCargando(false);
    }
  }

  function activarEstimadoOffline() {
    setCotizacionCreada({
      id_cotizacion: "DEMO-ESTIMADO",
      radio_m: Number(radioNumero.toFixed(4)),
      longitud_m: Number(longitudNumero.toFixed(4)),
      tipo_fondo,
      diametro_m: Number(diametro_m.toFixed(4)),
      volumen_m3: Number(volumen_m3.toFixed(4)),
      litros_tanque: Number(litros_tanque.toFixed(2)),
      perimetro_m: Number(perimetro_m.toFixed(4)),
      area_lamina_m2: Number(area_lamina_m2.toFixed(4)),
      tipo_acero,
      tiene_agitacion,
      precio_base: precioBaseEstimado,
      precio_final: totalEstimado,
      cotizacion_aprobada: false,
    });
    setUsandoEstimadoOffline(true);
    setMensajeError("");
  }

  function reiniciarCotizacion() {
    setCotizacionCreada(null);
    setUsandoEstimadoOffline(false);
    setRadioM("");
    setLongitudM("");
    setTipoFondo("Plano");
    setTieneAgitacion(false);
    setMensajeError("");
    setErrorPdf("");
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
            Calculadora Técnica de Ingeniería • Ing. Raúl Romero
          </span>
          {alVolver && (
            <button
              type="button"
              onClick={alVolver}
              className="btn btn-secundario-claro btn-sm rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2"
            >
              <ArrowLeft size={16} strokeWidth={2} />
              <span>Volver</span>
            </button>
          )}
        </div>
      </nav>

      <div className="container py-4 py-md-5 flex-grow-1">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto"
          style={{ maxWidth: "880px" }}
        >
          <div className="text-center mb-4">
            <span className="badge insignia-cristal text-uppercase px-3 py-2 mb-2 rounded-pill small d-inline-flex align-items-center gap-2">
              <Calculator size={14} strokeWidth={2} className="text-primary" />
              <span>Dimensionamiento Geométrico • Desarrollo de Lámina • PDF Oficial</span>
            </span>
            <h1 className="h2 fw-bold text-dark mb-2">
              Calculadora Técnica de Tanques Inoxidables
            </h1>
            <p className="text-secondary small mx-auto col-md-10 mb-0">
              Ingresa el radio, la longitud/altura del cuerpo y el tipo de cabezal/fondo para calcular
              automáticamente diámetro, volumen, litros, desarrollo y área de lámina.
            </p>
          </div>

          {!cotizacionCreada ? (
            <div className="tarjeta-cristal p-4 p-md-5" style={ESTILO_TARJETA}>
              <form onSubmit={manejarEnvioFormulario}>
                {/* ===== SECCIÓN 1: DIMENSIONES GEOMÉTRICAS ===== */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <label className="form-label text-dark fw-bold mb-0 fs-6 d-flex align-items-center gap-2">
                      <Ruler size={18} strokeWidth={2} className="text-primary" />
                      <span>1. Dimensiones Geométricas y Tipo de Fondo</span>
                    </label>
                    <span className="text-secondary small">Medidas rápidas de referencia:</span>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {PRESETS_GEOMETRICOS.map((preset) => {
                      const activo =
                        radio_m === preset.radio_m && longitud_m === preset.longitud_m;
                      return (
                        <button
                          type="button"
                          key={preset.etiqueta}
                          onClick={() => {
                            setRadioM(preset.radio_m);
                            setLongitudM(preset.longitud_m);
                            setMensajeError("");
                          }}
                          className={`btn btn-preset ${activo ? "activo" : ""}`}
                        >
                          {preset.etiqueta}
                        </button>
                      );
                    })}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-4">
                      <label htmlFor="input-radio-m" className="form-label text-dark fw-semibold small mb-1">
                        Radio del Tanque (m) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          id="input-radio-m"
                          name="radio_m"
                          type="number"
                          min="0.01"
                          step="any"
                          className="form-control input-cristal"
                          value={radio_m}
                          onKeyDown={bloquearTeclasInvalidas}
                          onChange={manejarCambioDimension(setRadioM)}
                          placeholder="Ej. 0.75"
                          required
                        />
                        <span className="input-group-text input-group-text-cristal fw-semibold">
                          m
                        </span>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label htmlFor="input-longitud-m" className="form-label text-dark fw-semibold small mb-1">
                        Longitud / Altura (m) <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          id="input-longitud-m"
                          name="longitud_m"
                          type="number"
                          min="0.01"
                          step="any"
                          className="form-control input-cristal"
                          value={longitud_m}
                          onKeyDown={bloquearTeclasInvalidas}
                          onChange={manejarCambioDimension(setLongitudM)}
                          placeholder="Ej. 1.50"
                          required
                        />
                        <span className="input-group-text input-group-text-cristal fw-semibold">
                          m
                        </span>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label htmlFor="select-tipo-fondo" className="form-label text-dark fw-semibold small mb-1">
                        Tipo de Fondo <span className="text-danger">*</span>
                      </label>
                      <select
                        id="select-tipo-fondo"
                        name="tipo_fondo"
                        className="form-select input-cristal"
                        value={tipo_fondo}
                        onChange={(evento) => setTipoFondo(evento.target.value)}
                      >
                        {TIPOS_FONDO.map((fondo) => (
                          <option key={fondo} value={fondo}>
                            {fondo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* ===== PANEL EN TIEMPO REAL: GEOMETRÍA Y DESARROLLO DE LÁMINA ===== */}
                <div
                  className="p-3 p-md-4 mb-4 rounded-4"
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                    <span className="fw-bold text-dark small text-uppercase d-flex align-items-center gap-2">
                      <Cylinder size={17} strokeWidth={2} className="text-primary" />
                      <span>Cálculos Automáticos de Ingeniería (Tiempo Real)</span>
                    </span>
                    <span className="badge text-bg-light border text-secondary">
                      Fondo seleccionado: <strong className="text-dark">{tipo_fondo}</strong>
                    </span>
                  </div>

                  <div className="row g-2 g-md-3">
                    <div className="col-6 col-md-4">
                      <div className="bg-white rounded-3 p-2 px-3 border h-100">
                        <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                          Diámetro (2 · R)
                        </span>
                        <strong className="text-dark fs-6">
                          {formatearMedida(diametro_m, 4)} m
                        </strong>
                      </div>
                    </div>

                    <div className="col-6 col-md-4">
                      <div className="bg-white rounded-3 p-2 px-3 border h-100">
                        <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                          Volumen Geométrico
                        </span>
                        <strong className="text-dark fs-6">
                          {formatearMedida(volumen_m3, 4)} m³
                        </strong>
                      </div>
                    </div>

                    <div className="col-12 col-md-4">
                      <div
                        className="rounded-3 p-2 px-3 border h-100"
                        style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
                      >
                        <span className="text-primary d-block fw-semibold" style={{ fontSize: "0.75rem" }}>
                          Capacidad Volumétrica
                        </span>
                        <strong className="text-primary fs-6">
                          {formatearMedida(litros_tanque, 2)} L
                        </strong>
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="bg-white rounded-3 p-2 px-3 border h-100">
                        <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                          Desarrollo de Lámina (Perímetro)
                        </span>
                        <strong className="text-dark fs-6">
                          {formatearMedida(perimetro_m, 4)} m
                        </strong>
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="bg-white rounded-3 p-2 px-3 border h-100">
                        <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                          Área de Lámina (Cuerpo)
                        </span>
                        <strong className="text-dark fs-6">
                          {formatearMedida(area_lamina_m2, 4)} m²
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===== SECCIÓN 2: ALEACIÓN DE ACERO ===== */}
                <div className="mb-4">
                  <label className="form-label text-dark fw-bold mb-2 fs-6 d-flex align-items-center gap-2">
                    <ShieldCheck size={18} strokeWidth={2} className="text-primary" />
                    <span>2. Tipo de Acero Inoxidable</span>
                  </label>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div
                        onClick={() => setTipoAcero("304")}
                        className={`tarjeta-seleccion h-100 ${
                          tipo_acero === "304" ? "seleccionada" : ""
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
                          tipo_acero === "316" ? "seleccionada" : ""
                        }`}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-bold text-dark fs-5">Acero AISI 316</span>
                          <span
                            className="badge rounded-pill px-2 py-1 small fw-semibold"
                            style={{ background: "#e0e7ff", color: "#3730a3" }}
                          >
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

                {/* ===== SECCIÓN 3: AGITACIÓN ===== */}
                <div className="mb-4">
                  <div
                    onClick={() => setTieneAgitacion(!tiene_agitacion)}
                    className={`tarjeta-seleccion d-flex align-items-center justify-content-between ${
                      tiene_agitacion ? "seleccionada" : ""
                    }`}
                  >
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <Settings2 size={18} strokeWidth={2} className="text-primary" />
                        <span className="fw-bold text-dark fs-6">
                          Sistema de Agitación Dinámica
                        </span>
                        <span
                          className="badge rounded-pill small fw-semibold"
                          style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}
                        >
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
                        checked={tiene_agitacion}
                        onChange={(evento) => setTieneAgitacion(evento.target.checked)}
                        onClick={(evento) => evento.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>

                {/* ===== RESUMEN ECONÓMICO PRELIMINAR ===== */}
                {hayDimensionesValidas && (
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
                        Cálculo base ({formatearMedida(litros_tanque, 2)} L × ${precioPorLitro.toFixed(2)}/L):
                      </span>
                      <span className="fw-semibold text-dark">
                        {formatearMoneda(precioBaseEstimado)}
                      </span>
                    </div>
                    {tiene_agitacion && (
                      <div className="d-flex justify-content-between align-items-center small text-secondary mb-1">
                        <span>Kit de Motorreductor y Agitación:</span>
                        <span className="fw-semibold text-dark">
                          {formatearMoneda(COSTO_AGITACION)}
                        </span>
                      </div>
                    )}
                    <hr className="border-secondary-subtle my-2" />
                    <div className="d-flex justify-content-between align-items-center fw-bold text-dark">
                      <span>Subtotal Preliminar Estimado (antes de IVA):</span>
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

                        {hayDimensionesValidas &&
                          mensajeError.includes("API de Luxman") && (
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
                        <span>Guardando y generando PDF oficial...</span>
                      </>
                    ) : (
                      <>
                        <Calculator size={20} strokeWidth={2} />
                        <span>Generar Cotización Técnica Oficial</span>
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
                  {cotizacionCreada.id_cotizacion !== "DEMO-ESTIMADO"
                    ? `#${cotizacionCreada.id_cotizacion}`
                    : "Estimada"}
                </h2>
                <p className="text-secondary small mb-0">
                  {usandoEstimadoOffline
                    ? "Cálculo generado localmente con las fórmulas geométricas y coeficientes oficiales de Luxman."
                    : "Guardada con éxito en PostgreSQL con su ficha geométrica completa."}
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
                  Especificaciones Geométricas y Técnicas del Tanque
                </h5>

                <div className="row g-3 small">
                  <div className="col-sm-4">
                    <span className="text-secondary d-block">Radio / Diámetro:</span>
                    <strong className="text-dark fs-6">
                      R {formatearMedida(cotizacionCreada.radio_m, 3)} m • Ø{" "}
                      {formatearMedida(cotizacionCreada.diametro_m, 3)} m
                    </strong>
                  </div>
                  <div className="col-sm-4">
                    <span className="text-secondary d-block">Longitud / Altura:</span>
                    <strong className="text-dark fs-6">
                      {formatearMedida(cotizacionCreada.longitud_m, 3)} m
                    </strong>
                  </div>
                  <div className="col-sm-4">
                    <span className="text-secondary d-block">Tipo de Fondo:</span>
                    <strong className="text-dark fs-6">
                      {cotizacionCreada.tipo_fondo}
                    </strong>
                  </div>

                  <div className="col-sm-4">
                    <span className="text-secondary d-block">Volumen Geométrico:</span>
                    <strong className="text-dark fs-6">
                      {formatearMedida(cotizacionCreada.volumen_m3, 4)} m³
                    </strong>
                  </div>
                  <div className="col-sm-4">
                    <span className="text-secondary d-block">Capacidad Nominal:</span>
                    <strong className="text-primary fs-6">
                      {formatearMedida(cotizacionCreada.litros_tanque, 2)} Litros
                    </strong>
                  </div>
                  <div className="col-sm-4">
                    <span className="text-secondary d-block">Desarrollo de Lámina:</span>
                    <strong className="text-dark fs-6">
                      {formatearMedida(cotizacionCreada.perimetro_m, 4)} m
                    </strong>
                  </div>

                  <div className="col-sm-4">
                    <span className="text-secondary d-block">Área de Lámina (Cuerpo):</span>
                    <strong className="text-dark fs-6">
                      {formatearMedida(cotizacionCreada.area_lamina_m2, 4)} m²
                    </strong>
                  </div>
                  <div className="col-sm-4">
                    <span className="text-secondary d-block">Material de Fabricación:</span>
                    <strong className="text-dark fs-6">
                      Acero Inoxidable AISI {cotizacionCreada.tipo_acero}
                    </strong>
                  </div>
                  <div className="col-sm-4">
                    <span className="text-secondary d-block">Sistema de Agitación:</span>
                    <strong className="text-dark fs-6">
                      {cotizacionCreada.tiene_agitacion
                        ? "Sí (Motorreductor + Flecha)"
                        : "No (Tanque estático)"}
                    </strong>
                  </div>
                </div>

                <hr className="border-secondary-subtle my-3" />

                <div className="d-flex justify-content-between align-items-center small text-secondary mb-1">
                  <span>Precio Base Material:</span>
                  <strong className="text-dark">{formatearMoneda(cotizacionCreada.precio_base)}</strong>
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-dark fs-5 fw-bold">Precio Final (antes de IVA):</span>
                  <span className="text-primary display-6 fw-bold">
                    {formatearMoneda(cotizacionCreada.precio_final)}
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
                {cotizacionCreada.id_cotizacion !== "DEMO-ESTIMADO" && (
                  <button
                    type="button"
                    onClick={() => descargarPdfCotizacion(cotizacionCreada.id_cotizacion)}
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
