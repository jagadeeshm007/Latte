import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered instead of the children after a render error; reset clears it. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Called once per caught error; wire it to the error reporter. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * ErrorBoundary catches a render error below it so one broken component
 * does not blank the page. Route-level errors are handled by the router's
 * errorComponent (RouteError); this one sits above the providers as the
 * last line. Errors thrown in event handlers or effects are not caught here.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }
    return (
      <section role="alert" className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
        <button
          type="button"
          onClick={this.reset}
          className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Try again
        </button>
      </section>
    );
  }
}
