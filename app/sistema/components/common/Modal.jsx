import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
  maxWidth = null,
  fitContent = false,
  compact = false,
  overlayPadding = null,
  scrollable = false,
  maxHeight = null,
  tightHeader = false,
}) {
  const mdTarget = useRef(null);
  const modalRef = useRef(null);
  useEffect(() => {
    const prevFocused = document.activeElement;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const getFocusable = () => {
      const root = modalRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
    };

    const focusables = getFocusable();
    const initial = focusables[0] || modalRef.current;
    if (initial && typeof initial.focus === "function") {
      initial.focus();
    }

    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const root = modalRef.current;
      if (!root) return;

      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const isInside = root.contains(active);

      if (!isInside) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      if (e.shiftKey && active === first) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
      if (prevFocused && typeof prevFocused.focus === "function") {
        prevFocused.focus();
      }
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      style={overlayPadding ? { padding: overlayPadding } : undefined}
      onMouseDown={(e) => {
        mdTarget.current = e.target;
      }}
      onMouseUp={(e) => {
        if (
          mdTarget.current === e.currentTarget &&
          e.target === e.currentTarget
        )
          onClose();
        mdTarget.current = null;
      }}
    >
      <div
        ref={modalRef}
        className="modal"
        tabIndex={-1}
        style={{
          ...(maxWidth || fitContent
            ? {
                width: fitContent ? "fit-content" : "min(96vw, 100%)",
                maxWidth: maxWidth || "96vw",
              }
            : {}),
          ...(compact ? { padding: "12px" } : {}),
          ...(scrollable
            ? {
                overflow: "auto",
                overscrollBehavior: "contain",
              }
            : {}),
          ...(maxHeight ? { maxHeight } : {}),
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <div
          className={tightHeader ? "flex-between" : "flex-between mb16"}
          style={tightHeader ? { marginBottom: 6 } : undefined}
        >
          <div
            className="modal-title"
            style={tightHeader ? { marginBottom: 0 } : undefined}
          >
            {title}
          </div>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={onClose}
            aria-label="Cerrar modal"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
