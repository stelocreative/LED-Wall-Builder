import React from 'react';
import { Button } from "@/components/ui/button";
import { Home, RefreshCw } from 'lucide-react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Runtime crash captured by AppErrorBoundary', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-xl border border-slate-700 bg-slate-800 p-6 text-center">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-slate-400">
              The app hit an unexpected runtime error. You can reload or return home.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button onClick={this.handleReload} className="bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload
              </Button>
              <Button
                variant="outline"
                className="border-slate-500 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:text-white"
                onClick={this.handleHome}
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
