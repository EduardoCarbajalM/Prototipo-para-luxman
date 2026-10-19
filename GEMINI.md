# Reglas Globales del Proyecto — Luxman ERP

## 1. Regla Obligatoria: Consulta de Memoria Antes que Disco (Ahorro de Tokens)
- **ANTES** de leer o inspeccionar archivos completos en disco (`view_file`, lectura completa de código fuente, etc.), **ES OBLIGATORIO** consultar primero:
  1. El grafo de conocimiento del servidor MCP `memory` (`read_graph`, `search_nodes`, `open_nodes`).
  2. El resumen arquitectónico en [`.antigravity/memory.md`](./.antigravity/memory.md).
- Utiliza la información del grafo de memoria para ubicar exactamente qué entidad, controlador, servicio, tabla o componente necesitas intervenir.
- Cuando sea indispensable leer un archivo en disco para editarlo, inspecciona únicamente los rangos de líneas necesarios (`StartLine` / `EndLine`) o usa búsquedas puntuales (`grep_search`) para minimizar el consumo de tokens.
- Si realizas cambios arquitectónicos (nuevos endpoints, tablas, servicios o componentes), actualiza el grafo del servidor MCP `memory` y `.antigravity/memory.md`.

## 2. Reglas de Diseño Frontend (`modern-ui`)
- Todo desarrollo o modificación en `luxman-frontend` debe activar y respetar la skill [`.agent/skills/modern-ui/SKILL.md`](./.agent/skills/modern-ui/SKILL.md):
  - Aplicar la **regla 60-30-10** para la distribución cromática.
  - Utilizar **`lucide-react`** para toda la iconografía.
  - Evitar componentes planos o genéricos de Bootstrap sin personalización glassmorphism/profundidad visual.
