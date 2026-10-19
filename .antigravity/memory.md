# Memoria Persistente del Proyecto — Luxman ERP & Cotizador Industrial

> **REGLA OBLIGATORIA DE AHORRO DE TOKENS**:
> Antes de inspeccionar o leer archivos completos en disco (`view_file`, etc.), **SIEMPRE** se debe consultar primero el grafo de memoria del servidor MCP `memory` (`read_graph`, `search_nodes`, `open_nodes`) y este archivo `.antigravity/memory.md` para identificar la arquitectura, contratos, rutas y componentes relevantes. Solo abre archivos en disco cuando necesites editar líneas específicas o verificar detalles de implementación no cubiertos en la memoria.

---

## 1. Resumen del Estado Actual

El proyecto **Prototipo-para-luxman** es una plataforma web y ERP ligero para **Equipos Inoxidables Luxman**, compuesta por un cotizador industrial de tanques de acero inoxidable y un sistema conversacional de generación/edición de cotizaciones en PDF con membrete. Toda la solución está contenerizada mediante `docker-compose.yml`.

### Estado Operativo
- **Frontend (`luxman-frontend`)**: Funcional en React 19 + Vite 8. Incluye Landing Page con catálogo interactivo, Cotizador de Tanques con cálculo preliminar en tiempo real + fallback offline, y módulo interno de Chat de Membretes (`#/memebretes`).
- **Backend (`LuxmanBackend`)**: Funcional en ASP.NET Core .NET 8. Expone endpoints REST para cotizaciones estructuradas (PostgreSQL + QuestPDF) y membretes conversacionales con PDFs editables (MongoDB + QuestPDF/iText/PdfPig).
- **Bases de Datos**:
  - **PostgreSQL 15**: Esquema relacional (`clientes`, `cotizaciones`) y cálculo automático de precios mediante trigger `BEFORE INSERT` en `PL/Python` (`plpython3u`) con fallback automático a `PL/pgSQL`.
  - **MongoDB 7**: Almacenamiento documental NoSQL (`luxman.MemebretesPDF`) para el historial y binarios de PDFs generados desde el chat.

---

## 2. Arquitectura y Componentes Clave

### A. Frontend (`./luxman-frontend`)
- **Stack**: React `19.2.8`, Vite `8.3.0`, Bootstrap `5.3.8`, Framer Motion `14.2.0`, `lucide-react` (estándar para iconografía en desarrollos UI).
- **Puerto Docker**: `5173:80` (`luxman_frontend_prod`).
- **Archivos Clave**:
  - `src/App.jsx`: Enrutador ligero. Muestra `ChatMemebretes` si `window.location.hash === '#/memebretes'`; de lo contrario alterna entre `LandingPage` (`inicio`) y `FormularioCotizacion` (`cotizador`).
  - `src/components/LandingPage.jsx`: Página principal con presentación corporativa, sectores industriales y catálogo de 6 líneas de equipos inoxidables con el subcomponente `CarruselImagenes` (`/img/equipos/1.jpg` a `20.jpg`).
  - `src/components/FormularioCotizacion.jsx`: Formulario de cotización de tanques (capacidad en litros hasta `1,000,000 L`, acero `304` o `316`, agitación dinámica opcional). Calcula estimado en vivo, consume `POST /api/cotizacion` y descarga automáticamente el PDF desde `GET /api/cotizacion/{id}/pdf`. Incluye modo estimado offline si el backend no responde.
  - `src/components/ChatMemebretes.jsx`: Interfaz para dirección/CEO (`#/memebretes`) con dos vistas: `VistaChat` (generación y corrección incremental de PDFs con visor integrado `VisorPdf` con zoom) y `VistaHistorial` (consulta de documentos previos en MongoDB).
  - `src/components/LandingPage.css` y `src/components/ChatMemebretes.css`: Hojas de estilo con diseño Modern UI en Modo Claro (regla 60-30-10: base `#FFFFFF`/`#F8FAFC`, tarjetas elevadas con bordes `slate-200/80` y sombras suaves difuminadas, y acentos en azul/índigo corporativo `#2563EB`/`#1E293B`).

