"use client";
import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(e: Error): State {
    return { error: e };
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div style={{ padding: "3rem 2rem", textAlign: "center" }}>
          <p style={{ fontSize: "2rem", marginBottom: "0.6rem" }}>🌸</p>
          <p style={{
            fontFamily: '"Georgia","Times New Roman",serif',
            fontStyle: "italic",
            color: "rgba(var(--pink-deep-rgb),.5)",
            fontSize: "1rem",
          }}>
            something went a little sideways — try refreshing 💗
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
