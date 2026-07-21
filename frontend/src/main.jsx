import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justify: 'center',
          background: '#060913',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Workspace Session Refresh</h2>
          <p style={{ color: '#94a3b8', maxWidth: '480px', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            A temporary session state issue occurred: {this.state.error?.message || 'Sync error'}.
          </p>
          <button 
            onClick={this.handleReload} 
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🔄 Reset Session & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
