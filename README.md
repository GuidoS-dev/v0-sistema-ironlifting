# Agente UI para Visual Studio Code

> Sistema completo de instrucciones para que cualquier agente de IA dentro de VS Code (Copilot, Cursor, Cline, Continue, Codex) genere componentes con estética **limpia y profesional**, al nivel de Linear, Vercel, Stripe, Arc, Raycast.

No es un plugin ni una extensión. Es un conjunto de **archivos de configuración y reglas** que se instalan en cualquier proyecto y "moldean" el comportamiento de tu agente para que deje de generar la típica "AI slop" (Inter en todos lados, gradientes morados, hero genérico) y produzca UI con identidad e intención.

---

## ¿Qué incluye?

```
.
├── AGENTS.md                          ← Instrucciones globales (se inyectan en TODOS los chats)
├── README.md                          ← Esta guía
├── .github/
│   ├── copilot-instructions.md        ← Instrucciones específicas de Copilot Chat
│   └── agents/                        ← Custom Agents (aparecen en el dropdown 👇)
│       ├── frontend-ui.agent.md       ← "UI/Frontend Engineer" — construye componentes
│       └── design-reviewer.agent.md   ← "Design Reviewer" — audita componentes existentes
├── .cursor/
│   └── rules/
│       └── frontend.mdc               ← Reglas específicas de Cursor
├── .vscode/
│   ├── settings.json                  ← Activa instrucciones + descubre custom agents
│   └── extensions.json                ← Extensiones recomendadas
└── design-system/
    ├── tokens.css                     ← Design tokens (color, spacing, motion, type)
    └── components.md                  ← Biblioteca de patrones de componentes
```

### Compatibilidad

| Herramienta | Archivo que lee |
|---|---|
| **GitHub Copilot Chat** (extensión unificada) | `.github/copilot-instructions.md` + los listados en `settings.json` |
| **Cursor** | `.cursor/rules/frontend.mdc` |
| **Cline / Roo Code** | `AGENTS.md` (estándar) |
| **Continue** | `AGENTS.md` |
| **Codex CLI / OpenAI Codex** | `AGENTS.md` |
| **Aider** | `AGENTS.md` (con `--read AGENTS.md`) |
| **Claude Code** | `AGENTS.md` o `CLAUDE.md` (renombralo si querés) |
| Cualquier otro | `AGENTS.md` se está convirtiendo en estándar de facto |

---

## Instalación rápida

### Opción 1 — Copiar a un proyecto existente

Descargá el ZIP, descomprimí, y copiá el contenido a la raíz de tu proyecto. Si ya tenés `.vscode/settings.json`, hacé merge manual de las claves (no lo sobrescribas a ciegas).

```bash
# Desde la raíz de tu proyecto:
unzip vscode-ui-agent.zip
cp -r vscode-ui-agent/. .
rm -rf vscode-ui-agent
```

### Opción 2 — Como template para proyectos nuevos

Cloná esta estructura como punto de partida y empezá a construir desde ahí:

```bash
mkdir mi-nuevo-proyecto && cd mi-nuevo-proyecto
unzip ~/Downloads/vscode-ui-agent.zip
git init
```

### Después de instalar

1. **Abrí el proyecto en VS Code**.
2. Cuando aparezca el toast *"This workspace has extension recommendations"*, aceptá para instalar las extensiones recomendadas.
3. Reiniciá la ventana (`Cmd/Ctrl + Shift + P` → *Developer: Reload Window*).
4. Listo. La próxima vez que le pidas a Copilot/Cursor/Cline que genere un componente, va a respetar las reglas.

---

## Cómo importar los design tokens en tu proyecto

### Si usás Tailwind CSS v4

En tu CSS principal (típicamente `src/app/globals.css` o `src/styles/globals.css`):

```css
@import "tailwindcss";
@import "../../design-system/tokens.css";

/* Mapeá las CSS vars como utilidades de Tailwind */
@theme inline {
  --color-bg:              var(--bg);
  --color-bg-subtle:       var(--bg-subtle);
  --color-surface:         var(--surface);
  --color-surface-hover:   var(--surface-hover);
  --color-fg:              var(--fg);
  --color-fg-muted:        var(--fg-muted);
  --color-fg-subtle:       var(--fg-subtle);
  --color-border:          var(--border);
  --color-border-strong:   var(--border-strong);
  --color-accent:          var(--accent);
  --color-accent-fg:       var(--accent-fg);
  --color-success:         var(--success);
  --color-warning:         var(--warning);
  --color-danger:          var(--danger);
  --color-ring:            var(--ring);

  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);

  --font-sans:    var(--font-sans);
  --font-display: var(--font-display);
  --font-mono:    var(--font-mono);
}
```

