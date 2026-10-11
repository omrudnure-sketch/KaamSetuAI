import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

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
        <div className="w-full max-w-xl mx-auto p-6 my-8 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Something went wrong</h2>
            <p className="text-xs text-slate-600">
              An unexpected error occurred while displaying this page.
            </p>
          </div>
          {this.state.error?.message && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-[11px] font-mono text-slate-700 overflow-x-auto max-h-24">
              {this.state.error.message}
            </div>
          )}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all border border-slate-200"
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
