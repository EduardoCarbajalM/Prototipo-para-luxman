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

const URL_SERVIDOR = import.meta.env.VITE_API_URL || 'http://localhost:5294';
const ZOOM_MINIMO = 0.5;
const ZOOM_MAXIMO = 2.5;
const PASO_ZOOM = 0.25;
const ALTO_VISOR = 620;

const MENSAJE_BIENVENIDA = {
  id: 'ia-inicial',
  rol: 'ia',
  tipo: 'texto',
  texto: 'Por favor inserta tu texto completo aquí',
};

// pide los bytes del pdf al backend y crea una url temporal para mostrarlo en el iframe
async function obtenerUrlPdf(idDocumento) {
  const respuesta = await fetch(`${URL_SERVIDOR}/api/memebretes/${idDocumento}/pdf`);
  if (!respuesta.ok) throw new Error('No se pudo cargar el PDF.');
  return URL.createObjectURL(await respuesta.blob());
}

async function extraerMensajeError(respuesta) {
  const texto = await respuesta.text();
  try {
    const datosJson = JSON.parse(texto);
    return typeof datosJson === 'string' ? datosJson : datosJson.title || datosJson.mensaje || texto;
  } catch {
    return texto || `Error ${respuesta.status}`;
  }
}

function formatearFechaHora(fechaIso) {
  return new Date(fechaIso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

// componente para ver el pdf adentro del chat con botones de zoom y descarga
function VisorPdf({ url, nombre }) {
  const [nivelZoom, setNivelZoom] = useState(1);

  const descargarArchivo = () => {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre || 'cotizacion.pdf';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
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
              onClick={() => setNivelZoom((actual) => Math.max(ZOOM_MINIMO, +(actual - PASO_ZOOM).toFixed(2)))}
              disabled={nivelZoom <= ZOOM_MINIMO}
              aria-label="Alejar"
              title="Reducir zoom"
            >
              <ZoomOut size={16} strokeWidth={2} />
            </button>
            <span className="mb-zoom-valor">{Math.round(nivelZoom * 100)}%</span>
            <button
              id="btn-zoom-in"
              type="button"
              className="mb-icono"
              onClick={() => setNivelZoom((actual) => Math.min(ZOOM_MAXIMO, +(actual + PASO_ZOOM).toFixed(2)))}
              disabled={nivelZoom >= ZOOM_MAXIMO}
              aria-label="Acercar"
              title="Aumentar zoom"
            >
              <ZoomIn size={16} strokeWidth={2} />
            </button>
          </div>

          <button
            id="btn-descargar"
            type="button"
            className="mb-descargar"
            onClick={descargarArchivo}
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
          style={{ width: `${nivelZoom * 100}%`, height: `${ALTO_VISOR * nivelZoom}px` }}
        />
      </div>
    </div>
  );
}

// pestaña del chat para generar y corregir las cotizaciones
function VistaChat() {
  const [listaMensajes, setListaMensajes] = useState([MENSAJE_BIENVENIDA]);
  const [textoEntrada, setTextoEntrada] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [idDocumentoActivo, setIdDocumentoActivo] = useState(null);
  const contadorMensajes = useRef(0);
  const refFinalChat = useRef(null);
  const refCajaTexto = useRef(null);

  useEffect(() => {
    refFinalChat.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [listaMensajes]);

  useEffect(() => {
    const caja = refCajaTexto.current;
    if (!caja) return;
    caja.style.height = 'auto';
    caja.style.height = `${Math.min(caja.scrollHeight, 160)}px`;
  }, [textoEntrada]);

  const generarIdMensaje = () => `m-${++contadorMensajes.current}`;

  const enviarMensaje = useCallback(async () => {
    const textoLimpio = textoEntrada.trim();
    if (!textoLimpio || enviando) return;

    const idTemporal = generarIdMensaje();
    setTextoEntrada('');
    setEnviando(true);
    setListaMensajes((anteriores) => [
      ...anteriores,
      { id: generarIdMensaje(), rol: 'usuario', tipo: 'texto', texto: textoLimpio },
      { id: idTemporal, rol: 'ia', tipo: 'cargando' },
    ]);

    const actualizarRespuesta = (datosNuevos) =>
      setListaMensajes((anteriores) =>
        anteriores.map((msg) => (msg.id === idTemporal ? { ...datosNuevos, id: idTemporal, rol: 'ia' } : msg))
      );

    try {
      const respuesta = await fetch(`${URL_SERVIDOR}/api/memebretes/procesar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: textoLimpio, idDocumentoActual: idDocumentoActivo }),
      });
      if (!respuesta.ok) throw new Error(await extraerMensajeError(respuesta));

      const datos = await respuesta.json();
      const urlPdf = await obtenerUrlPdf(datos.id);
      setIdDocumentoActivo(datos.id);
      actualizarRespuesta({
        tipo: 'pdf',
        texto: datos.mensaje,
        pdf: { url: urlPdf, nombre: datos.nombreArchivo },
      });
    } catch (error) {
      actualizarRespuesta({ tipo: 'error', texto: error.message || 'Ocurrió un error inesperado.' });
    } finally {
      setEnviando(false);
    }
  }, [textoEntrada, enviando, idDocumentoActivo]);

  const manejarTeclaEnter = (evento) => {
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      enviarMensaje();
    }
  };

  return (
    <>
      <div className="mb-mensajes" id="chat-mensajes">
        {listaMensajes.map((mensaje) => (
          <div key={mensaje.id} className={`mb-fila mb-fila-${mensaje.rol}`}>
            {mensaje.rol === 'ia' && (
              <div className="mb-avatar" title="Asistente Luxman">
                <Sparkles size={16} strokeWidth={2} />
              </div>
            )}
            <div
              className={`mb-burbuja mb-burbuja-${mensaje.rol} ${
                mensaje.tipo === 'error' ? 'mb-error' : ''
              } ${mensaje.tipo === 'pdf' ? 'mb-burbuja-pdf' : ''}`}
            >
              {mensaje.tipo === 'cargando' && (
                <div className="mb-escribiendo" aria-label="Generando PDF">
                  <Loader2 size={16} className="mb-spinner" />
                  <span className="mb-escribiendo-texto">Generando documento con membrete…</span>
                </div>
              )}
              {mensaje.tipo !== 'cargando' && mensaje.texto && (
                <div className="mb-texto-contenedor">
                  {mensaje.tipo === 'error' && (
                    <AlertCircle size={18} strokeWidth={2} className="mb-icono-estado-error" />
                  )}
                  {mensaje.tipo === 'pdf' && (
                    <CheckCircle2 size={18} strokeWidth={2} className="mb-icono-estado-ok" />
                  )}
                  <p className="mb-texto">{mensaje.texto}</p>
                </div>
              )}
              {mensaje.tipo === 'pdf' && <VisorPdf url={mensaje.pdf.url} nombre={mensaje.pdf.nombre} />}
            </div>
          </div>
        ))}
        <div ref={refFinalChat} />
      </div>

      <div className="mb-entrada-wrapper">
        <form
          className="mb-entrada"
          onSubmit={(evento) => {
            evento.preventDefault();
            enviarMensaje();
          }}
        >
          <textarea
            id="chat-input"
            ref={refCajaTexto}
            rows={1}
            value={textoEntrada}
            onChange={(evento) => setTextoEntrada(evento.target.value)}
            onKeyDown={manejarTeclaEnter}
            placeholder={
              idDocumentoActivo
                ? 'Pega un texto nuevo o escribe: "corrige solo el precio a $15,000"'
                : 'Pega aquí el texto de la cotización…'
            }
            disabled={enviando}
          />
          <button
            id="chat-enviar"
            type="submit"
            className="mb-enviar"
            disabled={enviando || !textoEntrada.trim()}
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
          {idDocumentoActivo && (
            <span className="mb-estado-doc-activo">
              <FileCheck2 size={13} strokeWidth={2} /> Documento activo listo para correcciones
            </span>
          )}
        </div>
      </div>
    </>
  );
}

// pestaña para consultar todos los pdfs guardados en mongodb
function VistaHistorial() {
  const [documentos, setDocumentos] = useState(null);
  const [mensajeError, setMensajeError] = useState('');
  const [documentoAbierto, setDocumentoAbierto] = useState(null);
  const [idCargando, setIdCargando] = useState(null);

  useEffect(() => {
    let componenteActivo = true;
    fetch(`${URL_SERVIDOR}/api/memebretes`)
      .then(async (respuesta) => {
        if (!respuesta.ok) throw new Error(await extraerMensajeError(respuesta));
        return respuesta.json();
      })
      .then((datos) => componenteActivo && setDocumentos(datos))
      .catch((error) => componenteActivo && setMensajeError(error.message));
    return () => {
      componenteActivo = false;
    };
  }, []);

  const abrirDocumento = async (registro) => {
    setIdCargando(registro.id);
    try {
      const urlPdf = await obtenerUrlPdf(registro.id);
      const fechaCorta = new Date(registro.fecha).toISOString().slice(0, 10).replaceAll('-', '');
      const clienteLimpio =
        registro.nombreCliente.replace(/[^\p{L}\p{N} ]/gu, '').trim().replaceAll(' ', '_') || 'Cliente';
      setDocumentoAbierto({ id: registro.id, url: urlPdf, nombre: `Cotizacion_${clienteLimpio}_${fechaCorta}.pdf` });
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setIdCargando(null);
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
        {documentos && (
          <span className="mb-historial-contador">
            <FileText size={15} strokeWidth={2} />
            {documentos.length} {documentos.length === 1 ? 'documento' : 'documentos'}
          </span>
        )}
      </div>

      {mensajeError && (
        <div className="mb-aviso mb-error-texto">
          <AlertCircle size={18} strokeWidth={2} />
          <span>{mensajeError}</span>
        </div>
      )}

      {!documentos && !mensajeError && (
        <div className="mb-estado-vacio">
          <Loader2 size={24} strokeWidth={2} className="mb-spinner" />
          <p className="mb-aviso">Cargando historial de cotizaciones…</p>
        </div>
      )}

      {documentos && documentos.length === 0 && (
        <div className="mb-estado-vacio">
          <div className="mb-estado-vacio-icono">
            <FileText size={28} strokeWidth={1.75} />
          </div>
          <h3>Sin cotizaciones registradas</h3>
          <p className="mb-aviso">Aún no has generado ningún PDF desde el asistente de cotizaciones.</p>
        </div>
      )}

      <div className="mb-lista-items">
        {documentos?.map((registro) => {
          const estaAbierto = documentoAbierto?.id === registro.id;
          const estaCargando = idCargando === registro.id;
          return (
            <div key={registro.id} className={`mb-item ${estaAbierto ? 'activo' : ''}`}>
              <div className="mb-item-cabecera">
                <div className="mb-item-meta">
                  <div className="mb-item-avatar">
                    <User size={18} strokeWidth={2} />
                  </div>
                  <div className="mb-item-textos">
                    <strong>{registro.nombreCliente}</strong>
                    <span className="mb-item-fecha">
                      <Calendar size={13} strokeWidth={2} />
                      {formatearFechaHora(registro.fecha)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className={`mb-btn-accion-historial ${estaAbierto ? 'abierto' : ''}`}
                  onClick={() => (estaAbierto ? setDocumentoAbierto(null) : abrirDocumento(registro))}
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
              {estaAbierto && <VisorPdf url={documentoAbierto.url} nombre={documentoAbierto.nombre} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ChatMemebretes() {
  const [pestanaActual, setPestanaActual] = useState('generar');

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
            className={pestanaActual === 'generar' ? 'activo' : ''}
            onClick={() => setPestanaActual('generar')}
          >
            <Sparkles size={16} strokeWidth={2} />
            <span>1. Generar PDF</span>
          </button>
          <button
            id="btn-historial"
            type="button"
            className={pestanaActual === 'historial' ? 'activo' : ''}
            onClick={() => setPestanaActual('historial')}
          >
            <History size={16} strokeWidth={2} />
            <span>2. Historial de PDF</span>
          </button>
        </nav>
      </header>

      <main className="mb-main">
        <section className="mb-seccion" hidden={pestanaActual !== 'generar'}>
          <VistaChat />
        </section>
        {pestanaActual === 'historial' && (
          <section className="mb-seccion mb-scroll">
            <VistaHistorial />
          </section>
        )}
      </main>
    </div>
  );
}