### B. Backend (`./LuxmanBackend`)
- **Stack**: .NET 8.0 Web API (`LuxmanErp`), `Npgsql` `10.0.3` (SQL directo sin ORM), `MongoDB.Driver` `3.12.0`, `QuestPDF` `2026.8.0` (Community License), `itext` `9.8.0`, `PdfPig` `0.1.16`.
- **Puerto**: `5294` (`http://localhost:5294`, Docker `5294:8080`, contenedor `luxman_backend_prod`).
- **Archivos Clave**:
  - `Program.cs`: Configuración de licencia QuestPDF, inyección de dependencias (`CotizacionService`, `PdfService`, `MemebreteRepository`, `MemebretePdfService`) y política CORS `PermitirFrontendReact` (expone `Content-Disposition`).
  - `Controllers/CotizacionController.cs`: Controlador REST en `api/cotizacion`.
  - `Controllers/MemebreteController.cs`: Controlador REST en `api/memebretes`.
  - `Cotizacion.cs`: Modelos `Cotizacion` y `CotizacionRequestDTO`.
  - `CotizacionService.cs`: Acceso a datos en PostgreSQL vía `NpgsqlConnection` (`CrearCotizacion`, `ObtenerCotizacionPorId`, `ObtenerCotizacionesPorCliente`). Convierte `idCliente == 0` o `null` en `DBNull.Value`.
  - `PdfService.cs`: Generación de PDF oficial de cotización de tanques usando QuestPDF y recursos en `Assets/header_luxman.png` y `Assets/footer_luxman.png`.
  - `MemebretePdf.cs`: Modelos `MemebretePdf` (BsonId ObjectId, Fecha, NombreCliente, Archivo byte[], TextoOriginal) y `MemebreteResumen`.
  - `MemebreteRepository.cs`: Repositorio singleton para la colección `MemebretesPDF` en MongoDB.
  - `MemebretePdfService.cs` y `TextoCotizacionParser.cs`: Parseo de texto libre y correcciones puntuales, y generación de PDFs con campos editables.

### C. Endpoints de la API
| Método | Ruta | Controlador | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/cotizacion` | `CotizacionController` | Crea una cotización en PostgreSQL y devuelve el registro con `precioBase` y `precioFinal` calculados por el trigger. |
| `GET` | `/api/cotizacion/cliente/{idCliente}` | `CotizacionController` | Lista las cotizaciones asociadas a un `idCliente` ordenadas por fecha descendente. |
| `GET` | `/api/cotizacion/{idCotizacion}/pdf` | `CotizacionController` | Genera y descarga el archivo `Cotizacion_Luxman_COT-{id:D5}.pdf`. |
| `POST` | `/api/memebretes/procesar` | `MemebreteController` | Genera un nuevo PDF con membrete a partir de `mensaje` o aplica una corrección sobre `idDocumentoActual`, guardándolo en MongoDB. |
| `GET` | `/api/memebretes` | `MemebreteController` | Devuelve la lista de `MemebreteResumen` (historial sin binarios) ordenada por fecha descendente. |
| `GET` | `/api/memebretes/{id}/pdf` | `MemebreteController` | Devuelve el binario `application/pdf` para visualización inline o descarga (`?descargar=true`). |

### D. Bases de Datos e Infraestructura (`docker-compose.yml`)
1. **PostgreSQL 15 (`db` / `luxman_db_prod`, puerto `5432`)**:
   - `01_schema.sql`: Crea tablas `clientes` (con cliente semilla *Lacteos del Norte SA de CV*) y `cotizaciones`, más el índice `idx_cotizaciones_cliente`.
   - `02_plpython_function.sql`: Define `fn_calcular_precio_cotizacion()` y el trigger `BEFORE INSERT` `trg_calcular_precio` sobre `cotizaciones`.
   - **Reglas de Negocio de Precios**:
     - Acero Inoxidable AISI `304`: **$45.50 MXN / Litro**
     - Acero Inoxidable AISI `316`: **$68.75 MXN / Litro**
     - Sistema de Agitación (`tiene_agitacion = TRUE`): **+$8,500.00 MXN**
2. **MongoDB 7 (`mongo` / `luxman_mongo_prod`, puerto `27017`)**:
   - Base de datos: `luxman`
   - Colección: `MemebretesPDF`

---

## 3. Reglas de Diseño y Flujo de Trabajo
1. **Memory-First (Ahorro de Tokens)**: Consultar siempre el grafo MCP `memory` (`read_graph` / `search_nodes`) y `.antigravity/memory.md` antes de leer archivos completos en disco.
2. **Modern UI Skill (`.agent/skills/modern-ui/SKILL.md`)**: Todo desarrollo de frontend debe aplicar la regla de color **60-30-10**, utilizar iconos de **`lucide-react`** y evitar componentes planos o genéricos.
