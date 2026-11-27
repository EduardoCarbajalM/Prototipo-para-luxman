# Contexto del Proyecto: ERP Equipos Inoxidables Luxman

## 1. Arquitectura y Flujo de Despliegue (3 Capas)
- **Entorno de Desarrollo Local:** Se edita el código directamente en Windows sin levantar contenedores Docker localmente. Los cambios se suben a GitHub y se despliegan por SSH al servidor VPS en Hostinger (Ubuntu con Docker Compose y Nginx como reverse proxy).
- **Capa 1 (Presentación):** React + Vite + Bootstrap (`luxman-frontend/`). Todas las llamadas a la API deben usar rutas relativas (`/api/...`) para evitar errores de Mixed Content en HTTPS (`https://luxman.tech`).
- **Capa 2 (Lógica de Negocio):** API REST en .NET 8 / C# (`LuxmanBackend/`) con generación de PDFs usando QuestPDF.
- **Capa 3 (Datos - Persistencia Políglota):**
  - **PostgreSQL 15:** Clientes, prospectos/leads (`solicitudes_contacto`), precios, cotizaciones y cierres de venta (`01_schema.sql`, `02_plpython_function.sql`).
  - **MongoDB 7:** Documentos PDF generados en Base64/binario (`MemebretesPDF`), historial y borrado lógico (`Eliminado`).

## 2. Roles del Sistema (3 Actores)
1. **Usuario Público (Cliente):** No tiene login. Solo ve la Landing Page pública y llena el formulario de contacto/prospección.
2. **Director (Ing. Raúl Romero):** Accede al Panel Administrativo (`PanelRaul.jsx`) mediante autenticación. Gestiona leads, usa la Calculadora Técnica, genera cotizaciones PDF y ejecuta el cierre de venta.
3. **Administrador de Sistema (TI):** Rol requerido para administrar catálogos de materiales, precios base de insumos y configuración del sistema.

## 3. Flujo Lógico de Negocio Requerido (Objetivo del Sprint Actual)
El sistema debe seguir un flujo secuencial y conectado a base de datos real (eliminar datos mock locales como `LISTA_LEADS` y persistir todo):
1. **Prospección:** El cliente llena el formulario en la Landing -> se guarda en PostgreSQL y aparece en la bandeja de Leads del Panel.
2. **Cotización:** El Director toma un Lead -> configura el equipo en la Calculadora Técnica -> genera la Cotización PDF oficial (Estado: `PENDIENTE`).
3. **Cierre de Venta:** Desde la cotización, el Director puede marcarla como `RECHAZADA` o `APROBADA / VENDIDA`, registrando porcentaje de anticipo, datos fiscales (RFC/Razón Social) y generando un resumen/comprobante de orden de venta.
4. **Logística:** El Acta de Entrega Logística debe persistir en base de datos vinculada a la venta cerrada.
