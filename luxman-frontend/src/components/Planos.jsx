import React, { useRef } from "react";
import { FileText, Download, Layers, CheckCircle2 } from "lucide-react";

// Limpia acentos para máxima compatibilidad en textos ASCII de archivos DXF R12 (AutoCAD / LibreCAD)
function limpiarTextoDxf(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ");
}

// Generador puro en JavaScript de archivo AutoCAD DXF (AC1009 / R12) en milímetros reales Escala 1:1
function generarContenidoDxf({
  diametro_mm,
  radio_mm,
  longitud_mm,
  altura_fondo_mm,
  perimetro_mm,
  tipo_fondo,
  tiene_patas,
  tiene_manway,
  tiene_boquillas,
  tiene_valvula,
  nombre_cliente,
  litros_tanque,
  medida_hoja,
  cantidad_hojas,
}) {
  const lineas = [];
  const par = (codigo, valor) => {
    lineas.push(String(codigo));
    lineas.push(String(valor));
  };

  const f = (num) => Number(num || 0).toFixed(3);

  const lineaDxf = (capa, x1, y1, x2, y2, tipoLinea = "CONTINUOUS") => {
    par(0, "LINE");
    par(8, capa);
    par(6, tipoLinea);
    par(10, f(x1));
    par(20, f(y1));
    par(30, "0.0");
    par(11, f(x2));
    par(21, f(y2));
    par(31, "0.0");
  };

  const circuloDxf = (capa, cx, cy, r, tipoLinea = "CONTINUOUS") => {
    par(0, "CIRCLE");
    par(8, capa);
    par(6, tipoLinea);
    par(10, f(cx));
    par(20, f(cy));
    par(30, "0.0");
    par(40, f(r));
  };

  const arcoDxf = (capa, cx, cy, r, angInicio, angFin) => {
    par(0, "ARC");
    par(8, capa);
    par(10, f(cx));
    par(20, f(cy));
    par(30, "0.0");
    par(40, f(r));
    par(50, f(angInicio));
    par(51, f(angFin));
  };

  const textoDxf = (capa, x, y, altura, contenido) => {
    par(0, "TEXT");
    par(8, capa);
    par(10, f(x));
    par(20, f(y));
    par(30, "0.0");
    par(40, f(altura));
    par(1, limpiarTextoDxf(contenido));
  };

  const rectanguloDxf = (capa, x, y, ancho, alto) => {
    lineaDxf(capa, x, y, x + ancho, y);
    lineaDxf(capa, x + ancho, y, x + ancho, y + alto);
    lineaDxf(capa, x + ancho, y + alto, x, y + alto);
    lineaDxf(capa, x, y + alto, x, y);
  };

  // ===== SECCIÓN HEADER (Unidades en milímetros = 4) =====
  par(0, "SECTION");
  par(2, "HEADER");
  par(9, "$ACADVER");
  par(1, "AC1009");
  par(9, "$INSUNITS");
  par(70, 4);
  par(0, "ENDSEC");

  // ===== SECCIÓN TABLES (Tipos de línea y Capas técnicas) =====
  par(0, "SECTION");
  par(2, "TABLES");

  par(0, "TABLE");
  par(2, "LTYPE");
  par(70, 2);

  par(0, "LTYPE");
  par(2, "CONTINUOUS");
  par(70, 0);
  par(3, "Solid line");
  par(72, 65);
  par(73, 0);
  par(40, "0.0");

  par(0, "LTYPE");
  par(2, "CENTER");
  par(70, 0);
  par(3, "Center ____ _ ____ _ ____");
  par(72, 65);
  par(73, 4);
  par(40, "40.0");
  par(49, "25.0");
  par(49, "-5.0");
  par(49, "5.0");
  par(49, "-5.0");

  par(0, "ENDTAB");

  const capas = [
    ["CONTORNO", 7, "CONTINUOUS"],
    ["EJES", 1, "CENTER"],
    ["COTAS", 5, "CONTINUOUS"],
    ["ACCESORIOS", 3, "CONTINUOUS"],
    ["DESARROLLO", 2, "CONTINUOUS"],
    ["CAJETIN", 7, "CONTINUOUS"],
  ];

  par(0, "TABLE");
  par(2, "LAYER");
  par(70, capas.length);
  capas.forEach(([nombre, color, ltype]) => {
    par(0, "LAYER");
    par(2, nombre);
    par(70, 0);
    par(62, color);
    par(6, ltype);
  });
  par(0, "ENDTAB");
  par(0, "ENDSEC");

  // ===== SECCIÓN ENTITIES (Escala Real 1:1 en milímetros) =====
  par(0, "SECTION");
  par(2, "ENTITIES");

  const escalaTexto = Math.max(25, Math.round(Math.max(diametro_mm, longitud_mm) * 0.03));
  const separacionCota = escalaTexto * 3.2;
  const alturaPatasMm = tiene_patas ? Math.max(250, Math.round(diametro_mm * 0.35)) : 0;

  // --- 1. VISTA FRONTAL (ELEVACIÓN 1:1) ---
  // Origen: centro de la base del cilindro en (cxElev, yBaseCilindro)
  const cxElev = radio_mm;
  const yBaseCilindro = alturaPatasMm + altura_fondo_mm;
  const yTopeCilindro = yBaseCilindro + longitud_mm;

  // Cuerpo cilíndrico (0..diametro_mm en X, yBaseCilindro..yTopeCilindro en Y)
  rectanguloDxf("CONTORNO", 0, yBaseCilindro, diametro_mm, longitud_mm);

  // Eje central vertical
  lineaDxf("EJES", cxElev, -escalaTexto * 2, cxElev, yTopeCilindro + escalaTexto * 3, "CENTER");

  // Geometría real del fondo en escala 1:1
  if (tipo_fondo === "Cónico") {
    lineaDxf("CONTORNO", 0, yBaseCilindro, cxElev, yBaseCilindro - altura_fondo_mm);
    lineaDxf("CONTORNO", diametro_mm, yBaseCilindro, cxElev, yBaseCilindro - altura_fondo_mm);
  } else if (tipo_fondo === "Toriesférico") {
    // Aproximación geométrica 1:1 de fondo toriesférico ASME F&D mediante arco de corona (R_c = D)
    const rc = diametro_mm;
    const cyCorona = yBaseCilindro - altura_fondo_mm + rc;
    const medioAngulo = (Math.asin(Math.min(0.98, radio_mm / rc)) * 180) / Math.PI;
    arcoDxf("CONTORNO", cxElev, cyCorona, rc, 270 - medioAngulo, 270 + medioAngulo);
    const yUnion = cyCorona - rc * Math.cos((medioAngulo * Math.PI) / 180);
    lineaDxf("CONTORNO", 0, yBaseCilindro, 0, yUnion);
    lineaDxf("CONTORNO", diametro_mm, yBaseCilindro, diametro_mm, yUnion);
  }

  // Patas estructurales (si están seleccionadas)
  if (tiene_patas) {
    const anchoPata = Math.max(40, Math.round(diametro_mm * 0.045));
    const xPataIzq = Math.round(diametro_mm * 0.12);
    const xPataDer = diametro_mm - xPataIzq - anchoPata;
    rectanguloDxf("ACCESORIOS", xPataIzq, 0, anchoPata, yBaseCilindro);
    rectanguloDxf("ACCESORIOS", xPataDer, 0, anchoPata, yBaseCilindro);
    // Placas base
    rectanguloDxf("ACCESORIOS", xPataIzq - anchoPata * 0.5, 0, anchoPata * 2, Math.max(12, anchoPata * 0.25));
    rectanguloDxf("ACCESORIOS", xPataDer - anchoPata * 0.5, 0, anchoPata * 2, Math.max(12, anchoPata * 0.25));
  }

  // Válvula de descarga inferior
  if (tiene_valvula) {
    const ySalida = yBaseCilindro - altura_fondo_mm;
    const largoTubo = Math.max(80, Math.round(diametro_mm * 0.08));
    lineaDxf("ACCESORIOS", cxElev - 20, ySalida, cxElev - 20, ySalida - largoTubo);
    lineaDxf("ACCESORIOS", cxElev + 20, ySalida, cxElev + 20, ySalida - largoTubo);
    lineaDxf("ACCESORIOS", cxElev - 45, ySalida - largoTubo, cxElev + 45, ySalida - largoTubo);
  }

  // Cota Diámetro Ø A (arriba del cilindro)
  const yCotaDiametro = yTopeCilindro + separacionCota;
  lineaDxf("COTAS", 0, yTopeCilindro + 20, 0, yCotaDiametro + escalaTexto * 0.6);
  lineaDxf("COTAS", diametro_mm, yTopeCilindro + 20, diametro_mm, yCotaDiametro + escalaTexto * 0.6);
  lineaDxf("COTAS", 0, yCotaDiametro, diametro_mm, yCotaDiametro);
  textoDxf("COTAS", cxElev - escalaTexto * 3.2, yCotaDiametro + escalaTexto * 0.35, escalaTexto, `DIA A = ${diametro_mm} mm`);

  // Cota Altura B (a la izquierda del cilindro)
  const xCotaAltura = -separacionCota;
  lineaDxf("COTAS", -20, yBaseCilindro, xCotaAltura - escalaTexto * 0.6, yBaseCilindro);
  lineaDxf("COTAS", -20, yTopeCilindro, xCotaAltura - escalaTexto * 0.6, yTopeCilindro);
  lineaDxf("COTAS", xCotaAltura, yBaseCilindro, xCotaAltura, yTopeCilindro);
  textoDxf("COTAS", xCotaAltura - escalaTexto * 6.5, (yBaseCilindro + yTopeCilindro) / 2, escalaTexto, `B = ${longitud_mm} mm`);

  textoDxf("CAJETIN", 0, -escalaTexto * 3.5, escalaTexto * 1.1, "VISTA FRONTAL (ELEVACION 1:1)");

  // --- 2. VISTA SUPERIOR (PLANTA 1:1) ---
  const cxPlanta = diametro_mm + Math.max(diametro_mm * 1.2, 800) + radio_mm;
  const cyPlanta = yBaseCilindro + longitud_mm / 2;
  const extEje = radio_mm * 1.22;

  circuloDxf("CONTORNO", cxPlanta, cyPlanta, radio_mm);
  lineaDxf("EJES", cxPlanta - extEje, cyPlanta, cxPlanta + extEje, cyPlanta, "CENTER");
  lineaDxf("EJES", cxPlanta, cyPlanta - extEje, cxPlanta, cyPlanta + extEje, "CENTER");

  textoDxf("COTAS", cxPlanta + extEje + 20, cyPlanta - escalaTexto * 0.4, escalaTexto * 0.85, "0 deg");
  textoDxf("COTAS", cxPlanta - escalaTexto * 1.2, cyPlanta + extEje + 25, escalaTexto * 0.85, "90 deg");
  textoDxf("COTAS", cxPlanta - extEje - escalaTexto * 4.5, cyPlanta - escalaTexto * 0.4, escalaTexto * 0.85, "180 deg");
  textoDxf("COTAS", cxPlanta - escalaTexto * 1.5, cyPlanta - extEje - escalaTexto * 1.4, escalaTexto * 0.85, "270 deg");

  if (tiene_manway) {
    const rManway = Math.min(225, Math.max(120, Math.round(radio_mm * 0.32)));
    const distManway = radio_mm * 0.48;
    circuloDxf("ACCESORIOS", cxPlanta - distManway * 0.7, cyPlanta + distManway * 0.7, rManway);
  }

  if (tiene_boquillas) {
    const rBoq = Math.max(25, Math.min(76, Math.round(radio_mm * 0.1)));
    const distBoq = radio_mm * 0.65;
    circuloDxf("ACCESORIOS", cxPlanta + distBoq, cyPlanta, rBoq);
    circuloDxf("ACCESORIOS", cxPlanta, cyPlanta + distBoq, rBoq);
    circuloDxf("ACCESORIOS", cxPlanta, cyPlanta - distBoq, rBoq);
  }

  textoDxf("CAJETIN", cxPlanta - radio_mm, cyPlanta - extEje - escalaTexto * 3.5, escalaTexto * 1.1, "VISTA SUPERIOR (PLANTA 1:1)");

  // --- 3. DESARROLLO DE LÁMINA 1:1 (P x L) ---
  const xDes = cxPlanta + radio_mm + Math.max(600, diametro_mm * 0.6);
  const yDes = yBaseCilindro;
  rectanguloDxf("DESARROLLO", xDes, yDes, perimetro_mm, longitud_mm);
  textoDxf(
    "DESARROLLO",
    xDes,
    yDes - escalaTexto * 2.2,
    escalaTexto,
    `DESARROLLO DE LAMINA 1:1 (${perimetro_mm} x ${longitud_mm} mm | ${cantidad_hojas} hojas ${medida_hoja})`
  );

  // --- 4. CAJETÍN TÉCNICO ---
  const anchoCajetin = Math.max(1800, diametro_mm * 2.2);
  const altoCajetin = escalaTexto * 8;
  const yCajetin = -escalaTexto * 6 - altoCajetin;
  rectanguloDxf("CAJETIN", 0, yCajetin, anchoCajetin, altoCajetin);
  textoDxf("CAJETIN", escalaTexto, yCajetin + altoCajetin - escalaTexto * 2, escalaTexto * 1.2, "EQUIPOS INOXIDABLES LUXMAN - PLANO PARAMETRICO 1:1");
  textoDxf("CAJETIN", escalaTexto, yCajetin + altoCajetin - escalaTexto * 3.8, escalaTexto * 0.9, `CLIENTE: ${nombre_cliente || "INGENIERIA INTERNA"}`);
  textoDxf(
    "CAJETIN",
    escalaTexto,
    yCajetin + altoCajetin - escalaTexto * 5.4,
    escalaTexto * 0.9,
    `MEDIDAS: DIA A = ${diametro_mm} mm | ALTURA B = ${longitud_mm} mm | FONDO: ${tipo_fondo}`
  );
  textoDxf(
    "CAJETIN",
    escalaTexto,
    yCajetin + altoCajetin - escalaTexto * 7.0,
    escalaTexto * 0.9,
    `VOLUMEN TOTAL: ${Number(litros_tanque || 0).toFixed(2)} L | DESARROLLO: ${perimetro_mm} x ${longitud_mm} mm`
  );

  par(0, "ENDSEC");
  par(0, "EOF");

  return lineas.join("\r\n");
}

