import React from 'react';
import { Button } from './ui/Button';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex max-w-lg flex-col items-center justify-center space-y-6"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
              <AlertTriangle className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
              <p className="text-muted-foreground">The application encountered an unexpected error.</p>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-muted p-4 rounded-md text-left text-xs overflow-auto max-w-full w-full max-h-64 border">
                <p className="font-bold text-red-500 mb-2">{this.state.error.toString()}</p>
                <pre>{this.state.errorInfo?.componentStack}</pre>
              </div>
            )}
            <div className="flex gap-4">
              <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">
                Refresh Page
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full sm:w-auto">
                Go to Dashboard
              </Button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
