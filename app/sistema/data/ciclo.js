import { CloudMoon, Droplets, Sprout, Zap } from "lucide-react";

// ── Ciclo menstrual — fases y cálculo ────────────────────────────────────────
export const FASES_CICLO = {
  menstruacion: {
    label: "Menstruación",
    color: "#e53935",
    bg: "rgba(229,57,53,.15)",
    Icon: Droplets,
  },
  folicular: {
    label: "Folicular",
    color: "#43a047",
    bg: "rgba(67,160,71,.15)",
    Icon: Sprout,
  },
  ovulacion: {
    label: "Ovulación",
    color: "#fb8c00",
    bg: "rgba(251,140,0,.15)",
    Icon: Zap,
  },
  lutea: {
    label: "Lútea",
    color: "#8e24aa",
    bg: "rgba(142,36,170,.15)",
    Icon: CloudMoon,
  },
};
