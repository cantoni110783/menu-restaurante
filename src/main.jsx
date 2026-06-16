import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Cliente from "./pages/Cliente";
import Cocina from "./pages/Cocina";
import Admin from "./pages/Admin";
import ErrorBoundary from "./components/ErrorBoundary";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Vista del cliente — escanea el QR y llega aquí */}
        <Route path="/" element={<Cliente />} />

        {/* Vista de cocina — ve los pedidos en tiempo real */}
        <Route
          path="/cocina"
          element={
            <ErrorBoundary>
              <Cocina />
            </ErrorBoundary>
          }
        />

        {/* Panel administrativo — gestiona menú y stock */}
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
