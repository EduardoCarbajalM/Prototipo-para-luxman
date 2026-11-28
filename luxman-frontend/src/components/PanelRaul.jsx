import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Layers,
  Calculator,
  Trash2,
  Send,
  Settings2,
} from 'lucide-react';
import FormularioCotizacion from './FormularioCotizacion';
import ChatMemebretes from './ChatMemebretes';
import VentasProyectos, { SECTORES_LUXMAN } from './VentasProyectos';
import { URL_BASE, obtenerTokenAdmin } from '../api';

// ---------- SUBMÓDULO 1: DASHBOARD EJECUTIVO (PLACEHOLDER) ----------
function DashboardEjecutivo({ alCambiarSubmodulo }) {
  return (
    <div className="p-4">
      <div className="card shadow-sm border-0 p-4 p-md-5 text-center mx-auto" style={{ maxWidth: '760px' }}>
        <div className="mb-3 text-primary">
          <Layers size={42} strokeWidth={2} />
        </div>
        <h3 className="fw-bold text-dark mb-2">Dashboard Ejecutivo Luxman</h3>
        <p className="text-secondary mb-4">
          Este panel concentrará las métricas en tiempo real de ingresos, anticipos recibidos,
          conversión de solicitudes y carga de fabricación en planta. Se conectará en el siguiente paso.
        </p>
        <div className="d-flex flex-wrap justify-content-center gap-2">
          <button
            type="button"
            onClick={() => alCambiarSubmodulo('cotizador')}
            className="btn btn-primary d-inline-flex align-items-center gap-2"
          >
            <Calculator size={16} />
            <span>Ir a Calculadora Técnica</span>
          </button>
          <button
            type="button"
            onClick={() => alCambiarSubmodulo('solicitudes')}
            className="btn btn-outline-dark"
          >
            Ver Solicitudes Clientes
          </button>
          <button
            type="button"
            onClick={() => alCambiarSubmodulo('ventas')}
            className="btn btn-outline-primary"
          >
            Ir a Ventas y Proyectos
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- SUBMÓDULO 6: DIRECTORIO DE CLIENTES (POSTGRESQL REAL) ----------
function DirectorioClientes() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const [sectorFiltro, setSectorFiltro] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');

  // Estado para alta o edición de cliente (null = cerrado, 'nuevo' = alta, id_cliente = edición)
  const [modoEditor, setModoEditor] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [formCliente, setFormCliente] = useState({
    nombre_cliente: '',
    sector: 'Agroalimentaria',
    rfc_cliente: '',
    telefono: '',
    correo: '',
  });

  const cargarClientes = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await fetch(`${URL_BASE}/api/clientes`);
      if (!respuesta.ok) throw new Error();
      const datos = await respuesta.json();
      setClientes(Array.isArray(datos) ? datos : []);
      setError('');
    } catch {
      setError('No se pudo cargar el directorio de clientes desde PostgreSQL.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const abrirNuevo = () => {
    setModoEditor('nuevo');
    setFormCliente({
      nombre_cliente: '',
      sector: 'Agroalimentaria',
      rfc_cliente: '',
      telefono: '',
      correo: '',
    });
    setError('');
  };

  const abrirEdicion = (cl) => {
    setModoEditor(cl.id_cliente);
    setFormCliente({
      nombre_cliente: cl.nombre_cliente || '',
      sector: cl.sector || 'Otro',
      rfc_cliente: cl.rfc_cliente || '',
      telefono: cl.telefono || '',
      correo: cl.correo || '',
    });
    setError('');
  };

  const guardarCliente = async (evento) => {
    evento.preventDefault();
    if (!formCliente.nombre_cliente.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }

    setGuardando(true);
    setError('');
    try {
      const esNuevo = modoEditor === 'nuevo';
      const url = esNuevo
        ? `${URL_BASE}/api/clientes`
        : `${URL_BASE}/api/clientes/${modoEditor}`;
      const metodo = esNuevo ? 'POST' : 'PUT';

      const respuesta = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_cliente: formCliente.nombre_cliente.trim(),
          sector: formCliente.sector,
          rfc_cliente: formCliente.rfc_cliente.trim() || null,
          telefono: formCliente.telefono.trim() || null,
          correo: formCliente.correo.trim() || null,
        }),
      });

      if (!respuesta.ok) {
        throw new Error((await respuesta.text()) || 'No se pudo guardar el cliente.');
      }

      setAviso(esNuevo ? 'Cliente agregado al directorio.' : 'Datos del cliente actualizados.');
      setModoEditor(null);
      await cargarClientes();
    } catch (err) {
      setError(err.message || 'Error al guardar el cliente.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCliente = async (cl) => {
    if (!window.confirm(`¿Eliminar a "${cl.nombre_cliente}" del directorio?`)) return;
    try {
      const respuesta = await fetch(`${URL_BASE}/api/clientes/${cl.id_cliente}`, {
        method: 'DELETE',
      });
      if (!respuesta.ok) throw new Error(await respuesta.text());
      setAviso(`Cliente "${cl.nombre_cliente}" eliminado.`);
      if (modoEditor === cl.id_cliente) setModoEditor(null);
      await cargarClientes();
    } catch (err) {
      setError('No se pudo eliminar el cliente: ' + err.message);
    }
  };

  const clientesFiltrados = clientes.filter((cl) => {
    const cumpleSector = sectorFiltro === 'Todos' || (cl.sector || 'Otro') === sectorFiltro;
    const termino = busqueda.trim().toLowerCase();
    const cumpleBusqueda =
      !termino ||
      (cl.nombre_cliente || '').toLowerCase().includes(termino) ||
      (cl.rfc_cliente || '').toLowerCase().includes(termino) ||
      (cl.correo || '').toLowerCase().includes(termino);
    return cumpleSector && cumpleBusqueda;
  });

  return (
    <div className="p-3 p-md-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h3 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <Building2 size={24} className="text-primary" />
            <span>Directorio de Clientes</span>
          </h3>
          <p className="text-secondary small mb-0">
            Catálogo real conectado a PostgreSQL con clasificación por sector industrial y datos fiscales/contacto.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button type="button" onClick={abrirNuevo} className="btn btn-primary btn-sm fw-semibold">
            + Nuevo cliente
          </button>
          <button
            type="button"
            onClick={cargarClientes}
            disabled={cargando}
            className="btn btn-outline-secondary btn-sm"
          >
            Actualizar
          </button>
        </div>
      </div>

      {aviso && (
        <div className="alert alert-success py-2 small d-flex justify-content-between align-items-center">
          <span>{aviso}</span>
          <button type="button" className="btn-close btn-sm" onClick={() => setAviso('')} />
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 small d-flex align-items-center gap-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {modoEditor !== null && (
        <form onSubmit={guardarCliente} className="card shadow-sm border-primary-subtle mb-4">
          <div className="card-body p-3 p-md-4">
            <h6 className="fw-bold text-dark mb-3">
              {modoEditor === 'nuevo' ? 'Registrar Nuevo Cliente' : 'Editar Datos del Cliente'}
            </h6>
            <div className="row g-3">
              <div className="col-md-5">
                <label className="form-label fw-semibold small mb-1">Nombre / Razón social *</label>
                <input
                  type="text"
                  maxLength={150}
                  required
                  className="form-control form-control-sm"
                  value={formCliente.nombre_cliente}
                  onChange={(e) =>
                    setFormCliente((prev) => ({ ...prev, nombre_cliente: e.target.value }))
                  }
                />
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold small mb-1">Sector industrial</label>
                <select
                  className="form-select form-select-sm"
                  value={formCliente.sector}
                  onChange={(e) => setFormCliente((prev) => ({ ...prev, sector: e.target.value }))}
                >
                  {SECTORES_LUXMAN.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold small mb-1">RFC</label>
                <input
                  type="text"
                  maxLength={20}
                  className="form-control form-control-sm text-uppercase"
                  placeholder="Opcional"
                  value={formCliente.rfc_cliente}
                  onChange={(e) =>
                    setFormCliente((prev) => ({
                      ...prev,
                      rfc_cliente: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold small mb-1">Teléfono</label>
                <input
                  type="text"
                  maxLength={30}
                  className="form-control form-control-sm"
                  placeholder="Opcional"
                  value={formCliente.telefono}
                  onChange={(e) => setFormCliente((prev) => ({ ...prev, telefono: e.target.value }))}
                />
              </div>

              <div className="col-md-5">
                <label className="form-label fw-semibold small mb-1">Correo electrónico</label>
                <input
                  type="email"
                  maxLength={150}
                  className="form-control form-control-sm"
                  placeholder="Opcional"
                  value={formCliente.correo}
                  onChange={(e) => setFormCliente((prev) => ({ ...prev, correo: e.target.value }))}
                />
              </div>

              <div className="col-md-3 d-flex align-items-end gap-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="btn btn-success btn-sm fw-semibold flex-grow-1"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setModoEditor(null)}
                  className="btn btn-outline-secondary btn-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <div className="row g-3 mb-3">
        <div className="col-md-5">
          <label className="form-label fw-semibold small mb-1">Filtrar por sector</label>
          <select
            className="form-select"
            value={sectorFiltro}
            onChange={(e) => setSectorFiltro(e.target.value)}
          >
            <option value="Todos">Todos los sectores</option>
            {SECTORES_LUXMAN.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-7">
          <label className="form-label fw-semibold small mb-1">Buscar cliente</label>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por empresa, RFC o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Cliente / Razón Social</th>
                <th>Sector</th>
                <th>RFC</th>
                <th>Contacto</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan="6" className="text-center text-secondary py-4">
                    <Loader2 size={18} className="mb-spinner me-2" />
                    Cargando clientes...
                  </td>
                </tr>
              )}

              {!cargando &&
                clientesFiltrados.map((cl, idx) => (
                  <tr key={cl.id_cliente}>
                    <td>{idx + 1}</td>
                    <td className="fw-semibold text-dark">{cl.nombre_cliente}</td>
                    <td>
                      <span className="badge text-bg-light border text-dark">
                        {cl.sector || 'Otro'}
                      </span>
                    </td>
                    <td className="font-monospace">{cl.rfc_cliente || '—'}</td>
                    <td>
                      {cl.correo && (
                        <a href={`mailto:${cl.correo}`} className="d-block text-break">
                          {cl.correo}
                        </a>
                      )}
                      {cl.telefono && <a href={`tel:${cl.telefono}`}>{cl.telefono}</a>}
                      {!cl.correo && !cl.telefono && <span className="text-secondary">—</span>}
                    </td>
                    <td className="text-end text-nowrap">
                      <div className="d-inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => abrirEdicion(cl)}
                          className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                        >
                          <Settings2 size={14} />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarCliente(cl)}
                          className="btn btn-outline-danger btn-sm"
                          title="Eliminar cliente"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!cargando && clientesFiltrados.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-secondary py-4">
                    No hay clientes registrados con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------- SUBMÓDULO 4: SOLICITUDES CLIENTES (FORMULARIO DE LA LANDING) ----------
function SolicitudesClientes({ alSesionExpirada, alConvertirAProyecto }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('pendientes');
  const [idConvirtiendo, setIdConvirtiendo] = useState(null);

  const cabeceras = () => ({
    'Content-Type': 'application/json',
    'X-Admin-Token': obtenerTokenAdmin(),
  });

  const cargar = useCallback(async () => {
    try {
      const respuesta = await fetch(`${URL_BASE}/api/solicitudes`, { headers: cabeceras() });
      if (respuesta.status === 401) {
        alSesionExpirada();
        return;
      }
      if (!respuesta.ok) throw new Error();
      setSolicitudes(await respuesta.json());
      setError('');
    } catch {
      setError('No se pudieron cargar las solicitudes. Verifica la conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  }, [alSesionExpirada]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarAtendida = async (solicitud) => {
    const nuevoValor = !solicitud.atendida;
    try {
      const respuesta = await fetch(
        `${URL_BASE}/api/solicitudes/${solicitud.id_solicitud}/atendida`,
        { method: 'PATCH', headers: cabeceras(), body: JSON.stringify({ atendida: nuevoValor }) }
      );
      if (respuesta.status === 401) {
        alSesionExpirada();
        return;
      }
      if (!respuesta.ok) throw new Error();
      setSolicitudes((anteriores) =>
        anteriores.map((s) =>
          s.id_solicitud === solicitud.id_solicitud ? { ...s, atendida: nuevoValor } : s
        )
      );
    } catch {
      setError('No se pudo actualizar la solicitud.');
    }
  };

  // Crea o vincula el cliente en PostgreSQL, marca la solicitud como atendida y abre Ventas y Proyectos
  const convertirSolicitudAProyecto = async (solicitud) => {
    setIdConvirtiendo(solicitud.id_solicitud);
    setError('');
    try {
      const nombreCliente = (solicitud.empresa || '').trim() || solicitud.nombre.trim();

      const resCliente = await fetch(`${URL_BASE}/api/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_cliente: nombreCliente,
          sector: 'Otro',
          telefono: solicitud.telefono,
          correo: solicitud.correo,
        }),
      });

      if (!resCliente.ok) {
        throw new Error((await resCliente.text()) || 'No se pudo vincular el cliente.');
      }

      const clienteVinculado = await resCliente.json();

      if (!solicitud.atendida) {
        const resAtendida = await fetch(
          `${URL_BASE}/api/solicitudes/${solicitud.id_solicitud}/atendida`,
          { method: 'PATCH', headers: cabeceras(), body: JSON.stringify({ atendida: true }) }
        );
        if (resAtendida.status === 401) {
          alSesionExpirada();
          return;
        }
      }

      const descripcionEquipo = solicitud.tipo_equipo
        ? `${solicitud.tipo_equipo} — ${clienteVinculado.nombre_cliente}`
        : `Proyecto para ${clienteVinculado.nombre_cliente}`;

      alConvertirAProyecto({
        id_cliente: clienteVinculado.id_cliente,
        id_solicitud: solicitud.id_solicitud,
        nombre_proyecto: descripcionEquipo,
        sector: clienteVinculado.sector || 'Otro',
      });
    } catch (err) {
      setError(err.message || 'No se pudo convertir la solicitud en proyecto.');
    } finally {
      setIdConvirtiendo(null);
    }
  };

  const visibles = solicitudes.filter((s) => {
    if (filtro === 'pendientes') return !s.atendida;
    if (filtro === 'atendidas') return s.atendida;
    return true;
  });
  const totalPendientes = solicitudes.filter((s) => !s.atendida).length;

  return (
    <div className="p-3 p-md-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h3 className="fw-bold mb-1">Solicitudes Clientes</h3>
          <p className="text-secondary mb-0">
            Prospectos reales recibidos desde la landing page.{' '}
            <strong>{totalPendientes}</strong> pendiente{totalPendientes === 1 ? '' : 's'}.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => {
            setCargando(true);
            cargar();
          }}
        >
          Actualizar
        </button>
      </div>

      <div className="btn-group mb-3" role="group" aria-label="Filtro de solicitudes">
        {[
          ['pendientes', 'Pendientes'],
          ['atendidas', 'Atendidas'],
          ['todas', 'Todas'],
        ].map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            className={`btn btn-sm ${filtro === valor ? 'btn-dark' : 'btn-outline-dark'}`}
            onClick={() => setFiltro(valor)}
          >
            {texto}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      <div className="card shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="table-dark">
              <tr>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>Empresa</th>
                <th>Contacto</th>
                <th>Equipo</th>
                <th style={{ minWidth: '200px' }}>Mensaje</th>
                <th>Estado</th>
                <th className="text-end">Flujo Comercial</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan="8" className="text-center text-secondary py-4">
                    Cargando solicitudes...
                  </td>
                </tr>
              )}
              {!cargando &&
                visibles.map((s) => (
                  <tr key={s.id_solicitud}>
                    <td className="text-nowrap">
                      {new Date(
                        s.fecha_creacion?.endsWith('Z') ? s.fecha_creacion : `${s.fecha_creacion}Z`
                      ).toLocaleString('es-MX', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="fw-semibold">{s.nombre}</td>
                    <td>{s.empresa || <span className="text-secondary">—</span>}</td>
                    <td>
                      <a href={`mailto:${s.correo}`} className="d-block text-break">
                        {s.correo}
                      </a>
                      <a href={`tel:${s.telefono}`}>{s.telefono}</a>
                    </td>
                    <td>{s.tipo_equipo || <span className="text-secondary">—</span>}</td>
                    <td style={{ whiteSpace: 'pre-wrap' }}>
                      {s.mensaje || <span className="text-secondary">—</span>}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => cambiarAtendida(s)}
                        className={`btn btn-sm ${s.atendida ? 'btn-success' : 'btn-outline-warning'}`}
                        title="Cambiar estado"
                      >
                        {s.atendida ? 'Atendida' : 'Pendiente'}
                      </button>
                    </td>
                    <td className="text-end text-nowrap">
                      <button
                        type="button"
                        disabled={idConvirtiendo === s.id_solicitud}
                        onClick={() => convertirSolicitudAProyecto(s)}
                        className="btn btn-primary btn-sm fw-semibold d-inline-flex align-items-center gap-1"
                      >
                        {idConvirtiendo === s.id_solicitud ? (
                          <>
                            <Loader2 size={14} className="mb-spinner" />
                            <span>Vinculando...</span>
                          </>
                        ) : (
                          <>
                            <Send size={13} />
                            <span>Convertir a Proyecto</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              {!cargando && visibles.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center text-secondary py-4">
                    No hay solicitudes en esta vista.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------- SUBMÓDULO 7: ACTA DE ENTREGA LOGÍSTICA ----------
function ActaEntrega() {
  const lienzoRef = useRef(null);
  const [dibujando, setDibujando] = useState(false);
  const [hayFirma, setHayFirma] = useState(false);

  const [cliente, setCliente] = useState('');
  const [nombreRecibe, setNombreRecibe] = useState('');
  const [equipo, setEquipo] = useState('Tanque de Proceso y Almacén');
  const [observaciones, setObservaciones] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [actaRegistrada, setActaRegistrada] = useState(null);

  const obtenerPosicion = (evento) => {
    const lienzo = lienzoRef.current;
    const caja = lienzo.getBoundingClientRect();
    return {
      x: (evento.clientX - caja.left) * (lienzo.width / caja.width),
      y: (evento.clientY - caja.top) * (lienzo.height / caja.height),
    };
  };

  const empezarFirma = (evento) => {
    const contexto = lienzoRef.current.getContext('2d');
    const posicion = obtenerPosicion(evento);
    contexto.lineWidth = 3;
    contexto.lineCap = 'round';
    contexto.strokeStyle = '#0f172a';
    contexto.beginPath();
    contexto.moveTo(posicion.x, posicion.y);
    setDibujando(true);
  };

  const dibujarFirma = (evento) => {
    if (!dibujando) return;
    const contexto = lienzoRef.current.getContext('2d');
    const posicion = obtenerPosicion(evento);
    contexto.lineTo(posicion.x, posicion.y);
    contexto.stroke();
    setHayFirma(true);
  };

  const terminarFirma = () => setDibujando(false);

  const limpiarFirma = () => {
    const lienzo = lienzoRef.current;
    lienzo.getContext('2d').clearRect(0, 0, lienzo.width, lienzo.height);
    setHayFirma(false);
  };

  const registrarActa = (evento) => {
    evento.preventDefault();

    if (!cliente.trim() || !nombreRecibe.trim()) {
      setMensajeError('Completa el cliente y el nombre de quien recibe.');
      return;
    }
    if (!hayFirma) {
      setMensajeError('Falta la firma digital de recepción.');
      return;
    }

    setMensajeError('');
    setActaRegistrada({
      folio: 'ACTA-00001',
      fecha: new Date().toLocaleString('es-MX'),
      cliente,
      nombreRecibe,
      equipo,
      observaciones,
      firma: lienzoRef.current.toDataURL('image/png'),
    });
  };

  const nuevaActa = () => {
    setActaRegistrada(null);
    setCliente('');
    setNombreRecibe('');
    setObservaciones('');
    setHayFirma(false);
  };

  if (actaRegistrada) {
    return (
      <div className="p-4">
        <h3 className="fw-bold mb-3">Acta de Entrega Logística</h3>
        <div className="alert alert-success">
          Acta <strong>{actaRegistrada.folio}</strong> registrada correctamente el {actaRegistrada.fecha}.
        </div>
        <div className="card shadow-sm">
          <div className="card-body">
            <p className="mb-1"><strong>Cliente:</strong> {actaRegistrada.cliente}</p>
            <p className="mb-1"><strong>Recibe:</strong> {actaRegistrada.nombreRecibe}</p>
            <p className="mb-1"><strong>Equipo entregado:</strong> {actaRegistrada.equipo}</p>
            <p className="mb-3"><strong>Observaciones:</strong> {actaRegistrada.observaciones || 'Sin observaciones'}</p>
            <p className="fw-semibold mb-1">Firma de recepción:</p>
            <img
              src={actaRegistrada.firma}
              alt="Firma de recepción"
              className="border rounded bg-white img-fluid"
              style={{ maxWidth: '400px' }}
            />
          </div>
        </div>
        <button className="btn btn-primary mt-3" onClick={nuevaActa}>
          Nueva acta
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="fw-bold mb-1">Acta de Entrega Logística</h3>
      <p className="text-secondary mb-4">
        Recepción de equipo con firma digital en sitio.
      </p>

      <form onSubmit={registrarActa} className="card shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Cliente</label>
              <input
                type="text"
                className="form-control"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Ej. Cosméticos Naturales Ideal SA de CV"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Nombre de quien recibe</label>
              <input
                type="text"
                className="form-control"
                value={nombreRecibe}
                onChange={(e) => setNombreRecibe(e.target.value)}
                placeholder="Nombre completo"
              />
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold">Equipo entregado</label>
              <select
                className="form-select"
                value={equipo}
                onChange={(e) => setEquipo(e.target.value)}
              >
                <option>Tanque de Proceso y Almacén</option>
                <option>Tanque Enchaquetado</option>
                <option>Marmita Industrial</option>
                <option>Reactor Químico</option>
                <option>Mezcladora de Doble Listón</option>
                <option>Agitador Industrial</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold">Observaciones</label>
              <textarea
                className="form-control"
                rows="2"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Estado del equipo, detalles de la entrega..."
              />
            </div>

            <div className="col-12">
              <label className="form-label fw-semibold">Firma digital (dibuja con el mouse o el dedo)</label>
              <canvas
                ref={lienzoRef}
                width="600"
                height="200"
                className="border border-2 rounded bg-white w-100"
                style={{ touchAction: 'none', cursor: 'crosshair' }}
                onPointerDown={empezarFirma}
                onPointerMove={dibujarFirma}
                onPointerUp={terminarFirma}
                onPointerLeave={terminarFirma}
              />
              <button
                type="button"
                onClick={limpiarFirma}
                className="btn btn-outline-secondary btn-sm mt-2"
              >
                Limpiar firma
              </button>
            </div>
          </div>

          {mensajeError && (
            <div className="alert alert-danger mt-3 mb-0">{mensajeError}</div>
          )}

          <button type="submit" className="btn btn-success btn-lg mt-3">
            Registrar entrega
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- CONTENEDOR PRINCIPAL DEL PANEL DEL ING. RAÚL ----------
function PanelRaul({ alCerrarSesion }) {
  // Vista activa por defecto: Calculadora Técnica ('cotizador')
  const [submoduloActual, setSubmoduloActual] = useState('cotizador');
  const [borradorProyecto, setBorradorProyecto] = useState(null);

  // Orden exacto de las 7 opciones solicitado
  const opcionesMenu = [
    { id: 'dashboard', texto: 'Dashboard Ejecutivo' },
    { id: 'cotizador', texto: 'Calculadora Técnica' },
    { id: 'memebretes', texto: 'Generador de Membretes' },
    { id: 'solicitudes', texto: 'Solicitudes Clientes' },
    { id: 'ventas', texto: 'Ventas y Proyectos' },
    { id: 'crm', texto: 'Directorio de Clientes' },
    { id: 'acta', texto: 'Acta de Entrega Logística' },
  ];

  const manejarConvertirSolicitud = (datosPrecargados) => {
    setBorradorProyecto(datosPrecargados);
    setSubmoduloActual('ventas');
  };

  return (
    <div className="row g-0 min-vh-100">
      {/* ===== SIDEBAR ===== */}
      <aside className="col-12 col-md-3 col-lg-2 bg-dark text-white d-flex flex-column p-3">
        <h5 className="fw-bold mb-0">LUXMAN ERP</h5>
        <small className="text-secondary mb-4">Panel del Ing. Raúl Romero</small>

        <ul className="nav nav-pills flex-column gap-1 mb-4">
          {opcionesMenu.map((opcion) => (
            <li className="nav-item" key={opcion.id}>
              <button
                type="button"
                onClick={() => setSubmoduloActual(opcion.id)}
                className={`nav-link w-100 text-start ${
                  submoduloActual === opcion.id ? 'active' : 'text-white'
                }`}
              >
                {opcion.texto}
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={alCerrarSesion}
          className="btn btn-outline-light btn-sm mt-md-auto"
        >
          Cerrar sesión
        </button>
      </aside>

      {/* ===== CONTENIDO ===== */}
      <main className="col bg-light overflow-auto">
        <motion.div
          key={submoduloActual}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {submoduloActual === 'dashboard' && (
            <DashboardEjecutivo alCambiarSubmodulo={setSubmoduloActual} />
          )}
          {submoduloActual === 'cotizador' && <FormularioCotizacion />}
          {submoduloActual === 'memebretes' && <ChatMemebretes />}
          {submoduloActual === 'solicitudes' && (
            <SolicitudesClientes
              alSesionExpirada={alCerrarSesion}
              alConvertirAProyecto={manejarConvertirSolicitud}
            />
          )}
          {submoduloActual === 'ventas' && (
            <VentasProyectos
              borradorInicial={borradorProyecto}
              alConsumirBorrador={() => setBorradorProyecto(null)}
            />
          )}
          {submoduloActual === 'crm' && <DirectorioClientes />}
          {submoduloActual === 'acta' && <ActaEntrega />}
        </motion.div>
      </main>
    </div>
  );
}

export default PanelRaul;
