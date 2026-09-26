import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered instead of `children` once an error is caught. */
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Generic, reusable error boundary. React only catches render/lifecycle/
// effect errors in the subtree below a class component that implements
// getDerivedStateFromError/componentDidCatch — there is no hook
// equivalent — so a failure here (e.g. GISMap's MapLibre init throwing)
// is contained to whatever this wraps instead of unmounting the whole app.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
