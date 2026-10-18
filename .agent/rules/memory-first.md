# Regla Obligatoria: Memory-First (Ahorro de Tokens) y Diseño UI

## 1. Consulta Prioritaria del Grafo de Memoria
- Es **obligatorio** consultar primero el grafo de memoria del servidor MCP `memory` (`read_graph`, `search_nodes`, `open_nodes`) y el archivo `.antigravity/memory.md` antes de inspeccionar archivos completos en disco.
- Prohibido abrir archivos completos de manera exploratoria cuando la arquitectura, endpoints, modelos o esquemas ya están registrados en el grafo de memoria.
- Al leer archivos en disco para una edición puntual, usa rangos de líneas acotados (`StartLine` y `EndLine`) para ahorrar tokens.

## 2. Estándar de Desarrollo Frontend (`modern-ui`)
- Todo trabajo de interfaz en `luxman-frontend` debe seguir la skill `.agent/skills/modern-ui/SKILL.md`:
  - Regla de color **60-30-10**.
  - Uso obligatorio de **`lucide-react`**.
  - Prohibido el uso de componentes planos o genéricos.
