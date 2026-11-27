import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  FileDown,
  RotateCcw,
  Loader2,
  Ruler,
  Cylinder,
  Layers,
  History,
  Save,
} from "lucide-react";
import "./LandingPage.css";
import { URL_BASE } from "../api";

// Ruta relativa para evitar problemas de Mixed Content en HTTPS/Nginx
const URL_API = `${URL_BASE}/api/calculos_tanques`;

const TIPOS_FONDO = ["Plano", "Cónico", "Toriesférico"];

// Hojas comerciales estándar de acero inoxidable con su área exacta en m²
const HOJAS_COMERCIALES = [
  { valor: "1.22x2.44", etiqueta: "1.22 × 2.44 m (4' × 8' • 2.98 m²)", area_m2: 1.22 * 2.44 },
  { valor: "1.22x3.05", etiqueta: "1.22 × 3.05 m (4' × 10' • 3.72 m²)", area_m2: 1.22 * 3.05 },
  { valor: "1.52x3.05", etiqueta: "1.52 × 3.05 m (5' × 10' • 4.64 m²)", area_m2: 1.52 * 3.05 },
];

// 6 referencias comerciales basadas en anchos/largos reales de lámina (1.22, 1.52 y 2.44 m)
const MEDIDAS_REFERENCIA = [
  { capacidad: "200 L", radio_m: "0.28", longitud_m: "0.85" },
  { capacidad: "500 L", radio_m: "0.36", longitud_m: "1.22" },
  { capacidad: "1,000 L", radio_m: "0.51", longitud_m: "1.22" },
  { capacidad: "2,000 L", radio_m: "0.65", longitud_m: "1.52" },
  { capacidad: "5,000 L", radio_m: "0.81", longitud_m: "2.44" },
  { capacidad: "10,000 L", radio_m: "1.14", longitud_m: "2.44" },
];

const ESTILO_TARJETA = {
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: "1rem",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  boxShadow: "0 6px 20px -4px rgba(15, 23, 42, 0.06)",
};

const formatearMoneda = (cantidad) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cantidad || 0);

const formatearMedida = (valor, decimales = 4) =>
  Number(valor || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimales,
  });

