import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  RotateCcw,
  FileCheck2,
  FileText,
  FileDown,
  Layers,
  Calendar,
  Calculator,
  Clock,
} from "lucide-react";
import { URL_BASE } from "../api";

const URL_PROYECTOS = `${URL_BASE}/api/proyectos_venta`;
const URL_CLIENTES = `${URL_BASE}/api/clientes`;
const URL_CALCULOS = `${URL_BASE}/api/calculos_tanques`;

export const SECTORES_LUXMAN = [
  "Agroalimentaria",
  "Farmacéutica",
  "Cosmética",
  "Química",
  "Tratamiento de Aguas",
  "Otro",
];

// Catálogos fiscales estándar SAT México (CFDI 4.0)
const CATALOGO_USO_CFDI = [
  "I08 - Otra maquinaria y equipo",
  "G03 - Gastos en general",
  "G01 - Adquisición de mercancías",
  "I01 - Construcciones",
  "S01 - Sin efectos fiscales",
];

const CATALOGO_REGIMEN_FISCAL = [
  "601 - General de Ley Personas Morales",
  "612 - Personas Físicas con Actividades Empresariales y Profesionales",
  "626 - Régimen Simplificado de Confianza",
  "603 - Personas Morales con Fines no Lucrativos",
  "616 - Sin obligaciones fiscales",
];

const CATALOGO_METODO_PAGO = [
  { valor: "PUE", texto: "PUE - Pago en una sola exhibición" },
  { valor: "PPD", texto: "PPD - Pago en parcialidades o diferido" },
];

const CATALOGO_FORMA_PAGO = [
  "03 - Transferencia electrónica",
  "02 - Cheque nominativo",
  "04 - Tarjeta de crédito",
  "28 - Tarjeta de débito",
  "01 - Efectivo",
  "99 - Por definir",
];

// Los 5 pasos productivos para la barra de progreso visual una vez aprobada la venta
const PASOS_FABRICACION = [
  "Aprobado / Anticipo Recibido",
  "En Fabricación (Corte y Rolado)",
  "Soldadura y Pulido Sanitario",
  "Listo para Entrega",
  "Entregado",
];

const formatearMoneda = (cantidad) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cantidad || 0);

const formatearFechaCorta = (fechaTexto) => {
  if (!fechaTexto) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) {
    const [anio, mes, dia] = fechaTexto.split("-");
    return `${dia}/${mes}/${anio}`;
  }
  const iso = fechaTexto.endsWith("Z") ? fechaTexto : `${fechaTexto}Z`;
  return new Date(iso).toLocaleDateString("es-MX", { dateStyle: "short" });
};

function obtenerIndicePaso(etapa_fabricacion) {
  const idx = PASOS_FABRICACION.indexOf(etapa_fabricacion);
  return idx >= 0 ? idx + 1 : 0;
}

function obtenerMetaEstadoFacturacion(estado_facturacion) {
  const estado = (estado_facturacion || "PENDIENTE").toUpperCase();
  if (estado === "FACTURADO_TOTAL") {
    return { clase: "text-bg-success", etiqueta: "Facturado 100%" };
  }
  if (estado === "ANTICIPO_FACTURADO") {
    return { clase: "text-bg-info text-dark", etiqueta: "Anticipo Facturado" };
  }
  return { clase: "text-bg-warning text-dark", etiqueta: "Facturación Pendiente" };
}

