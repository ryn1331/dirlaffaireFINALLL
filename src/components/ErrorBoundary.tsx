import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-[50vh] flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="font-heading text-xl font-bold mb-2">Une erreur est survenue</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Quelque chose s'est mal passé. Veuillez rafraîchir la page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="h-10 px-6 rounded-xl gradient-primary text-primary-foreground text-sm font-heading font-bold"
              >
                Rafraîchir la page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
