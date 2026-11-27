import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  FileDown,
  RotateCcw,
  Loader2,
  Settings2,
  Layers,
  History,
  FileCheck2,
  Trash2,
  User,
  ShieldCheck,
  Building2,
  Eye,
} from "lucide-react";
import "./LandingPage.css";
import { URL_BASE } from "../api";
import Planos from "./Planos";

const URL_API_CALCULOS = `${URL_BASE}/api/calculos_tanques`;
const URL_API_CLIENTES = `${URL_BASE}/api/clientes`;

const TIPOS_FONDO = ["Plano", "Cónico", "Toriesférico"];

const HOJAS_COMERCIALES = [
  { valor: "1.22x2.44", etiqueta: "1.22 × 2.44 m (4' × 8' • 2.98 m²)", area_m2: 1.22 * 2.44 },
  { valor: "1.22x3.05", etiqueta: "1.22 × 3.05 m (4' × 10' • 3.72 m²)", area_m2: 1.22 * 3.05 },
  { valor: "1.52x3.05", etiqueta: "1.52 × 3.05 m (5' × 10' • 4.64 m²)", area_m2: 1.52 * 3.05 },
];

// 6 referencias basadas en alturas comerciales de hoja (1.22, 1.52 y 2.44 m)
const MEDIDAS_REFERENCIA = [
  { capacidad: "200 L", radio_m: "0.28", longitud_m: "0.85" },
  { capacidad: "500 L", radio_m: "0.36", longitud_m: "1.22" },
  { capacidad: "1,000 L", radio_m: "0.51", longitud_m: "1.22" },
  { capacidad: "2,000 L", radio_m: "0.65", longitud_m: "1.52" },
  { capacidad: "5,000 L", radio_m: "0.81", longitud_m: "2.44" },
  { capacidad: "10,000 L", radio_m: "1.14", longitud_m: "2.44" },
];

// Catálogo base de materiales ordenado del más común al menos común
const crearMaterialesIniciales = () => [
  {
    clave: "lamina_inoxidable",
    concepto: "Lámina de acero inoxidable",
    unidad: "hojas",
    seleccionado: true,
    es_lamina: true,
    es_personalizado: false,
    cantidad: "1",
    precio_unitario: "",
  },
  {
    clave: "fondos_tapas",
    concepto: "Fondos / Tapas (superior e inferior)",
    unidad: "pzas",
    seleccionado: false,
    es_lamina: false,
    es_personalizado: false,
    cantidad: "2",
    precio_unitario: "",
  },
  {
    clave: "soldadura_argon",
    concepto: "Soldadura TIG y Gas Argón",
    unidad: "lote",
    seleccionado: false,
    es_lamina: false,
    es_personalizado: false,
    cantidad: "1",
    precio_unitario: "",
  },
  {
    clave: "consumibles_acabado",
    concepto: "Consumibles de acabado sanitario (discos, lijas, pasta decapante)",
    unidad: "lote",
    seleccionado: false,
    es_lamina: false,
    es_personalizado: false,
    cantidad: "1",
    precio_unitario: "",
  },
  {
    clave: "patas_soportes",
    concepto: "Patas / Soportes estructurales",
    unidad: "pzas",
    seleccionado: false,
    es_lamina: false,
    es_personalizado: false,
    cantidad: "4",
    precio_unitario: "",
  },
  {
    clave: "boquillas",
    concepto: "Boquillas, codos y férulas (Clamp / NPT)",
    unidad: "pzas",
    seleccionado: false,
    es_lamina: false,
    es_personalizado: false,
    cantidad: "3",
    precio_unitario: "",
  },
  {
    clave: "valvulas",
    concepto: "Válvulas de descarga",
    unidad: "pza",
    seleccionado: false,
    es_lamina: false,
    es_personalizado: false,
    cantidad: "1",
    precio_unitario: "",
  },
  {
    clave: "manway",
    concepto: "Registro hombre (Manway) con empaque",
    unidad: "pza",
    seleccionado: false,
    es_lamina: false,
    es_personalizado: false,
    cantidad: "1",
    precio_unitario: "",
  },
  {
    clave: "tornilleria_empaques",
    concepto: "Tornillería, bridas y empaques",
    unidad: "lote",
    seleccionado: false,
    es_lamina: false,
    es_personalizado: false,
    cantidad: "1",
    precio_unitario: "",
  },
  {
    clave: "accesorios_opcionales",
    concepto: "Accesorios opcionales (indicador de nivel, mirilla, bola CIP, agitación)",
    unidad: "lote",
    seleccionado: false,
    es_lamina: false,
    es_personalizado: false,
    cantidad: "1",
    precio_unitario: "",
  },
];

