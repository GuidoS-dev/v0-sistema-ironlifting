import { Plus } from "lucide-react";
import { ESCUELA_NIVEL_LABEL, ESCUELA_NIVEL_COLOR } from "../../data/plantillas-meta";
import { PlantillaCard } from "../plantillas/PlantillaCard";

export function AlumnoSectionHeader({ title, count, color, onAdd }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: "2px solid " + (color || "var(--gold)") + "30",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            fontFamily: "'Bebas Neue'",
            fontSize: 22,
            color: color || "var(--gold)",
            letterSpacing: ".04em",
          }}
        >
          {title}
        </div>
        <span
          style={{
            fontSize: 11,
            color: "var(--muted)",
            fontWeight: 600,
            background: "var(--surface2)",
            padding: "2px 8px",
            borderRadius: 20,
          }}
        >
          {count}
        </span>
      </div>
      <button
        className="btn btn-ghost btn-sm"
        onClick={onAdd}
        style={{
          borderColor: color || "var(--gold)",
          color: color || "var(--gold)",
        }}
      >
        <Plus size={13} /> Nuevo
      </button>
    </div>
  );
}

export function SectionHeader({
  title,
  count,
  color = "#4db6ac",
  badge,
  collapsed,
  onToggle,
  children,
}) {
  return (
    <div style={{ marginBottom: collapsed ? 8 : 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          borderRadius: collapsed ? "10px" : "10px 10px 0 0",
          background: `${color}18`,
          border: `1px solid ${color}40`,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={onToggle}
      >
        <div
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}
        >
          <span
            style={{
              fontFamily: "'Bebas Neue'",
              fontSize: 18,
              color,
              letterSpacing: ".05em",
            }}
          >
            {title}
          </span>
          {badge && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 20,
                background: `${color}30`,
                color,
              }}
            >
              {badge}
            </span>
          )}
          <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 4 }}>
            {count} plantilla{count !== 1 ? "s" : ""}
          </span>
        </div>
        <span
          style={{
            color,
            fontSize: 16,
            transition: "transform .2s",
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </div>
      {!collapsed && (
        <div
          style={{
            border: `1px solid ${color}40`,
            borderTop: "none",
            borderRadius: "0 0 10px 10px",
            padding: 16,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function CardGrid({ lista, onOpen, onDuplicate, onEdit, onDelete }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
        gap: 12,
      }}
    >
      {lista.map((plt) => (
        <PlantillaCard
          key={plt.id}
          plt={plt}
          onOpen={onOpen ? () => onOpen(plt) : undefined}
          onDuplicate={() => onDuplicate(plt)}
          onEdit={() => onEdit(plt)}
          onDelete={() => onDelete(plt)}
        />
      ))}
    </div>
  );
}

export function NivelSection({
  nivel,
  pltList,
  colapsadoEscuela,
  setColapsadoEscuela,
  matchBusqueda,
  onOpen,
  onDuplicate,
  onEdit,
  onDelete,
}) {
  const filtradas = pltList.filter(matchBusqueda);
  if (filtradas.length === 0) return null;
  const col = colapsadoEscuela[nivel];
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          borderRadius: col ? "8px" : "8px 8px 0 0",
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setColapsadoEscuela((p) => ({ ...p, [nivel]: !col }))}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            flexShrink: 0,
            background: ESCUELA_NIVEL_COLOR[nivel],
          }}
        />
        <span
          style={{
            fontFamily: "'Bebas Neue'",
            fontSize: 15,
            color: ESCUELA_NIVEL_COLOR[nivel],
            letterSpacing: ".04em",
          }}
        >
          {ESCUELA_NIVEL_LABEL[nivel]}
        </span>
        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 2 }}>
          {filtradas.length} plantilla{filtradas.length !== 1 ? "s" : ""}
        </span>
        <span
          style={{
            marginLeft: "auto",
            color: "var(--muted)",
            fontSize: 13,
            transform: col ? "rotate(-90deg)" : "rotate(0deg)",
            transition: "transform .2s",
          }}
        >
          ▾
        </span>
      </div>
      {!col && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            padding: 12,
          }}
        >
          <CardGrid
            lista={filtradas}
            onOpen={onOpen}
            onDuplicate={onDuplicate}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
}