A partir de ahí podés usar `bg-bg`, `text-fg`, `border-border`, `bg-accent`, etc. en tus clases.

### Si usás Tailwind v3 o CSS plano

Importá `tokens.css` igual y usá `var(--token)` directamente en tus estilos:

```css
.boton-primario {
  background: var(--accent);
  color: var(--accent-fg);
  border-radius: var(--radius-md);
  transition: background var(--duration) var(--ease-out);
}
```

---

## Cómo activar las instrucciones según tu agente

### GitHub Copilot Chat

> A inicios de 2026 Microsoft unificó la extensión vieja `github.copilot` (ghost text) dentro de `github.copilot-chat`. Hoy se instala una sola extensión y trae todo: chat, agente, e inline suggestions.

Ya está activado vía `.vscode/settings.json`. Verificá que tengas la clave:

```jsonc
"github.copilot.chat.codeGeneration.useInstructionFiles": true
```

Para confirmar que Copilot está leyendo las instrucciones, abrí Copilot Chat y mirá las "References" que muestra debajo de cada respuesta — deberías ver `AGENTS.md` y `copilot-instructions.md` listados.

### Cursor

Cursor lee automáticamente `.cursor/rules/*.mdc`. La regla está marcada con `alwaysApply: true`, así que se inyecta en cada chat sobre archivos UI. Verificá en *Settings → Rules*.

### Cline / Roo Code / Continue / Codex

Estas herramientas leen `AGENTS.md` automáticamente cuando está en la raíz del workspace. No requiere configuración adicional.

### Claude Code

Renombrá `AGENTS.md` a `CLAUDE.md` (o dejalo así, también lo lee).

---

## Cómo personalizar para tu marca

### Cambiar el color de marca

### Dos formas de personalizar Copilot — y por qué este pack tiene ambas

Copilot Chat ofrece **dos mecanismos distintos** para moldear su comportamiento. Este pack usa los dos juntos porque se complementan:

| Mecanismo | Archivo | Cómo se activa | Cuándo usarlo |
|---|---|---|---|
| **Instructions** | `AGENTS.md`, `.github/copilot-instructions.md` | Se inyectan automáticamente en cada chat | Reglas de fondo que querés que apliquen siempre (anti-patrones, tokens, estética general) |
| **Custom Agents** | `.github/agents/*.agent.md` | Los elegís manualmente desde el dropdown 🔻 | Personas especializadas para tareas concretas (construir UI, revisar UI, refactorizar, etc.) |

> **Antes se llamaban "chat modes"**. Microsoft los renombró a "custom agents" en 2026. Si tenés archivos `.chatmode.md` viejos, renombralos a `.agent.md`.

### Los Custom Agents que vienen incluidos

Cuando abrís el selector de agentes en Copilot Chat (el dropdown que se ve en tu captura), van a aparecer estos dos:

| Agente | Para qué sirve |
|---|---|
| **UI/Frontend Engineer** | Construye componentes nuevos siguiendo todo el quality bar del pack. Usalo cuando le pidas "hacé un dashboard", "creá un Card", "armá una tabla de planillas", etc. |
| **Design Reviewer** | Audita componentes existentes y devuelve un reporte estructurado (visuales, tokens, estados, accesibilidad, motion, código). Es read-only — no edita. Tiene un botón de handoff que pasa el reporte al UI/Frontend Engineer para que aplique los fixes. |

Para usarlos: abrí Copilot Chat → click en el dropdown de agentes (donde decía *"Agent"* / *"Ask"*) → seleccioná **UI/Frontend Engineer** o **Design Reviewer**.

Si no aparecen al principio, ejecutá en la paleta de comandos (`Cmd/Ctrl+Shift+P`):
- *"Chat: Configure Custom Agents..."* → te muestra qué agentes detectó.
- *"Developer: Reload Window"* después de instalar el pack si todavía no aparecen.

### Crear tu propio Custom Agent

Copiá uno de los `.agent.md` existentes en `.github/agents/`, renombralo, y editá el frontmatter + el cuerpo. Los campos del frontmatter útiles son:

