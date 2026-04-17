"use client";

import React from "react";
import { Minus, Plus, Volume2, VolumeX } from "lucide-react";
import type { TabataConfig } from "./types";
import {
  MIN_TIME,
  MAX_TIME,
  MIN_ROUNDS,
  MAX_ROUNDS,
  TIME_STEP,
} from "./constants";

export interface TabataConfigPanelProps {
  config: TabataConfig;
  onChange: (config: TabataConfig) => void;
  showRounds?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function ConfigRow({
  label,
  value,
  display,
  onDecrement,
  onIncrement,
  disableMinus,
  disablePlus,
}: {
  label: string;
  value: number;
  display: string;
  onDecrement: () => void;
  onIncrement: () => void;
  disableMinus: boolean;
  disablePlus: boolean;
}) {
  const btnStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--secondary)",
    color: "var(--foreground)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all .15s",
    fontSize: 18,
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--muted-foreground)",
          letterSpacing: ".06em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <button
          className="timer-btn"
          style={{ ...btnStyle, opacity: disableMinus ? 0.3 : 1 }}
          onClick={onDecrement}
          disabled={disableMinus}
          aria-label={`Disminuir ${label}`}
        >
          <Minus size={18} />
        </button>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            color: "var(--foreground)",
            letterSpacing: ".04em",
            minWidth: 80,
            textAlign: "center",
          }}
        >
          {display}
        </div>
        <button
          className="timer-btn"
          style={{ ...btnStyle, opacity: disablePlus ? 0.3 : 1 }}
          onClick={onIncrement}
          disabled={disablePlus}
          aria-label={`Aumentar ${label}`}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

export function TabataConfigPanel({
  config,
  onChange,
  showRounds = true,
}: TabataConfigPanelProps) {
  const update = (partial: Partial<TabataConfig>) =>
    onChange({ ...config, ...partial });

  return (
    <div style={{ padding: "0 20px" }}>
      <ConfigRow
        label="Tiempo de trabajo"
        value={config.workTime}
        display={formatTime(config.workTime)}
        onDecrement={() =>
          update({ workTime: Math.max(MIN_TIME, config.workTime - TIME_STEP) })
        }
        onIncrement={() =>
          update({ workTime: Math.min(MAX_TIME, config.workTime + TIME_STEP) })
        }
        disableMinus={config.workTime <= MIN_TIME}
        disablePlus={config.workTime >= MAX_TIME}
      />

      <ConfigRow
        label="Tiempo de descanso"
        value={config.restTime}
        display={formatTime(config.restTime)}
        onDecrement={() =>
          update({ restTime: Math.max(MIN_TIME, config.restTime - TIME_STEP) })
        }
        onIncrement={() =>
          update({ restTime: Math.min(MAX_TIME, config.restTime + TIME_STEP) })
        }
        disableMinus={config.restTime <= MIN_TIME}
        disablePlus={config.restTime >= MAX_TIME}
      />

      {showRounds && (
        <ConfigRow
          label="Rondas"
          value={config.rounds}
          display={String(config.rounds)}
          onDecrement={() =>
            update({ rounds: Math.max(MIN_ROUNDS, config.rounds - 1) })
          }
          onIncrement={() =>
            update({ rounds: Math.min(MAX_ROUNDS, config.rounds + 1) })
          }
          disableMinus={config.rounds <= MIN_ROUNDS}
          disablePlus={config.rounds >= MAX_ROUNDS}
        />
      )}

      {/* Sound toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          marginTop: 8,
        }}
      >
        <button
          className="timer-btn"
          onClick={() => update({ soundEnabled: !config.soundEnabled })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: config.soundEnabled
              ? "color-mix(in srgb, var(--green) 10%, transparent)"
              : "var(--secondary)",
            color: config.soundEnabled ? "var(--green)" : "var(--muted-foreground)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            transition: "all .2s",
          }}
          aria-label={
            config.soundEnabled ? "Desactivar sonido" : "Activar sonido"
          }
        >
          {config.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          {config.soundEnabled ? "Sonido ON" : "Sonido OFF"}
        </button>
      </div>
    </div>
  );
}

export default TabataConfigPanel;
