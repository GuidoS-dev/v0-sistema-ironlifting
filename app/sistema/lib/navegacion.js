export const PLANILLA_NAV_SELECTOR =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

export function buildPlanillaFocusGrid(container) {
  if (!container) return null;
  const points = Array.from(container.querySelectorAll(PLANILLA_NAV_SELECTOR))
    .filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.closest('[data-grid-nav-ignore="true"]')) return false;
      if (el.tabIndex < 0) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })
    .map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        el,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    })
    .sort((a, b) => {
      if (Math.abs(a.y - b.y) > 6) return a.y - b.y;
      return a.x - b.x;
    });

  if (!points.length) return null;

  const rows = [];
  points.forEach((p) => {
    const prevRow = rows[rows.length - 1];
    if (!prevRow || Math.abs(prevRow.y - p.y) > 8) {
      rows.push({ y: p.y, items: [p] });
      return;
    }
    prevRow.items.push(p);
    prevRow.y =
      (prevRow.y * (prevRow.items.length - 1) + p.y) / prevRow.items.length;
  });

  rows.forEach((row) => row.items.sort((a, b) => a.x - b.x));

  const posMap = new Map();
  rows.forEach((row, rowIdx) => {
    row.items.forEach((item, colIdx) => {
      posMap.set(item.el, { rowIdx, colIdx, x: item.x });
    });
  });

  return { rows, posMap };
}

export function focusPlanillaField(el) {
  if (!(el instanceof HTMLElement)) return;
  el.focus({ preventScroll: true });
  if (typeof el.select === "function") {
    try {
      el.select();
    } catch {}
  }
  el.scrollIntoView({ block: "nearest", inline: "nearest" });
}

export function handlePlanillaArrowNavigation(event, container) {
  if (!container) return;
  if (event.defaultPrevented) return;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

  const key = event.key;
  if (
    key !== "ArrowLeft" &&
    key !== "ArrowRight" &&
    key !== "ArrowUp" &&
    key !== "ArrowDown"
  ) {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!container.contains(target)) return;
  if (target.closest('[data-grid-nav-ignore="true"]')) return;

  const active = target.matches(PLANILLA_NAV_SELECTOR)
    ? target
    : target.closest(PLANILLA_NAV_SELECTOR);
  if (!active) return;

  const grid = buildPlanillaFocusGrid(container);
  if (!grid) return;

  const pos = grid.posMap.get(active);
  if (!pos) return;

  const rowCount = grid.rows.length;
  const row = grid.rows[pos.rowIdx];
  let next = null;

  if (key === "ArrowRight") {
    if (pos.colIdx < row.items.length - 1) {
      next = row.items[pos.colIdx + 1]?.el;
    } else {
      const nextRow = grid.rows[(pos.rowIdx + 1) % rowCount];
      next = nextRow?.items[0]?.el;
    }
  }

  if (key === "ArrowLeft") {
    if (pos.colIdx > 0) {
      next = row.items[pos.colIdx - 1]?.el;
    } else {
      const prevRow = grid.rows[(pos.rowIdx - 1 + rowCount) % rowCount];
      next = prevRow?.items[prevRow.items.length - 1]?.el;
    }
  }

  if (key === "ArrowDown" || key === "ArrowUp") {
    const delta = key === "ArrowDown" ? 1 : -1;
    const targetRow = grid.rows[(pos.rowIdx + delta + rowCount) % rowCount];
    if (targetRow?.items?.length) {
      let nearest = targetRow.items[0];
      let dist = Math.abs(nearest.x - pos.x);
      for (let i = 1; i < targetRow.items.length; i += 1) {
        const d = Math.abs(targetRow.items[i].x - pos.x);
        if (d < dist) {
          nearest = targetRow.items[i];
          dist = d;
        }
      }
      next = nearest?.el;
    }
  }

  if (!next || next === active) return;
  event.preventDefault();
  focusPlanillaField(next);
}

export const SEMBRADO_NAV_SELECTOR = '[data-sembrado-nav="true"]';
export const SEMBRADO_ROLE_ORDER = {
  ejercicio: 0,
  intensidad: 1,
  tabla: 2,
  remove: 3,
  add: 4,
};

export function getSembradoTabSequence(container, { includeRemove = true } = {}) {
  if (!container) return [];

  const items = Array.from(container.querySelectorAll(SEMBRADO_NAV_SELECTOR))
    .filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.tabIndex < 0 || el.hasAttribute("disabled")) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })
    .map((el) => {
      const sem = Number(el.dataset.semIdx);
      const turno = Number(el.dataset.turnoIdx);
      const role = el.dataset.role || "";
      const ejIdxRaw = Number(el.dataset.ejIdx);
      const ejIdx = role === "add" ? Number.MAX_SAFE_INTEGER : ejIdxRaw;
      const roleIdx =
        SEMBRADO_ROLE_ORDER[role] === undefined
          ? Number.MAX_SAFE_INTEGER
          : SEMBRADO_ROLE_ORDER[role];

      return {
        el,
        sem: Number.isFinite(sem) ? sem : Number.MAX_SAFE_INTEGER,
        turno: Number.isFinite(turno) ? turno : Number.MAX_SAFE_INTEGER,
        ejIdx: Number.isFinite(ejIdx) ? ejIdx : Number.MAX_SAFE_INTEGER,
        roleIdx,
      };
    })
    .filter(
      (item) => includeRemove || item.roleIdx !== SEMBRADO_ROLE_ORDER.remove,
    )
    .sort((a, b) => {
      if (a.sem !== b.sem) return a.sem - b.sem;
      if (a.turno !== b.turno) return a.turno - b.turno;
      if (a.ejIdx !== b.ejIdx) return a.ejIdx - b.ejIdx;
      return a.roleIdx - b.roleIdx;
    });

  return items.map((item) => item.el);
}

export function handleSembradoTabNavigation(event, container) {
  if (!container) return;
  if (event.defaultPrevented) return;
  if (event.key !== "Tab") return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;

  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!container.contains(target)) return;

  const active = target.matches(SEMBRADO_NAV_SELECTOR)
    ? target
    : target.closest(SEMBRADO_NAV_SELECTOR);
  if (!(active instanceof HTMLElement)) return;

  const isBackward = event.shiftKey;
  const seq = getSembradoTabSequence(container, {
    includeRemove: isBackward,
  });
  if (!seq.length) return;

  const idx = seq.indexOf(active);
  if (idx === -1) return;

  event.preventDefault();
  const delta = isBackward ? -1 : 1;
  const nextIdx = Math.min(Math.max(idx + delta, 0), seq.length - 1);
  focusPlanillaField(seq[nextIdx]);
}