const formatearFecha = (fechaIso) => {
  if (!fechaIso) return "—";
  const textoNormalizado = fechaIso.endsWith("Z") ? fechaIso : `${fechaIso}Z`;
  return new Date(textoNormalizado).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

function FormularioCotizacion({ alVolver }) {
  // Entradas del Ing. Raúl (snake_case)
  const [nombre_referencia, setNombreReferencia] = useState("");
  const [radio_m, setRadioM] = useState("");
  const [longitud_m, setLongitudM] = useState("");
  const [tipo_fondo, setTipoFondo] = useState("Plano");
  const [medida_hoja, setMedidaHoja] = useState("1.22x2.44");
  const [precio_hoja, setPrecioHoja] = useState("");

  // Las fórmulas matemáticas inician ocultas por defecto
  const [mostrarFormulas, setMostrarFormulas] = useState(false);

  // Estados de guardado, historial y descarga PDF
  const [guardando, setGuardando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [errorHistorial, setErrorHistorial] = useState("");
  const [idDescargandoPdf, setIdDescargandoPdf] = useState(null);

  // Cálculos geométricos y de lámina comercial en tiempo real
  const radioNumero = Math.max(0, parseFloat(radio_m) || 0);
  const longitudNumero = Math.max(0, parseFloat(longitud_m) || 0);
  const precioHojaNumero = Math.max(0, parseFloat(precio_hoja) || 0);
  const hayDimensionesValidas = radioNumero > 0 && longitudNumero > 0;

  const hojaElegida =
    HOJAS_COMERCIALES.find((h) => h.valor === medida_hoja) || HOJAS_COMERCIALES[0];

  const diametro_m = hayDimensionesValidas ? 2 * radioNumero : 0;
  const volumen_m3 = hayDimensionesValidas ? Math.PI * Math.pow(radioNumero, 2) * longitudNumero : 0;
  const litros_tanque = hayDimensionesValidas ? volumen_m3 * 1000 : 0;
  const perimetro_m = hayDimensionesValidas ? Math.PI * diametro_m : 0;
  const area_lamina_m2 = hayDimensionesValidas ? perimetro_m * longitudNumero : 0;
  const cantidad_hojas = hayDimensionesValidas
    ? Math.max(1, Math.ceil(area_lamina_m2 / hojaElegida.area_m2))
    : 0;
  const costo_total_lamina =
    hayDimensionesValidas && precioHojaNumero > 0
      ? Math.round(cantidad_hojas * precioHojaNumero * 100) / 100
      : 0;

  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);
    try {
      const respuesta = await fetch(URL_API);
      if (!respuesta.ok) throw new Error("No se pudo obtener el historial de medidas.");
      const datos = await respuesta.json();
      setHistorial(Array.isArray(datos) ? datos : []);
      setErrorHistorial("");
    } catch {
      setErrorHistorial("No se pudo conectar con el servidor para cargar el historial de medidas.");
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  async function descargarPdfMedidas(id_calculo) {
    setIdDescargandoPdf(id_calculo);
    setMensajeError("");
    try {
      const respuesta = await fetch(`${URL_API}/${id_calculo}/pdf`);
      if (!respuesta.ok) {
        const texto = await respuesta.text();
        throw new Error(texto || `Error ${respuesta.status} al generar el PDF de medidas.`);
      }

      const cabecera = respuesta.headers.get("Content-Disposition") || "";
      const coincidencia = cabecera.match(/filename="?([^";]+)"?/);
      const nombreDescarga = coincidencia
        ? coincidencia[1]
        : `Ficha_Medidas_Luxman_CALC-${String(id_calculo).padStart(5, "0")}.pdf`;

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
      setMensajeError("No se pudo descargar el PDF de medidas: " + error.message);
    } finally {
      setIdDescargandoPdf(null);
    }
  }

  function bloquearTeclasInvalidas(evento) {
    if (["-", "+", "e", "E"].includes(evento.key)) {
      evento.preventDefault();
    }
  }

  function manejarCambioNumeroPositivo(setter) {
    return (evento) => {
      const valor = evento.target.value;
      if (valor === "") {
        setter("");
        setMensajeError("");
        return;
      }
      if (parseFloat(valor) < 0) {
        setMensajeError("No se permiten valores negativos.");
        return;
      }
      setMensajeError("");
      setter(valor);
    };
  }

  async function manejarGuardarMedidas(evento) {
    evento.preventDefault();

    if (!radio_m || radio_m.trim() === "" || isNaN(radioNumero) || radioNumero <= 0) {
      setMensajeError("Ingresa un radio en metros mayor a cero.");
      return;
    }

    if (!longitud_m || longitud_m.trim() === "" || isNaN(longitudNumero) || longitudNumero <= 0) {
      setMensajeError("Ingresa una longitud/altura en metros mayor a cero.");
      return;
    }

    if (!TIPOS_FONDO.includes(tipo_fondo)) {
      setMensajeError("Selecciona un tipo de fondo válido (Plano, Cónico o Toriesférico).");
      return;
    }

    setGuardando(true);
    setMensajeError("");
    setUltimoGuardado(null);

    const payload = {
      nombre_referencia: nombre_referencia.trim() || null,
      radio_m: Number(radioNumero.toFixed(4)),
      longitud_m: Number(longitudNumero.toFixed(4)),
      tipo_fondo,
      medida_hoja,
      precio_hoja: precio_hoja === "" ? 0 : Number(precioHojaNumero.toFixed(2)),
      diametro_m: Number(diametro_m.toFixed(4)),
      volumen_m3: Number(volumen_m3.toFixed(4)),
      litros_tanque: Number(litros_tanque.toFixed(2)),
      perimetro_m: Number(perimetro_m.toFixed(4)),
      area_lamina_m2: Number(area_lamina_m2.toFixed(4)),
      cantidad_hojas,
      costo_total_lamina: Number(costo_total_lamina.toFixed(2)),
    };

    try {
      const respuesta = await fetch(URL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!respuesta.ok) {
        const textoError = await respuesta.text();
        throw new Error(textoError || `Error ${respuesta.status}: No se pudieron guardar las medidas.`);
      }

      const registroGuardado = await respuesta.json();
      setUltimoGuardado(registroGuardado);
      setHistorial((anterior) => [
        registroGuardado,
        ...anterior.filter((item) => item.id_calculo !== registroGuardado.id_calculo),
      ]);
      setErrorHistorial("");
    } catch (error) {
      if (
        error.name === "TypeError" ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        setMensajeError("No se pudo conectar con la API de Luxman. Verifica que el backend esté activo.");
      } else {
        setMensajeError(error.message);
      }
    } finally {
      setGuardando(false);
    }
  }

  function limpiarFormulario() {
    setNombreReferencia("");
    setRadioM("");
    setLongitudM("");
    setTipoFondo("Plano");
    setMedidaHoja("1.22x2.44");
    setPrecioHoja("");
    setMensajeError("");
    setUltimoGuardado(null);
  }

  function aplicarMedidaReferencia(preset) {
    setRadioM(preset.radio_m);
    setLongitudM(preset.longitud_m);
    setMensajeError("");
    setUltimoGuardado(null);
  }

  return (
    <div className="p-3 p-md-4">
      <div className="mx-auto" style={{ maxWidth: "1040px" }}>
        {/* ===== ENCABEZADO COMPACTO ===== */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <Calculator size={24} strokeWidth={2.2} className="text-primary" />
              <span>Calculadora Técnica de Tanques Inoxidables</span>
            </h3>
            <p className="text-secondary small mb-0">
              Herramienta interna de ingeniería para dimensionamiento geométrico y cuantificación de hojas comerciales.
            </p>
          </div>
          {alVolver && (
            <button
              type="button"
              onClick={alVolver}
              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
            >
              <ArrowLeft size={15} />
              <span>Volver</span>
            </button>
          )}
        </div>

        {/* ===== 1. CALCULADORA DIRECTA (ENTRADAS + RESULTADOS EN TIEMPO REAL) ===== */}
        <div className="p-4 mb-4" style={ESTILO_TARJETA}>
          <form onSubmit={manejarGuardarMedidas}>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label htmlFor="input-nombre-referencia" className="form-label fw-semibold small text-dark mb-1">
                  Referencia del cálculo <span className="text-secondary fw-normal">(opcional)</span>
                </label>
                <input
                  id="input-nombre-referencia"
                  name="nombre_referencia"
                  type="text"
                  maxLength={150}
                  className="form-control"
                  value={nombre_referencia}
                  onChange={(e) => setNombreReferencia(e.target.value)}
                  placeholder='Ej. "Tanque 500L Cliente X"'
                />
              </div>

              <div className="col-6 col-md-3">
                <label htmlFor="input-radio-m" className="form-label fw-semibold small text-dark mb-1">
                  Radio (m) <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <input
                    id="input-radio-m"
                    name="radio_m"
                    type="number"
                    min="0.01"
                    step="any"
                    className="form-control"
                    value={radio_m}
                    onKeyDown={bloquearTeclasInvalidas}
                    onChange={manejarCambioNumeroPositivo(setRadioM)}
                    placeholder="Ej. 0.51"
                    required
                  />
                  <span className="input-group-text">m</span>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <label htmlFor="input-longitud-m" className="form-label fw-semibold small text-dark mb-1">
                  Longitud / Altura (m) <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <input
                    id="input-longitud-m"
                    name="longitud_m"
                    type="number"
                    min="0.01"
                    step="any"
                    className="form-control"
                    value={longitud_m}
                    onKeyDown={bloquearTeclasInvalidas}
                    onChange={manejarCambioNumeroPositivo(setLongitudM)}
                    placeholder="Ej. 1.22"
                    required
                  />
                  <span className="input-group-text">m</span>
                </div>
              </div>

              <div className="col-md-4">
                <label htmlFor="select-tipo-fondo" className="form-label fw-semibold small text-dark mb-1">
                  Tipo de fondo <span className="text-danger">*</span>
                </label>
                <select
                  id="select-tipo-fondo"
                  name="tipo_fondo"
                  className="form-select"
                  value={tipo_fondo}
                  onChange={(e) => setTipoFondo(e.target.value)}
                >
                  {TIPOS_FONDO.map((fondo) => (
                    <option key={fondo} value={fondo}>
                      {fondo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label htmlFor="select-medida-hoja" className="form-label fw-semibold small text-dark mb-1">
                  Hoja comercial de lámina <span className="text-danger">*</span>
                </label>
                <select
                  id="select-medida-hoja"
                  name="medida_hoja"
                  className="form-select"
                  value={medida_hoja}
                  onChange={(e) => setMedidaHoja(e.target.value)}
                >
                  {HOJAS_COMERCIALES.map((hoja) => (
                    <option key={hoja.valor} value={hoja.valor}>
                      {hoja.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label htmlFor="input-precio-hoja" className="form-label fw-semibold small text-dark mb-1">
                  Precio por hoja MXN <span className="text-secondary fw-normal">(opcional)</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text">$</span>
                  <input
                    id="input-precio-hoja"
                    name="precio_hoja"
                    type="number"
                    min="0"
                    step="any"
                    className="form-control"
                    value={precio_hoja}
                    onKeyDown={bloquearTeclasInvalidas}
                    onChange={manejarCambioNumeroPositivo(setPrecioHoja)}
                    placeholder="0.00"
                  />
                  <span className="input-group-text">MXN</span>
                </div>
              </div>
            </div>

            {/* ===== CONTENEDOR DE RESULTADOS EN TIEMPO REAL + BOTÓN CIRCULAR fx ===== */}
            <div
              className="p-3 p-md-4 mb-4 rounded-4"
              style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
              }}
            >
              <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                <span className="fw-bold text-dark small text-uppercase d-flex align-items-center gap-2">
                  <Cylinder size={17} strokeWidth={2} className="text-primary" />
                  <span>Resultados de Dimensionamiento y Lámina (Tiempo Real)</span>
                </span>

                <button
                  type="button"
                  onClick={() => setMostrarFormulas((prev) => !prev)}
                  aria-expanded={mostrarFormulas}
                  title={mostrarFormulas ? "Ocultar fórmulas matemáticas" : "Mostrar fórmulas matemáticas"}
                  className={`btn btn-sm d-inline-flex align-items-center justify-content-center fw-bold ${
                    mostrarFormulas ? "btn-primary" : "btn-outline-secondary"
                  }`}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    padding: 0,
                    fontStyle: "italic",
                    fontSize: "0.82rem",
                  }}
                >
                  fx
                </button>
              </div>

              {mostrarFormulas && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border rounded-3 p-3 mb-3 small"
                >
                  <div className="fw-semibold text-primary mb-2">Fórmulas matemáticas empleadas:</div>
                  <div className="row g-2 text-secondary">
                    <div className="col-sm-6 col-md-3">
                      <strong className="text-dark">Diámetro:</strong> D = 2 · r
                    </div>
                    <div className="col-sm-6 col-md-3">
                      <strong className="text-dark">Volumen:</strong> V = π · r² · L
                    </div>
                    <div className="col-sm-6 col-md-3">
                      <strong className="text-dark">Desarrollo:</strong> P = π · D
                    </div>
                    <div className="col-sm-6 col-md-3">
                      <strong className="text-dark">Área cuerpo:</strong> A = P · L
                    </div>
                    <div className="col-sm-6">
                      <strong className="text-dark">Litros:</strong> Lts = V × 1,000
                    </div>
                    <div className="col-sm-6">
                      <strong className="text-dark">Hojas comerciales:</strong> N = redondeo superior (A / A_hoja)
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="row g-2 g-md-3">
                <div className="col-6 col-md-4">
                  <div className="bg-white rounded-3 p-2 px-3 border h-100">
                    <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                      Diámetro
                    </span>
                    <strong className="text-dark fs-6">{formatearMedida(diametro_m, 4)} m</strong>
                  </div>
                </div>

                <div className="col-6 col-md-4">
                  <div className="bg-white rounded-3 p-2 px-3 border h-100">
                    <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                      Volumen geométrico
                    </span>
                    <strong className="text-dark fs-6">{formatearMedida(volumen_m3, 4)} m³</strong>
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <div
                    className="rounded-3 p-2 px-3 border h-100"
                    style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
                  >
                    <span className="text-primary d-block fw-semibold" style={{ fontSize: "0.75rem" }}>
                      Capacidad volumétrica
                    </span>
                    <strong className="text-primary fs-6">{formatearMedida(litros_tanque, 2)} L</strong>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="bg-white rounded-3 p-2 px-3 border h-100">
                    <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                      Desarrollo de lámina
                    </span>
                    <strong className="text-dark fs-6">{formatearMedida(perimetro_m, 4)} m</strong>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="bg-white rounded-3 p-2 px-3 border h-100">
                    <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                      Área del cuerpo
                    </span>
                    <strong className="text-dark fs-6">{formatearMedida(area_lamina_m2, 4)} m²</strong>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div
                    className="rounded-3 p-2 px-3 border h-100"
                    style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}
                  >
                    <span className="text-success d-block fw-semibold" style={{ fontSize: "0.75rem" }}>
                      Hojas ({medida_hoja})
                    </span>
                    <strong className="text-success fs-6">
                      {cantidad_hojas} {cantidad_hojas === 1 ? "hoja" : "hojas"}
                    </strong>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="bg-white rounded-3 p-2 px-3 border h-100">
                    <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                      Costo total de lámina
                    </span>
                    <strong className="text-dark fs-6">
                      {precioHojaNumero > 0 && hayDimensionesValidas
                        ? formatearMoneda(costo_total_lamina)
                        : "—"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {mensajeError && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
                <AlertTriangle size={18} className="flex-shrink-0" />
                <span className="small">{mensajeError}</span>
              </div>
            )}

            {ultimoGuardado && (
              <div className="alert alert-success d-flex flex-wrap justify-content-between align-items-center gap-2 py-2 mb-3">
                <div className="d-flex align-items-center gap-2 small">
                  <CheckCircle2 size={18} className="flex-shrink-0" />
                  <span>
                    Medidas guardadas como{" "}
                    <strong>CALC-{String(ultimoGuardado.id_calculo).padStart(5, "0")}</strong>
                    {ultimoGuardado.nombre_referencia ? ` (${ultimoGuardado.nombre_referencia})` : ""}.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => descargarPdfMedidas(ultimoGuardado.id_calculo)}
                  disabled={idDescargandoPdf === ultimoGuardado.id_calculo}
                  className="btn btn-sm btn-success d-inline-flex align-items-center gap-1"
                >
                  <FileDown size={15} />
                  <span>Descargar PDF de Medidas</span>
                </button>
              </div>
            )}

            <div className="d-flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="btn btn-primary px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2"
              >
                {guardando ? (
                  <>
                    <Loader2 size={18} className="mb-spinner" />
                    <span>Guardando medidas...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Guardar medidas</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={limpiarFormulario}
                className="btn btn-outline-secondary px-3 py-2 d-inline-flex align-items-center gap-2"
              >
                <RotateCcw size={16} />
                <span>Limpiar</span>
              </button>
            </div>
          </form>
        </div>

        {/* ===== 2. MEDIDAS RÁPIDAS DE REFERENCIA (ABAJO DE LA CALCULADORA) ===== */}
        <div className="p-3 p-md-4 mb-4" style={ESTILO_TARJETA}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <Ruler size={18} className="text-primary" />
            <h6 className="fw-bold text-dark mb-0">Medidas rápidas de referencia</h6>
            <span className="text-secondary small d-none d-sm-inline">
              (basadas en alturas de lámina comercial)
            </span>
          </div>

          <div className="row g-2 mt-1">
            {MEDIDAS_REFERENCIA.map((preset) => {
              const activo = radio_m === preset.radio_m && longitud_m === preset.longitud_m;
              return (
                <div className="col-6 col-md-4 col-lg-2" key={preset.capacidad}>
                  <button
                    type="button"
                    onClick={() => aplicarMedidaReferencia(preset)}
                    className={`btn w-100 text-start p-2 rounded-3 border ${
                      activo ? "btn-primary text-white border-primary" : "btn-light text-dark"
                    }`}
                  >
                    <div className="fw-bold small">{preset.capacidad}</div>
                    <div
                      style={{ fontSize: "0.75rem" }}
                      className={activo ? "text-white-50" : "text-secondary"}
                    >
                      r={preset.radio_m}, L={preset.longitud_m}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== 3. HISTORIAL DE MEDIDAS GUARDADAS ===== */}
        <div className="p-3 p-md-4" style={ESTILO_TARJETA}>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <History size={19} className="text-primary" />
              <div>
                <h5 className="fw-bold text-dark mb-0">Historial de Medidas Guardadas</h5>
                <small className="text-secondary">
                  Consulta cálculos anteriores y descarga la ficha técnica con fórmulas en PDF.
                </small>
              </div>
            </div>
            <button
              type="button"
              onClick={cargarHistorial}
              disabled={cargandoHistorial}
              className="btn btn-outline-secondary btn-sm"
            >
              Actualizar
            </button>
          </div>

          {errorHistorial && (
            <div className="alert alert-warning py-2 small">{errorHistorial}</div>
          )}

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>Folio / Fecha</th>
                  <th>Referencia</th>
                  <th>Dimensiones</th>
                  <th>Volumen</th>
                  <th>Desarrollo / Área</th>
                  <th>Lámina Comercial</th>
                  <th>Costo Lámina</th>
                  <th className="text-end">Ficha Técnica</th>
                </tr>
              </thead>
              <tbody>
                {cargandoHistorial && (
                  <tr>
                    <td colSpan="8" className="text-center text-secondary py-4">
                      Cargando historial de medidas...
                    </td>
                  </tr>
                )}

                {!cargandoHistorial &&
                  historial.map((item) => (
                    <tr key={item.id_calculo}>
                      <td className="text-nowrap">
                        <div className="fw-bold text-dark">
                          CALC-{String(item.id_calculo).padStart(5, "0")}
                        </div>
                        <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                          {formatearFecha(item.fecha_creacion)}
                        </div>
                      </td>
                      <td>
                        <span className="fw-semibold text-dark">
                          {item.nombre_referencia || <span className="text-secondary fw-normal">Sin referencia</span>}
                        </span>
                        <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                          Fondo: {item.tipo_fondo}
                        </div>
                      </td>
                      <td className="text-nowrap">
                        <div>r = {formatearMedida(item.radio_m, 3)} m (Ø {formatearMedida(item.diametro_m, 3)} m)</div>
                        <div className="text-secondary">L = {formatearMedida(item.longitud_m, 3)} m</div>
                      </td>
                      <td className="text-nowrap">
                        <div className="fw-semibold text-primary">
                          {formatearMedida(item.litros_tanque, 2)} L
                        </div>
                        <div className="text-secondary">{formatearMedida(item.volumen_m3, 4)} m³</div>
                      </td>
                      <td className="text-nowrap">
                        <div>P = {formatearMedida(item.perimetro_m, 3)} m</div>
                        <div className="text-secondary">A = {formatearMedida(item.area_lamina_m2, 3)} m²</div>
                      </td>
                      <td className="text-nowrap">
                        <span className="badge text-bg-success-subtle text-success border border-success-subtle">
                          {item.cantidad_hojas} {item.cantidad_hojas === 1 ? "hoja" : "hojas"}
                        </span>
                        <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                          <Layers size={11} className="me-1" />
                          {item.medida_hoja}
                        </div>
                      </td>
                      <td className="text-nowrap fw-semibold">
                        {item.precio_hoja > 0 ? formatearMoneda(item.costo_total_lamina) : "—"}
                      </td>
                      <td className="text-end text-nowrap">
                        <button
                          type="button"
                          onClick={() => descargarPdfMedidas(item.id_calculo)}
                          disabled={idDescargandoPdf === item.id_calculo}
                          className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                        >
                          {idDescargandoPdf === item.id_calculo ? (
                            <>
                              <Loader2 size={14} className="mb-spinner" />
                              <span>Generando...</span>
                            </>
                          ) : (
                            <>
                              <FileDown size={14} />
                              <span>Descargar PDF de Medidas</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}

                {!cargandoHistorial && historial.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center text-secondary py-4">
                      Aún no hay medidas guardadas. Ingresa las dimensiones arriba y haz clic en{" "}
                      <strong>Guardar medidas</strong>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FormularioCotizacion;
