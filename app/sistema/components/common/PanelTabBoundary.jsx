import React from "react";

// Error boundary que aísla un tab del panel para que un crash no
// tire toda la app. Usado por PanelReferencia, PageAtleta y PageCalculadora.
export class PanelTabBoundary extends React.Component {
  constructor(p) {
    super(p);
    this.state = { err: null };
  }
  static getDerivedStateFromError(e) {
    return { err: e };
  }
  componentDidCatch(e, i) {
    console.error(
      "[BOUNDARY]",
      this.props.tab,
      e?.message,
      i?.componentStack?.slice(0, 200),
    );
  }
  render() {
    if (this.state.err)
      return (
        <div
          style={{
            padding: 24,
            color: "#e85047",
            fontSize: 12,
            fontFamily: "monospace",
            wordBreak: "break-all",
            background: "#1a0000",
            borderRadius: 8,
            margin: 8,
          }}
        >
          <strong>💥 Error en {this.props.tab}:</strong>
          <br />
          {String(this.state.err?.message || this.state.err)}
        </div>
      );
    return this.props.children;
  }
}
