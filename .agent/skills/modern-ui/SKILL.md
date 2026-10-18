---
name: modern-ui
description: >-
  Reglas y estándares de diseño UI/UX para todo desarrollo de frontend en el proyecto Luxman.
  Activa esta skill siempre que se creen, modifiquen o refactoricen componentes, vistas o estilos en React/Vite.
---

# Modern UI Design Skill — Luxman Frontend

Todo desarrollo, modificación o creación de interfaces en el frontend (`luxman-frontend`) **DEBE** cumplir estrictamente con los siguientes lineamientos de diseño:

## 1. Regla Cromática 60-30-10 en Modo Claro Corporativo (Obligatoria)

Toda vista y componente debe estructurar su jerarquía visual siguiendo la proporción **60-30-10** sobre una paleta luminosa, limpia y ejecutiva:

- **60% — Color Dominante (Fondos Principales y Lienzo)**:
  - Base limpia en blanco puro (`#FFFFFF`) combinada con fondos secundarios neutros claros (`#F8FAFC` / `slate-50` o `#FAFAFA` / `zinc-50`) para dar amplitud, legibilidad y orden visual.
- **30% — Color Secundario (Tarjetas Elevadas, Superficies y Estructura)**:
  - Contenedores y tarjetas en blanco (`#FFFFFF`) o gris neutro sutil (`#F1F5F9` / `slate-100`) delimitados por bordes delicados (`1px solid rgba(226, 232, 240, 0.8)` / `border-slate-200/80`), tipografía principal en `slate-900` (`#0F172A`) y secundaria en `slate-500`/`slate-600` (`#64748B` / `#475569`).
- **10% — Color de Acento Corporativo (CTAs, Elementos Activos y Puntos Focales)**:
  - Azul/Índigo industrial profundo (`#1E293B` / `slate-800` a `#4F46E5` / `indigo-600` y `#2563EB` / `blue-600`) reservado para llamadas a la acción primarias, pestañas activas, avatares, badges destacados y estados seleccionados.

## 2. Profundidad y Acabado Visual (Cero Diseño Plano)

- **Prohibido usar componentes planos o genéricos**: Sustituye las tarjetas planas por superficies con elevación sutil mediante sombras suaves y difuminadas (`shadow-sm`: `0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)`; `shadow-md`: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`).
- **Esquinas Redondeadas Modernas**: Utiliza radios amplios y armónicos (`rounded-xl` / `12px` a `rounded-2xl` / `16px–20px`).
- **Micro-interacciones**: Añade transiciones suaves en todos los botones, tarjetas y campos de entrada al pasar el cursor o enfocar (`transition-all duration-200`, elevación sutil `hover:-translate-y-0.5`, `hover:shadow-md` y anillos de enfoque `focus-within:ring-2`).

## 3. Iconografía con `lucide-react` (Obligatorio)

- **Usa siempre `lucide-react`** para toda la iconografía del sistema (botones, navegación, visor PDF, barra de chat, historial, alertas y fichas técnicas).
- **Prohibido usar emojis o símbolos de texto básicos** (como `📄`, `⬇`, `➤`, `−`, `+`, `⚠️`, `✓`, `←`) cuando exista un icono vectorial en `lucide-react` (`FileText`, `Download`, `SendHorizontal`, `ZoomOut`, `ZoomIn`, `AlertTriangle`, `CheckCircle2`, `ArrowLeft`, `History`, `Sparkles`, `Eye`, `EyeOff`, etc.).

## 4. Consulta de Memoria Previa
- Antes de inspeccionar archivos completos en disco, consulta siempre el grafo del servidor MCP `memory` y `.antigravity/memory.md` para ahorrar tokens.