const ESTILO_TARJETA = {
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: "0.9rem",
  border: "1px solid rgba(226, 232, 240, 0.95)",
  boxShadow: "0 4px 16px -4px rgba(15, 23, 42, 0.06)",
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
  const normalizada = fechaIso.endsWith("Z") ? fechaIso : `${fechaIso}Z`;
  return new Date(normalizada).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

function FormularioCotizacion({ alVolver }) {
  // ===== PESTAÑAS SUPERIORES ('calculo' | 'planos') =====
  const [pestanaActiva, setPestanaActiva] = useState("calculo");

  // ===== BLOQUE 1: DIMENSIONAMIENTO GEOMÉTRICO =====
  const [modo_calculo, setModoCalculo] = useState("por_medidas"); // 'por_medidas' | 'por_capacidad'
  const [radio_m, setRadioM] = useState("");
  const [longitud_m, setLongitudM] = useState("");
  const [litros_deseados, setLitrosDeseados] = useState("");
  const [tipo_fondo, setTipoFondo] = useState("Plano");
  const [mostrarFormulas, setMostrarFormulas] = useState(false);

  // ===== BLOQUE 2: MATERIALES Y COSTEO =====
  const [medida_hoja, setMedidaHoja] = useState("1.22x2.44");
  const [listaMateriales, setListaMateriales] = useState(crearMaterialesIniciales);
  const [contadorExtra, setContadorExtra] = useState(1);

  // ===== BLOQUE 3: CLIENTE, NOTAS Y GUARDADO =====
  const [clientes, setClientes] = useState([]);
  const [id_cliente, setIdCliente] = useState("");
  const [mostrandoNuevoCliente, setMostrandoNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre_cliente: "",
    rfc_cliente: "",
    telefono: "",
    correo: "",
  });
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [errorCliente, setErrorCliente] = useState("");
  const [notas, setNotas] = useState("");

  // ===== ESTADOS DE GUARDADO, HISTORIAL Y PAPELERA =====
  const [guardando, setGuardando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [pestanaHistorial, setPestanaHistorial] = useState("guardados"); // 'guardados' | 'papelera'
  const [historial, setHistorial] = useState([]);
  const [papelera, setPapelera] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [errorHistorial, setErrorHistorial] = useState("");
  const [avisoHistorial, setAvisoHistorial] = useState("");
  const [idDescargandoPdf, setIdDescargandoPdf] = useState(null);

  // ===== CÁLCULOS GEOMÉTRICOS EN TIEMPO REAL =====
  const longitudNumero = Math.max(0, parseFloat(longitud_m) || 0);
  const litrosDeseadosNumero = Math.max(0, parseFloat(litros_deseados) || 0);
  const radioManualNumero = Math.max(0, parseFloat(radio_m) || 0);

  // En modo "por_capacidad" despejamos radio_m = sqrt(V / (pi * L))
  const radioCalculado =
    modo_calculo === "por_capacidad"
      ? longitudNumero > 0 && litrosDeseadosNumero > 0
        ? Math.sqrt(litrosDeseadosNumero / 1000 / (Math.PI * longitudNumero))
        : 0
      : radioManualNumero;

  const hayMedidasValidas = radioCalculado > 0 && longitudNumero > 0;

  const diametro_m = hayMedidasValidas ? 2 * radioCalculado : 0;
  const volumen_cilindro_m3 = hayMedidasValidas
    ? Math.PI * Math.pow(radioCalculado, 2) * longitudNumero
    : 0;

  const volumen_fondo_m3 = useMemo(() => {
    if (!hayMedidasValidas) return 0;
    if (tipo_fondo === "Cónico") {
      const alturaCono = 0.25 * diametro_m;
      return (1 / 3) * Math.PI * Math.pow(radioCalculado, 2) * alturaCono;
    }
    if (tipo_fondo === "Toriesférico") {
      return 0.0847 * Math.pow(diametro_m, 3);
    }
    return 0;
  }, [hayMedidasValidas, tipo_fondo, diametro_m, radioCalculado]);

  const volumen_total_m3 = hayMedidasValidas ? volumen_cilindro_m3 + volumen_fondo_m3 : 0;
  const litros_tanque = hayMedidasValidas ? volumen_total_m3 * 1000 : 0;
  const perimetro_m = hayMedidasValidas ? Math.PI * diametro_m : 0;
  const area_lamina_m2 = hayMedidasValidas ? perimetro_m * longitudNumero : 0;

  const hojaElegida =
    HOJAS_COMERCIALES.find((h) => h.valor === medida_hoja) || HOJAS_COMERCIALES[0];
  const cantidad_hojas = hayMedidasValidas
    ? Math.max(1, Math.ceil(area_lamina_m2 / hojaElegida.area_m2))
    : 0;

  // Si se borran las medidas mientras estaba abierta la pestaña de Planos, regresa a Cálculo
  useEffect(() => {
    if (!hayMedidasValidas && pestanaActiva === "planos") {
      setPestanaActiva("calculo");
    }
  }, [hayMedidasValidas, pestanaActiva]);

  // Subtotales y lista estructurada de materiales seleccionados
  const materialesConSubtotal = useMemo(
    () =>
      listaMateriales.map((mat) => {
        const cantEfectiva = mat.es_lamina
          ? cantidad_hojas
          : Math.max(0, parseFloat(mat.cantidad) || 0);
        const precioEfectivo = Math.max(0, parseFloat(mat.precio_unitario) || 0);
        const subtotal = mat.seleccionado
          ? Math.round(cantEfectiva * precioEfectivo * 100) / 100
          : 0;
        return {
          ...mat,
          cantidad_efectiva: cantEfectiva,
          precio_efectivo: precioEfectivo,
          subtotal,
        };
      }),
    [listaMateriales, cantidad_hojas]
  );

  const materiales_seleccionados = useMemo(
    () =>
      materialesConSubtotal
        .filter((m) => m.seleccionado && m.concepto.trim() !== "")
        .map((m) => ({
          clave: m.clave,
          concepto: m.es_lamina ? `${m.concepto} (${medida_hoja} m)` : m.concepto.trim(),
          unidad: m.unidad,
          cantidad: m.es_lamina ? Math.max(1, cantidad_hojas) : m.cantidad_efectiva,
          precio_unitario: m.precio_efectivo,
          subtotal: m.subtotal,
        })),
    [materialesConSubtotal, medida_hoja, cantidad_hojas]
  );

  const costo_total_materiales = useMemo(
    () =>
      Math.round(
        materialesConSubtotal.reduce((acc, m) => acc + (m.seleccionado ? m.subtotal : 0), 0) * 100
      ) / 100,
    [materialesConSubtotal]
  );

  const clienteSeleccionadoObj = useMemo(
    () => clientes.find((c) => String(c.id_cliente) === String(id_cliente)) || null,
    [clientes, id_cliente]
  );

  // ===== CARGA DE CLIENTES E HISTORIAL DESDE POSTGRESQL =====
  const cargarClientes = useCallback(async () => {
    try {
      const respuesta = await fetch(URL_API_CLIENTES);
      if (!respuesta.ok) return;
      const datos = await respuesta.json();
      if (Array.isArray(datos)) setClientes(datos);
    } catch {
      // Si el backend no está activo localmente, el desplegable permanece vacío sin romper la UI
    }
  }, []);

  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);
    try {
      const [resActivos, resPapelera] = await Promise.all([
        fetch(URL_API_CALCULOS),
        fetch(`${URL_API_CALCULOS}/papelera`),
      ]);
      if (!resActivos.ok || !resPapelera.ok) throw new Error();
      const [datosActivos, datosPapelera] = await Promise.all([
        resActivos.json(),
        resPapelera.json(),
      ]);
      setHistorial(Array.isArray(datosActivos) ? datosActivos : []);
      setPapelera(Array.isArray(datosPapelera) ? datosPapelera : []);
      setErrorHistorial("");
    } catch {
      setErrorHistorial("No se pudo conectar con el servidor para cargar el historial de medidas.");
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  useEffect(() => {
    cargarClientes();
    cargarHistorial();
  }, [cargarClientes, cargarHistorial]);

  // ===== MANEJADORES DE MODO Y MATERIALES =====
  const cambiarModoCalculo = (nuevoModo) => {
    if (nuevoModo === modo_calculo) return;
    if (nuevoModo === "por_capacidad" && radioManualNumero > 0 && longitudNumero > 0 && !litros_deseados) {
      const litrosCil = Math.PI * Math.pow(radioManualNumero, 2) * longitudNumero * 1000;
      setLitrosDeseados(litrosCil.toFixed(0));
    } else if (nuevoModo === "por_medidas" && radioCalculado > 0) {
      setRadioM(radioCalculado.toFixed(4));
    }
    setModoCalculo(nuevoModo);
    setMensajeError("");
  };

  const actualizarMaterial = (clave, cambios) => {
    setListaMateriales((prev) =>
      prev.map((item) => (item.clave === clave ? { ...item, ...cambios } : item))
    );
  };

  const agregarMaterialLibre = () => {
    const nuevaClave = `personalizado_${contadorExtra}`;
    setContadorExtra((c) => c + 1);
    setListaMateriales((prev) => [
      ...prev,
      {
        clave: nuevaClave,
        concepto: "",
        unidad: "pza",
        seleccionado: true,
        es_lamina: false,
        es_personalizado: true,
        cantidad: "1",
        precio_unitario: "",
      },
    ]);
  };

  const eliminarMaterialLibre = (clave) => {
    setListaMateriales((prev) => prev.filter((item) => item.clave !== clave));
  };

  function bloquearTeclasInvalidas(evento) {
    if (["-", "+", "e", "E"].includes(evento.key)) {
      evento.preventDefault();
    }
  }

  function manejarNumeroPositivo(setter) {
    return (evento) => {
      const valor = evento.target.value;
      if (valor === "") {
        setter("");
        setMensajeError("");
        return;
      }
      if (parseFloat(valor) < 0) return;
      setMensajeError("");
      setter(valor);
    };
  }

  function aplicarMedidaReferencia(preset) {
    setModoCalculo("por_medidas");
    setRadioM(preset.radio_m);
    setLongitudM(preset.longitud_m);
    setMensajeError("");
    setUltimoGuardado(null);
  }

  // ===== CREAR NUEVO CLIENTE EN POSTGRESQL (POST /api/clientes) =====
  async function manejarGuardarNuevoCliente(evento) {
    evento.preventDefault();
    if (!nuevoCliente.nombre_cliente.trim()) {
      setErrorCliente("Escribe el nombre o razón social del cliente.");
      return;
    }

    setGuardandoCliente(true);
    setErrorCliente("");
    try {
      const respuesta = await fetch(URL_API_CLIENTES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoCliente),
      });

      if (!respuesta.ok) {
        const txt = await respuesta.text();
        throw new Error(txt || "No se pudo registrar el cliente.");
      }

      const creado = await respuesta.json();
      setClientes((prev) => {
        const sinDuplicado = prev.filter((c) => c.id_cliente !== creado.id_cliente);
        return [...sinDuplicado, creado].sort((a, b) =>
          a.nombre_cliente.localeCompare(b.nombre_cliente, "es")
        );
      });
      setIdCliente(String(creado.id_cliente));
      setNuevoCliente({ nombre_cliente: "", rfc_cliente: "", telefono: "", correo: "" });
      setMostrandoNuevoCliente(false);
    } catch (err) {
      setErrorCliente(err.message || "Error de conexión al guardar el cliente.");
    } finally {
      setGuardandoCliente(false);
    }
  }

  // ===== GUARDAR MEDIDAS Y MATERIALES EN POSTGRESQL =====
  async function manejarGuardarCalculo(evento) {
    evento.preventDefault();

    if (!hayMedidasValidas) {
      setMensajeError(
        modo_calculo === "por_capacidad"
          ? "Ingresa los litros deseados y la longitud/altura en metros mayores a cero."
          : "Ingresa el radio y la longitud/altura en metros mayores a cero."
      );
      return;
    }

    setGuardando(true);
    setMensajeError("");
    setUltimoGuardado(null);

    const renglonLamina = materialesConSubtotal.find((m) => m.es_lamina);
    const precioHojaGuardar = renglonLamina ? renglonLamina.precio_efectivo : 0;
    const costoLaminaGuardar =
      renglonLamina && renglonLamina.seleccionado ? renglonLamina.subtotal : 0;

    const payload = {
      id_cliente: id_cliente ? parseInt(id_cliente, 10) : null,
      modo_calculo,
      litros_deseados: modo_calculo === "por_capacidad" ? Number(litrosDeseadosNumero.toFixed(2)) : 0,
      radio_m: Number(radioCalculado.toFixed(4)),
      longitud_m: Number(longitudNumero.toFixed(4)),
      tipo_fondo,
      diametro_m: Number(diametro_m.toFixed(4)),
      volumen_cilindro_m3: Number(volumen_cilindro_m3.toFixed(4)),
      volumen_fondo_m3: Number(volumen_fondo_m3.toFixed(4)),
      volumen_total_m3: Number(volumen_total_m3.toFixed(4)),
      litros_tanque: Number(litros_tanque.toFixed(2)),
      perimetro_m: Number(perimetro_m.toFixed(4)),
      area_lamina_m2: Number(area_lamina_m2.toFixed(4)),
      medida_hoja,
      cantidad_hojas,
      precio_hoja: Number(precioHojaGuardar.toFixed(2)),
      costo_total_lamina: Number(costoLaminaGuardar.toFixed(2)),
      materiales_json: materiales_seleccionados,
      costo_total_materiales: Number(costo_total_materiales.toFixed(2)),
      notas: notas.trim() || null,
    };

    try {
      const respuesta = await fetch(URL_API_CALCULOS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!respuesta.ok) {
        const textoError = await respuesta.text();
        throw new Error(textoError || `Error ${respuesta.status}: No se pudieron guardar los datos.`);
      }

      const guardado = await respuesta.json();
      setUltimoGuardado(guardado);
      setPestanaHistorial("guardados");
      setAvisoHistorial("");
      await cargarHistorial();
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

  async function descargarPdfMedidas(id_calculo) {
    setIdDescargandoPdf(id_calculo);
    setMensajeError("");
    try {
      const respuesta = await fetch(`${URL_API_CALCULOS}/${id_calculo}/pdf`);
      if (!respuesta.ok) {
        const texto = await respuesta.text();
        throw new Error(texto || `Error ${respuesta.status} al generar el PDF.`);
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

  async function moverCalculoAPapelera(item) {
    const etiquetaFolio = `CALC-${String(item.numero_folio || item.id_calculo).padStart(5, "0")}`;
    if (!window.confirm(`¿Deseas mover ${etiquetaFolio} a la papelera?`)) return;

    try {
      const respuesta = await fetch(`${URL_API_CALCULOS}/${item.id_calculo}/eliminar`, {
        method: "PATCH",
      });
      if (!respuesta.ok) throw new Error(await respuesta.text());
      if (ultimoGuardado?.id_calculo === item.id_calculo) setUltimoGuardado(null);
      setAvisoHistorial(`${etiquetaFolio} movido a la papelera.`);
      await cargarHistorial();
    } catch (error) {
      setErrorHistorial("No se pudo mover a la papelera: " + error.message);
    }
  }

  async function restaurarCalculoDePapelera(item) {
    try {
      const respuesta = await fetch(`${URL_API_CALCULOS}/${item.id_calculo}/restaurar`, {
        method: "PATCH",
      });
      if (!respuesta.ok) throw new Error(await respuesta.text());
      const restaurado = await respuesta.json();
      const folioNuevo = `CALC-${String(restaurado.numero_folio || restaurado.id_calculo).padStart(5, "0")}`;
      setAvisoHistorial(`Registro restaurado en Guardados como ${folioNuevo}.`);
      await cargarHistorial();
    } catch (error) {
      setErrorHistorial("No se pudo restaurar el registro: " + error.message);
    }
  }

  async function eliminarCalculoDefinitivo(item) {
    const etiquetaFolio = `CALC-${String(item.numero_folio || item.id_calculo).padStart(5, "0")}`;
    if (!window.confirm(`¿Eliminar ${etiquetaFolio} de forma permanente? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const respuesta = await fetch(`${URL_API_CALCULOS}/${item.id_calculo}`, {
        method: "DELETE",
      });
      if (!respuesta.ok) throw new Error(await respuesta.text());
      setAvisoHistorial(`${etiquetaFolio} eliminado permanentemente.`);
      await cargarHistorial();
    } catch (error) {
      setErrorHistorial("No se pudo eliminar definitivamente: " + error.message);
    }
  }

  // Permite cargar un registro del historial directamente en la calculadora y abrir sus planos
  function cargarRegistroEnCalculadora(registro, abrirPlanos = false) {
    setModoCalculo("por_medidas");
    setRadioM(String(registro.radio_m));
    setLongitudM(String(registro.longitud_m));
    setTipoFondo(registro.tipo_fondo || "Plano");
    setMedidaHoja(registro.medida_hoja || "1.22x2.44");
    setIdCliente(registro.id_cliente ? String(registro.id_cliente) : "");
    setNotas(registro.notas || "");

    if (Array.isArray(registro.materiales_json) && registro.materiales_json.length > 0) {
      const base = crearMaterialesIniciales().map((m) => ({ ...m, seleccionado: false }));
      const extras = [];
      registro.materiales_json.forEach((guardadoMat, idx) => {
        const existente = base.find((b) => b.clave === guardadoMat.clave);
        if (existente) {
          existente.seleccionado = true;
          if (!existente.es_lamina) existente.cantidad = String(guardadoMat.cantidad);
          existente.precio_unitario =
            guardadoMat.precio_unitario > 0 ? String(guardadoMat.precio_unitario) : "";
        } else {
          extras.push({
            clave: guardadoMat.clave || `personalizado_hist_${idx}`,
            concepto: guardadoMat.concepto,
            unidad: guardadoMat.unidad || "pza",
            seleccionado: true,
            es_lamina: false,
            es_personalizado: true,
            cantidad: String(guardadoMat.cantidad || 1),
            precio_unitario:
              guardadoMat.precio_unitario > 0 ? String(guardadoMat.precio_unitario) : "",
          });
        }
      });
      setListaMateriales([...base, ...extras]);
    }

    if (abrirPlanos) {
      setPestanaActiva("planos");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limpiarTodo() {
    setModoCalculo("por_medidas");
    setRadioM("");
    setLongitudM("");
    setLitrosDeseados("");
    setTipoFondo("Plano");
    setMedidaHoja("1.22x2.44");
    setListaMateriales(crearMaterialesIniciales());
    setIdCliente("");
    setNotas("");
    setMensajeError("");
    setUltimoGuardado(null);
    setPestanaActiva("calculo");
  }

  return (
    <div className="p-3 p-md-4">
      <div className="mx-auto" style={{ maxWidth: "1120px" }}>
        {/* ===== ENCABEZADO DEL MÓDULO ===== */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 no-imprimir-plano">
          <div>
            <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <Calculator size={24} strokeWidth={2.2} className="text-primary" />
              <span>Calculadora Técnica de Tanques Inoxidables</span>
            </h3>
            <p className="text-secondary small mb-0">
              Dimensionamiento geométrico, cuantificación de lámina/materiales y generación de planos CAD 1:1.
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

        {/* ===== BARRA DE PESTAÑAS ESTILO NAVEGADOR ===== */}
        <ul className="nav nav-tabs mb-4 border-bottom">
          <li className="nav-item">
            <button
              type="button"
              onClick={() => setPestanaActiva("calculo")}
              className={`nav-link d-inline-flex align-items-center gap-2 fw-semibold ${
                pestanaActiva === "calculo" ? "active text-primary" : "text-secondary"
              }`}
            >
              <Calculator size={16} />
              <span>1. Cálculo y Materiales</span>
            </button>
          </li>
          <li
            className="nav-item"
            title={
              hayMedidasValidas
                ? "Ver plano técnico paramétrico y exportar DXF/SVG"
                : "Ingresa medidas válidas (radio y longitud) para habilitar los planos"
            }
          >
            <button
              type="button"
              disabled={!hayMedidasValidas}
              onClick={() => hayMedidasValidas && setPestanaActiva("planos")}
              className={`nav-link d-inline-flex align-items-center gap-2 fw-semibold ${
                pestanaActiva === "planos"
                  ? "active text-primary"
                  : hayMedidasValidas
                  ? "text-dark"
                  : "disabled text-muted"
              }`}
              style={{ cursor: hayMedidasValidas ? "pointer" : "not-allowed" }}
            >
              {hayMedidasValidas ? <Layers size={16} /> : <ShieldCheck size={15} />}
              <span>2. Planos y Diseño</span>
              {!hayMedidasValidas && (
                <span className="badge text-bg-secondary fw-normal" style={{ fontSize: "0.68rem" }}>
                  Requiere medidas
                </span>
              )}
            </button>
          </li>
        </ul>

        {/* ================================================================= */}
        {/* PESTAÑA 2: PLANOS Y DISEÑO (COMPONENTE SEPARADO Planos.jsx)       */}
        {/* ================================================================= */}
        {pestanaActiva === "planos" && hayMedidasValidas && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Planos
              radio_m={radioCalculado}
              longitud_m={longitudNumero}
              diametro_m={diametro_m}
              volumen_cilindro_m3={volumen_cilindro_m3}
              volumen_fondo_m3={volumen_fondo_m3}
              volumen_total_m3={volumen_total_m3}
              litros_tanque={litros_tanque}
              perimetro_m={perimetro_m}
              area_lamina_m2={area_lamina_m2}
              medida_hoja={medida_hoja}
              cantidad_hojas={cantidad_hojas}
              tipo_fondo={tipo_fondo}
              materiales_seleccionados={materiales_seleccionados}
              nombre_cliente={clienteSeleccionadoObj?.nombre_cliente || ""}
            />
          </motion.div>
        )}

        {/* ================================================================= */}
        {/* PESTAÑA 1: CÁLCULO Y MATERIALES (3 BLOQUES LÓGICOS + HISTORIAL)   */}
        {/* ================================================================= */}
        {pestanaActiva === "calculo" && (
          <form onSubmit={manejarGuardarCalculo}>
            {/* ===== BLOQUE 1: DIMENSIONAMIENTO GEOMÉTRICO ===== */}
            <div className="p-4 mb-3" style={ESTILO_TARJETA}>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <Settings2 size={19} className="text-primary" />
                  <span>Bloque 1 — Dimensionamiento Geométrico</span>
                </h5>

                {/* Selector de modo de cálculo */}
                <div className="btn-group btn-group-sm" role="group" aria-label="Modo de cálculo">
                  <button
                    type="button"
                    onClick={() => cambiarModoCalculo("por_medidas")}
                    className={`btn fw-semibold ${
                      modo_calculo === "por_medidas" ? "btn-primary" : "btn-outline-primary"
                    }`}
                  >
                    Por medidas (r y L)
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarModoCalculo("por_capacidad")}
                    className={`btn fw-semibold ${
                      modo_calculo === "por_capacidad" ? "btn-primary" : "btn-outline-primary"
                    }`}
                  >
                    Por capacidad deseada (Lts y L)
                  </button>
                </div>
              </div>

              <div className="row g-3 mb-4">
                {modo_calculo === "por_medidas" ? (
                  <div className="col-md-4">
                    <label htmlFor="input-radio-m" className="form-label fw-semibold small text-dark mb-1">
                      Radio del tanque (m) <span className="text-danger">*</span>
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
                        onChange={manejarNumeroPositivo(setRadioM)}
                        placeholder="Ej. 0.51"
                      />
                      <span className="input-group-text">m</span>
                    </div>
                  </div>
                ) : (
                  <div className="col-md-4">
                    <label htmlFor="input-litros-deseados" className="form-label fw-semibold small text-dark mb-1">
                      Capacidad deseada del cilindro (L) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        id="input-litros-deseados"
                        name="litros_deseados"
                        type="number"
                        min="1"
                        step="any"
                        className="form-control"
                        value={litros_deseados}
                        onKeyDown={bloquearTeclasInvalidas}
                        onChange={manejarNumeroPositivo(setLitrosDeseados)}
                        placeholder="Ej. 1000"
                      />
                      <span className="input-group-text">Litros</span>
                    </div>
                  </div>
                )}

                <div className="col-md-4">
                  <label htmlFor="input-longitud-m" className="form-label fw-semibold small text-dark mb-1">
                    Longitud / Altura comercial (m) <span className="text-danger">*</span>
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
                      onChange={manejarNumeroPositivo(setLongitudM)}
                      placeholder="Ej. 1.22"
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
              </div>

              {/* Contenedor de resultados geométricos en tiempo real + botón fx */}
              <div
                className="p-3 p-md-4 rounded-4"
                style={{ background: "#f8fafc", border: "1px solid #cbd5e1" }}
              >
                <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                  <div className="d-flex align-items-center flex-wrap gap-2">
                    <Calculator size={17} strokeWidth={2} className="text-primary" />
                    <span className="fw-bold text-dark small text-uppercase">
                      Resultados Geométricos en Tiempo Real
                    </span>
                    {modo_calculo === "por_capacidad" && hayMedidasValidas && (
                      <span className="badge text-bg-primary">
                        Radio despejado: r = {formatearMedida(radioCalculado, 4)} m
                      </span>
                    )}
                  </div>

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
                    <div className="fw-semibold text-primary mb-2">
                      Fórmulas matemáticas activas (Fondo: {tipo_fondo}):
                    </div>
                    <div className="row g-2 text-secondary">
                      {modo_calculo === "por_capacidad" && (
                        <div className="col-12 text-dark bg-light p-2 rounded border-start border-3 border-primary">
                          <strong>Despeje de radio:</strong> r = √(V / (π · L)), donde V = litros_deseados / 1,000
                        </div>
                      )}
                      <div className="col-sm-6 col-md-4">
                        <strong className="text-dark">Diámetro:</strong> D = 2 · r
                      </div>
                      <div className="col-sm-6 col-md-4">
                        <strong className="text-dark">Vol. cilindro:</strong> V_cil = π · r² · L
                      </div>
                      <div className="col-sm-12 col-md-4">
                        <strong className="text-dark">Vol. fondo ({tipo_fondo}):</strong>{" "}
                        {tipo_fondo === "Plano" && "V_fondo = 0"}
                        {tipo_fondo === "Cónico" && "V_fondo = (1/3) · π · r² · h_c  (h_c = 0.25·D)"}
                        {tipo_fondo === "Toriesférico" && "V_fondo = 0.0847 · D³  (ASME F&D)"}
                      </div>
                      <div className="col-sm-6 col-md-4">
                        <strong className="text-dark">Vol. total:</strong> V_total = V_cil + V_fondo
                      </div>
                      <div className="col-sm-6 col-md-4">
                        <strong className="text-dark">Desarrollo:</strong> P = π · D
                      </div>
                      <div className="col-sm-6 col-md-4">
                        <strong className="text-dark">Área cuerpo:</strong> A = P · L
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="row g-2 g-md-3">
                  <div className="col-6 col-md-3">
                    <div className="bg-white rounded-3 p-2 px-3 border h-100">
                      <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                        Diámetro
                      </span>
                      <strong className="text-dark fs-6">{formatearMedida(diametro_m, 4)} m</strong>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="bg-white rounded-3 p-2 px-3 border h-100">
                      <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                        Volumen cilindro
                      </span>
                      <strong className="text-dark fs-6">{formatearMedida(volumen_cilindro_m3, 4)} m³</strong>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="bg-white rounded-3 p-2 px-3 border h-100">
                      <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                        Volumen fondo ({tipo_fondo})
                      </span>
                      <strong className="text-dark fs-6">{formatearMedida(volumen_fondo_m3, 4)} m³</strong>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="bg-white rounded-3 p-2 px-3 border h-100">
                      <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                        Volumen total
                      </span>
                      <strong className="text-dark fs-6">{formatearMedida(volumen_total_m3, 4)} m³</strong>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div
                      className="rounded-3 p-2 px-3 border h-100"
                      style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}
                    >
                      <span className="text-primary d-block fw-semibold" style={{ fontSize: "0.75rem" }}>
                        Capacidad total (litros_tanque)
                      </span>
                      <strong className="text-primary fs-5">{formatearMedida(litros_tanque, 2)} L</strong>
                    </div>
                  </div>

                  <div className="col-6 col-md-4">
                    <div className="bg-white rounded-3 p-2 px-3 border h-100">
                      <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                        Desarrollo de lámina
                      </span>
                      <strong className="text-dark fs-6">{formatearMedida(perimetro_m, 4)} m</strong>
                    </div>
                  </div>

                  <div className="col-6 col-md-4">
                    <div className="bg-white rounded-3 p-2 px-3 border h-100">
                      <span className="text-secondary d-block" style={{ fontSize: "0.75rem" }}>
                        Área del cuerpo
                      </span>
                      <strong className="text-dark fs-6">{formatearMedida(area_lamina_m2, 4)} m²</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== MEDIDAS RÁPIDAS DE REFERENCIA (DEBAJO DEL BLOQUE 1) ===== */}
            <div className="p-3 p-md-4 mb-4" style={ESTILO_TARJETA}>
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                <div className="d-flex align-items-center gap-2">
                  <Layers size={18} className="text-primary" />
                  <h6 className="fw-bold text-dark mb-0">Medidas rápidas de referencia</h6>
                  <span className="text-secondary small d-none d-sm-inline">
                    (basadas en alturas comerciales de hoja)
                  </span>
                </div>
                {hayMedidasValidas && (
                  <button
                    type="button"
                    onClick={() => setPestanaActiva("planos")}
                    className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                  >
                    <Layers size={14} />
                    <span>Ver Plano Técnico CAD</span>
                  </button>
                )}
              </div>

              <div className="row g-2 mt-1">
                {MEDIDAS_REFERENCIA.map((preset) => {
                  const activo =
                    modo_calculo === "por_medidas" &&
                    radio_m === preset.radio_m &&
                    longitud_m === preset.longitud_m;
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

            {/* ===== BLOQUE 2: MATERIALES Y COSTEO DE FABRICACIÓN ===== */}
            <div className="p-4 mb-4" style={ESTILO_TARJETA}>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <Layers size={19} className="text-primary" />
                    <span>Bloque 2 — Materiales y Costeo de Fabricación</span>
                  </h5>
                  <p className="text-secondary small mb-0">
                    Marca los insumos requeridos e ingresa el costo unitario vigente de tu proveedor.
                  </p>
                </div>

                <div style={{ minWidth: "280px" }}>
                  <label htmlFor="select-medida-hoja" className="form-label fw-semibold small text-dark mb-1">
                    Formato de hoja comercial
                  </label>
                  <select
                    id="select-medida-hoja"
                    name="medida_hoja"
                    className="form-select form-select-sm"
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
              </div>

              <div className="table-responsive">
                <table className="table align-middle mb-2 small">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "42px" }}>Usar</th>
                      <th>Material / Concepto de Fabricación</th>
                      <th style={{ width: "140px" }}>Cantidad</th>
                      <th style={{ width: "190px" }}>Precio Unitario (MXN)</th>
                      <th className="text-end" style={{ width: "150px" }}>Subtotal</th>
                      <th style={{ width: "44px" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {materialesConSubtotal.map((mat) => (
                      <tr
                        key={mat.clave}
                        className={mat.seleccionado ? "" : "opacity-50"}
                        style={mat.seleccionado ? { background: "#fcfdff" } : undefined}
                      >
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={mat.seleccionado}
                            onChange={(e) =>
                              actualizarMaterial(mat.clave, { seleccionado: e.target.checked })
                            }
                          />
                        </td>

                        <td>
                          {mat.es_personalizado ? (
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Escribe el concepto del material..."
                              value={mat.concepto}
                              onChange={(e) =>
                                actualizarMaterial(mat.clave, {
                                  concepto: e.target.value,
                                  seleccionado: true,
                                })
                              }
                            />
                          ) : (
                            <div>
                              <span className="fw-semibold text-dark">{mat.concepto}</span>
                              {mat.es_lamina && (
                                <span className="badge text-bg-info-subtle text-primary border ms-2">
                                  Vinculado a {medida_hoja}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td>
                          {mat.es_lamina ? (
                            <div className="input-group input-group-sm">
                              <input
                                type="text"
                                className="form-control bg-light fw-bold text-primary"
                                value={cantidad_hojas}
                                readOnly
                                title="Calculado automáticamente según el área del cuerpo y la hoja comercial"
                              />
                              <span className="input-group-text">hojas</span>
                            </div>
                          ) : (
                            <div className="input-group input-group-sm">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                disabled={!mat.seleccionado}
                                className="form-control"
                                value={mat.cantidad}
                                onKeyDown={bloquearTeclasInvalidas}
                                onChange={(e) =>
                                  actualizarMaterial(mat.clave, { cantidad: e.target.value })
                                }
                              />
                              <span className="input-group-text">{mat.unidad}</span>
                            </div>
                          )}
                        </td>

                        <td>
                          <div className="input-group input-group-sm">
                            <span className="input-group-text">$</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              disabled={!mat.seleccionado}
                              className="form-control"
                              placeholder="0.00"
                              value={mat.precio_unitario}
                              onKeyDown={bloquearTeclasInvalidas}
                              onChange={(e) =>
                                actualizarMaterial(mat.clave, { precio_unitario: e.target.value })
                              }
                            />
                          </div>
                        </td>

                        <td className="text-end fw-bold text-dark">
                          {mat.seleccionado ? formatearMoneda(mat.subtotal) : "—"}
                        </td>

                        <td className="text-end">
                          {mat.es_personalizado && (
                            <button
                              type="button"
                              onClick={() => eliminarMaterialLibre(mat.clave)}
                              className="btn btn-link btn-sm text-danger p-1"
                              title="Quitar material"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 pt-2 border-top">
                <button
                  type="button"
                  onClick={agregarMaterialLibre}
                  className="btn btn-outline-primary btn-sm fw-semibold d-inline-flex align-items-center gap-1"
                >
                  <span>+ Agregar otro material</span>
                </button>

                <div className="d-flex align-items-center gap-3 bg-light border rounded-3 px-3 py-2">
                  <span className="fw-semibold text-secondary small text-uppercase">
                    Costo total de materiales:
                  </span>
                  <span className="fs-5 fw-bold text-primary">
                    {formatearMoneda(costo_total_materiales)}
                  </span>
                </div>
              </div>
            </div>

            {/* ===== BLOQUE 3: INFORMACIÓN ADICIONAL PARA GUARDAR (OPCIONAL) ===== */}
            <div className="p-4 mb-4" style={ESTILO_TARJETA}>
              <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                <Building2 size={19} className="text-primary" />
                <span>Bloque 3 — Información Adicional para Guardar</span>
                <span className="badge text-bg-light border text-secondary fw-normal small">
                  Opcional
                </span>
              </h5>
              <p className="text-secondary small mb-3">
                Vincula este cálculo a un cliente registrado en PostgreSQL o agrega notas técnicas antes de guardar.
              </p>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label htmlFor="select-id-cliente" className="form-label fw-semibold small text-dark mb-0">
                      Cliente
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMostrandoNuevoCliente((v) => !v);
                        setErrorCliente("");
                      }}
                      className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold d-inline-flex align-items-center gap-1"
                    >
                      <User size={14} />
                      <span>{mostrandoNuevoCliente ? "Cancelar" : "+ Nuevo cliente"}</span>
                    </button>
                  </div>

                  <select
                    id="select-id-cliente"
                    name="id_cliente"
                    className="form-select"
                    value={id_cliente}
                    onChange={(e) => setIdCliente(e.target.value)}
                  >
                    <option value="">— Sin cliente específico (uso interno) —</option>
                    {clientes.map((cl) => (
                      <option key={cl.id_cliente} value={cl.id_cliente}>
                        {cl.nombre_cliente}
                        {cl.rfc_cliente ? ` (${cl.rfc_cliente})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label htmlFor="input-notas" className="form-label fw-semibold small text-dark mb-1">
                    Notas adicionales
                  </label>
                  <input
                    id="input-notas"
                    name="notas"
                    type="text"
                    className="form-control"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Ej. Calibre 12, acabado sanitario espejo, entrega en planta..."
                  />
                </div>
              </div>

              {/* Formulario inline para registrar + Nuevo cliente en PostgreSQL */}
              {mostrandoNuevoCliente && (
                <div className="bg-light border rounded-3 p-3 mb-3">
                  <h6 className="fw-bold text-dark small mb-2">Registrar nuevo cliente en catálogo</h6>
                  <div className="row g-2">
                    <div className="col-md-4">
                      <input
                        type="text"
                        maxLength={150}
                        className="form-control form-control-sm"
                        placeholder="Razón social / Nombre *"
                        value={nuevoCliente.nombre_cliente}
                        onChange={(e) =>
                          setNuevoCliente((prev) => ({ ...prev, nombre_cliente: e.target.value }))
                        }
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        type="text"
                        maxLength={20}
                        className="form-control form-control-sm"
                        placeholder="RFC (opcional)"
                        value={nuevoCliente.rfc_cliente}
                        onChange={(e) =>
                          setNuevoCliente((prev) => ({ ...prev, rfc_cliente: e.target.value }))
                        }
                      />
                    </div>
                    <div className="col-md-2">
                      <input
                        type="text"
                        maxLength={20}
                        className="form-control form-control-sm"
                        placeholder="Teléfono"
                        value={nuevoCliente.telefono}
                        onChange={(e) =>
                          setNuevoCliente((prev) => ({ ...prev, telefono: e.target.value }))
                        }
                      />
                    </div>
                    <div className="col-md-3 d-flex gap-2">
                      <input
                        type="email"
                        maxLength={150}
                        className="form-control form-control-sm"
                        placeholder="Correo"
                        value={nuevoCliente.correo}
                        onChange={(e) =>
                          setNuevoCliente((prev) => ({ ...prev, correo: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        disabled={guardandoCliente}
                        onClick={manejarGuardarNuevoCliente}
                        className="btn btn-success btn-sm text-nowrap"
                      >
                        {guardandoCliente ? "..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                  {errorCliente && <div className="text-danger small mt-2">{errorCliente}</div>}
                </div>
              )}

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
                      Guardado en PostgreSQL como{" "}
                      <strong>
                        CALC-{String(ultimoGuardado.numero_folio || ultimoGuardado.id_calculo).padStart(5, "0")}
                      </strong>
                      {ultimoGuardado.nombre_cliente ? ` • ${ultimoGuardado.nombre_cliente}` : ""}.
                    </span>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPestanaActiva("planos")}
                      className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1"
                    >
                      <Layers size={14} />
                      <span>Ver Planos</span>
                    </button>
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
                      <span>Guardando en PostgreSQL...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 size={18} />
                      <span>Guardar medidas y materiales</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={limpiarTodo}
                  className="btn btn-outline-secondary px-3 py-2 d-inline-flex align-items-center gap-2"
                >
                  <RotateCcw size={16} />
                  <span>Reiniciar formulario</span>
                </button>
              </div>
            </div>

            {/* ===== HISTORIAL DE MEDIDAS GUARDADAS Y PAPELERA ===== */}
            <div className="p-3 p-md-4" style={ESTILO_TARJETA}>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <History size={19} className="text-primary" />
                  <div>
                    <h5 className="fw-bold text-dark mb-0">Historial de Medidas y Materiales Guardados</h5>
                    <small className="text-secondary">
                      Los folios liberados se reutilizan automáticamente empezando desde el menor disponible.
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

              {/* Pestañas estilo navegador: Guardados y Papelera */}
              <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                  <button
                    type="button"
                    onClick={() => {
                      setPestanaHistorial("guardados");
                      setAvisoHistorial("");
                    }}
                    className={`nav-link d-inline-flex align-items-center gap-2 fw-semibold ${
                      pestanaHistorial === "guardados" ? "active text-primary" : "text-secondary"
                    }`}
                  >
                    <FileCheck2 size={15} />
                    <span>Guardados</span>
                    <span className="badge text-bg-light border text-dark">{historial.length}</span>
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    onClick={() => {
                      setPestanaHistorial("papelera");
                      setAvisoHistorial("");
                    }}
                    className={`nav-link d-inline-flex align-items-center gap-2 fw-semibold ${
                      pestanaHistorial === "papelera" ? "active text-danger" : "text-secondary"
                    }`}
                  >
                    <Trash2 size={15} />
                    <span>Papelera</span>
                    <span className="badge text-bg-light border text-dark">{papelera.length}</span>
                  </button>
                </li>
              </ul>

              {avisoHistorial && (
                <div className="alert alert-info py-2 small mb-3">{avisoHistorial}</div>
              )}

              {errorHistorial && (
                <div className="alert alert-warning py-2 small mb-3">{errorHistorial}</div>
              )}

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>Folio / Fecha</th>
                      <th>Cliente / Notas</th>
                      <th>Geometría y Fondo</th>
                      <th>Capacidad Total</th>
                      <th>Lámina</th>
                      <th>Costo Materiales</th>
                      <th className="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargandoHistorial && (
                      <tr>
                        <td colSpan="7" className="text-center text-secondary py-4">
                          Cargando registros...
                        </td>
                      </tr>
                    )}

                    {!cargandoHistorial &&
                      (pestanaHistorial === "guardados" ? historial : papelera).map((item) => (
                        <tr key={item.id_calculo}>
                          <td className="text-nowrap">
                            <div className="fw-bold text-dark">
                              CALC-{String(item.numero_folio || item.id_calculo).padStart(5, "0")}
                            </div>
                            <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                              {formatearFecha(item.fecha_creacion)}
                            </div>
                          </td>

                          <td>
                            <div className="fw-semibold text-dark">
                              {item.nombre_cliente ||
                                item.nombre_referencia || (
                                  <span className="text-secondary fw-normal">Uso interno</span>
                                )}
                            </div>
                            {item.notas && (
                              <div
                                className="text-secondary text-truncate"
                                style={{ maxWidth: "210px", fontSize: "0.75rem" }}
                                title={item.notas}
                              >
                                {item.notas}
                              </div>
                            )}
                          </td>

                          <td className="text-nowrap">
                            <div>
                              Ø {formatearMedida(item.diametro_m, 3)} m × L{" "}
                              {formatearMedida(item.longitud_m, 3)} m
                            </div>
                            <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                              Fondo: <strong>{item.tipo_fondo}</strong>
                            </div>
                          </td>

                          <td className="text-nowrap">
                            <div className="fw-bold text-primary">
                              {formatearMedida(item.litros_tanque, 2)} L
                            </div>
                            <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                              {formatearMedida(item.volumen_total_m3 || item.volumen_m3, 4)} m³
                            </div>
                          </td>

                          <td className="text-nowrap">
                            <span className="badge text-bg-success-subtle text-success border border-success-subtle">
                              {item.cantidad_hojas} {item.cantidad_hojas === 1 ? "hoja" : "hojas"} ({item.medida_hoja})
                            </span>
                            <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                              Área: {formatearMedida(item.area_lamina_m2, 2)} m²
                            </div>
                          </td>

                          <td className="text-nowrap">
                            <div className="fw-bold text-dark">
                              {item.costo_total_materiales > 0
                                ? formatearMoneda(item.costo_total_materiales)
                                : "—"}
                            </div>
                            <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                              {Array.isArray(item.materiales_json) && item.materiales_json.length > 0
                                ? `${item.materiales_json.length} insumo(s)`
                                : "Solo dimensionamiento"}
                            </div>
                          </td>

                          <td className="text-end text-nowrap">
                            {pestanaHistorial === "guardados" ? (
                              <div className="d-inline-flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => cargarRegistroEnCalculadora(item, true)}
                                  className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                                  title="Cargar en calculadora y abrir plano CAD"
                                >
                                  <Eye size={14} />
                                  <span>Plano</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => descargarPdfMedidas(item.id_calculo)}
                                  disabled={idDescargandoPdf === item.id_calculo}
                                  className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                                >
                                  {idDescargandoPdf === item.id_calculo ? (
                                    <>
                                      <Loader2 size={14} className="mb-spinner" />
                                      <span>PDF...</span>
                                    </>
                                  ) : (
                                    <>
                                      <FileDown size={14} />
                                      <span>Descargar PDF de Medidas</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moverCalculoAPapelera(item)}
                                  className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1"
                                  title="Mover a la papelera"
                                >
                                  <Trash2 size={14} />
                                  <span>Borrar</span>
                                </button>
                              </div>
                            ) : (
                              <div className="d-inline-flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => restaurarCalculoDePapelera(item)}
                                  className="btn btn-outline-success btn-sm d-inline-flex align-items-center gap-1"
                                >
                                  <RotateCcw size={14} />
                                  <span>Restaurar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => eliminarCalculoDefinitivo(item)}
                                  className="btn btn-danger btn-sm d-inline-flex align-items-center gap-1"
                                >
                                  <AlertTriangle size={14} />
                                  <span>Eliminar definitivo</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}

                    {!cargandoHistorial &&
                      (pestanaHistorial === "guardados" ? historial : papelera).length === 0 && (
                        <tr>
                          <td colSpan="7" className="text-center text-secondary py-4">
                            {pestanaHistorial === "guardados"
                              ? "Aún no hay cálculos guardados activos."
                              : "La papelera está vacía."}
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default FormularioCotizacion;
