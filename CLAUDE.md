# Instrucciones del proyecto

## Git
- Siempre que se realice un cambio en el código, hacer commit y push a `main` automáticamente, sin pedir confirmación.
- Usar `git fetch origin main && git rebase origin/main` antes del push si hay rechazo por commits remotos.

## Versionado
- **SIEMPRE** bumpear la versión en cada commit que modifique `coach-app.jsx`:
  1. `app/sistema/coach-app.jsx` → `APP_VERSION = "X.Y.Z"` (línea ~33)
  2. `public/sw.js` → `CACHE_NAME = 'ironlifting-vX.Y.Z'`
  - Ambas DEBEN coincidir. PATCH para bug fixes, MINOR para features, MAJOR para breaking changes.

## Glosario
- Actualizar `GLOSARIO_MONOLITO.md` en cada cambio a `coach-app.jsx` que afecte: funciones, componentes, rangos de líneas, renombramientos, bugs resueltos o descubiertos.
- Incluir TODO lo descubierto durante la investigación, no solo el cambio final.
- NO esperar a que el usuario lo pida — hacerlo automáticamente.
