"use client";

import React, { useCallback } from "react";
import {
  Minus,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  Repeat,
} from "lucide-react";
import type { TabataBlock } from "./types";
import { MIN_TIME, MAX_TIME, MIN_ROUNDS, MAX_ROUNDS, TIME_STEP } from "./constants";
import { createBlock } from "./constants";

export interface TabataBlockConfigProps {
  blocks: TabataBlock[];
  onChange: (blocks: TabataBlock[]) => void;
}

const MAX_BLOCKS = 10;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/* ── Inline stepper: small +/- for a value ── */
function InlineStepper({
  value,
  display,
  onDecrement,
  onIncrement,
  disableMinus,
  disablePlus,
  ariaLabel,
}: {
  value: number;
  display: string;
  onDecrement: () => void;
  onIncrement: () => void;
  disableMinus: boolean;
  disablePlus: boolean;
  ariaLabel: string;
}) {
  const miniBtn: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--secondary)",
    color: "var(--foreground)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all .15s",
    fontSize: 14,
    flexShrink: 0,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <button
        className="timer-btn"
        style={{ ...miniBtn, opacity: disableMinus ? 0.3 : 1 }}
        onClick={onDecrement}
        disabled={disableMinus}
        aria-label={`Disminuir ${ariaLabel}`}
      >
        <Minus size={14} />
      </button>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 20,
          color: "var(--foreground)",
          letterSpacing: ".03em",
          minWidth: 56,
          textAlign: "center",
        }}
      >
        {display}
      </span>
      <button
        className="timer-btn"
        style={{ ...miniBtn, opacity: disablePlus ? 0.3 : 1 }}
        onClick={onIncrement}
        disabled={disablePlus}
        aria-label={`Aumentar ${ariaLabel}`}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

/* ── Single block card ── */
function BlockCard({
  block,
  index,
  total,
  onChange,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  block: TabataBlock;
  index: number;
  total: number;
  onChange: (updated: TabataBlock) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const update = (partial: Partial<TabataBlock>) =>
    onChange({ ...block, ...partial });

  const totalTime = block.rounds * (block.workTime + block.restTime) - block.restTime;

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color .15s",
      }}
    >
      {/* Block header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderBottom: "1px solid var(--border)",
          background: "color-mix(in srgb, var(--gold-dark) 6%, var(--card))",
        }}
      >
        {/* Badge */}
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            padding: "3px 7px",
            borderRadius: 6,
            background: "var(--gold-dark)",
            color: "var(--background)",
            fontFamily: "var(--font-display)",
            letterSpacing: ".04em",
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>

        {/* Editable name */}
        <input
          type="text"
          value={block.name}
          onChange={(e) => update({ name: e.target.value })}
          maxLength={24}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--foreground)",
            letterSpacing: ".01em",
          }}
          aria-label={`Nombre del bloque ${index + 1}`}
        />

        {/* Time estimate */}
        <span
          style={{
            fontSize: 10,
            color: "var(--muted-foreground)",
            fontFamily: "var(--font-sans)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          ~{formatTime(totalTime)}
        </span>

        {/* Actions */}
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          {total > 1 && index > 0 && (
            <button
              className="timer-btn"
              onClick={onMoveUp}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted-foreground)",
                cursor: "pointer",
                padding: 4,
                display: "flex",
              }}
              aria-label="Mover arriba"
            >
              <ChevronUp size={14} />
            </button>
          )}
          {total > 1 && index < total - 1 && (
            <button
              className="timer-btn"
              onClick={onMoveDown}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted-foreground)",
                cursor: "pointer",
                padding: 4,
                display: "flex",
              }}
              aria-label="Mover abajo"
            >
              <ChevronDown size={14} />
            </button>
          )}
          <button
            className="timer-btn"
            onClick={onDuplicate}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted-foreground)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
            aria-label="Duplicar bloque"
          >
            <Copy size={14} />
          </button>
          {total > 1 && (
            <button
              className="timer-btn"
              onClick={onRemove}
              style={{
                background: "none",
                border: "none",
                color: "var(--danger, var(--orange))",
                cursor: "pointer",
                padding: 4,
                display: "flex",
              }}
              aria-label="Eliminar bloque"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Config rows */}
      <div
        style={{
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Work time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--orange)",
            }}
          >
            <Clock size={14} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".04em",
                textTransform: "uppercase",
                fontFamily: "var(--font-sans)",
              }}
            >
              Trabajo
            </span>
          </div>
          <InlineStepper
            value={block.workTime}
            display={formatTime(block.workTime)}
            onDecrement={() =>
              update({ workTime: Math.max(MIN_TIME, block.workTime - TIME_STEP) })
            }
            onIncrement={() =>
              update({ workTime: Math.min(MAX_TIME, block.workTime + TIME_STEP) })
            }
            disableMinus={block.workTime <= MIN_TIME}
            disablePlus={block.workTime >= MAX_TIME}
            ariaLabel="tiempo de trabajo"
          />
        </div>

        {/* Rest time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--green)",
            }}
          >
            <Coffee size={14} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".04em",
                textTransform: "uppercase",
                fontFamily: "var(--font-sans)",
              }}
            >
              Descanso
            </span>
          </div>
          <InlineStepper
            value={block.restTime}
            display={formatTime(block.restTime)}
            onDecrement={() =>
              update({ restTime: Math.max(MIN_TIME, block.restTime - TIME_STEP) })
            }
            onIncrement={() =>
              update({ restTime: Math.min(MAX_TIME, block.restTime + TIME_STEP) })
            }
            disableMinus={block.restTime <= MIN_TIME}
            disablePlus={block.restTime >= MAX_TIME}
            ariaLabel="tiempo de descanso"
          />
        </div>

        {/* Rounds */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--gold-dark)",
            }}
          >
            <Repeat size={14} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".04em",
                textTransform: "uppercase",
                fontFamily: "var(--font-sans)",
              }}
            >
              Rondas
            </span>
          </div>
          <InlineStepper
            value={block.rounds}
            display={String(block.rounds)}
            onDecrement={() =>
              update({ rounds: Math.max(MIN_ROUNDS, block.rounds - 1) })
            }
            onIncrement={() =>
              update({ rounds: Math.min(MAX_ROUNDS, block.rounds + 1) })
            }
            disableMinus={block.rounds <= MIN_ROUNDS}
            disablePlus={block.rounds >= MAX_ROUNDS}
            ariaLabel="rondas"
          />
        </div>
      </div>
    </div>
  );
}

