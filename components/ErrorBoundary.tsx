import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-100">Algo sali\u00f3 mal</h2>
          <p className="max-w-md text-slate-600 dark:text-slate-400 mb-8">
            Ocurri\u00f3 un error inesperado. Puedes reiniciar o recargar la p\u00e1gina.
          </p>
          {this.state.error && (
            <pre className="max-w-lg mb-8 p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border font-mono text-xs text-rose-600 dark:text-rose-400 overflow-auto text-left">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3">
            <button onClick={this.handleReset} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 flex items-center gap-2">
              <RefreshCw size={16} />Reintentar
            </button>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold">
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
