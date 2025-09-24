// src/components/Menu.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { useAuthContext } from "./authContext";
import "../index.scss";

const Menu = () => {
  const {
    isAuthenticated,
    principalId,
    isLoading,
    connect, // ✅ Ahora usamos connect en lugar de openProviderModal
    logout,
  } = useAuthContext();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const rol = localStorage.getItem("rol");

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.clear();
      setShowLogoutModal(false);
    } catch (err) {
      console.error("❌ Error al cerrar sesión:", err);
    }
  };

  return (
    <div>
      <nav className="navbar navbar-expand-lg custom-navbar">
        <div className="container-fluid custom-container">
          <Link to="/" className="custom-brand">Hecho en Oaxaca</Link>
          <div className="custom-links-container">
            {!isAuthenticated ? (
              <button
                className="custom-button login-button"
                onClick={connect} // ✅ Cambiado de openProviderModal a connect
                disabled={isLoading}
              >
                {isLoading ? "Conectando..." : "Iniciar Sesión con NFID"} {/* ✅ Texto actualizado */}
              </button>
            ) : (
              <>
                {rol === "Cliente" && <Link to="/cliente-dashboard">Dashboard Cliente</Link>}
                {rol === "Artesano" && <Link to="/artesano-dashboard">Dashboard Artesano</Link>}
                {rol === "Intermediario" && <Link to="/intermediario-dashboard">Dashboard Intermediario</Link>}
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
          <Button variant="danger" onClick={handleLogout}>Salir</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Menu;