import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: false };
  }

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidCatch() {
    // Recuperar automáticamente después de 1 segundo
    setTimeout(() => this.setState({ error: false }), 1000);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <p className="text-gray-400">Actualizando...</p>
        </div>
      );
    }
    return this.props.children;
  }
}
