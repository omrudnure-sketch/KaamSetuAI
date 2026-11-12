import React from 'react';
import { AlertCircle, RotateCcw, Home, Sparkles } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full max-w-xl mx-auto p-6 sm:p-8 my-8 ks-glass-card border-rose-500/30 shadow-2xl space-y-5 text-center relative overflow-hidden">
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Something went wrong</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              An unexpected error occurred while displaying this page.
            </p>
          </div>
          {this.state.error?.message && (
            <div className="p-3 bg-slate-900/10 dark:bg-black/30 border border-slate-200/80 dark:border-white/10 rounded-xl text-left text-xs font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-32">
              {this.state.error.message}
            </div>
          )}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="ks-btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <a
              href="/"
              className="ks-btn-outline inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return Home</span>
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
