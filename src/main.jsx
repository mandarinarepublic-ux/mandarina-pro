import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{padding:40,fontFamily:'monospace',color:'red',background:'#111',minHeight:'100vh'}}>
        <h2>App Error:</h2>
        <pre>{this.state.error?.message}</pre>
        <pre>{this.state.error?.stack?.substring(0,500)}</pre>
      </div>
    );
    return this.props.children;
  }
}

import React from 'react'
createRoot(document.getElementById('root')).render(
  <ErrorBoundary><App /></ErrorBoundary>
)
