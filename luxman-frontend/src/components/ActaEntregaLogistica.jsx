import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileCheck2,
  History,
  RotateCcw,
  Eye,
  Building2,
  Calendar,
} from "lucide-react";
import { URL_BASE } from "../api";

const URL_ACTAS = `${URL_BASE}/api/actas_entrega`;
const URL_PROYECTOS = `${URL_BASE}/api/proyectos_venta`;

const formatearFechaHora = (fechaIso) => {
  if (!fechaIso) return "—";
  const iso = fechaIso.endsWith("Z") ? fechaIso : `${fechaIso}Z`;
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

function ActaEntregaLogistica({ alIrAVentas }) {
  const lienzoRef = useRef(null);
  const [dibujando, setDibujando] = useState(false);
  const [hayFirma, setHayFirma] = useState(false);

  const [proyectosPendientes, setProyectosPendientes] = useState([]);
  const [actas, setActas] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [id_proyecto, setIdProyecto] = useState("");
  const [nombre_receptor, setNombreReceptor] = useState("");
  const [puesto_receptor, setPuestoReceptor] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [actaRecienGuardada, setActaRecienGuardada] = useState(null);
  const [actaVistaFirma, setActaVistaFirma] = useState(null);

  const cargarDatos = useCallback(async () => {
    setCargandoDatos(true);
    try {
      const [resProyectos, resActas] = await Promise.all([
        fetch(URL_PROYECTOS),
        fetch(URL_ACTAS),
      ]);

      if (resProyectos.ok) {
        const todosProyectos = await resProyectos.json();
        const elegibles = (Array.isArray(todosProyectos) ? todosProyectos : []).filter(
          (p) => p.estado_venta === "APROBADO" && p.etapa_fabricacion !== "Entregado"
        );
        setProyectosPendientes(elegibles);
      }

      if (resActas.ok) {
        const listaActas = await resActas.json();
        setActas(Array.isArray(listaActas) ? listaActas : []);
      }
    } catch {
      setMensajeError("No se pudo conectar con el servidor para consultar proyectos y actas.");
    } finally {
      setCargandoDatos(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const proyectoSeleccionadoObj = useMemo(
    () =>
      proyectosPendientes.find((p) => String(p.id_proyecto) === String(id_proyecto)) || null,
    [proyectosPendientes, id_proyecto]
  );

  // Coordenadas escaladas del mouse o pantalla táctil sobre el canvas
  const obtenerPosicion = (evento) => {
    const lienzo = lienzoRef.current;
    const caja = lienzo.getBoundingClientRect();
    return {
      x: (evento.clientX - caja.left) * (lienzo.width / caja.width),
      y: (evento.clientY - caja.top) * (lienzo.height / caja.height),
    };
  };

  const empezarFirma = (evento) => {
    if (!lienzoRef.current) return;
    const contexto = lienzoRef.current.getContext("2d");
    const posicion = obtenerPosicion(evento);
    contexto.lineWidth = 3;
    contexto.lineCap = "round";
    contexto.strokeStyle = "#0f172a";
    contexto.beginPath();
    contexto.moveTo(posicion.x, posicion.y);
    setDibujando(true);
  };

  const dibujarFirma = (evento) => {
    if (!dibujando || !lienzoRef.current) return;
    const contexto = lienzoRef.current.getContext("2d");
    const posicion = obtenerPosicion(evento);
    contexto.lineTo(posicion.x, posicion.y);
    contexto.stroke();
    setHayFirma(true);
  };

  const terminarFirma = () => setDibujando(false);

  const limpiarFirma = () => {
    if (!lienzoRef.current) return;
    const lienzo = lienzoRef.current;
    lienzo.getContext("2d").clearRect(0, 0, lienzo.width, lienzo.height);
    setHayFirma(false);
  };

  const registrarActa = async (evento) => {
    evento.preventDefault();

    if (!id_proyecto) {
      setMensajeError("Selecciona un proyecto aprobado pendiente de entrega.");
      return;
    }

    if (!nombre_receptor.trim()) {
      setMensajeError("Completa el nombre de la persona que recibe el equipo.");
      return;
    }

    if (!hayFirma || !lienzoRef.current) {
      setMensajeError("Falta capturar la firma digital de recepción en el recuadro.");
      return;
    }

    setGuardando(true);
    setMensajeError("");
    setActaRecienGuardada(null);

    const firma_base64 = lienzoRef.current.toDataURL("image/png");

    try {
      const respuesta = await fetch(URL_ACTAS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_proyecto: parseInt(id_proyecto, 10),
          nombre_receptor: nombre_receptor.trim(),
          puesto_receptor: puesto_receptor.trim() || null,
          observaciones: observaciones.trim() || null,
          firma_base64,
        }),
      });

      if (!respuesta.ok) {
        throw new Error((await respuesta.text()) || "No se pudo guardar el acta de entrega.");
      }

      const guardada = await respuesta.json();
      setActaRecienGuardada(guardada);
      setIdProyecto("");
      setNombreReceptor("");
      setPuestoReceptor("");
      setObservaciones("");
      limpiarFirma();
      await cargarDatos();
    } catch (err) {
      setMensajeError(err.message || "Error al guardar el acta de entrega.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-3 p-md-4">
      <div className="mx-auto" style={{ maxWidth: "1060px" }}>
        {/* ===== ENCABEZADO ===== */}
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
              <FileCheck2 size={24} className="text-primary" />
              <span>Acta de Entrega Logística</span>
            </h3>
            <p className="text-secondary small mb-0">
              Registra la recepción física del equipo con firma digital y marca automáticamente el proyecto como Entregado.
            </p>
          </div>
          <button
            type="button"
            onClick={cargarDatos}
            disabled={cargandoDatos}
            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
          >
            <RotateCcw size={14} />
            <span>Actualizar</span>
          </button>
        </div>

        {actaRecienGuardada && (
          <div className="alert alert-success d-flex flex-wrap justify-content-between align-items-center gap-2 py-2 mb-4">
            <div className="d-flex align-items-center gap-2 small">
              <CheckCircle2 size={18} className="flex-shrink-0" />
              <span>
                Acta <strong>{actaRecienGuardada.codigo_folio}</strong> guardada en PostgreSQL. El proyecto{" "}
                <strong>{actaRecienGuardada.folio_proyecto}</strong> pasó automáticamente a etapa{" "}
                <strong>Entregado</strong>.
              </span>
            </div>
            <button
              type="button"
              className="btn-close btn-sm"
              onClick={() => setActaRecienGuardada(null)}
            />
          </div>
        )}

        {/* ===== 1. FORMULARIO DE ACTA DE ENTREGA CON FIRMA EN CANVAS ===== */}
        <form onSubmit={registrarActa} className="card shadow-sm border-0 mb-4">
          <div className="card-body p-4">
            <h5 className="fw-bold text-dark mb-3">Nueva Acta de Recepción de Equipo</h5>

            {!cargandoDatos && proyectosPendientes.length === 0 && (
              <div className="alert alert-info py-2 small d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <span>
                  No hay proyectos aprobados pendientes de entrega en este momento. Cuando apruebes un proyecto en{" "}
                  <strong>Ventas y Proyectos</strong>, aparecerá aquí listo para su entrega.
                </span>
                {alIrAVentas && (
                  <button
                    type="button"
                    onClick={alIrAVentas}
                    className="btn btn-primary btn-sm fw-semibold"
                  >
                    Ir a Ventas y Proyectos
                  </button>
                )}
              </div>
            )}

            <div className="row g-3">
              <div className="col-12">
                <label className="form-label fw-semibold small text-dark mb-1">
                  Proyecto aprobado a entregar <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={id_proyecto}
                  onChange={(e) => {
                    setIdProyecto(e.target.value);
                    setMensajeError("");
                  }}
                  required
                >
                  <option value="">— Selecciona un proyecto APROBADO pendiente de entrega —</option>
                  {proyectosPendientes.map((p) => (
                    <option key={p.id_proyecto} value={p.id_proyecto}>
                      {p.codigo_folio} • {p.nombre_proyecto} —{" "}
                      {p.nombre_cliente || "Sin cliente"} (Etapa: {p.etapa_fabricacion})
                    </option>
                  ))}
                </select>

                {proyectoSeleccionadoObj && (
                  <div className="mt-2 p-2 px-3 rounded bg-light border small d-flex flex-wrap gap-3 text-secondary">
                    <span>
                      <Building2 size={14} className="me-1 text-primary" />
                      <strong>Cliente:</strong>{" "}
                      {proyectoSeleccionadoObj.nombre_cliente || "Sin cliente asignado"}
                    </span>
                    <span>
                      <strong>Etapa actual:</strong> {proyectoSeleccionadoObj.etapa_fabricacion}
                    </span>
                    {proyectoSeleccionadoObj.fecha_compromiso_entrega && (
                      <span>
                        <Calendar size={14} className="me-1" />
                        <strong>Fecha compromiso:</strong>{" "}
                        {proyectoSeleccionadoObj.fecha_compromiso_entrega}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold small text-dark mb-1">
                  Nombre completo de quien recibe <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  maxLength={150}
                  className="form-control"
                  value={nombre_receptor}
                  onChange={(e) => setNombreReceptor(e.target.value)}
                  placeholder="Ej. Ing. Roberto Méndez"
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold small text-dark mb-1">
                  Puesto / Cargo de quien recibe{" "}
                  <span className="text-secondary fw-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  maxLength={120}
                  className="form-control"
                  value={puesto_receptor}
                  onChange={(e) => setPuestoReceptor(e.target.value)}
                  placeholder="Ej. Jefe de Mantenimiento / Almacén"
                />
              </div>

              <div className="col-12">
                <label className="form-label fw-semibold small text-dark mb-1">
                  Observaciones de entrega
                </label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Condiciones físicas del tanque, empaques, manuales entregados..."
                />
              </div>

              <div className="col-12">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label fw-semibold small text-dark mb-0">
                    Firma digital de conformidad (dibuja con el mouse o el dedo){" "}
                    <span className="text-danger">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={limpiarFirma}
                    className="btn btn-outline-secondary btn-sm py-0 px-2"
                  >
                    Limpiar firma
                  </button>
                </div>
                <canvas
                  ref={lienzoRef}
                  width="640"
                  height="190"
                  className="border border-2 rounded bg-white w-100"
                  style={{ touchAction: "none", cursor: "crosshair", maxHeight: "190px" }}
                  onPointerDown={empezarFirma}
                  onPointerMove={dibujarFirma}
                  onPointerUp={terminarFirma}
                  onPointerLeave={terminarFirma}
                />
              </div>
            </div>

            {mensajeError && (
              <div className="alert alert-danger py-2 small mt-3 mb-0 d-flex align-items-center gap-2">
                <AlertTriangle size={17} />
                <span>{mensajeError}</span>
              </div>
            )}

            <div className="mt-3">
              <button
                type="submit"
                disabled={guardando || proyectosPendientes.length === 0}
                className="btn btn-success px-4 py-2 fw-bold d-inline-flex align-items-center gap-2"
              >
                {guardando ? (
                  <>
                    <Loader2 size={18} className="mb-spinner" />
                    <span>Guardando acta en PostgreSQL...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Guardar Acta y Marcar como Entregado</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* ===== 2. HISTORIAL DE ACTAS FIRMADAS EN POSTGRESQL ===== */}
        <div className="card shadow-sm border-0">
          <div className="card-body p-3 p-md-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <History size={19} className="text-primary" />
              <div>
                <h5 className="fw-bold text-dark mb-0">Historial de Actas de Entrega Firmadas</h5>
                <small className="text-secondary">
                  Respaldo permanente de recepciones de equipos registradas en base de datos.
                </small>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Folio Acta / Fecha</th>
                    <th>Proyecto Entregado</th>
                    <th>Cliente</th>
                    <th>Recibió</th>
                    <th>Observaciones</th>
                    <th className="text-end">Firma Digital</th>
                  </tr>
                </thead>
                <tbody>
                  {cargandoDatos && (
                    <tr>
                      <td colSpan="6" className="text-center text-secondary py-4">
                        Cargando historial de actas...
                      </td>
                    </tr>
                  )}

                  {!cargandoDatos &&
                    actas.map((acta) => (
                      <tr key={acta.id_acta}>
                        <td className="text-nowrap">
                          <div className="font-monospace fw-bold text-dark">
                            {acta.codigo_folio}
                          </div>
                          <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                            {formatearFechaHora(acta.fecha_entrega)}
                          </div>
                        </td>
                        <td>
                          {acta.folio_proyecto && (
                            <span className="badge text-bg-dark font-monospace me-1">
                              {acta.folio_proyecto}
                            </span>
                          )}
                          <span className="fw-semibold text-dark">
                            {acta.nombre_proyecto || "Proyecto desvinculado"}
                          </span>
                        </td>
                        <td>{acta.nombre_cliente || "—"}</td>
                        <td>
                          <div className="fw-semibold text-dark">{acta.nombre_receptor}</div>
                          {acta.puesto_receptor && (
                            <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                              {acta.puesto_receptor}
                            </div>
                          )}
                        </td>
                        <td style={{ maxWidth: "220px" }}>
                          <span className="text-secondary">
                            {acta.observaciones || "Sin observaciones"}
                          </span>
                        </td>
                        <td className="text-end text-nowrap">
                          <div className="d-inline-flex align-items-center gap-2">
                            {acta.firma_base64 && (
                              <img
                                src={acta.firma_base64}
                                alt={`Firma ${acta.codigo_folio}`}
                                className="border rounded bg-white"
                                style={{ height: "36px", width: "95px", objectFit: "contain" }}
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => setActaVistaFirma(acta)}
                              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                            >
                              <Eye size={14} />
                              <span>Ver</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {!cargandoDatos && actas.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center text-secondary py-4">
                        Aún no hay actas de entrega registradas en la base de datos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal para visualizar comprobante completo del acta y su firma */}
        {actaVistaFirma && (
          <div
            className="modal d-block"
            tabIndex="-1"
            role="dialog"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header bg-dark text-white">
                  <div>
                    <h5 className="modal-title fw-bold mb-0">
                      Comprobante de Entrega • {actaVistaFirma.codigo_folio}
                    </h5>
                    <small className="text-white-50">
                      {formatearFechaHora(actaVistaFirma.fecha_entrega)}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setActaVistaFirma(null)}
                  />
                </div>
                <div className="modal-body p-4 small">
                  <p className="mb-1">
                    <strong>Proyecto:</strong> {actaVistaFirma.folio_proyecto || ""}{" "}
                    {actaVistaFirma.nombre_proyecto || "—"}
                  </p>
                  <p className="mb-1">
                    <strong>Cliente:</strong> {actaVistaFirma.nombre_cliente || "—"}
                  </p>
                  <p className="mb-1">
                    <strong>Recibió:</strong> {actaVistaFirma.nombre_receptor}
                    {actaVistaFirma.puesto_receptor
                      ? ` (${actaVistaFirma.puesto_receptor})`
                      : ""}
                  </p>
                  <p className="mb-3">
                    <strong>Observaciones:</strong>{" "}
                    {actaVistaFirma.observaciones || "Sin observaciones"}
                  </p>

                  <div className="fw-semibold text-dark mb-1">Firma digital registrada:</div>
                  <div className="border rounded-3 bg-white p-2 text-center">
                    <img
                      src={actaVistaFirma.firma_base64}
                      alt="Firma de conformidad"
                      className="img-fluid"
                      style={{ maxHeight: "190px" }}
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    onClick={() => setActaVistaFirma(null)}
                    className="btn btn-dark btn-sm px-3"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActaEntregaLogistica;
