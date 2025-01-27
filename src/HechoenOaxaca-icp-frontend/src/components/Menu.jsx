import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory, canisterId } from "../../../declarations/HechoenOaxaca-icp-backend";
import "../index.scss";

const Menu = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [principalId, setPrincipalId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const agent = new HttpAgent({ host: "http://127.0.0.1:4943" });
  if (process.env.NODE_ENV === "development") {
    agent.fetchRootKey().catch((err) =>
      console.error("Error al obtener rootKey para desarrollo:", err)
    );
  }
  const backendActor = Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });

  const handleLogin = async () => {
    const { AuthClient } = await import("@dfinity/auth-client");
    const authClient = await AuthClient.create();
    const identityProvider = "https://nfid.one/authenticate";

    authClient.login({
      identityProvider,
      onSuccess: async () => {
        const principal = authClient.getIdentity().getPrincipal().toText();
        setPrincipalId(principal);
        setIsConnected(true);
        fetchUserRole();
      },
      onError: (error) => {
        console.error("Error de autenticación:", error);
      },
    });
  };

  const fetchUserRole = async () => {
    try {
      if (principalId) {
        const roleResult = await backendActor.getUserRole(principalId);
        console.log("Rol devuelto por backend:", roleResult);

        if (roleResult && roleResult.length > 0) {
          const userRole = roleResult[0];
          setUserRole(userRole);
          navigate(`/${userRole}-dashboard`);
        } else {
          console.warn("Rol no encontrado, redirigiendo al registro.");
          setUserRole(null);
          navigate("/registro");
        }
      }
    } catch (err) {
      console.error("Error al obtener el rol del usuario:", err);
      setUserRole(null);
      navigate("/registro");
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setPrincipalId(null);
    setUserRole(null);
    navigate("/");
  };

  useEffect(() => {
    if (isConnected) {
      const timeout = setTimeout(() => {
        handleDisconnect();
      }, 15 * 60 * 1000);
      return () => clearTimeout(timeout);
    }
  }, [isConnected]);

  useEffect(() => {
    fetchUserRole();
  }, [principalId]);

  return (
    <div>
      <nav className="navbar navbar-expand-lg custom-navbar">
        <div className="container-fluid custom-container">
        <Link to="/" className="custom-brand">
           Hecho en Oaxaca
        </Link>
          <div className="custom-links-container">
            {isConnected ? (
              <>
                {userRole === "cliente" && <Link to="/cliente-dashboard">Dashboard Cliente</Link>}
                {userRole === "artesano" && <Link to="/artesano-dashboard">Dashboard Artesano</Link>}
                {userRole === "intermediario" && (
                  <Link to="/intermediario-dashboard">Dashboard Intermediario</Link>
                )}
                <button onClick={() => setShowLogoutModal(true)}>Salir</button>
              </>
            ) : (
              <button onClick={handleLogin}>Iniciar Sesión</button>
            )}
          </div>
        </div>
      </nav>
      
      {/* Modal de confirmación de salida */}
      <Modal show={showLogoutModal} onHide={() => setShowLogoutModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmación</Modal.Title>
        </Modal.Header>
        <Modal.Body>¿Está seguro de que quiere salir?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setShowLogoutModal(false); // Cierra el modal
              handleDisconnect(); // Desconectar al usuario
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