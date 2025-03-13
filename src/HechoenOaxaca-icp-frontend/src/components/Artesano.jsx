import React, { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import CrearProducto from "./CrearProducto";
import Products from "./Products";
import Wallet from "./Wallet";
import { FaBell, FaWallet, FaPlusCircle, FaShoppingCart, FaUser } from "react-icons/fa";
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { HechoenOaxaca_icp_backend } from "../../../declarations/HechoenOaxaca-icp-backend";

const Artesano = ({ principalId }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nombreCompleto: "",
    lugarOrigen: "",
    telefono: "",
  });
  const [perfil, setPerfil] = useState(null);
  const navigate = useNavigate();

  // Cargar el perfil del artesano al iniciar
  useEffect(() => {
    const fetchPerfil = async () => {
      try {
        const perfilRes = await HechoenOaxaca_icp_backend.obtenerPerfil(principalId);
        setPerfil(perfilRes);
        setEditFormData({
          nombreCompleto: perfilRes.nombreCompleto,
          lugarOrigen: perfilRes.lugarOrigen,
          telefono: perfilRes.telefono,
        });
      } catch (error) {
        console.error("Error al cargar el perfil:", error);
      }
    };

    fetchPerfil();
  }, [principalId]);

  // Función para abrir el modal de edición
  const handleEditClick = () => {
    setShowEditModal(true);
  };

  // Función para cerrar el modal de edición
  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };

  // Función para manejar cambios en el formulario de edición
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  // Función para guardar los cambios del perfil
  const handleSaveChanges = async () => {
    try {
      const result = await HechoenOaxaca_icp_backend.actualizarPerfil(
        principalId,
        editFormData.nombreCompleto,
        editFormData.lugarOrigen,
        editFormData.telefono
      );

      if ("ok" in result) {
        setPerfil(editFormData); // Actualizar el estado del perfil
        setShowEditModal(false); // Cerrar el modal
      } else {
        console.error("Error al actualizar el perfil:", result.err);
      }
    } catch (error) {
      console.error("Error al actualizar el perfil:", error);
    }
  };

  return (
    <div className="artesano-dashboard min-h-screen bg-gray-50 px-4 py-6">
      <header className="dashboard-header text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Bienvenido, Artesano</h1>
        <p className="text-gray-600 mt-2">
          Gestiona tus productos, añade nuevos a tu inventario, y más.
        </p>
      </header>

      {/* Opciones principales */}
      <div className="artesano-options flex justify-center gap-4 mb-8">
        <Link to="/nuevo-producto" className="custom-btn btn-primary">
          <FaPlusCircle size={20} />
          Crear Producto
        </Link>
        <Link to="/mis-productos" className="custom-btn btn-secondary">
          <FaShoppingCart size={20} />
          Mis Productos
        </Link>
        <Link to="/wallet" className="custom-btn wallet-btn">
          <FaWallet size={20} />
          Wallet
        </Link>
        <Link to="/notificaciones" className="custom-btn notifications-btn">
          <FaBell size={20} />
          Notificaciones
        </Link>
        <Button className="custom-btn btn-perfil" onClick={handleEditClick}>
          <FaUser size={20} /> Perfil
        </Button>
      </div>

      {/* Modal de edición de perfil */}
      <Modal show={showEditModal} onHide={handleCloseEditModal}>
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
          <Button variant="secondary" onClick={handleCloseEditModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSaveChanges}>
            Guardar Cambios
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Configuración de rutas */}
      <div className="artesano-routes container mx-auto">
        <Routes>
          <Route path="/nuevo-producto" element={<CrearProducto />} />
          <Route path="/mis-productos" element={<Products />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/notificaciones" element={<div>Notificaciones en construcción</div>} />
        </Routes>
      </div>
    </div>
  );
};

export default Artesano;