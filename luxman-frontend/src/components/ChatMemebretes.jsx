import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText,
  ZoomIn,
  ZoomOut,
  Download,
  SendHorizontal,
  History,
  Sparkles,
  Calendar,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Building2,
  CheckCircle2,
  FileCheck2,
} from 'lucide-react';
import './ChatMemebretes.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5294';
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_PASO = 0.25;
const ALTO_BASE = 620;

const MENSAJE_INICIAL = {
  id: 'ia-inicial',
  rol: 'ia',
  tipo: 'texto',
  texto: 'Por favor inserta tu texto completo aquí',
};

// Descarga el PDF desde la API y lo convierte en una URL local para el visor
async function cargarPdf(id) {
  const r = await fetch(`${API}/api/memebretes/${id}/pdf`);
  if (!r.ok) throw new Error('No se pudo cargar el PDF.');
  return URL.createObjectURL(await r.blob());
}

async function leerError(r) {
  const t = await r.text();
  try {
    const j = JSON.parse(t);
    return typeof j === 'string' ? j : j.title || j.mensaje || t;
  } catch {
    return t || `Error ${r.status}`;
  }
}

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

/* ---------------- Visor PDF con zoom y descarga ---------------- */
function VisorPdf({ url, nombre }) {
  const [zoom, setZoom] = useState(1);

  const descargar = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre || 'cotizacion.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="mb-visor">
      <div className="mb-visor-barra">
        <div className="mb-visor-info">
          <span className="mb-visor-icono-doc">
            <FileText size={16} strokeWidth={2} />
          </span>
          <span className="mb-visor-nombre" title={nombre}>
            {nombre}
          </span>
          <span className="mb-visor-badge">PDF Editable</span>
        </div>

        <div className="mb-visor-controles">
          <div className="mb-zoom-grupo" role="group" aria-label="Controles de zoom">
            <button
              id="btn-zoom-out"
              type="button"
              className="mb-icono"
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_PASO).toFixed(2)))}
              disabled={zoom <= ZOOM_MIN}
              aria-label="Zoom out"
              title="Reducir zoom"
            >
              <ZoomOut size={16} strokeWidth={2} />
            </button>
            <span className="mb-zoom-valor">{Math.round(zoom * 100)}%</span>
            <button
              id="btn-zoom-in"
              type="button"
              className="mb-icono"
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_PASO).toFixed(2)))}
              disabled={zoom >= ZOOM_MAX}
              aria-label="Zoom in"
              title="Aumentar zoom"
            >
              <ZoomIn size={16} strokeWidth={2} />
            </button>
          </div>

          <button
            id="btn-descargar"
            type="button"
            className="mb-descargar"
            onClick={descargar}
          >
            <Download size={16} strokeWidth={2} />
            <span>Descargar PDF</span>
          </button>
        </div>
      </div>

      <div className="mb-visor-lienzo">
        <iframe
          title={nombre}
          src={`${url}#navpanes=0&view=FitH`}
          style={{ width: `${zoom * 100}%`, height: `${ALTO_BASE * zoom}px` }}
        />
      </div>
    </div>
  );
}