```yaml
---
description: Una línea — esto es lo que se ve en el dropdown bajo el nombre
name: Como aparece en el dropdown
model: ['Claude Opus 4.7', 'GPT-5.2']   # Lista de fallback en orden
tools: ['search/codebase', 'edit/applyPatch']  # Opcional — limita herramientas
handoffs:                                # Botones que aparecen al final del chat
  - label: Texto del botón
    agent: NombreDelOtroAgente
    prompt: Lo que se le manda al otro agente
    send: false                          # false = abre el prompt para que lo edites primero
---

# Cuerpo en Markdown — esto se prepende a cada prompt cuando el agente está activo.
```

---

## Cómo personalizar para tu marca

### Cambiar el color de marca

Editá `design-system/tokens.css`, sección `--accent-*`. Los valores están en formato `oklch(L C H)` para máxima fidelidad de color:

```css
--accent-500: oklch(56% 0.190 265);  /* indigo por defecto */

/* Rojo Iron Lifting (ejemplo) */
--accent-500: oklch(58% 0.20 25);
```

Tip: para encontrar valores oklch, usá [oklch.com](https://oklch.com) — pegás un hex y te devuelve el oklch equivalente y toda la escala perceptualmente uniforme.

### Cambiar la tipografía

Editá las variables `--font-display`, `--font-sans`, `--font-mono` en `tokens.css`. Después auto-hospedá las fuentes usando `next/font` o `@fontsource`.

Combinaciones recomendadas:

| Estilo | Display | Sans | Mono |
|---|---|---|---|
| Editorial moderno | Fraunces | Geist | Geist Mono |
| Tech refinado | Söhne / Geist | Inter | JetBrains Mono |
| Corporativo serio | IBM Plex Serif | IBM Plex Sans | IBM Plex Mono |
| Suizo limpio | Söhne | Söhne | Söhne Mono |
| Open source | Instrument Serif | Geist | Commit Mono |

### Cambiar el bar de calidad

Editá `AGENTS.md` sección `## 2. The Aesthetic Bar`. Si tu producto necesita algo más bold (entretenimiento, gaming) o más sobrio (banca, salud), ajustá los "Always" / "Never" ahí.

---

## Cómo usarlo en el día a día

Una vez instalado, simplemente **pedile cosas a tu agente con normalidad**:

> *"Hacé un dashboard con sidebar, header, y una grilla de 3 cards mostrando métricas de ventas."*

Y vas a notar:
- El agente arranca con una **nota de diseño** breve antes de codear.
- Usa los **tokens** (`bg-bg`, `text-fg`, `bg-accent`) en lugar de colores hardcodeados.
- Implementa **estados reales** (loading, empty, error, focus).
- Termina con una **nota de accesibilidad**.
- Te entrega ejemplos de uso con **datos realistas**, no `Click me` / `Lorem ipsum`.

Si alguna vez ves al agente cayendo en patrones genéricos (Inter solo, gradiente morado, hero centrado típico), recordáselo:

> *"Releé `AGENTS.md` sección 2 antes de seguir."*

---

## Verificación

Para confirmar que todo está bien instalado, pedile a Copilot/Cursor:

> *"¿Qué reglas estás siguiendo en este proyecto? Listame los puntos clave de AGENTS.md."*

Si te responde mencionando los tokens, el bar de calidad, los anti-patrones — está funcionando.

Si te dice "no veo ningún archivo de reglas" — revisá:
1. Que `AGENTS.md` esté en la raíz del workspace (no en una subcarpeta).
2. Que `settings.json` tenga `useInstructionFiles: true` (Copilot).
3. Que hayas reiniciado VS Code después de instalar.

---

## Filosofía

Este sistema parte de una idea simple: **los agentes de IA, por defecto, generan la misma UI genérica una y otra vez**. Inter, gradientes morados, glassmorphism, shadows enormes. No porque sean malos, sino porque "lo que está en el medio del dataset" se siente como "lo correcto".

La forma de salir de eso es **decirle al agente, antes de cada generación, qué bar de calidad esperás y qué patrones no querés ver**. Eso es exactamente lo que hace `AGENTS.md`: define explícitamente qué es "limpio y profesional" para este proyecto, con ejemplos concretos y anti-patrones.

El resultado: componentes que parecen diseñados por alguien, no escupidos por una caja negra.

---

## Licencia

MIT. Adaptalo, modificalo, hacelo tuyo.
