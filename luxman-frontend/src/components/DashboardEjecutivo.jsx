import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Clock,
  Award,
  Building2,
  Calculator,
  RotateCcw,
} from "lucide-react";
import { URL_BASE } from "../api";

const URL_METRICAS = `${URL_BASE}/api/dashboard/metricas`;

const COLORES_SECTOR = [
  "#1d4ed8",
  "#0284c7",
  "#0d9488",
  "#4f46e5",
  "#d97706",
  "#64748b",
];

const COLORES_EMBUDO = [
  "#2563eb",
  "#0284c7",
  "#0891b2",
  "#0d9488",
  "#16a34a",
];

const formatearMoneda = (cantidad) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cantidad || 0);

const formatearFechaCorta = (fechaIso) => {
  if (!fechaIso) return "Sin fecha";
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaIso)) {
    const [anio, mes, dia] = fechaIso.split("-");
    return `${dia}/${mes}/${anio}`;
  }
  return fechaIso;
};

function sumarDiasIso(dias) {
  const f = new Date();
  f.setDate(f.getDate() + dias);
  const yyyy = f.getFullYear();
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  const dd = String(f.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function DashboardEjecutivo({ alCambiarSubmodulo }) {
  const [metricas, setMetricas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [fecha_limite, setFechaLimite] = useState("");

  const cargarMetricas = useCallback(async (limite = "") => {
    setCargando(true);
    try {
      const query = limite ? `?fecha_limite=${encodeURIComponent(limite)}` : "";
      const respuesta = await fetch(`${URL_METRICAS}${query}`);
      if (!respuesta.ok) {
        throw new Error("No se pudieron consultar las métricas del dashboard.");
      }
      const datos = await respuesta.json();
      setMetricas(datos);
      setError("");
    } catch (err) {
      setError(err.message || "Error de conexión al cargar el Dashboard Ejecutivo.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarMetricas(fecha_limite);
  }, [cargarMetricas, fecha_limite]);

  const maxMontoSector = useMemo(() => {
    if (!metricas?.proyectos_por_sector?.length) return 1;
    return Math.max(
      1,
      ...metricas.proyectos_por_sector.map((s) =>
        Math.max(Number(s.monto_cotizado || 0), Number(s.monto_vendido || 0))
      )
    );
  }, [metricas]);

  const maxCantidadSector = useMemo(() => {
    if (!metricas?.proyectos_por_sector?.length) return 1;
    return Math.max(
      1,
      ...metricas.proyectos_por_sector.map((s) => Number(s.cantidad_proyectos || 0))
    );
  }, [metricas]);

  const maxEtapa = useMemo(() => {
    if (!metricas?.proyectos_por_etapa?.length) return 1;
    return Math.max(
      1,
      ...metricas.proyectos_por_etapa.map((e) => Number(e.cantidad_proyectos || 0))
    );
  }, [metricas]);

  const renderBadgeUrgencia = (entrega) => {
    if (entrega.nivel_alerta === "vencida") {
      const atraso = Math.abs(entrega.dias_restantes || 0);
      return (
        <span className="badge text-bg-danger">
          Vencida ({atraso} {atraso === 1 ? "día" : "días"})
        </span>
      );
    }
    if (entrega.nivel_alerta === "proxima") {
      if (entrega.dias_restantes === 0) {
        return <span className="badge text-bg-danger">Entrega HOY</span>;
      }
      return (
        <span className="badge text-bg-warning text-dark">
          Próxima ({entrega.dias_restantes} {entrega.dias_restantes === 1 ? "día" : "días"})
        </span>
      );
    }
    if (entrega.nivel_alerta === "en_tiempo") {
      return (
        <span className="badge text-bg-success-subtle text-success border border-success-subtle">
          En tiempo ({entrega.dias_restantes} días)
        </span>
      );
    }
    return <span className="badge text-bg-secondary">Sin fecha</span>;
  };

  const anioSiguiente = new Date().getFullYear() + 1;

  return (
    <div className="p-3 p-md-4">
      {/* ===== ENCABEZADO ===== */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <Award size={25} className="text-primary" />
            <span>Dashboard Ejecutivo</span>
          </h3>
          <p className="text-secondary small mb-0">
            Indicadores comerciales, carga de fabricación en planta y calendario de entregas en tiempo real.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          {alCambiarSubmodulo && (
            <>
              <button
                type="button"
                onClick={() => alCambiarSubmodulo("cotizador")}
                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
              >
                <Calculator size={15} />
                <span>Calculadora Técnica</span>
              </button>
              <button
                type="button"
                onClick={() => alCambiarSubmodulo("ventas")}
                className="btn btn-primary btn-sm fw-semibold"
              >
                Ir a Ventas y Proyectos
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => cargarMetricas(fecha_limite)}
            disabled={cargando}
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
          >
            <RotateCcw size={14} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-4">
          <AlertTriangle size={17} />
          <span>{error}</span>
        </div>
      )}

      {/* ===== 1. TARJETAS KPI SUPERIORES ===== */}
      <div className="row g-3 mb-4">
        {/* KPI 1: Tasa de Cierre (%) */}
        <div className="col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary small fw-semibold text-uppercase">
                  Tasa de Cierre
                </span>
                <span className="badge text-bg-primary-subtle text-primary rounded-pill">
                  Conversión
                </span>
              </div>
              <div className="display-6 fw-bold text-primary mb-1">
                {metricas ? `${Number(metricas.tasa_cierre_porcentaje || 0).toFixed(1)}%` : "—"}
              </div>
              <div className="small text-secondary">
                <strong>{metricas?.total_aprobadas ?? 0}</strong> aprobadas de{" "}
                <strong>{metricas?.total_cotizaciones ?? 0}</strong> cotizadas (
                {metricas?.total_pendientes ?? 0} pendientes · {metricas?.total_rechazadas ?? 0}{" "}
                rechazadas)
              </div>
            </div>
          </div>
        </div>

        {/* KPI 2: Monto Total Vendido (MXN) */}
        <div className="col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary small fw-semibold text-uppercase">
                  Monto Total Vendido
                </span>
                <CheckCircle2 size={18} className="text-success" />
              </div>
              <div className="fs-3 fw-bold text-dark mb-1">
                {metricas ? formatearMoneda(metricas.monto_total_vendido) : "—"}
              </div>
              <div className="small text-secondary">
                Volumen cotizado global:{" "}
                <strong>
                  {metricas ? formatearMoneda(metricas.monto_total_cotizado) : "$0.00"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3: Anticipos Recibidos (MXN) */}
        <div className="col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary small fw-semibold text-uppercase">
                  Anticipos Recibidos
                </span>
                <span className="badge text-bg-success-subtle text-success rounded-pill">
                  Flujo real
                </span>
              </div>
              <div className="fs-3 fw-bold text-success mb-1">
                {metricas ? formatearMoneda(metricas.monto_total_anticipos) : "—"}
              </div>
              <div className="small text-secondary">
                Saldo por liquidar en ventas:{" "}
                <strong>
                  {metricas
                    ? formatearMoneda(
                        Math.max(
                          0,
                          Number(metricas.monto_total_vendido || 0) -
                            Number(metricas.monto_total_anticipos || 0)
                        )
                      )
                    : "$0.00"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 4: Proyectos Activos en Taller */}
        <div className="col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary small fw-semibold text-uppercase">
                  Proyectos Activos en Taller
                </span>
                <Layers size={18} className="text-primary" />
              </div>
              <div className="display-6 fw-bold text-dark mb-1">
                {metricas ? metricas.proyectos_activos_taller : "—"}
              </div>
              <div className="small text-secondary d-flex flex-wrap gap-2">
                <span>
                  Clientes: <strong>{metricas?.total_clientes ?? 0}</strong>
                </span>
                <span>·</span>
                <span>
                  Solicitudes web sin atender:{" "}
                  <strong className="text-warning-emphasis">
                    {metricas?.solicitudes_pendientes ?? 0}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 2. GRÁFICAS VISUALES (SVG NATIVO / CSS) ===== */}
      <div className="row g-4 mb-4">
        {/* Gráfica 1: Proyectos y Monto por Sector Industrial */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                    <Building2 size={18} className="text-primary" />
                    <span>Proyectos y Monto por Sector Industrial</span>
                  </h5>
                  <small className="text-secondary">
                    Comparativa de monto vendido vs. monto cotizado por industria
                  </small>
                </div>
              </div>

              {cargando && !metricas ? (
                <div className="py-5 text-center text-secondary small">
                  <Loader2 size={20} className="mb-spinner me-2" />
                  Calculando sectores...
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {(metricas?.proyectos_por_sector || []).map((item, idx) => {
                    const montoCot = Number(item.monto_cotizado || 0);
                    const montoVen = Number(item.monto_vendido || 0);
                    const usarEscalaMonto = maxMontoSector > 1;
                    const anchoCot = usarEscalaMonto
                      ? Math.min(100, (montoCot / maxMontoSector) * 100)
                      : Math.min(100, (item.cantidad_proyectos / maxCantidadSector) * 100);
                    const anchoVen = usarEscalaMonto
                      ? Math.min(100, (montoVen / maxMontoSector) * 100)
                      : Math.min(100, (item.cantidad_aprobados / maxCantidadSector) * 100);
                    const color = COLORES_SECTOR[idx % COLORES_SECTOR.length];

                    return (
                      <div key={item.sector}>
                        <div className="d-flex justify-content-between align-items-baseline small mb-1">
                          <div>
                            <strong className="text-dark">{item.sector}</strong>
                            <span className="badge text-bg-light border text-secondary ms-2">
                              {item.cantidad_proyectos}{" "}
                              {item.cantidad_proyectos === 1 ? "proyecto" : "proyectos"} (
                              {item.cantidad_aprobados} aprob.)
                            </span>
                          </div>
                          <div className="text-end">
                            <strong style={{ color }}>{formatearMoneda(montoVen)}</strong>
                            {montoCot > montoVen && (
                              <span className="text-secondary ms-1" style={{ fontSize: "0.73rem" }}>
                                / {formatearMoneda(montoCot)} cot.
                              </span>
                            )}
                          </div>
                        </div>

                        <svg
                          viewBox="0 0 400 14"
                          className="w-100 d-block rounded"
                          style={{ height: "14px", background: "#f1f5f9" }}
                        >
                          {/* Barra gris azulada: total cotizado del sector */}
                          <rect
                            x="0"
                            y="0"
                            width={Math.max(anchoCot * 4, item.cantidad_proyectos > 0 ? 8 : 0)}
                            height="14"
                            rx="4"
                            fill="#cbd5e1"
                          />
                          {/* Barra sólida: monto aprobado/vendido del sector */}
                          <rect
                            x="0"
                            y="0"
                            width={Math.max(anchoVen * 4, item.cantidad_aprobados > 0 ? 8 : 0)}
                            height="14"
                            rx="4"
                            fill={color}
                          />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gráfica 2: Embudo de Etapas de Fabricación */}
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body p-3 p-md-4">
              <div className="mb-3">
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <Layers size={18} className="text-primary" />
                  <span>Embudo de Etapas de Fabricación</span>
                </h5>
                <small className="text-secondary">
                  Distribución actual de los equipos aprobados a lo largo de las 5 fases de planta
                </small>
              </div>

              {cargando && !metricas ? (
                <div className="py-5 text-center text-secondary small">
                  <Loader2 size={20} className="mb-spinner me-2" />
                  Calculando embudo de planta...
                </div>
              ) : (
                <div className="d-flex flex-column gap-2 pt-1">
                  {(metricas?.proyectos_por_etapa || []).map((etapa, idx) => {
                    const cant = Number(etapa.cantidad_proyectos || 0);
                    // Embudo centrado proporcional en SVG
                    const anchoBaseEmbudo = 340 - idx * 32;
                    const anchoProporcional =
                      cant > 0
                        ? Math.max(90, (cant / maxEtapa) * 360)
                        : Math.max(70, anchoBaseEmbudo * 0.35);
                    const xInicio = (400 - anchoProporcional) / 2;
                    const color = COLORES_EMBUDO[idx % COLORES_EMBUDO.length];

                    return (
                      <div
                        key={etapa.etapa_fabricacion}
                        className="p-2 rounded-3 border bg-light"
                      >
                        <div className="d-flex justify-content-between align-items-center small mb-1 px-1">
                          <span className="fw-semibold text-dark">
                            {etapa.orden_paso}. {etapa.etapa_fabricacion}
                          </span>
                          <span
                            className="badge rounded-pill"
                            style={{
                              backgroundColor: cant > 0 ? color : "#e2e8f0",
                              color: cant > 0 ? "#ffffff" : "#475569",
                            }}
                          >
                            {cant} {cant === 1 ? "equipo" : "equipos"}
                          </span>
                        </div>

                        <svg viewBox="0 0 400 16" className="w-100 d-block" style={{ height: "16px" }}>
                          <rect x="0" y="2" width="400" height="12" rx="6" fill="#e2e8f0" />
                          <rect
                            x={xInicio}
                            y="2"
                            width={anchoProporcional}
                            height="12"
                            rx="6"
                            fill={cant > 0 ? color : "#cbd5e1"}
                            opacity={cant > 0 ? 1 : 0.55}
                          />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== 3. TABLA DE PRÓXIMAS ENTREGAS CON FILTRO DE FECHA LÍMITE ===== */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
            <div>
              <h5 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                <Clock size={19} className="text-primary" />
                <span>Próximas Entregas Comprometidas</span>
              </h5>
              <small className="text-secondary">
                Proyectos aprobados en curso que aún no han sido marcados como Entregados.
              </small>
            </div>

            <div className="d-flex flex-wrap align-items-end gap-2">
              <div>
                <label className="form-label small fw-semibold text-dark mb-1">
                  <Calendar size={13} className="me-1" />
                  Entregar antes de:
                </label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={fecha_limite}
                  onChange={(e) => setFechaLimite(e.target.value)}
                />
              </div>

              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  onClick={() => setFechaLimite(sumarDiasIso(7))}
                  className="btn btn-outline-secondary"
                >
                  7 días
                </button>
                <button
                  type="button"
                  onClick={() => setFechaLimite(sumarDiasIso(30))}
                  className="btn btn-outline-secondary"
                >
                  30 días
                </button>
                <button
                  type="button"
                  onClick={() => setFechaLimite(`${anioSiguiente}-01-01`)}
                  className="btn btn-outline-secondary"
                >
                  1 Ene {anioSiguiente}
                </button>
                {fecha_limite && (
                  <button
                    type="button"
                    onClick={() => setFechaLimite("")}
                    className="btn btn-dark"
                  >
                    Todas
                  </button>
                )}
              </div>
            </div>
          </div>

          {metricas?.fecha_limite_aplicada && (
            <div className="alert alert-primary py-2 small mb-3 d-flex justify-content-between align-items-center">
              <span>
                Proyectos por entregar hasta el{" "}
                <strong>{formatearFechaCorta(metricas.fecha_limite_aplicada)}</strong>:{" "}
                <strong>{metricas.proximas_entregas?.length ?? 0}</strong> equipo(s).
              </span>
              <button
                type="button"
                onClick={() => setFechaLimite("")}
                className="btn btn-link btn-sm p-0 text-decoration-none"
              >
                Quitar filtro
              </button>
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>Folio</th>
                  <th>Proyecto</th>
                  <th>Cliente</th>
                  <th>Sector</th>
                  <th>Etapa Actual</th>
                  <th>Fecha Compromiso</th>
                  <th className="text-end">Urgencia</th>
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr>
                    <td colSpan="7" className="text-center text-secondary py-4">
                      Cargando calendario de entregas...
                    </td>
                  </tr>
                )}

                {!cargando &&
                  (metricas?.proximas_entregas || []).map((item) => (
                    <tr
                      key={item.id_proyecto}
                      className={
                        item.nivel_alerta === "vencida"
                          ? "table-danger"
                          : item.nivel_alerta === "proxima"
                          ? "table-warning"
                          : ""
                      }
                    >
                      <td className="font-monospace fw-bold">{item.codigo_folio}</td>
                      <td className="fw-semibold text-dark">{item.nombre_proyecto}</td>
                      <td>{item.nombre_cliente}</td>
                      <td>{item.sector}</td>
                      <td>
                        <span className="badge text-bg-light border text-dark">
                          {item.etapa_fabricacion}
                        </span>
                      </td>
                      <td className="fw-semibold">
                        {formatearFechaCorta(item.fecha_compromiso_entrega)}
                      </td>
                      <td className="text-end">{renderBadgeUrgencia(item)}</td>
                    </tr>
                  ))}

                {!cargando && (metricas?.proximas_entregas || []).length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center text-secondary py-4">
                      {metricas?.fecha_limite_aplicada
                        ? "No hay entregas pendientes antes de la fecha seleccionada."
                        : "No hay proyectos aprobados pendientes de entrega en este momento."}
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

export default DashboardEjecutivo;
