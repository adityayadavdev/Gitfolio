import React from 'react';
import { clearAllDexieData } from '../services/db';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  handleReset = async () => {
    try {
      await clearAllDexieData();
      window.location.reload();
    } catch (err) {
      console.error('Failed to clear data during reset', err);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h1>Something went wrong.</h1>
          <p>Clear data and retry?</p>
          <button 
            onClick={this.handleReset}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Reset App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