export function TabataBlockConfig({ blocks, onChange }: TabataBlockConfigProps) {
  const updateBlock = useCallback(
    (index: number, updated: TabataBlock) => {
      const next = [...blocks];
      next[index] = updated;
      onChange(next);
    },
    [blocks, onChange],
  );

  const removeBlock = useCallback(
    (index: number) => {
      if (blocks.length <= 1) return;
      const next = blocks.filter((_, i) => i !== index);
      onChange(next);
    },
    [blocks, onChange],
  );

  const duplicateBlock = useCallback(
    (index: number) => {
      if (blocks.length >= MAX_BLOCKS) return;
      const source = blocks[index];
      const dup = createBlock({
        name: `${source.name} (copia)`,
        workTime: source.workTime,
        restTime: source.restTime,
        rounds: source.rounds,
      });
      const next = [...blocks];
      next.splice(index + 1, 0, dup);
      onChange(next);
    },
    [blocks, onChange],
  );

  const moveBlock = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= blocks.length) return;
      const next = [...blocks];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onChange(next);
    },
    [blocks, onChange],
  );

  const addBlock = useCallback(() => {
    if (blocks.length >= MAX_BLOCKS) return;
    const n = blocks.length + 1;
    onChange([...blocks, createBlock({ name: `Bloque ${n}` })]);
  }, [blocks, onChange]);

  // Total estimated time across all blocks
  const totalTime = blocks.reduce(
    (sum, b) => sum + b.rounds * (b.workTime + b.restTime) - b.restTime,
    0,
  );

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {blocks.map((block, i) => (
        <BlockCard
          key={block.id}
          block={block}
          index={i}
          total={blocks.length}
          onChange={(updated) => updateBlock(i, updated)}
          onRemove={() => removeBlock(i)}
          onDuplicate={() => duplicateBlock(i)}
          onMoveUp={() => moveBlock(i, i - 1)}
          onMoveDown={() => moveBlock(i, i + 1)}
        />
      ))}

      {/* Add block button */}
      {blocks.length < MAX_BLOCKS && (
        <button
          className="timer-btn"
          onClick={addBlock}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "12px 0",
            borderRadius: 10,
            border: "1px dashed var(--border)",
            background: "transparent",
            color: "var(--gold-dark)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: ".02em",
            transition: "all .15s",
          }}
          aria-label="Agregar bloque"
        >
          <Plus size={16} />
          Agregar bloque
        </button>
      )}

      {/* Total time estimate */}
      {blocks.length > 1 && (
        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "var(--muted-foreground)",
            fontFamily: "var(--font-sans)",
            padding: "4px 0",
          }}
        >
          Tiempo total estimado: <strong style={{ color: "var(--gold-dark)" }}>{formatTime(totalTime)}</strong>
        </div>
      )}
    </div>
  );
}

export default TabataBlockConfig;
