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

  // Función para iniciar sesión
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
        localStorage.setItem("principalId", principal); // Guardar sesión en localStorage
        fetchUserRole(principal); // Obtener rol del usuario
      },
      onError: (error) => {
        console.error("Error de autenticación:", error);
      },
    });
  };

  // Obtener el rol del usuario
  const fetchUserRole = async (id) => {
    try {
      const currentPrincipalId = id || principalId;
      if (currentPrincipalId) {
        const userData = await backendActor.registrarUsuario(
          "", // Nombre completo (no necesario para obtener el rol)
          "", // Lugar de origen (no necesario para obtener el rol)
          "", // Teléfono (no necesario para obtener el rol)
          ""  // Rol (no necesario para obtener el rol)
        );

        if ("ok" in userData) {
          const userRole = Object.keys(userData.ok.rol)[0].toLowerCase(); // 'artesano', 'cliente', 'intermediario'
          setUserRole(userRole);
          localStorage.setItem("userRole", userRole); // Guardar rol del usuario
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

  // Desconectar al usuario
  const handleDisconnect = () => {
    setIsConnected(false);
    setPrincipalId(null);
    setUserRole(null);
    localStorage.removeItem("principalId");
    localStorage.removeItem("userRole");
    navigate("/");
  };

  // Validar sesión al cargar la app
  useEffect(() => {
    const checkSession = async () => {
      const { AuthClient } = await import("@dfinity/auth-client");
      const authClient = await AuthClient.create();

      if (await authClient.isAuthenticated()) {
        const principal = localStorage.getItem("principalId");
        setPrincipalId(principal);
        setIsConnected(true);

        const storedRole = localStorage.getItem("userRole");
        if (storedRole) {
          setUserRole(storedRole);
          navigate(`/${storedRole}-dashboard`);
        } else {
          fetchUserRole(principal); // Obtener rol si no está en localStorage
        }
      }
    };

    checkSession();
  }, []);

  // Redirigir al dashboard si el usuario ya está conectado
  useEffect(() => {
    if (isConnected && principalId) {
      fetchUserRole();
    }
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