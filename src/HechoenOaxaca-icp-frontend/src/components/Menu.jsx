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
    connect,
    logout,
    rol
  } = useAuthContext();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.clear();
      setShowLogoutModal(false);
    } catch (err) {
      console.error("❌ Error al cerrar sesión:", err);
    }
  };

  // Función para formatear el principal ID
  const formatPrincipalId = (principal) => {
    if (!principal) return "";
    return `${principal.slice(0, 5)}...${principal.slice(-3)}`;
  };

  return (
    <div>
      <nav className="menu-navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand">
            Hecho en Oaxaca
          </Link>
          
          <div className="navbar-links">
            {!isAuthenticated ? (
              <button
                className={`menu-button login-connect-btn ${isLoading ? 'button-loading' : ''}`}
                onClick={connect}
                disabled={isLoading}
              >
                {isLoading ? "Conectando..." : "Iniciar Sesión con NFID"}
              </button>
            ) : (
              <div className="auth-status">
                {/* Información del usuario */}
                <div className="user-info">
                  <span>Usuario:</span>
                  <span className="user-principal">
                    {formatPrincipalId(principalId)}
                  </span>
                </div>
                
                {rol && (
                  <div className="user-role">
                    {rol}
                  </div>
                )}

                {/* Enlaces al dashboard según el rol */}
                {rol === "Cliente" && (
                  <Link 
                    to="/cliente-dashboard" 
                    className="dashboard-link cliente-dashboard"
                  >
                    📊 Dashboard Cliente
                  </Link>
                )}
                {rol === "Artesano" && (
                  <Link 
                    to="/artesano-dashboard" 
                    className="dashboard-link artesano-dashboard"
                  >
                    🎨 Dashboard Artesano
                  </Link>
                )}
                {rol === "Intermediario" && (
                  <Link 
                    to="/intermediario-dashboard" 
                    className="dashboard-link intermediario-dashboard"
                  >
                    🤝 Dashboard Intermediario
                  </Link>
                )}

                {/* Botón de logout */}
                <button
                  className="menu-button logout-btn"
                  onClick={() => setShowLogoutModal(true)}
                >
                  🚪 Salir
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Modal de confirmación de logout */}
      <Modal 
        show={showLogoutModal} 
        onHide={() => setShowLogoutModal(false)}
        className="logout-modal"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>🔐 Confirmar Cierre de Sesión</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Está seguro de que desea cerrar sesión?</p>
          <small className="text-muted">
            Será redirigido a la página de inicio.
          </small>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowLogoutModal(false)}
          >
            Cancelar
          </Button>
          <Button 
            variant="danger" 
            onClick={handleLogout}
          >
            Sí, Cerrar Sesión
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Menu;