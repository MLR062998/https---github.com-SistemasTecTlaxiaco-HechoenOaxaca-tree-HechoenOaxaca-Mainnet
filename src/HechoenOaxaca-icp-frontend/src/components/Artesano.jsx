// src/components/Artesano.jsx
import React, { useEffect, useState } from "react";
import { Route, Routes, useNavigate, useLocation } from "react-router-dom";
import CrearProducto from "./CrearProducto";
import Products from "./Products";
import Wallet from "./Wallet";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import DashboardLayout from "./DashboardLayout";
import { useAuthContext } from "./authContext";
import "../artesano.scss";

const Artesano = () => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [editFormData, setEditFormData] = useState({
    nombreCompleto: "",
    lugarOrigen: "",
    telefono: "",
  });

  const { actor, principalId, isLoading, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Verificación mejorada de rutas
  const currentPath = location.pathname;
  const isDashboard = currentPath === "/artesano-dashboard";
  const isSubRoute = currentPath.startsWith("/artesano-dashboard/");

  useEffect(() => {
    // ✅ Solo redirigir si no está autenticado y no está loading
    if (!isLoading && !isAuthenticated) {
      console.log("❌ Usuario no autenticado, redirigiendo a login");
      navigate("/", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const fetchPerfil = async () => {
      if (!actor || !principalId) return;
      try {
        const res = await actor.obtenerUsuario();
        if ("ok" in res) {
          const perfilRes = res.ok;
          setPerfil(perfilRes);
          setEditFormData({
            nombreCompleto: perfilRes.nombreCompleto,
            lugarOrigen: perfilRes.lugarOrigen,
            telefono: perfilRes.telefono,
          });
        } else {
          console.warn("Perfil no encontrado:", res.err);
        }
      } catch (error) {
        console.error("❌ Error al cargar el perfil:", error);
      }
    };

    if (isAuthenticated) {
      fetchPerfil();
    }
  }, [actor, principalId, isAuthenticated]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleSaveChanges = async () => {
    if (!actor) return;
    try {
      // ✅ NOTA: Necesitas implementar actor.editarPerfil() en tu backend
      // Por ahora, solo muestra un mensaje
      console.log("📤 Intentando editar perfil:", editFormData);
      alert("Función de edición de perfil en desarrollo");
      setShowEditModal(false);
      
      // Si tienes el método en el backend, descomenta esto:
      /*
      const result = await actor.editarPerfil(
        editFormData.nombreCompleto,
        editFormData.lugarOrigen,
        editFormData.telefono
      );

      if ("ok" in result) {
        setPerfil(editFormData);
        setShowEditModal(false);
      } else {
        console.error("⚠️ Error al actualizar perfil:", result.err);
      }
      */
    } catch (error) {
      console.error("❌ Error al actualizar perfil:", error);
    }
  };

  if (isLoading) return <div className="text-center mt-5"><p>🔄 Cargando...</p></div>;
  if (!isAuthenticated) return <div className="text-center mt-5"><p>❌ No autenticado</p></div>;
  if (!perfil) return <div className="text-center mt-5"><p>📭 Cargando perfil...</p></div>;

  return (
    <DashboardLayout title="Bienvenido, Artesano">
      {/* ✅ Solo mostrar botón de volver si está en una subruta */}
      {isSubRoute && !isDashboard && (
        <div className="mb-3">
          <Button 
            variant="outline-secondary" 
            onClick={() => navigate("/artesano-dashboard")}
            className="me-2"
          >
            ← Volver al Dashboard
          </Button>
        </div>
      )}

      <Routes>
        <Route
          index
          element={
            <div className="perfil">
              <h4>👤 Perfil Artesano</h4>
              <p><strong>Nombre:</strong> {perfil.nombreCompleto}</p>
              <p><strong>Origen:</strong> {perfil.lugarOrigen}</p>
              <p><strong>Teléfono:</strong> {perfil.telefono}</p>
              
              <div className="botones-superiores mt-4">
                <Button 
                  className="btn-crear me-2 mb-2" 
                  onClick={() => navigate("nuevo-producto")}
                >
                  🛠 Crear Producto
                </Button>
                <Button 
                  className="btn-productos me-2 mb-2" 
                  onClick={() => navigate("mis-productos")}
                >
                  📦 Ver Mis Productos
                </Button>
                <Button 
                  className="btn-wallet me-2 mb-2" 
                  onClick={() => navigate("wallet")}
                >
                  💰 Wallet
                </Button>
                <Button 
                  className="btn-notif me-2 mb-2" 
                  onClick={() => navigate("notificaciones")}
                >
                  🔔 Notificaciones
                </Button>
                <Button 
                  className="btn-editar mb-2" 
                  variant="outline-primary" 
                  onClick={() => setShowEditModal(true)}
                >
                  ✏️ Editar Perfil
                </Button>
              </div>
            </div>
          }
        />
        <Route path="nuevo-producto" element={<CrearProducto />} />
        <Route path="mis-productos" element={<Products />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="notificaciones" element={<div className="p-4">🔧 Notificaciones en construcción</div>} />
      </Routes>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Perfil</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nombre Completo</Form.Label>
              <Form.Control
                type="text"
                name="nombreCompleto"
                value={editFormData.nombreCompleto}
                onChange={handleEditChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Lugar de Origen</Form.Label>
              <Form.Control
                type="text"
                name="lugarOrigen"
                value={editFormData.lugarOrigen}
                onChange={handleEditChange}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Teléfono</Form.Label>
              <Form.Control
                type="tel"
                name="telefono"
                value={editFormData.telefono}
                onChange={handleEditChange}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSaveChanges}>
            Guardar Cambios
          </Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  );
};

export default Artesano;