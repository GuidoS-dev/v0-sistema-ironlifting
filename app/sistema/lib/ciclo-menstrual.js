import { FASES_CICLO } from "../data/ciclo";

// Dado el último ciclo y la fecha de inicio de semana, devuelve la fase
export function parseAppDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  const raw = String(value).trim();
  if (!raw) return null;

  // YYYY-MM-DD → parse as local time (not UTC)
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const direct = new Date(raw);
  if (!isNaN(direct.getTime())) return direct;

  const match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return null;

  const [, dayStr, monthStr, yearStr] = match;
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);
  if (!day || !month || !year) return null;

  const parsed = new Date(year, month - 1, day);
  if (
    isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function getAgeFromBirthDate(value, referenceDate = new Date()) {
  const birthDate = parseAppDate(value);
  if (!birthDate) return null;

  const ref = parseAppDate(referenceDate);
  if (!ref) return null;

  let age = ref.getFullYear() - birthDate.getFullYear();
  const hasNotHadBirthdayYet =
    ref.getMonth() < birthDate.getMonth() ||
    (ref.getMonth() === birthDate.getMonth() &&
      ref.getDate() < birthDate.getDate());

  if (hasNotHadBirthdayYet) age -= 1;
  if (!Number.isFinite(age) || age < 0) return null;
  return age;
}

export function getFasePorDia(diaEnCiclo, durCiclo, durMens) {
  if (diaEnCiclo <= durMens) return "menstruacion";
  if (diaEnCiclo <= durCiclo * 0.5) return "folicular";
  if (diaEnCiclo <= durCiclo * 0.5 + 2) return "ovulacion";
  return "lutea";
}

export function getFasesVentanaCiclo(ciclo, fechaSemana, ventanaDias = 1) {
  if (!ciclo?.ultimo_inicio || !fechaSemana) return null;
  const durCiclo = Number(ciclo.duracion_ciclo) || 28;
  const durMens = Number(ciclo.duracion_mens) || 5;
  const inicio = parseAppDate(ciclo.ultimo_inicio);
  const semana = parseAppDate(fechaSemana);
  if (!inicio || !semana) return null;
  const diffDias = Math.floor((semana - inicio) / (1000 * 60 * 60 * 24));
  if (isNaN(diffDias)) return null;
  // Normalizar al ciclo actual
  const diaInicio = (((diffDias % durCiclo) + durCiclo) % durCiclo) + 1;

  const windowSize = Math.max(1, Number(ventanaDias) || 1);
  const fasesSemana = [];
  for (let i = 0; i < windowSize; i += 1) {
    const dia = ((((diaInicio - 1 + i) % durCiclo) + durCiclo) % durCiclo) + 1;
    fasesSemana.push(getFasePorDia(dia, durCiclo, durMens));
  }
  return fasesSemana;
}

export function getFaseDominante(fasesSemana) {
  if (!Array.isArray(fasesSemana) || !fasesSemana.length) return null;

  // Si la ovulación cae dentro de la semana, priorizar esa fase para visibilidad.
  if (fasesSemana.includes("ovulacion")) return "ovulacion";

  const prioridad = ["menstruacion", "folicular", "lutea"];
  const conteo = fasesSemana.reduce((acc, fase) => {
    acc[fase] = (acc[fase] || 0) + 1;
    return acc;
  }, {});

  let faseDominante = "lutea";
  let max = -1;
  prioridad.forEach((fase) => {
    const n = conteo[fase] || 0;
    if (n > max) {
      max = n;
      faseDominante = fase;
    }
  });
  return faseDominante;
}

export function getFaseCiclo(ciclo, fechaSemana, ventanaDias = 1) {
  const fasesSemana = getFasesVentanaCiclo(ciclo, fechaSemana, ventanaDias);
  return getFaseDominante(fasesSemana);
}

export function getDetalleFaseCiclo(ciclo, fechaSemana, ventanaDias = 1) {
  const fasesSemana = getFasesVentanaCiclo(ciclo, fechaSemana, ventanaDias);
  if (!fasesSemana?.length) return null;

  const fase = getFaseDominante(fasesSemana);
  const segmentos = fasesSemana.filter(
    (f, i) => i === 0 || f !== fasesSemana[i - 1],
  );
  const transicion =
    segmentos.length > 1
      ? segmentos.map((f) => FASES_CICLO[f]?.label || f).join(" -> ")
      : null;

  return { fase, transicion };
}

// Para una semana del meso (por número), calcular fecha aproximada
export function getFechaSemana(mesoFechaInicio, semanaNum) {
  if (!mesoFechaInicio) return null;
  const d = parseAppDate(mesoFechaInicio);
  if (!d) return null;
  const num = Number(semanaNum);
  if (isNaN(num)) return null;
  d.setDate(d.getDate() + (num - 1) * 7);
  if (isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function getFechaSemanaEfectiva(mesoFechaInicio, sem) {
  if (sem.fecha_override) return sem.fecha_override;
  return getFechaSemana(mesoFechaInicio, sem.numero);
}

export function formatFechaSemana(isoDate) {
  if (!isoDate) return "";
  const d = parseAppDate(isoDate);
  if (!d) return isoDate;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export function formatDateDisplay(isoDate) {
  if (!isoDate) return "";
  const d = parseAppDate(isoDate);
  if (!d) return isoDate;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}
