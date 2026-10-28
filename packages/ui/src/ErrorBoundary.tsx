import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Shows render errors instead of a blank task pane, so they can be reported. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="oo-root" data-theme="system">
        <div className="oo-login">
          <strong>Unerwarteter Fehler / Unexpected error</strong>
          <pre className="oo-error" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {error.message}
            {"\n\n"}
            {error.stack?.split("\n").slice(0, 8).join("\n")}
          </pre>
          <button onClick={() => this.setState({ error: null })}>OK</button>
          <button onClick={() => location.reload()}>Reload</button>
        </div>
      </div>
    );
  }
}
