import { useCallback, useEffect, useRef, useState } from 'react';
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
        <span className="mb-visor-nombre" title={nombre}>📄 {nombre}</span>
        <div className="mb-visor-controles">
          <button
            id="btn-zoom-out"
            className="mb-icono"
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_PASO).toFixed(2)))}
            disabled={zoom <= ZOOM_MIN}
            aria-label="Zoom out"
            title="Zoom out"
          >
            −
          </button>
          <span className="mb-zoom-valor">{Math.round(zoom * 100)}%</span>
          <button
            id="btn-zoom-in"
            className="mb-icono"
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_PASO).toFixed(2)))}
            disabled={zoom >= ZOOM_MAX}
            aria-label="Zoom in"
            title="Zoom in"
          >
            +
          </button>
          <button id="btn-descargar" className="mb-descargar" onClick={descargar}>
            ⬇ Descargar
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
            {m.rol === 'ia' && <div className="mb-avatar">L</div>}
            <div className={`mb-burbuja mb-burbuja-${m.rol} ${m.tipo === 'error' ? 'mb-error' : ''} ${m.tipo === 'pdf' ? 'mb-burbuja-pdf' : ''}`}>
              {m.tipo === 'cargando' && (
                <div className="mb-escribiendo" aria-label="Generando PDF">
                  <span /><span /><span />
                </div>
              )}
              {m.tipo !== 'cargando' && m.texto && <p className="mb-texto">{m.texto}</p>}
              {m.tipo === 'pdf' && <VisorPdf url={m.pdf.url} nombre={m.pdf.nombre} />}
            </div>
          </div>
        ))}
        <div ref={finRef} />
      </div>

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
          placeholder={ultimoId ? 'Pega un texto nuevo o escribe: "corrige solo el precio a $15,000"' : 'Pega aquí el texto de la cotización…'}
          disabled={enviando}
        />
        <button id="chat-enviar" type="submit" className="mb-enviar" disabled={enviando || !entrada.trim()} aria-label="Enviar">
          ➤
        </button>
      </form>
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
      const limpio = it.nombreCliente.replace(/[^\p{L}\p{N} ]/gu, '').trim().replaceAll(' ', '_') || 'Cliente';
      setAbierto({ id: it.id, url, nombre: `Cotizacion_${limpio}_${fecha}.pdf` });
    } catch (e) {
      setError(e.message);
    } finally {
      setCargandoId(null);
    }
  };

  return (
    <div className="mb-historial" id="historial-lista">
      <h2>Historial de PDF</h2>
      {error && <p className="mb-aviso mb-error-texto">{error}</p>}
      {!items && !error && <p className="mb-aviso">Cargando…</p>}
      {items && items.length === 0 && <p className="mb-aviso">Aún no has generado ningún PDF.</p>}

      {items?.map((it) => (
        <div key={it.id} className={`mb-item ${abierto?.id === it.id ? 'activo' : ''}`}>
          <div className="mb-item-cabecera">
            <div>
              <strong>{it.nombreCliente}</strong>
              <span>{formatearFecha(it.fecha)}</span>
            </div>
            <button className="mb-descargar" onClick={() => (abierto?.id === it.id ? setAbierto(null) : ver(it))} disabled={cargandoId === it.id}>
              {cargandoId === it.id ? 'Cargando…' : abierto?.id === it.id ? 'Ocultar' : 'Ver PDF'}
            </button>
          </div>
          {abierto?.id === it.id && <VisorPdf url={abierto.url} nombre={abierto.nombre} />}
        </div>
      ))}
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
          <div className="mb-logo">L</div>
          <div>
            <h1>Luxman · Cotizaciones</h1>
            <small>Ing. Raúl Romero Juárez</small>
          </div>
        </div>
        <nav className="mb-nav">
          <button id="btn-generar" className={vista === 'generar' ? 'activo' : ''} onClick={() => setVista('generar')}>
            1. Generar PDF
          </button>
          <button id="btn-historial" className={vista === 'historial' ? 'activo' : ''} onClick={() => setVista('historial')}>
            2. Historial de PDF
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
