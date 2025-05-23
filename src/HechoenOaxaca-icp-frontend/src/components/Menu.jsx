import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { useConnect } from "@connect2ic/react";
import "../index.scss";

const Menu = () => {
  const {
    isConnected,
    isConnecting,
    principal,
    connect,
    disconnect,
    error,
  } = useConnect();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const rol = localStorage.getItem("rol");

  const handleLogin = async () => {
    console.log("🔘 Botón 'Iniciar Sesión' presionado");
    try {
      await connect();
    } catch (err) {
      console.error("❌ Error al iniciar sesión:", err);
    }
  };

  useEffect(() => {
    if (isConnected && principal) {
      const principalStr = typeof principal === "object" && typeof principal.toText === "function"
        ? principal.toText()
        : principal;
      console.log("✅ Usuario conectado:", principalStr);
      localStorage.setItem("principalId", principalStr);
    }
  }, [isConnected, principal]);

  return (
    <div>
      <nav className="navbar navbar-expand-lg custom-navbar">
        <div className="container-fluid custom-container">
          <Link to="/" className="custom-brand">Hecho en Oaxaca</Link>
          <div className="custom-links-container">
            {!isConnected ? (
              <>
                <button
                  className="custom-button login-button"
                  onClick={handleLogin}
                  disabled={isConnecting}
                >
                  {isConnecting ? "Conectando..." : "Iniciar Sesión"}
                </button>
                {error && (
                  <div className="text-danger mt-2" style={{ fontSize: "0.9rem" }}>
                    ⚠️ {error.message || String(error)}
                  </div>
                )}
              </>
            ) : (
              <>
                {rol === "cliente" && <Link to="/cliente-dashboard">Dashboard Cliente</Link>}
                {rol === "artesano" && <Link to="/artesano-dashboard">Dashboard Artesano</Link>}
                {rol === "intermediario" && <Link to="/intermediario-dashboard">Dashboard Intermediario</Link>}
                <button
                  className="custom-button logout-button"
                  onClick={() => setShowLogoutModal(true)}
                >
                  Salir
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <Modal show={showLogoutModal} onHide={() => setShowLogoutModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmación</Modal.Title>
        </Modal.Header>
        <Modal.Body>¿Está seguro de que quiere salir?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>Cancelar</Button>
          <Button
            variant="danger"
            onClick={() => {
              disconnect();
              localStorage.clear();
              setShowLogoutModal(false);
            }}
          >
            Salir
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Menu;
