import { Component, ErrorInfo, ReactNode } from 'react';
import { createClientLogger } from '~/utils/clientLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  private logger = createClientLogger('error-boundary');

  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    };
  }

  private categorizeError(error: Error): { category: string; severity: 'low' | 'medium' | 'high' | 'critical' } {
    const message = error.message?.toLowerCase() || '';

    // Critical errors (user-blocking)
    if (error instanceof TypeError && message.includes('undefined')) {
      return { category: 'type-undefined-or-null', severity: 'critical' };
    }

    // High severity (feature-breaking)
    if (message.includes('invalid hook call')) {
      return { category: 'react-hook', severity: 'high' };
    }

    // Medium severity (UX impact)
    if (message.includes('cors')) {
      return { category: 'network-cors', severity: 'medium' };
    }

    // Low severity (minor issues)
    if (message.includes('prop type')) {
      return { category: 'data-prop-validation', severity: 'low' };
    }

    return { category: 'unknown', severity: 'medium' };
  }


  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {

    const { category: errorCategory, severity: errorSeverity } = this.categorizeError(error);


    this.logger.error('Component error boundary triggered', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      userAction: 'component-error',
      businessCritical: true,
      errorCategory,
      errorSeverity
    });

    this.props.onError?.(error, errorInfo);
  }


  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary" role="alert">
          <div className="dts-alert dts-alert--error">
            <div className="dts-alert__icon">
              <i className="fa fa-exclamation-triangle" aria-hidden="true"></i>
            </div>
            <div className="dts-alert__content">
              <h2 className="dts-heading-3" style={{ marginBottom: '1rem' }}>
                Something went wrong
              </h2>
              <p className="dts-body-text" style={{ marginBottom: '1.5rem' }}>
                We're sorry, but something unexpected happened. Please try again.
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  className="mg-button mg-button-primary"
                  onClick={this.handleRetry}
                >
                  Try Again
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details style={{ textAlign: 'left', marginTop: '1rem' }}>
                  <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                    Error Details (Development Only)
                  </summary>
                  <pre style={{
                    background: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    overflow: 'auto'
                  }}>
                    Error ID: {this.state.errorId}
                    {"\n"}
                    {this.state.error?.message}
                    {"\n"}
                    {this.state.error?.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