function VentasProyectos({ borradorInicial, alConsumirBorrador }) {
  const [proyectos, setProyectos] = useState([]);
  const [papelera, setPapelera] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [calculos, setCalculos] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const [pestanaVista, setPestanaVista] = useState("activos"); // 'activos' | 'papelera'
  const [filtroEstado, setFiltroEstado] = useState("TODOS"); // 'TODOS' | 'COTIZADO' | 'APROBADO' | 'RECHAZADO'

  // Formulario para crear proyecto / cotización
  const [mostrarFormularioNuevo, setMostrarFormularioNuevo] = useState(false);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [formProyecto, setFormProyecto] = useState({
    id_cliente: "",
    id_solicitud: null,
    id_calculo: "",
    nombre_proyecto: "",
    sector: "Agroalimentaria",
    monto_cotizado: "",
  });

  // Modal de Cierre de Venta (Aprobar)
  const [proyectoEnCierre, setProyectoEnCierre] = useState(null);
  const [procesandoCierre, setProcesandoCierre] = useState(false);
  const [errorModalCierre, setErrorModalCierre] = useState("");
  const [formCierre, setFormCierre] = useState({
    porcentaje_anticipo: "50",
    rfc_facturacion: "",
    razon_social_facturacion: "",
    fecha_compromiso_entrega: "",
  });

  // Modal de Facturación Fiscal (Anticipo o 100% del proyecto)
  const [proyectoEnFacturacion, setProyectoEnFacturacion] = useState(null);
  const [procesandoFactura, setProcesandoFactura] = useState(false);
  const [idDescargandoFactura, setIdDescargandoFactura] = useState(null);
  const [errorModalFactura, setErrorModalFactura] = useState("");
  const [formFactura, setFormFactura] = useState({
    rfc_facturacion: "",
    razon_social_facturacion: "",
    regimen_fiscal: CATALOGO_REGIMEN_FISCAL[0],
    uso_cfdi: CATALOGO_USO_CFDI[0],
    metodo_pago: "PUE",
    forma_pago: CATALOGO_FORMA_PAGO[0],
    estado_facturacion: "FACTURADO_TOTAL",
  });

  const cargarTodo = useCallback(async () => {
    setCargando(true);
    try {
      const [resActivos, resPapelera, resClientes, resCalculos] = await Promise.all([
        fetch(URL_PROYECTOS),
        fetch(`${URL_PROYECTOS}/papelera`),
        fetch(URL_CLIENTES),
        fetch(URL_CALCULOS),
      ]);

      if (!resActivos.ok || !resPapelera.ok) {
        throw new Error("No se pudieron consultar los proyectos de venta.");
      }

      const [listaActivos, listaPapelera] = await Promise.all([
        resActivos.json(),
        resPapelera.json(),
      ]);

      setProyectos(Array.isArray(listaActivos) ? listaActivos : []);
      setPapelera(Array.isArray(listaPapelera) ? listaPapelera : []);

      if (resClientes.ok) {
        const datosCl = await resClientes.json();
        setClientes(Array.isArray(datosCl) ? datosCl : []);
      }
      if (resCalculos.ok) {
        const datosCalc = await resCalculos.json();
        setCalculos(Array.isArray(datosCalc) ? datosCalc : []);
      }

      setError("");
    } catch (err) {
      setError(err.message || "Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  // Si venimos desde "Convertir a Proyecto" en Solicitudes Clientes, precarga el formulario
  useEffect(() => {
    if (!borradorInicial) return;
    setPestanaVista("activos");
    setMostrarFormularioNuevo(true);
    setFormProyecto({
      id_cliente: borradorInicial.id_cliente ? String(borradorInicial.id_cliente) : "",
      id_solicitud: borradorInicial.id_solicitud || null,
      id_calculo: "",
      nombre_proyecto: borradorInicial.nombre_proyecto || "",
      sector: borradorInicial.sector || "Otro",
      monto_cotizado: "",
    });
    setAviso(
      "Solicitud vinculada. Revisa el nombre del proyecto, vincula un cálculo si lo deseas y asigna el monto cotizado."
    );
    if (alConsumirBorrador) alConsumirBorrador();
  }, [borradorInicial, alConsumirBorrador]);

  const calculoSeleccionadoObj = useMemo(
    () => calculos.find((c) => String(c.id_calculo) === String(formProyecto.id_calculo)) || null,
    [calculos, formProyecto.id_calculo]
  );

  const manejarSeleccionCliente = (idElegido) => {
    const cl = clientes.find((c) => String(c.id_cliente) === String(idElegido));
    setFormProyecto((prev) => ({
      ...prev,
      id_cliente: idElegido,
      sector: cl?.sector || prev.sector,
    }));
  };

  const manejarSeleccionCalculo = (idCalcElegido) => {
    const calc = calculos.find((c) => String(c.id_calculo) === String(idCalcElegido));
    setFormProyecto((prev) => {
      let nombreSugerido = prev.nombre_proyecto;
      if (calc && !nombreSugerido.trim()) {
        const litrosFmt = Math.round(Number(calc.litros_tanque || 0)).toLocaleString("es-MX");
        nombreSugerido = `Tanque ${litrosFmt} L Fondo ${calc.tipo_fondo}`;
      }
      return {
        ...prev,
        id_calculo: idCalcElegido,
        id_cliente: !prev.id_cliente && calc?.id_cliente ? String(calc.id_cliente) : prev.id_cliente,
        nombre_proyecto: nombreSugerido,
      };
    });
  };

  async function manejarCrearProyecto(evento) {
    evento.preventDefault();
    if (!formProyecto.nombre_proyecto.trim()) {
      setError("Ingresa el nombre o descripción del proyecto.");
      return;
    }

    const montoNum = parseFloat(formProyecto.monto_cotizado);
    if (isNaN(montoNum) || montoNum < 0) {
      setError("Ingresa un monto cotizado válido mayor o igual a cero.");
      return;
    }

    setGuardandoNuevo(true);
    setError("");
    try {
      const payload = {
        id_cliente: formProyecto.id_cliente ? parseInt(formProyecto.id_cliente, 10) : null,
        id_solicitud: formProyecto.id_solicitud || null,
        id_calculo: formProyecto.id_calculo ? parseInt(formProyecto.id_calculo, 10) : null,
        nombre_proyecto: formProyecto.nombre_proyecto.trim(),
        sector: formProyecto.sector,
        monto_cotizado: Number(montoNum.toFixed(2)),
      };

      const respuesta = await fetch(URL_PROYECTOS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!respuesta.ok) {
        throw new Error((await respuesta.text()) || "No se pudo registrar el proyecto.");
      }

      const creado = await respuesta.json();
      setAviso(`Proyecto creado exitosamente con folio ${creado.codigo_folio}.`);
      setFormProyecto({
        id_cliente: "",
        id_solicitud: null,
        id_calculo: "",
        nombre_proyecto: "",
        sector: "Agroalimentaria",
        monto_cotizado: "",
      });
      setMostrarFormularioNuevo(false);
      await cargarTodo();
    } catch (err) {
      setError(err.message || "Error al crear el proyecto.");
    } finally {
      setGuardandoNuevo(false);
    }
  }

  function abrirModalCerrarVenta(proyecto) {
    const cl = clientes.find((c) => c.id_cliente === proyecto.id_cliente);
    setProyectoEnCierre(proyecto);
    setErrorModalCierre("");
    setFormCierre({
      porcentaje_anticipo:
        proyecto.porcentaje_anticipo > 0 ? String(proyecto.porcentaje_anticipo) : "50",
      rfc_facturacion: proyecto.rfc_facturacion || cl?.rfc_cliente || "",
      razon_social_facturacion:
        proyecto.razon_social_facturacion || proyecto.nombre_cliente || cl?.nombre_cliente || "",
      fecha_compromiso_entrega: proyecto.fecha_compromiso_entrega || "",
    });
  }

  async function ejecutarAprobacionVenta(evento) {
    evento.preventDefault();
    if (!proyectoEnCierre) return;

    const pct = parseFloat(formCierre.porcentaje_anticipo);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setErrorModalCierre("El porcentaje de anticipo debe estar entre 0% y 100%.");
      return;
    }

    if (!formCierre.razon_social_facturacion.trim()) {
      setErrorModalCierre("Ingresa la razón social de facturación.");
      return;
    }

    if (!formCierre.fecha_compromiso_entrega) {
      setErrorModalCierre("Selecciona la fecha compromiso de entrega.");
      return;
    }

    setProcesandoCierre(true);
    setErrorModalCierre("");
    try {
      const respuesta = await fetch(
        `${URL_PROYECTOS}/${proyectoEnCierre.id_proyecto}/cerrar-venta`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estado_venta: "APROBADO",
            porcentaje_anticipo: pct,
            rfc_facturacion: formCierre.rfc_facturacion.trim() || null,
            razon_social_facturacion: formCierre.razon_social_facturacion.trim(),
            fecha_compromiso_entrega: formCierre.fecha_compromiso_entrega,
          }),
        }
      );

      if (!respuesta.ok) {
        throw new Error((await respuesta.text()) || "No se pudo aprobar la venta.");
      }

      const actualizado = await respuesta.json();
      setAviso(`Venta aprobada para ${actualizado.codigo_folio}. Anticipo registrado correctamente.`);
      setProyectoEnCierre(null);
      await cargarTodo();
    } catch (err) {
      setErrorModalCierre(err.message || "Error al aprobar la venta.");
    } finally {
      setProcesandoCierre(false);
    }
  }

  function abrirModalFacturacion(proyecto) {
    const cl = clientes.find((c) => c.id_cliente === proyecto.id_cliente);
    const estadoFactActual = (proyecto.estado_facturacion || "PENDIENTE").toUpperCase();

    let alcanceSugerido = "FACTURADO_TOTAL";
    if (estadoFactActual === "ANTICIPO_FACTURADO") {
      alcanceSugerido = "ANTICIPO_FACTURADO";
    } else if (
      estadoFactActual === "PENDIENTE" &&
      Number(proyecto.monto_anticipo || 0) > 0 &&
      proyecto.etapa_fabricacion !== "Entregado" &&
      proyecto.etapa_fabricacion !== "Listo para Entrega"
    ) {
      alcanceSugerido = "ANTICIPO_FACTURADO";
    }

    setProyectoEnFacturacion(proyecto);
    setErrorModalFactura("");
    setFormFactura({
      rfc_facturacion: proyecto.rfc_facturacion || cl?.rfc_cliente || "",
      razon_social_facturacion:
        proyecto.razon_social_facturacion || proyecto.nombre_cliente || cl?.nombre_cliente || "",
      regimen_fiscal: proyecto.regimen_fiscal || CATALOGO_REGIMEN_FISCAL[0],
      uso_cfdi: proyecto.uso_cfdi || CATALOGO_USO_CFDI[0],
      metodo_pago:
        proyecto.metodo_pago || (alcanceSugerido === "ANTICIPO_FACTURADO" ? "PPD" : "PUE"),
      forma_pago: proyecto.forma_pago || CATALOGO_FORMA_PAGO[0],
      estado_facturacion: alcanceSugerido,
    });
  }

  async function ejecutarFacturacion(evento) {
    evento.preventDefault();
    if (!proyectoEnFacturacion) return;

    if (!formFactura.rfc_facturacion.trim()) {
      setErrorModalFactura("Ingresa el RFC del receptor para emitir la factura.");
      return;
    }

    if (!formFactura.razon_social_facturacion.trim()) {
      setErrorModalFactura("Ingresa la razón social del receptor.");
      return;
    }

    setProcesandoFactura(true);
    setErrorModalFactura("");
    try {
      const respuesta = await fetch(
        `${URL_PROYECTOS}/${proyectoEnFacturacion.id_proyecto}/facturar`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rfc_facturacion: formFactura.rfc_facturacion.trim().toUpperCase(),
            razon_social_facturacion: formFactura.razon_social_facturacion.trim(),
            regimen_fiscal: formFactura.regimen_fiscal,
            uso_cfdi: formFactura.uso_cfdi,
            metodo_pago: formFactura.metodo_pago,
            forma_pago: formFactura.forma_pago,
            estado_facturacion: formFactura.estado_facturacion,
          }),
        }
      );

      if (!respuesta.ok) {
        throw new Error((await respuesta.text()) || "No se pudo registrar la factura.");
      }

      const actualizado = await respuesta.json();
      setProyectos((prev) =>
        prev.map((p) => (p.id_proyecto === actualizado.id_proyecto ? actualizado : p))
      );
      setProyectoEnFacturacion(actualizado);
      setAviso(
        `Factura ${actualizado.folio_factura} registrada exitosamente para ${actualizado.codigo_folio}.`
      );
    } catch (err) {
      setErrorModalFactura(err.message || "Error al generar la factura.");
    } finally {
      setProcesandoFactura(false);
    }
  }

  // Abre el PDF de la factura en una pestaña nueva usando Blob para conservar intacta la sesión móvil en /directivo
  async function descargarFacturaPdf(proyecto) {
    const pestanaNueva = window.open("", "_blank");
    setIdDescargandoFactura(proyecto.id_proyecto);
    setError("");
    try {
      const respuesta = await fetch(`${URL_PROYECTOS}/${proyecto.id_proyecto}/factura-pdf`);
      if (!respuesta.ok) {
        throw new Error((await respuesta.text()) || "No se pudo generar el PDF de la factura.");
      }

      const blob = await respuesta.blob();
      const urlBlob = URL.createObjectURL(blob);
      const nombreArchivo = `${proyecto.folio_factura || `Factura_${proyecto.codigo_folio}`}.pdf`;

      if (pestanaNueva) {
        pestanaNueva.location.href = urlBlob;
      } else {
        const enlace = document.createElement("a");
        enlace.href = urlBlob;
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
      }

      setTimeout(() => URL.revokeObjectURL(urlBlob), 60000);
    } catch (err) {
      if (pestanaNueva) pestanaNueva.close();
      setError(err.message || "No se pudo descargar el PDF de la factura.");
    } finally {
      setIdDescargandoFactura(null);
    }
  }

  async function rechazarProyecto(proyecto) {
    if (!window.confirm(`¿Marcar el proyecto ${proyecto.codigo_folio} como RECHAZADO?`)) return;
    try {
      const respuesta = await fetch(`${URL_PROYECTOS}/${proyecto.id_proyecto}/cerrar-venta`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado_venta: "RECHAZADO" }),
      });
      if (!respuesta.ok) throw new Error(await respuesta.text());
      setAviso(`Proyecto ${proyecto.codigo_folio} marcado como RECHAZADO.`);
      await cargarTodo();
    } catch (err) {
      setError("No se pudo actualizar el estado: " + err.message);
    }
  }

  async function cambiarEtapaFabricacion(proyecto, nuevaEtapa) {
    if (nuevaEtapa === proyecto.etapa_fabricacion) return;
    try {
      const respuesta = await fetch(`${URL_PROYECTOS}/${proyecto.id_proyecto}/etapa`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa_fabricacion: nuevaEtapa }),
      });
      if (!respuesta.ok) throw new Error(await respuesta.text());
      const actualizado = await respuesta.json();
      setProyectos((prev) =>
        prev.map((p) => (p.id_proyecto === actualizado.id_proyecto ? actualizado : p))
      );
    } catch (err) {
      setError("No se pudo actualizar la etapa de fabricación: " + err.message);
    }
  }

  async function moverProyectoAPapelera(proyecto) {
    if (!window.confirm(`¿Mover ${proyecto.codigo_folio} a la papelera?`)) return;
    try {
      const respuesta = await fetch(`${URL_PROYECTOS}/${proyecto.id_proyecto}/eliminar`, {
        method: "PATCH",
      });
      if (!respuesta.ok) throw new Error(await respuesta.text());
      setAviso(`${proyecto.codigo_folio} movido a la papelera.`);
      await cargarTodo();
    } catch (err) {
      setError("Error al mover a la papelera: " + err.message);
    }
  }

  async function restaurarProyecto(proyecto) {
    try {
      const respuesta = await fetch(`${URL_PROYECTOS}/${proyecto.id_proyecto}/restaurar`, {
        method: "PATCH",
      });
      if (!respuesta.ok) throw new Error(await respuesta.text());
      const restaurado = await respuesta.json();
      setAviso(`Proyecto restaurado como ${restaurado.codigo_folio}.`);
      await cargarTodo();
    } catch (err) {
      setError("Error al restaurar proyecto: " + err.message);
    }
  }

  async function eliminarProyectoDefinitivo(proyecto) {
    if (
      !window.confirm(
        `¿Eliminar definitivamente ${proyecto.codigo_folio}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    try {
      const respuesta = await fetch(`${URL_PROYECTOS}/${proyecto.id_proyecto}`, {
        method: "DELETE",
      });
      if (!respuesta.ok) throw new Error(await respuesta.text());
      setAviso(`${proyecto.codigo_folio} eliminado permanentemente.`);
      await cargarTodo();
    } catch (err) {
      setError("Error al eliminar proyecto: " + err.message);
    }
  }

  const proyectosFiltrados = useMemo(() => {
    if (pestanaVista === "papelera") return papelera;
    if (filtroEstado === "TODOS") return proyectos;
    return proyectos.filter((p) => p.estado_venta === filtroEstado);
  }, [pestanaVista, papelera, proyectos, filtroEstado]);

  const montoAnticipoCalculadoModal = useMemo(() => {
    if (!proyectoEnCierre) return 0;
    const pct = Math.max(0, Math.min(100, parseFloat(formCierre.porcentaje_anticipo) || 0));
    return Math.round(Number(proyectoEnCierre.monto_cotizado || 0) * (pct / 100) * 100) / 100;
  }, [proyectoEnCierre, formCierre.porcentaje_anticipo]);

  const desgloseFacturaModal = useMemo(() => {
    if (!proyectoEnFacturacion) {
      return { subtotal: 0, iva: 0, total: 0 };
    }
    const base =
      formFactura.estado_facturacion === "ANTICIPO_FACTURADO"
        ? Number(proyectoEnFacturacion.monto_anticipo || 0)
        : Number(proyectoEnFacturacion.monto_cotizado || 0);
    const subtotal = Math.round(base * 100) / 100;
    const iva = Math.round(subtotal * 0.16 * 100) / 100;
    const total = Math.round((subtotal + iva) * 100) / 100;
    return { subtotal, iva, total };
  }, [proyectoEnFacturacion, formFactura.estado_facturacion]);

  return (
    <div className="p-3 p-md-4">
      {/* ===== ENCABEZADO ===== */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <Layers size={24} className="text-primary" />
            <span>Ventas y Proyectos</span>
          </h3>
          <p className="text-secondary small mb-0">
            Gestión de cotizaciones comerciales, cierre de venta con anticipo, facturación con IVA (16%) y seguimiento en 5 etapas.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMostrarFormularioNuevo((v) => !v);
              setError("");
            }}
            className="btn btn-primary fw-semibold"
          >
            {mostrarFormularioNuevo ? "Cerrar formulario" : "+ Nuevo Proyecto / Cotización"}
          </button>
          <button
            type="button"
            onClick={cargarTodo}
            disabled={cargando}
            className="btn btn-outline-secondary"
          >
            Actualizar
          </button>
        </div>
      </div>

      {aviso && (
        <div className="alert alert-success py-2 small d-flex justify-content-between align-items-center">
          <span>{aviso}</span>
          <button
            type="button"
            className="btn-close btn-sm"
            aria-label="Cerrar aviso"
            onClick={() => setAviso("")}
          />
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 small d-flex align-items-center gap-2">
          <AlertTriangle size={17} />
          <span>{error}</span>
        </div>
      )}

      {/* ===== FORMULARIO NUEVO PROYECTO / COTIZACIÓN ===== */}
      {mostrarFormularioNuevo && (
        <form onSubmit={manejarCrearProyecto} className="card shadow-sm border-primary-subtle mb-4">
          <div className="card-body p-4">
            <h5 className="fw-bold text-dark mb-3">Registrar Nuevo Proyecto / Cotización</h5>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold small mb-1">Cliente</label>
                <select
                  className="form-select"
                  value={formProyecto.id_cliente}
                  onChange={(e) => manejarSeleccionCliente(e.target.value)}
                >
                  <option value="">— Seleccionar cliente del directorio —</option>
                  {clientes.map((cl) => (
                    <option key={cl.id_cliente} value={cl.id_cliente}>
                      {cl.nombre_cliente} ({cl.sector})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold small mb-1">
                  Vincular cálculo de Calculadora Técnica{" "}
                  <span className="text-secondary fw-normal">(opcional)</span>
                </label>
                <select
                  className="form-select"
                  value={formProyecto.id_calculo}
                  onChange={(e) => manejarSeleccionCalculo(e.target.value)}
                >
                  <option value="">— Sin cálculo técnico vinculado —</option>
                  {calculos.map((c) => (
                    <option key={c.id_calculo} value={c.id_calculo}>
                      CALC-{String(c.numero_folio || c.id_calculo).padStart(5, "0")} •{" "}
                      {Math.round(Number(c.litros_tanque || 0)).toLocaleString("es-MX")} L (
                      {c.tipo_fondo})
                      {c.costo_total_materiales > 0
                        ? ` • Costo insumos: ${formatearMoneda(c.costo_total_materiales)}`
                        : ""}
                    </option>
                  ))}
                </select>
                {calculoSeleccionadoObj && calculoSeleccionadoObj.costo_total_materiales > 0 && (
                  <small className="text-primary d-block mt-1">
                    <Calculator size={13} className="me-1" />
                    Referencia interna: costo directo de materiales calculado en{" "}
                    <strong>{formatearMoneda(calculoSeleccionadoObj.costo_total_materiales)}</strong>.
                  </small>
                )}
              </div>

              <div className="col-md-5">
                <label className="form-label fw-semibold small mb-1">
                  Nombre del proyecto <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  maxLength={200}
                  required
                  className="form-control"
                  value={formProyecto.nombre_proyecto}
                  onChange={(e) =>
                    setFormProyecto((prev) => ({ ...prev, nombre_proyecto: e.target.value }))
                  }
                  placeholder='Ej. "Tanque 1,000 L Fondo Cónico"'
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold small mb-1">Sector industrial</label>
                <select
                  className="form-select"
                  value={formProyecto.sector}
                  onChange={(e) =>
                    setFormProyecto((prev) => ({ ...prev, sector: e.target.value }))
                  }
                >
                  {SECTORES_LUXMAN.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold small mb-1">
                  Monto cotizado sin IVA (MXN) <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text">$</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    className="form-control"
                    value={formProyecto.monto_cotizado}
                    onChange={(e) =>
                      setFormProyecto((prev) => ({ ...prev, monto_cotizado: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 mt-3">
              <button type="submit" disabled={guardandoNuevo} className="btn btn-success fw-semibold">
                {guardandoNuevo ? "Guardando..." : "Guardar Proyecto / Cotización"}
              </button>
              <button
                type="button"
                onClick={() => setMostrarFormularioNuevo(false)}
                className="btn btn-outline-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ===== PESTAÑAS Y FILTROS DE ESTADO ===== */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <ul className="nav nav-tabs border-bottom-0">
          <li className="nav-item">
            <button
              type="button"
              onClick={() => setPestanaVista("activos")}
              className={`nav-link d-inline-flex align-items-center gap-2 fw-semibold ${
                pestanaVista === "activos" ? "active text-primary" : "text-secondary"
              }`}
            >
              <FileCheck2 size={15} />
              <span>Proyectos Activos</span>
              <span className="badge text-bg-light border text-dark">{proyectos.length}</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              onClick={() => setPestanaVista("papelera")}
              className={`nav-link d-inline-flex align-items-center gap-2 fw-semibold ${
                pestanaVista === "papelera" ? "active text-danger" : "text-secondary"
              }`}
            >
              <Trash2 size={15} />
              <span>Papelera</span>
              <span className="badge text-bg-light border text-dark">{papelera.length}</span>
            </button>
          </li>
        </ul>

        {pestanaVista === "activos" && (
          <div className="btn-group btn-group-sm" role="group">
            {[
              ["TODOS", "Todos"],
              ["COTIZADO", "Cotizados"],
              ["APROBADO", "Aprobados / En Taller"],
              ["RECHAZADO", "Rechazados"],
            ].map(([valor, etq]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltroEstado(valor)}
                className={`btn ${filtroEstado === valor ? "btn-dark" : "btn-outline-dark"}`}
              >
                {etq}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===== LISTADO DE PROYECTOS ===== */}
      {cargando ? (
        <div className="card shadow-sm p-5 text-center text-secondary">
          <div>
            <Loader2 size={24} className="mb-spinner me-2" />
            Cargando proyectos de venta...
          </div>
        </div>
      ) : proyectosFiltrados.length === 0 ? (
        <div className="card shadow-sm p-5 text-center text-secondary">
          {pestanaVista === "activos"
            ? "No hay proyectos registrados en esta vista."
            : "La papelera de proyectos está vacía."}
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {proyectosFiltrados.map((p) => {
            const pasoActual = obtenerIndicePaso(p.etapa_fabricacion);
            const porcentajeBarra =
              p.estado_venta === "APROBADO" ? Math.max(20, pasoActual * 20) : 0;

            const colorEstado =
              p.estado_venta === "APROBADO"
                ? "success"
                : p.estado_venta === "RECHAZADO"
                ? "danger"
                : "warning";

            const metaFactura = obtenerMetaEstadoFacturacion(p.estado_facturacion);
            const yaFacturado =
              p.estado_venta === "APROBADO" &&
              p.estado_facturacion &&
              p.estado_facturacion.toUpperCase() !== "PENDIENTE";

            return (
              <div key={p.id_proyecto} className="card shadow-sm border-0">
                <div className="card-body p-3 p-md-4">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                    <div>
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                        <span className="badge text-bg-dark fs-6 font-monospace">
                          {p.codigo_folio}
                        </span>
                        <span className={`badge text-bg-${colorEstado}`}>{p.estado_venta}</span>
                        <span className="badge text-bg-light border text-secondary">
                          {p.sector}
                        </span>
                        {p.estado_venta === "APROBADO" && (
                          <span className={`badge ${metaFactura.clase}`}>
                            {metaFactura.etiqueta}
                          </span>
                        )}
                        {yaFacturado && p.folio_factura && (
                          <span className="badge text-bg-primary font-monospace">
                            {p.folio_factura}
                          </span>
                        )}
                        {p.folio_calculo && (
                          <span className="badge text-bg-info-subtle text-primary border">
                            CALC-{String(p.folio_calculo).padStart(5, "0")}
                          </span>
                        )}
                      </div>

                      <h5 className="fw-bold text-dark mb-1">{p.nombre_proyecto}</h5>
                      <div className="small text-secondary d-flex flex-wrap gap-3">
                        <span>
                          <Building2 size={14} className="me-1" />
                          <strong>Cliente:</strong> {p.nombre_cliente || "Sin cliente asignado"}
                        </span>
                        <span>
                          <Calendar size={14} className="me-1" />
                          <strong>Creado:</strong> {formatearFechaCorta(p.fecha_creacion)}
                        </span>
                        {p.fecha_compromiso_entrega && (
                          <span className="text-primary fw-semibold">
                            <Clock size={14} className="me-1" />
                            Entrega compromiso: {formatearFechaCorta(p.fecha_compromiso_entrega)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-md-end">
                      <div className="small text-secondary">Monto Cotizado (sin IVA)</div>
                      <div className="fs-4 fw-bold text-dark">
                        {formatearMoneda(p.monto_cotizado)}
                      </div>
                      {p.estado_venta === "APROBADO" && (
                        <div className="small text-success fw-semibold">
                          Anticipo ({p.porcentaje_anticipo}%): {formatearMoneda(p.monto_anticipo)}
                        </div>
                      )}
                      {yaFacturado && p.total_factura > 0 && (
                        <div className="small text-primary fw-semibold">
                          Total c/IVA: {formatearMoneda(p.total_factura)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Datos fiscales si la venta fue aprobada */}
                  {p.estado_venta === "APROBADO" &&
                    (p.razon_social_facturacion || p.rfc_facturacion || yaFacturado) && (
                      <div className="mt-2 pt-2 border-top small text-secondary d-flex flex-wrap gap-3">
                        <span>
                          <strong>Receptor:</strong>{" "}
                          {p.razon_social_facturacion || p.nombre_cliente || "—"}
                        </span>
                        {p.rfc_facturacion && (
                          <span>
                            <strong>RFC:</strong> {p.rfc_facturacion}
                          </span>
                        )}
                        {yaFacturado && p.uso_cfdi && (
                          <span>
                            <strong>Uso CFDI:</strong> {p.uso_cfdi}
                          </span>
                        )}
                        {yaFacturado && p.metodo_pago && (
                          <span>
                            <strong>Pago:</strong> {p.metodo_pago} • {p.forma_pago || "03"}
                          </span>
                        )}
                      </div>
                    )}

                  {/* ===== BARRA DE PROGRESO VISUAL DE 5 PASOS DE FABRICACIÓN ===== */}
                  {pestanaVista === "activos" && p.estado_venta === "APROBADO" && (
                    <div className="mt-3 p-3 rounded-3 bg-light border">
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                        <span className="small fw-bold text-dark">
                          Avance de Fabricación ({pasoActual} de 5):{" "}
                          <span className="text-primary">{p.etapa_fabricacion}</span>
                        </span>

                        <select
                          className="form-select form-select-sm"
                          style={{ maxWidth: "290px" }}
                          value={p.etapa_fabricacion}
                          onChange={(e) => cambiarEtapaFabricacion(p, e.target.value)}
                        >
                          {PASOS_FABRICACION.map((etapa, idx) => (
                            <option key={etapa} value={etapa}>
                              Paso {idx + 1}: {etapa}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="progress mb-2" style={{ height: "10px" }}>
                        <div
                          className={`progress-bar ${
                            pasoActual === 5 ? "bg-success" : "bg-primary"
                          }`}
                          role="progressbar"
                          style={{ width: `${porcentajeBarra}%` }}
                          aria-valuenow={porcentajeBarra}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        />
                      </div>

                      <div className="row g-1 text-center" style={{ fontSize: "0.72rem" }}>
                        {PASOS_FABRICACION.map((etapa, idx) => {
                          const num = idx + 1;
                          const completado = num <= pasoActual;
                          const esActual = num === pasoActual;
                          return (
                            <div className="col" key={etapa}>
                              <button
                                type="button"
                                onClick={() => cambiarEtapaFabricacion(p, etapa)}
                                className={`btn btn-sm w-100 py-1 px-1 text-truncate ${
                                  esActual
                                    ? "btn-primary fw-bold"
                                    : completado
                                    ? "btn-success-subtle text-success fw-semibold border border-success-subtle"
                                    : "btn-outline-secondary"
                                }`}
                                style={{ fontSize: "0.72rem" }}
                                title={`Cambiar a: ${etapa}`}
                              >
                                {num}. {etapa}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ===== BOTONES DE ACCIÓN ===== */}
                  <div className="d-flex flex-wrap justify-content-end gap-2 mt-3 pt-2 border-top">
                    {pestanaVista === "activos" ? (
                      <>
                        {p.estado_venta === "COTIZADO" && (
                          <>
                            <button
                              type="button"
                              onClick={() => abrirModalCerrarVenta(p)}
                              className="btn btn-success btn-sm fw-semibold d-inline-flex align-items-center gap-1"
                            >
                              <CheckCircle2 size={15} />
                              <span>Cerrar Venta</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => rechazarProyecto(p)}
                              className="btn btn-outline-warning btn-sm fw-semibold"
                            >
                              Rechazar
                            </button>
                          </>
                        )}

                        {p.estado_venta === "APROBADO" && (
                          <>
                            <button
                              type="button"
                              onClick={() => abrirModalFacturacion(p)}
                              className={`btn btn-sm fw-semibold d-inline-flex align-items-center gap-1 ${
                                yaFacturado ? "btn-outline-primary" : "btn-primary"
                              }`}
                            >
                              <FileText size={14} />
                              <span>{yaFacturado ? "Ver Factura" : "Facturar"}</span>
                            </button>

                            {yaFacturado && (
                              <button
                                type="button"
                                disabled={idDescargandoFactura === p.id_proyecto}
                                onClick={() => descargarFacturaPdf(p)}
                                className="btn btn-success btn-sm fw-semibold d-inline-flex align-items-center gap-1"
                              >
                                {idDescargandoFactura === p.id_proyecto ? (
                                  <Loader2 size={14} className="mb-spinner" />
                                ) : (
                                  <FileDown size={14} />
                                )}
                                <span>Descargar Factura PDF</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => abrirModalCerrarVenta(p)}
                              className="btn btn-outline-secondary btn-sm"
                            >
                              Editar datos de cierre / entrega
                            </button>
                          </>
                        )}

                        {p.estado_venta === "RECHAZADO" && (
                          <button
                            type="button"
                            onClick={() => abrirModalCerrarVenta(p)}
                            className="btn btn-outline-success btn-sm"
                          >
                            Reabrir y Cerrar Venta
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => moverProyectoAPapelera(p)}
                          className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1"
                        >
                          <Trash2 size={14} />
                          <span>Borrar</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => restaurarProyecto(p)}
                          className="btn btn-outline-success btn-sm d-inline-flex align-items-center gap-1"
                        >
                          <RotateCcw size={14} />
                          <span>Restaurar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarProyectoDefinitivo(p)}
                          className="btn btn-danger btn-sm d-inline-flex align-items-center gap-1"
                        >
                          <AlertTriangle size={14} />
                          <span>Eliminar definitivo</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== MODAL DE CIERRE DE VENTA (APROBACIÓN COMERCIAL) ===== */}
      {proyectoEnCierre && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <form onSubmit={ejecutarAprobacionVenta}>
                <div className="modal-header bg-dark text-white">
                  <div>
                    <h5 className="modal-title fw-bold mb-0">
                      Cerrar Venta • {proyectoEnCierre.codigo_folio}
                    </h5>
                    <small className="text-white-50">{proyectoEnCierre.nombre_proyecto}</small>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setProyectoEnCierre(null)}
                  />
                </div>

                <div className="modal-body p-4">
                  <div className="d-flex justify-content-between align-items-center p-2 px-3 mb-3 rounded bg-light border">
                    <span className="small text-secondary fw-semibold">
                      Monto Cotizado (sin IVA):
                    </span>
                    <strong className="fs-5 text-dark">
                      {formatearMoneda(proyectoEnCierre.monto_cotizado)}
                    </strong>
                  </div>

                  <div className="row g-3">
                    <div className="col-sm-6">
                      <label className="form-label fw-semibold small mb-1">
                        Porcentaje de anticipo (%) *
                      </label>
                      <div className="input-group">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          required
                          className="form-control"
                          value={formCierre.porcentaje_anticipo}
                          onChange={(e) =>
                            setFormCierre((prev) => ({
                              ...prev,
                              porcentaje_anticipo: e.target.value,
                            }))
                          }
                        />
                        <span className="input-group-text">%</span>
                      </div>
                    </div>

                    <div className="col-sm-6">
                      <label className="form-label fw-semibold small mb-1">
                        Monto de anticipo calculado
                      </label>
                      <input
                        type="text"
                        readOnly
                        className="form-control bg-light fw-bold text-success"
                        value={formatearMoneda(montoAnticipoCalculadoModal)}
                      />
                    </div>

                    <div className="col-sm-5">
                      <label className="form-label fw-semibold small mb-1">
                        RFC de facturación
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        className="form-control text-uppercase"
                        placeholder="Ej. LNO010101ABC"
                        value={formCierre.rfc_facturacion}
                        onChange={(e) =>
                          setFormCierre((prev) => ({
                            ...prev,
                            rfc_facturacion: e.target.value.toUpperCase(),
                          }))
                        }
                      />
                    </div>

                    <div className="col-sm-7">
                      <label className="form-label fw-semibold small mb-1">
                        Razón social de facturación *
                      </label>
                      <input
                        type="text"
                        maxLength={200}
                        required
                        className="form-control"
                        placeholder="Razón social oficial"
                        value={formCierre.razon_social_facturacion}
                        onChange={(e) =>
                          setFormCierre((prev) => ({
                            ...prev,
                            razon_social_facturacion: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold small mb-1">
                        Fecha compromiso de entrega *
                      </label>
                      <input
                        type="date"
                        required
                        className="form-control"
                        value={formCierre.fecha_compromiso_entrega}
                        onChange={(e) =>
                          setFormCierre((prev) => ({
                            ...prev,
                            fecha_compromiso_entrega: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {errorModalCierre && (
                    <div className="alert alert-danger py-2 small mt-3 mb-0">
                      {errorModalCierre}
                    </div>
                  )}
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    onClick={() => setProyectoEnCierre(null)}
                    className="btn btn-outline-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={procesandoCierre}
                    className="btn btn-success fw-bold"
                  >
                    {procesandoCierre ? "Aprobando..." : "Aprobar y Cerrar Venta"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DE FACTURACIÓN FISCAL (CFDI / COMPROBANTE LUXMAN) ===== */}
      {proyectoEnFacturacion && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.58)", overflowY: "auto" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <form onSubmit={ejecutarFacturacion}>
                <div className="modal-header bg-primary text-white">
                  <div>
                    <h5 className="modal-title fw-bold mb-0 d-flex align-items-center gap-2">
                      <FileText size={20} />
                      <span>
                        Facturación Comercial • {proyectoEnFacturacion.codigo_folio}
                      </span>
                      {proyectoEnFacturacion.folio_factura && (
                        <span className="badge text-bg-light text-primary font-monospace">
                          {proyectoEnFacturacion.folio_factura}
                        </span>
                      )}
                    </h5>
                    <small className="text-white-50">
                      {proyectoEnFacturacion.nombre_proyecto}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setProyectoEnFacturacion(null)}
                  />
                </div>

                <div className="modal-body p-4">
                  {/* Selector de alcance a facturar: Anticipo vs 100% */}
                  <label className="form-label fw-bold small text-dark mb-2">
                    1. Selecciona el alcance a facturar
                  </label>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <button
                        type="button"
                        disabled={Number(proyectoEnFacturacion.monto_anticipo || 0) <= 0}
                        onClick={() =>
                          setFormFactura((prev) => ({
                            ...prev,
                            estado_facturacion: "ANTICIPO_FACTURADO",
                            metodo_pago: "PPD",
                          }))
                        }
                        className={`btn w-100 text-start p-3 border ${
                          formFactura.estado_facturacion === "ANTICIPO_FACTURADO"
                            ? "btn-primary text-white shadow-sm"
                            : "btn-outline-secondary text-dark bg-white"
                        }`}
                      >
                        <div className="fw-bold">
                          Facturar Anticipo ({proyectoEnFacturacion.porcentaje_anticipo}%)
                        </div>
                        <div
                          className={`small ${
                            formFactura.estado_facturacion === "ANTICIPO_FACTURADO"
                              ? "text-white-50"
                              : "text-secondary"
                          }`}
                        >
                          Base sin IVA: {formatearMoneda(proyectoEnFacturacion.monto_anticipo)}
                        </div>
                      </button>
                    </div>

                    <div className="col-md-6">
                      <button
                        type="button"
                        onClick={() =>
                          setFormFactura((prev) => ({
                            ...prev,
                            estado_facturacion: "FACTURADO_TOTAL",
                            metodo_pago: "PUE",
                          }))
                        }
                        className={`btn w-100 text-start p-3 border ${
                          formFactura.estado_facturacion === "FACTURADO_TOTAL"
                            ? "btn-primary text-white shadow-sm"
                            : "btn-outline-secondary text-dark bg-white"
                        }`}
                      >
                        <div className="fw-bold">Facturar 100% del Proyecto</div>
                        <div
                          className={`small ${
                            formFactura.estado_facturacion === "FACTURADO_TOTAL"
                              ? "text-white-50"
                              : "text-secondary"
                          }`}
                        >
                          Base sin IVA: {formatearMoneda(proyectoEnFacturacion.monto_cotizado)}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Datos del Receptor y Catálogos Fiscales */}
                  <label className="form-label fw-bold small text-dark mb-2">
                    2. Datos fiscales del receptor y método de pago
                  </label>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small mb-1">
                        RFC del receptor *
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        required
                        className="form-control text-uppercase font-monospace"
                        placeholder="Ej. LNO010101ABC"
                        value={formFactura.rfc_facturacion}
                        onChange={(e) =>
                          setFormFactura((prev) => ({
                            ...prev,
                            rfc_facturacion: e.target.value.toUpperCase(),
                          }))
                        }
                      />
                    </div>

                    <div className="col-md-8">
                      <label className="form-label fw-semibold small mb-1">
                        Razón social de facturación *
                      </label>
                      <input
                        type="text"
                        maxLength={200}
                        required
                        className="form-control"
                        value={formFactura.razon_social_facturacion}
                        onChange={(e) =>
                          setFormFactura((prev) => ({
                            ...prev,
                            razon_social_facturacion: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small mb-1">Uso de CFDI</label>
                      <select
                        className="form-select"
                        value={formFactura.uso_cfdi}
                        onChange={(e) =>
                          setFormFactura((prev) => ({ ...prev, uso_cfdi: e.target.value }))
                        }
                      >
                        {CATALOGO_USO_CFDI.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small mb-1">
                        Régimen fiscal del receptor
                      </label>
                      <select
                        className="form-select"
                        value={formFactura.regimen_fiscal}
                        onChange={(e) =>
                          setFormFactura((prev) => ({ ...prev, regimen_fiscal: e.target.value }))
                        }
                      >
                        {CATALOGO_REGIMEN_FISCAL.map((reg) => (
                          <option key={reg} value={reg}>
                            {reg}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small mb-1">Método de pago</label>
                      <select
                        className="form-select"
                        value={formFactura.metodo_pago}
                        onChange={(e) =>
                          setFormFactura((prev) => ({ ...prev, metodo_pago: e.target.value }))
                        }
                      >
                        {CATALOGO_METODO_PAGO.map((m) => (
                          <option key={m.valor} value={m.valor}>
                            {m.texto}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small mb-1">Forma de pago</label>
                      <select
                        className="form-select"
                        value={formFactura.forma_pago}
                        onChange={(e) =>
                          setFormFactura((prev) => ({ ...prev, forma_pago: e.target.value }))
                        }
                      >
                        {CATALOGO_FORMA_PAGO.map((fp) => (
                          <option key={fp} value={fp}>
                            {fp}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Resumen automático de Subtotal + IVA 16% + Total */}
                  <div className="mt-4 p-3 rounded-3 bg-light border">
                    <div className="row g-2 text-center text-md-end align-items-center">
                      <div className="col-md-4">
                        <div className="small text-secondary">Subtotal (sin IVA)</div>
                        <div className="fs-6 fw-bold text-dark">
                          {formatearMoneda(desgloseFacturaModal.subtotal)}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="small text-secondary">IVA Trasladado (16%)</div>
                        <div className="fs-6 fw-bold text-dark">
                          {formatearMoneda(desgloseFacturaModal.iva)}
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="small text-primary fw-semibold">Total Factura (MXN)</div>
                        <div className="fs-5 fw-bold text-primary">
                          {formatearMoneda(desgloseFacturaModal.total)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {errorModalFactura && (
                    <div className="alert alert-danger py-2 small mt-3 mb-0">
                      {errorModalFactura}
                    </div>
                  )}
                </div>

                <div className="modal-footer bg-light d-flex flex-wrap justify-content-between gap-2">
                  <div>
                    {proyectoEnFacturacion.estado_facturacion &&
                      proyectoEnFacturacion.estado_facturacion.toUpperCase() !== "PENDIENTE" && (
                        <button
                          type="button"
                          disabled={idDescargandoFactura === proyectoEnFacturacion.id_proyecto}
                          onClick={() => descargarFacturaPdf(proyectoEnFacturacion)}
                          className="btn btn-success fw-semibold d-inline-flex align-items-center gap-1"
                        >
                          <FileDown size={16} />
                          <span>Descargar Factura PDF</span>
                        </button>
                      )}
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      onClick={() => setProyectoEnFacturacion(null)}
                      className="btn btn-outline-secondary"
                    >
                      Cerrar
                    </button>
                    <button
                      type="submit"
                      disabled={procesandoFactura}
                      className="btn btn-primary fw-bold"
                    >
                      {procesandoFactura
                        ? "Emitiendo..."
                        : proyectoEnFacturacion.folio_factura
                        ? "Actualizar Factura"
                        : "Emitir y Guardar Factura"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VentasProyectos;