function Planos({
  radio_m,
  longitud_m,
  diametro_m,
  volumen_total_m3,
  litros_tanque,
  perimetro_m,
  area_lamina_m2,
  medida_hoja,
  cantidad_hojas,
  tipo_fondo,
  materiales_seleccionados = [],
  nombre_cliente,
}) {
  const svgRef = useRef(null);

  // Conversión exacta a milímetros para acotación industrial y exportación 1:1
  const diametro_mm = Math.round((diametro_m || 0) * 1000);
  const radio_mm = Math.round((radio_m || 0) * 1000);
  const longitud_mm = Math.round((longitud_m || 0) * 1000);
  const perimetro_mm = Math.round((perimetro_m || 0) * 1000);

  const altura_fondo_mm =
    tipo_fondo === "Cónico"
      ? Math.round(0.25 * diametro_mm)
      : tipo_fondo === "Toriesférico"
      ? Math.round(0.1935 * diametro_mm)
      : 0;

  // Detección reactiva de accesorios marcados en la lista de materiales
  const clavesSeleccionadas = new Set(materiales_seleccionados.map((m) => m.clave));
  const textosSeleccionados = materiales_seleccionados.map((m) => m.concepto.toLowerCase());

  const tiene_patas =
    clavesSeleccionadas.has("patas_soportes") ||
    textosSeleccionados.some((t) => t.includes("pata") || t.includes("soporte"));
  const tiene_manway =
    clavesSeleccionadas.has("manway") ||
    textosSeleccionados.some((t) => t.includes("manway") || t.includes("registro hombre"));
  const tiene_boquillas =
    clavesSeleccionadas.has("boquillas") ||
    textosSeleccionados.some((t) => t.includes("boquilla") || t.includes("ferula") || t.includes("férula"));
  const tiene_valvula =
    clavesSeleccionadas.has("valvulas") ||
    textosSeleccionados.some((t) => t.includes("valvula") || t.includes("válvula"));

  // ===== CÁLCULO DE ESCALA PROPORCIONAL PARA EL LIENZO SVG (1100 x 760) =====
  const alturaPatasMm = tiene_patas ? Math.max(250, Math.round(diametro_mm * 0.32)) : 0;
  const altoTotalModeloMm = Math.max(1, longitud_mm + altura_fondo_mm + alturaPatasMm);
  const anchoModeloMm = Math.max(1, diametro_mm);

  // Caja disponible en SVG para Vista Frontal: ancho máx 250 px, alto máx 340 px
  const escalaBruta = Math.min(240 / anchoModeloMm, 330 / altoTotalModeloMm);
  const anchoCilSvg = Math.min(250, Math.max(76, anchoModeloMm * escalaBruta));
  const altoCilSvg = Math.min(300, Math.max(70, longitud_mm * escalaBruta));
  const altoFondoSvg =
    tipo_fondo === "Plano"
      ? 0
      : Math.min(85, Math.max(18, altura_fondo_mm * escalaBruta));
  const altoPatasSvg = tiene_patas
    ? Math.min(80, Math.max(36, alturaPatasMm * escalaBruta))
    : 0;

  const cxElev = 290;
  const yCentroElev = 295;
  const altoConjuntoSvg = altoCilSvg + altoFondoSvg + altoPatasSvg;
  const yTopCil = yCentroElev - altoConjuntoSvg / 2 + 15;
  const yBotCil = yTopCil + altoCilSvg;
  const xIzqCil = cxElev - anchoCilSvg / 2;
  const xDerCil = cxElev + anchoCilSvg / 2;
  const yBaseFondo = yBotCil + altoFondoSvg;
  const yPiso = yBaseFondo + altoPatasSvg;

  // Coordenadas Vista Superior (Planta)
  const cxPlanta = 815;
  const cyPlanta = 285;
  const rPlantaSvg = Math.min(135, Math.max(68, anchoCilSvg * 0.56));
  const extEjePlanta = rPlantaSvg + 28;

  const clienteMostrar = nombre_cliente || "INGENIERÍA INTERNA (SIN CLIENTE ASIGNADO)";
  const fechaHoy = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const descargarArchivo = (contenidoTexto, tipoMime, extension) => {
    const limpio = (nombre_cliente || "Tanque_Luxman")
      .replace(/[^\p{L}\p{N}_-]+/gu, "_")
      .slice(0, 35);
    const blob = new Blob([contenidoTexto], { type: tipoMime });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `Plano_${limpio}_${diametro_mm}x${longitud_mm}mm.${extension}`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  };

  const manejarDescargarDxf = () => {
    const dxf = generarContenidoDxf({
      diametro_mm,
      radio_mm,
      longitud_mm,
      altura_fondo_mm,
      perimetro_mm,
      tipo_fondo,
      tiene_patas,
      tiene_manway,
      tiene_boquillas,
      tiene_valvula,
      nombre_cliente: clienteMostrar,
      litros_tanque,
      medida_hoja,
      cantidad_hojas,
    });
    descargarArchivo(dxf, "application/dxf", "dxf");
  };

  const manejarDescargarSvg = () => {
    if (!svgRef.current) return;
    const serializador = new XMLSerializer();
    let codigoSvg = serializador.serializeToString(svgRef.current);
    if (!codigoSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
      codigoSvg = codigoSvg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const documentoXml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${codigoSvg}`;
    descargarArchivo(documentoXml, "image/svg+xml;charset=utf-8", "svg");
  };

  const manejarImprimirPlano = () => {
    window.print();
  };

  return (
    <div>
      {/* Estilos exclusivos @media print para imprimir solo el plano y cajetín en horizontal */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 6mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          aside,
          nav,
          .nav-tabs,
          .no-imprimir-plano {
            display: none !important;
          }
          main,
          .min-vh-100,
          .row {
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          #luxman-area-impresion-plano {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 auto !important;
            width: 100% !important;
            overflow: visible !important;
          }
          #luxman-area-impresion-plano svg {
            width: 100% !important;
            max-height: 192mm !important;
            min-width: 0 !important;
            height: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Barra superior de acciones CAD */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3 p-3 bg-white rounded-3 border shadow-sm no-imprimir-plano">
        <div className="d-flex align-items-center gap-2">
          <Layers size={22} className="text-primary" />
          <div>
            <h5 className="fw-bold text-dark mb-0">Plano Técnico Paramétrico (CAD)</h5>
            <small className="text-secondary">
              Generado en tiempo real • Cotas en milímetros • Exportación directa Escala 1:1 para AutoCAD / LibreCAD
            </small>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            onClick={manejarImprimirPlano}
            className="btn btn-success fw-semibold d-inline-flex align-items-center gap-2"
          >
            <FileText size={17} />
            <span>Imprimir / Guardar Plano PDF</span>
          </button>

          <button
            type="button"
            onClick={manejarDescargarDxf}
            className="btn btn-primary fw-semibold d-inline-flex align-items-center gap-2"
          >
            <FileText size={17} />
            <span>Descargar Plano .DXF (Escala 1:1)</span>
          </button>

          <button
            type="button"
            onClick={manejarDescargarSvg}
            className="btn btn-outline-dark fw-semibold d-inline-flex align-items-center gap-2"
          >
            <Download size={17} />
            <span>Descargar Plano .SVG</span>
          </button>
        </div>
      </div>

      {/* Indicadores rápidos de elementos representados en el plano */}
      <div className="d-flex flex-wrap gap-2 mb-3 small no-imprimir-plano">
        <span className="badge text-bg-light border text-dark">
          Ø A = {diametro_mm.toLocaleString("es-MX")} mm
        </span>
        <span className="badge text-bg-light border text-dark">
          Altura cuerpo B = {longitud_mm.toLocaleString("es-MX")} mm
        </span>
        <span className="badge text-bg-light border text-dark">
          Fondo: {tipo_fondo} {altura_fondo_mm > 0 ? `(h = ${altura_fondo_mm} mm)` : ""}
        </span>
        {tiene_patas && (
          <span className="badge text-bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1">
            <CheckCircle2 size={12} /> Con patas/soportes estructurales
          </span>
        )}
        {tiene_manway && (
          <span className="badge text-bg-primary-subtle text-primary border border-primary-subtle">
            Con registro hombre (Manway)
          </span>
        )}
        {tiene_boquillas && (
          <span className="badge text-bg-primary-subtle text-primary border border-primary-subtle">
            Con boquillas Clamp/NPT
          </span>
        )}
      </div>

      {/* Lienzo SVG Técnico */}
      <div
        id="luxman-area-impresion-plano"
        className="bg-white border rounded-3 shadow-sm p-2 p-md-3 overflow-auto"
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1100 760"
          className="w-100 h-auto d-block"
          style={{ minWidth: "760px", background: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          <defs>
            <marker
              id="flecha-ini"
              viewBox="0 0 10 10"
              refX="2"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M 10 1 L 1 5 L 10 9 z" fill="#1d4ed8" />
            </marker>
            <marker
              id="flecha-fin"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#1d4ed8" />
            </marker>
            <pattern id="patron-piso" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#94a3b8" strokeWidth="1.2" />
            </pattern>
          </defs>

          {/* Fondo blanco puro y doble marco técnico ISO */}
          <rect x="0" y="0" width="1100" height="760" fill="#ffffff" />
          <rect x="14" y="14" width="1072" height="732" fill="none" stroke="#0f172a" strokeWidth="1.2" />
          <rect x="24" y="24" width="1052" height="712" fill="none" stroke="#0f172a" strokeWidth="2.2" />

          {/* Referencias de cuadrícula perimetral CAD (1-6 / A-D) */}
          {[1, 2, 3, 4, 5, 6].map((num, idx) => {
            const posX = 24 + (idx + 0.5) * (1052 / 6);
            return (
              <g key={`col-${num}`}>
                <text x={posX} y="21" fontSize="9" textAnchor="middle" fill="#475569" fontWeight="bold">
                  {num}
                </text>
                <text x={posX} y="745" fontSize="9" textAnchor="middle" fill="#475569" fontWeight="bold">
                  {num}
                </text>
              </g>
            );
          })}
          {["A", "B", "C", "D"].map((letra, idx) => {
            const posY = 24 + (idx + 0.5) * (712 / 4);
            return (
              <g key={`fila-${letra}`}>
                <text x="19" y={posY + 3} fontSize="9" textAnchor="middle" fill="#475569" fontWeight="bold">
                  {letra}
                </text>
                <text x="1081" y={posY + 3} fontSize="9" textAnchor="middle" fill="#475569" fontWeight="bold">
                  {letra}
                </text>
              </g>
            );
          })}

          {/* Línea divisoria vertical suave entre Elevación y Planta */}
          <line x1="565" y1="36" x2="565" y2="575" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />

          {/* ============================================================== */}
          {/* 1. VISTA FRONTAL (ELEVACIÓN)                                   */}
          {/* ============================================================== */}
          <text x={cxElev} y="56" fontSize="13" fontWeight="bold" textAnchor="middle" fill="#0f172a" letterSpacing="0.8">
            VISTA FRONTAL (ELEVACIÓN)
          </text>
          <text x={cxElev} y="71" fontSize="10" textAnchor="middle" fill="#64748b">
            Proporción dinámica • Acotación en milímetros (mm)
          </text>

          {/* Eje de simetría central */}
          <line
            x1={cxElev}
            y1={yTopCil - 30}
            x2={cxElev}
            y2={yPiso + 22}
            stroke="#dc2626"
            strokeWidth="1"
            strokeDasharray="14,4,3,4"
          />

          {/* Boquillas superiores en elevación */}
          {tiene_boquillas && (
            <g stroke="#0f172a" strokeWidth="1.5" fill="#f8fafc">
              <rect x={cxElev - anchoCilSvg * 0.28 - 5} y={yTopCil - 14} width="10" height="14" />
              <line x1={cxElev - anchoCilSvg * 0.28 - 9} y1={yTopCil - 14} x2={cxElev - anchoCilSvg * 0.28 + 9} y2={yTopCil - 14} strokeWidth="2.2" />
              <rect x={cxElev + anchoCilSvg * 0.28 - 5} y={yTopCil - 14} width="10" height="14" />
              <line x1={cxElev + anchoCilSvg * 0.28 - 9} y1={yTopCil - 14} x2={cxElev + anchoCilSvg * 0.28 + 9} y2={yTopCil - 14} strokeWidth="2.2" />
            </g>
          )}

          {/* Patas / Soportes estructurales (condicional al checkbox de materiales) */}
          {tiene_patas && (
            <g>
              {/* Línea de nivel de piso */}
              <line x1={xIzqCil - 35} y1={yPiso} x2={xDerCil + 35} y2={yPiso} stroke="#475569" strokeWidth="1.6" />
              <rect x={xIzqCil - 35} y={yPiso} width={anchoCilSvg + 70} height="8" fill="url(#patron-piso)" />

              {/* Pata izquierda + cartela + placa base */}
              <rect
                x={xIzqCil + anchoCilSvg * 0.08}
                y={yBotCil - 6}
                width="11"
                height={yPiso - (yBotCil - 6)}
                fill="#e2e8f0"
                stroke="#0f172a"
                strokeWidth="1.6"
              />
              <rect
                x={xIzqCil + anchoCilSvg * 0.08 - 6}
                y={yPiso - 5}
                width="23"
                height="5"
                fill="#94a3b8"
                stroke="#0f172a"
                strokeWidth="1.4"
              />

              {/* Pata derecha + cartela + placa base */}
              <rect
                x={xDerCil - anchoCilSvg * 0.08 - 11}
                y={yBotCil - 6}
                width="11"
                height={yPiso - (yBotCil - 6)}
                fill="#e2e8f0"
                stroke="#0f172a"
                strokeWidth="1.6"
              />
              <rect
                x={xDerCil - anchoCilSvg * 0.08 - 17}
                y={yPiso - 5}
                width="23"
                height="5"
                fill="#94a3b8"
                stroke="#0f172a"
                strokeWidth="1.4"
              />
            </g>
          )}

          {/* Cuerpo cilíndrico principal */}
          <rect
            x={xIzqCil}
            y={yTopCil}
            width={anchoCilSvg}
            height={altoCilSvg}
            fill="#f8fafc"
            stroke="#0f172a"
            strokeWidth="2.2"
          />

          {/* Reborde superior sanitario */}
          <line x1={xIzqCil - 4} y1={yTopCil} x2={xDerCil + 4} y2={yTopCil} stroke="#0f172a" strokeWidth="2.8" />

          {/* Costura de soldadura intermedia ilustrativa */}
          <line
            x1={xIzqCil}
            y1={yTopCil + altoCilSvg * 0.5}
            x2={xDerCil}
            y2={yTopCil + altoCilSvg * 0.5}
            stroke="#94a3b8"
            strokeWidth="0.9"
            strokeDasharray="5,4"
          />

          {/* Registro hombre (Manway) en elevación si está seleccionado */}
          {tiene_manway && (
            <g>
              <circle
                cx={cxElev + anchoCilSvg * 0.18}
                cy={yTopCil + altoCilSvg * 0.34}
                r={Math.min(22, Math.max(12, anchoCilSvg * 0.1))}
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="1.6"
              />
              <circle
                cx={cxElev + anchoCilSvg * 0.18}
                cy={yTopCil + altoCilSvg * 0.34}
                r={Math.min(17, Math.max(9, anchoCilSvg * 0.075))}
                fill="none"
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            </g>
          )}

          {/* Geometría Real del Fondo Seleccionado */}
          {tipo_fondo === "Plano" && (
            <line x1={xIzqCil - 3} y1={yBotCil} x2={xDerCil + 3} y2={yBotCil} stroke="#0f172a" strokeWidth="2.8" />
          )}

          {tipo_fondo === "Cónico" && (
            <g>
              <polygon
                points={`${xIzqCil},${yBotCil} ${xDerCil},${yBotCil} ${cxElev},${yBaseFondo}`}
                fill="#f1f5f9"
                stroke="#0f172a"
                strokeWidth="2.2"
              />
              <line
                x1={xIzqCil}
                y1={yBotCil}
                x2={xDerCil}
                y2={yBotCil}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="4,3"
              />
            </g>
          )}

          {tipo_fondo === "Toriesférico" && (
            <g>
              <path
                d={`M ${xIzqCil} ${yBotCil}
                    C ${xIzqCil} ${yBotCil + altoFondoSvg * 0.65},
                      ${cxElev - anchoCilSvg * 0.28} ${yBaseFondo},
                      ${cxElev} ${yBaseFondo}
                    C ${cxElev + anchoCilSvg * 0.28} ${yBaseFondo},
                      ${xDerCil} ${yBotCil + altoFondoSvg * 0.65},
                      ${xDerCil} ${yBotCil} Z`}
                fill="#f1f5f9"
                stroke="#0f172a"
                strokeWidth="2.2"
              />
              <line
                x1={xIzqCil}
                y1={yBotCil}
                x2={xDerCil}
                y2={yBotCil}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="4,3"
              />
            </g>
          )}

          {/* Válvula de descarga inferior */}
          {tiene_valvula && (
            <g stroke="#0f172a" strokeWidth="1.4" fill="#ffffff">
              <rect x={cxElev - 4} y={yBaseFondo} width="8" height="12" />
              <polygon points={`${cxElev - 9},${yBaseFondo + 12} ${cxElev + 9},${yBaseFondo + 12} ${cxElev},${yBaseFondo + 18}`} />
              <polygon points={`${cxElev - 9},${yBaseFondo + 24} ${cxElev + 9},${yBaseFondo + 24} ${cxElev},${yBaseFondo + 18}`} />
            </g>
          )}

          {/* ===== LÍNEAS DE COTA TÉCNICAS (Ø A y B en mm) ===== */}
          {/* Cota horizontal: Diámetro Ø A */}
          <g>
            <line x1={xIzqCil} y1={yTopCil - 6} x2={xIzqCil} y2={yTopCil - 44} stroke="#1d4ed8" strokeWidth="1" />
            <line x1={xDerCil} y1={yTopCil - 6} x2={xDerCil} y2={yTopCil - 44} stroke="#1d4ed8" strokeWidth="1" />
            <line
              x1={xIzqCil + 3}
              y1={yTopCil - 36}
              x2={xDerCil - 3}
              y2={yTopCil - 36}
              stroke="#1d4ed8"
              strokeWidth="1.4"
              markerStart="url(#flecha-ini)"
              markerEnd="url(#flecha-fin)"
            />
            <rect x={cxElev - 64} y={yTopCil - 52} width="128" height="15" fill="#ffffff" />
            <text x={cxElev} y={yTopCil - 41} fontSize="11" fontWeight="bold" textAnchor="middle" fill="#1d4ed8">
              Ø A = {diametro_mm.toLocaleString("es-MX")} mm
            </text>
          </g>

          {/* Cota vertical izquierda: Altura del cuerpo B */}
          <g>
            <line x1={xIzqCil - 8} y1={yTopCil} x2={xIzqCil - 54} y2={yTopCil} stroke="#1d4ed8" strokeWidth="1" />
            <line x1={xIzqCil - 8} y1={yBotCil} x2={xIzqCil - 54} y2={yBotCil} stroke="#1d4ed8" strokeWidth="1" />
            <line
              x1={xIzqCil - 44}
              y1={yTopCil + 3}
              x2={xIzqCil - 44}
              y2={yBotCil - 3}
              stroke="#1d4ed8"
              strokeWidth="1.4"
              markerStart="url(#flecha-ini)"
              markerEnd="url(#flecha-fin)"
            />
            <text
              x={xIzqCil - 52}
              y={(yTopCil + yBotCil) / 2}
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
              fill="#1d4ed8"
              transform={`rotate(-90, ${xIzqCil - 52}, ${(yTopCil + yBotCil) / 2})`}
            >
              B = {longitud_mm.toLocaleString("es-MX")} mm
            </text>
          </g>

          {/* Cota auxiliar derecha si el fondo es Cónico o Toriesférico */}
          {altura_fondo_mm > 0 && (
            <g>
              <line x1={xDerCil + 8} y1={yBotCil} x2={xDerCil + 46} y2={yBotCil} stroke="#475569" strokeWidth="0.9" />
              <line x1={cxElev + 8} y1={yBaseFondo} x2={xDerCil + 46} y2={yBaseFondo} stroke="#475569" strokeWidth="0.9" />
              <line x1={xDerCil + 38} y1={yBotCil} x2={xDerCil + 38} y2={yBaseFondo} stroke="#475569" strokeWidth="1.1" />
              <text x={xDerCil + 44} y={(yBotCil + yBaseFondo) / 2 + 4} fontSize="9.5" fill="#334155" fontWeight="bold">
                h_f = {altura_fondo_mm} mm
              </text>
            </g>
          )}

          {/* ============================================================== */}
          {/* 2. VISTA SUPERIOR (PLANTA)                                     */}
          {/* ============================================================== */}
          <text x={cxPlanta} y="56" fontSize="13" fontWeight="bold" textAnchor="middle" fill="#0f172a" letterSpacing="0.8">
            VISTA SUPERIOR (PLANTA)
          </text>
          <text x={cxPlanta} y="71" fontSize="10" textAnchor="middle" fill="#64748b">
            Orientación angular de ejes y conexiones superiores
          </text>

          {/* Círculo exterior e interior de pared del tanque */}
          <circle cx={cxPlanta} cy={cyPlanta} r={rPlantaSvg} fill="#f8fafc" stroke="#0f172a" strokeWidth="2.3" />
          <circle cx={cxPlanta} cy={cyPlanta} r={rPlantaSvg - 4} fill="none" stroke="#94a3b8" strokeWidth="0.9" />

          {/* Ejes perpendiculares (0° - 180° y 90° - 270°) */}
          <line
            x1={cxPlanta - extEjePlanta}
            y1={cyPlanta}
            x2={cxPlanta + extEjePlanta}
            y2={cyPlanta}
            stroke="#dc2626"
            strokeWidth="1"
            strokeDasharray="12,4,3,4"
          />
          <line
            x1={cxPlanta}
            y1={cyPlanta - extEjePlanta}
            x2={cxPlanta}
            y2={cyPlanta + extEjePlanta}
            stroke="#dc2626"
            strokeWidth="1"
            strokeDasharray="12,4,3,4"
          />

          {/* Referencias angulares */}
          <text x={cxPlanta + extEjePlanta + 8} y={cyPlanta + 4} fontSize="11" fontWeight="bold" fill="#0f172a">
            0°
          </text>
          <text x={cxPlanta} y={cyPlanta - extEjePlanta - 8} fontSize="11" fontWeight="bold" textAnchor="middle" fill="#0f172a">
            90°
          </text>
          <text x={cxPlanta - extEjePlanta - 8} y={cyPlanta + 4} fontSize="11" fontWeight="bold" textAnchor="end" fill="#0f172a">
            180°
          </text>
          <text x={cxPlanta} y={cyPlanta + extEjePlanta + 16} fontSize="11" fontWeight="bold" textAnchor="middle" fill="#0f172a">
            270°
          </text>

          {/* Representación de Registro Hombre (Manway) en Planta */}
          <g opacity={tiene_manway ? 1 : 0.45}>
            <circle
              cx={cxPlanta - rPlantaSvg * 0.38}
              cy={cyPlanta - rPlantaSvg * 0.36}
              r={rPlantaSvg * 0.24}
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth="1.8"
              strokeDasharray={tiene_manway ? "none" : "4,3"}
            />
            <circle
              cx={cxPlanta - rPlantaSvg * 0.38}
              cy={cyPlanta - rPlantaSvg * 0.36}
              r={rPlantaSvg * 0.19}
              fill="none"
              stroke="#64748b"
              strokeWidth="1"
            />
            <text
              x={cxPlanta - rPlantaSvg * 0.38}
              y={cyPlanta - rPlantaSvg * 0.36 + 3}
              fontSize="8.5"
              fontWeight="bold"
              textAnchor="middle"
              fill="#0f172a"
            >
              MW
            </text>
          </g>

          {/* Representación de Boquillas / Férulas en Planta (N1, N2, N3) */}
          {[
            { etq: "N1", x: cxPlanta + rPlantaSvg * 0.62, y: cyPlanta },
            { etq: "N2", x: cxPlanta, y: cyPlanta - rPlantaSvg * 0.62 },
            { etq: "N3", x: cxPlanta + rPlantaSvg * 0.35, y: cyPlanta + rPlantaSvg * 0.52 },
          ].map((boq) => (
            <g key={boq.etq} opacity={tiene_boquillas ? 1 : 0.45}>
              <circle
                cx={boq.x}
                cy={boq.y}
                r="10"
                fill="#ffffff"
                stroke="#1d4ed8"
                strokeWidth="1.6"
                strokeDasharray={tiene_boquillas ? "none" : "3,2"}
              />
              <circle cx={boq.x} cy={boq.y} r="5" fill="none" stroke="#1d4ed8" strokeWidth="1" />
              <text x={boq.x + 13} y={boq.y + 3} fontSize="8.5" fontWeight="bold" fill="#1e293b">
                {boq.etq}
              </text>
            </g>
          ))}

          {/* Leyenda compacta de Planta */}
          <g transform="translate(650, 485)">
            <rect x="0" y="0" width="330" height="44" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
            <text x="12" y="17" fontSize="9" fontWeight="bold" fill="#0f172a">
              SIMBOLOGÍA PLANTA:
            </text>
            <text x="12" y="32" fontSize="8.5" fill="#475569">
              MW: Registro Hombre (Manway)  •  N1, N2, N3: Boquillas de Proceso / CIP
            </text>
          </g>

          {/* ============================================================== */}
          {/* 3. CAJETÍN TÉCNICO ISO LUXMAN                                  */}
          {/* ============================================================== */}
          <g transform="translate(24, 590)">
            <rect x="0" y="0" width="1052" height="146" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />

            {/* Líneas internas del cajetín */}
            <line x1="0" y1="42" x2="1052" y2="42" stroke="#0f172a" strokeWidth="1.4" />
            <line x1="0" y1="94" x2="1052" y2="94" stroke="#0f172a" strokeWidth="1.2" />
            <line x1="420" y1="0" x2="420" y2="146" stroke="#0f172a" strokeWidth="1.4" />
            <line x1="760" y1="42" x2="760" y2="146" stroke="#0f172a" strokeWidth="1.4" />

            {/* Fila 1: Identidad Luxman y Cliente */}
            <text x="16" y="20" fontSize="14" fontWeight="bold" fill="#1f5fa8" letterSpacing="0.6">
              EQUIPOS INOXIDABLES LUXMAN
            </text>
            <text x="16" y="34" fontSize="9" fill="#475569">
              DEPARTAMENTO DE INGENIERÍA Y DISEÑO MECÁNICO • ECATEPEC, EDO. MÉX.
            </text>

            <text x="436" y="16" fontSize="8.5" fontWeight="bold" fill="#64748b">
              CLIENTE / PROYECTO:
            </text>
            <text x="436" y="33" fontSize="12" fontWeight="bold" fill="#0f172a">
              {clienteMostrar.slice(0, 62)}
            </text>

            {/* Fila 2: Medidas en mm, Volumen en L y Tipo de Fondo */}
            <text x="16" y="58" fontSize="8.5" fontWeight="bold" fill="#64748b">
              MEDIDAS NOMINALES DEL CUERPO (mm):
            </text>
            <text x="16" y="79" fontSize="12" fontWeight="bold" fill="#0f172a">
              Ø A = {diametro_mm.toLocaleString("es-MX")} mm  •  B = {longitud_mm.toLocaleString("es-MX")} mm  (r = {radio_mm.toLocaleString("es-MX")} mm)
            </text>

            <text x="436" y="58" fontSize="8.5" fontWeight="bold" fill="#64748b">
              VOLUMEN TOTAL NOMINAL:
            </text>
            <text x="436" y="79" fontSize="12" fontWeight="bold" fill="#1d4ed8">
              {Number(litros_tanque || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L  ({Number(volumen_total_m3 || 0).toFixed(4)} m³)
            </text>

            <text x="776" y="58" fontSize="8.5" fontWeight="bold" fill="#64748b">
              TIPO DE FONDO / CABEZAL:
            </text>
            <text x="776" y="79" fontSize="12" fontWeight="bold" fill="#0f172a">
              {tipo_fondo.toUpperCase()} {altura_fondo_mm > 0 ? `(h = ${altura_fondo_mm} mm)` : ""}
            </text>

            {/* Fila 3: Desarrollo de lámina (P x L), Hoja comercial y Autor/Fecha */}
            <text x="16" y="110" fontSize="8.5" fontWeight="bold" fill="#64748b">
              DESARROLLO DE LÁMINA DEL CUERPO (P × L):
            </text>
            <text x="16" y="131" fontSize="11.5" fontWeight="bold" fill="#0f172a">
              {perimetro_mm.toLocaleString("es-MX")} × {longitud_mm.toLocaleString("es-MX")} mm  ({Number(area_lamina_m2 || 0).toFixed(4)} m²)
            </text>

            <text x="436" y="110" fontSize="8.5" fontWeight="bold" fill="#64748b">
              CUANTIFICACIÓN DE HOJA COMERCIAL:
            </text>
            <text x="436" y="131" fontSize="11.5" fontWeight="bold" fill="#0f172a">
              {cantidad_hojas} {cantidad_hojas === 1 ? "hoja" : "hojas"} de {medida_hoja.replace("x", " × ")} m
            </text>

            <text x="776" y="110" fontSize="8.5" fontWeight="bold" fill="#64748b">
              APROBÓ / FECHA / UNIDADES:
            </text>
            <text x="776" y="131" fontSize="10.5" fontWeight="bold" fill="#0f172a">
              Ing. Raúl Romero • {fechaHoy} • [mm]
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}

export default Planos;
