# Refactor Notes — Mejoras pendientes para fase 2

> Lista viva de cosas detectadas durante la atomización pero **NO aplicadas** (la fase 1 es solo extracción). Cada nota incluye prioridad y referencia.
>
> Prioridades: 🔴 alta · 🟡 media · 🟢 baja

---

## Seguridad

_(pendiente — se completará al revisar cada módulo)_

## Performance / Rendimiento

_(pendiente)_

## Tipos / TS migration

_(pendiente)_

## Deuda técnica / Code smells

_(pendiente)_

## Testing / Cobertura

- 🟡 No hay tests automatizados pre-existentes. Toda la cobertura se construye desde cero durante el refactor.

## UX / UI

- 🟡 **PagePlantillas** — los filtros laterales por Período / Objetivo / Nivel no existen en la galería de plantillas. Hoy `PERIODOS`, `OBJETIVOS` y `NIVELES` se usan solo dentro de los modales de crear/guardar/editar (`coach-app.jsx` ~24725, ~26283). Falta el sidebar de filtros para la lista.
  - Origen: detectado en verificación visual del Paso 2.4.
  - Propuesta: agregar panel de filtros en `PagePlantillas` cuando se extraiga (paso 8.4).
  - Bloqueante para fase 1: no.

---

## Plantilla para nuevas notas

```
- [PRIO] **[área]** — descripción breve.
  - Origen: `archivo:línea` o paso del plan donde se detectó.
  - Propuesta: cómo se podría resolver.
  - Bloqueante para fase 1: sí/no.
```
