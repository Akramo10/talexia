import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-slate-900 border border-danger/50 rounded-xl max-w-2xl mx-auto mt-10">
          <h2 className="text-xl font-bold text-danger mb-4">Un problème est survenu.</h2>
          <div className="bg-slate-950 p-4 rounded-lg overflow-auto">
            <p className="text-white font-mono text-sm">{this.state.error?.toString()}</p>
            <pre className="text-slate-500 font-mono text-xs mt-4">
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <button 
            className="mt-6 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 font-bold"
            onClick={() => window.location.reload()}
          >
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