/* ---------------- Vista: Generar PDF (chat) ---------------- */
function VistaChat() {
  const [mensajes, setMensajes] = useState([MENSAJE_INICIAL]);
  const [entrada, setEntrada] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ultimoId, setUltimoId] = useState(null);
  const contador = useRef(0);
  const finRef = useRef(null);
  const areaRef = useRef(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensajes]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [entrada]);

  const siguienteId = () => `m-${++contador.current}`;

  const enviar = useCallback(async () => {
    const texto = entrada.trim();
    if (!texto || enviando) return;

    const idCarga = siguienteId();
    setEntrada('');
    setEnviando(true);
    setMensajes((m) => [
      ...m,
      { id: siguienteId(), rol: 'usuario', tipo: 'texto', texto },
      { id: idCarga, rol: 'ia', tipo: 'cargando' },
    ]);

    const reemplazar = (nuevo) =>
      setMensajes((m) => m.map((x) => (x.id === idCarga ? { ...nuevo, id: idCarga, rol: 'ia' } : x)));

    try {
      const r = await fetch(`${API}/api/memebretes/procesar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: texto, idDocumentoActual: ultimoId }),
      });
      if (!r.ok) throw new Error(await leerError(r));

      const data = await r.json();
      const url = await cargarPdf(data.id);
      setUltimoId(data.id);
      reemplazar({
        tipo: 'pdf',
        texto: data.mensaje,
        pdf: { url, nombre: data.nombreArchivo },
      });
    } catch (e) {
      reemplazar({ tipo: 'error', texto: e.message || 'Ocurrió un error inesperado.' });
    } finally {
      setEnviando(false);
    }
  }, [entrada, enviando, ultimoId]);

  const alTeclear = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <>
      <div className="mb-mensajes" id="chat-mensajes">
        {mensajes.map((m) => (
          <div key={m.id} className={`mb-fila mb-fila-${m.rol}`}>
            {m.rol === 'ia' && (
              <div className="mb-avatar" title="Asistente Luxman">
                <Sparkles size={16} strokeWidth={2} />
              </div>
            )}
            <div
              className={`mb-burbuja mb-burbuja-${m.rol} ${
                m.tipo === 'error' ? 'mb-error' : ''
              } ${m.tipo === 'pdf' ? 'mb-burbuja-pdf' : ''}`}
            >
              {m.tipo === 'cargando' && (
                <div className="mb-escribiendo" aria-label="Generando PDF">
                  <Loader2 size={16} className="mb-spinner" />
                  <span className="mb-escribiendo-texto">Generando documento con membrete…</span>
                </div>
              )}
              {m.tipo !== 'cargando' && m.texto && (
                <div className="mb-texto-contenedor">
                  {m.tipo === 'error' && (
                    <AlertCircle size={18} strokeWidth={2} className="mb-icono-estado-error" />
                  )}
                  {m.tipo === 'pdf' && (
                    <CheckCircle2 size={18} strokeWidth={2} className="mb-icono-estado-ok" />
                  )}
                  <p className="mb-texto">{m.texto}</p>
                </div>
              )}
              {m.tipo === 'pdf' && <VisorPdf url={m.pdf.url} nombre={m.pdf.nombre} />}
            </div>
          </div>
        ))}
        <div ref={finRef} />
      </div>

      <div className="mb-entrada-wrapper">
        <form
          className="mb-entrada"
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          <textarea
            id="chat-input"
            ref={areaRef}
            rows={1}
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={alTeclear}
            placeholder={
              ultimoId
                ? 'Pega un texto nuevo o escribe: "corrige solo el precio a $15,000"'
                : 'Pega aquí el texto de la cotización…'
            }
            disabled={enviando}
          />
          <button
            id="chat-enviar"
            type="submit"
            className="mb-enviar"
            disabled={enviando || !entrada.trim()}
            aria-label="Enviar"
            title="Enviar mensaje"
          >
            {enviando ? (
              <Loader2 size={18} strokeWidth={2} className="mb-spinner" />
            ) : (
              <SendHorizontal size={18} strokeWidth={2} />
            )}
          </button>
        </form>
        <div className="mb-entrada-pie">
          <span>Presiona <strong>Enter</strong> para enviar o <strong>Shift + Enter</strong> para salto de línea</span>
          {ultimoId && (
            <span className="mb-estado-doc-activo">
              <FileCheck2 size={13} strokeWidth={2} /> Documento activo listo para correcciones
            </span>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------- Vista: Historial de PDF ---------------- */
function VistaHistorial() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(null); // { id, url, nombre }
  const [cargandoId, setCargandoId] = useState(null);

  useEffect(() => {
    let vivo = true;
    fetch(`${API}/api/memebretes`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await leerError(r));
        return r.json();
      })
      .then((d) => vivo && setItems(d))
      .catch((e) => vivo && setError(e.message));
    return () => {
      vivo = false;
    };
  }, []);

  const ver = async (it) => {
    setCargandoId(it.id);
    try {
      const url = await cargarPdf(it.id);
      const fecha = new Date(it.fecha).toISOString().slice(0, 10).replaceAll('-', '');
      const limpio =
        it.nombreCliente.replace(/[^\p{L}\p{N} ]/gu, '').trim().replaceAll(' ', '_') || 'Cliente';
      setAbierto({ id: it.id, url, nombre: `Cotizacion_${limpio}_${fecha}.pdf` });
    } catch (e) {
      setError(e.message);
    } finally {
      setCargandoId(null);
    }
  };

  return (
    <div className="mb-historial" id="historial-lista">
      <div className="mb-historial-encabezado">
        <div>
          <h2>Historial de Cotizaciones PDF</h2>
          <p className="mb-historial-subtitulo">
            Consulta, visualiza y descarga los documentos oficiales con membrete almacenados en el sistema.
          </p>
        </div>
        {items && (
          <span className="mb-historial-contador">
            <FileText size={15} strokeWidth={2} />
            {items.length} {items.length === 1 ? 'documento' : 'documentos'}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-aviso mb-error-texto">
          <AlertCircle size={18} strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {!items && !error && (
        <div className="mb-estado-vacio">
          <Loader2 size={24} strokeWidth={2} className="mb-spinner" />
          <p className="mb-aviso">Cargando historial de cotizaciones…</p>
        </div>
      )}

      {items && items.length === 0 && (
        <div className="mb-estado-vacio">
          <div className="mb-estado-vacio-icono">
            <FileText size={28} strokeWidth={1.75} />
          </div>
          <h3>Sin cotizaciones registradas</h3>
          <p className="mb-aviso">Aún no has generado ningún PDF desde el asistente de cotizaciones.</p>
        </div>
      )}

      <div className="mb-lista-items">
        {items?.map((it) => {
          const estaAbierto = abierto?.id === it.id;
          const estaCargando = cargandoId === it.id;
          return (
            <div key={it.id} className={`mb-item ${estaAbierto ? 'activo' : ''}`}>
              <div className="mb-item-cabecera">
                <div className="mb-item-meta">
                  <div className="mb-item-avatar">
                    <User size={18} strokeWidth={2} />
                  </div>
                  <div className="mb-item-textos">
                    <strong>{it.nombreCliente}</strong>
                    <span className="mb-item-fecha">
                      <Calendar size={13} strokeWidth={2} />
                      {formatearFecha(it.fecha)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className={`mb-btn-accion-historial ${estaAbierto ? 'abierto' : ''}`}
                  onClick={() => (estaAbierto ? setAbierto(null) : ver(it))}
                  disabled={estaCargando}
                >
                  {estaCargando ? (
                    <>
                      <Loader2 size={16} strokeWidth={2} className="mb-spinner" />
                      <span>Cargando…</span>
                    </>
                  ) : estaAbierto ? (
                    <>
                      <EyeOff size={16} strokeWidth={2} />
                      <span>Ocultar PDF</span>
                    </>
                  ) : (
                    <>
                      <Eye size={16} strokeWidth={2} />
                      <span>Ver PDF</span>
                    </>
                  )}
                </button>
              </div>
              {estaAbierto && <VisorPdf url={abierto.url} nombre={abierto.nombre} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Contenedor principal ---------------- */
export default function ChatMemebretes() {
  const [vista, setVista] = useState('generar');

  return (
    <div className="mb-app">
      <header className="mb-header">
        <div className="mb-marca">
          <div className="mb-logo">
            <Building2 size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h1>Luxman · Cotizaciones</h1>
            <small>Ing. Raúl Romero Juárez · Sistema de Membretes Ejecutivos</small>
          </div>
        </div>
        <nav className="mb-nav" aria-label="Navegación de membretes">
          <button
            id="btn-generar"
            type="button"
            className={vista === 'generar' ? 'activo' : ''}
            onClick={() => setVista('generar')}
          >
            <Sparkles size={16} strokeWidth={2} />
            <span>1. Generar PDF</span>
          </button>
          <button
            id="btn-historial"
            type="button"
            className={vista === 'historial' ? 'activo' : ''}
            onClick={() => setVista('historial')}
          >
            <History size={16} strokeWidth={2} />
            <span>2. Historial de PDF</span>
          </button>
        </nav>
      </header>

      <main className="mb-main">
        {/* Se mantiene montado para conservar la conversación al ir al historial */}
        <section className="mb-seccion" hidden={vista !== 'generar'}>
          <VistaChat />
        </section>
        {vista === 'historial' && (
          <section className="mb-seccion mb-scroll">
            <VistaHistorial />
          </section>
        )}
      </main>
    </div>
  );
}
