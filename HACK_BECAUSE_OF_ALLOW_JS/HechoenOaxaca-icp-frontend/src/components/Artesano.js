import React, { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { HechoenOaxaca_icp_backend } from "../../../declarations/HechoenOaxaca-icp-backend";
import CrearProducto from "./CrearProducto";
import Products from "./Products";
import Wallet from "./Wallet";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import DashboardLayout from "./DashboardLayout";
import { useConnect } from "@connect2ic/react";
const Artesano = () => {
    const [showEditModal, setShowEditModal] = useState(false);
    const [perfil, setPerfil] = useState(null);
    const [editFormData, setEditFormData] = useState({
        nombreCompleto: "",
        lugarOrigen: "",
        telefono: "",
    });
    const navigate = useNavigate();
    const { principal } = useConnect();
    useEffect(() => {
        const fetchPerfil = async () => {
            if (!principal)
                return;
            try {
                const perfilRes = await HechoenOaxaca_icp_backend.obtenerPerfil(principal);
                setPerfil(perfilRes);
                setEditFormData({
                    nombreCompleto: perfilRes.nombreCompleto,
                    lugarOrigen: perfilRes.lugarOrigen,
                    telefono: perfilRes.telefono,
                });
            }
            catch (error) {
                console.error("Error al cargar el perfil:", error);
            }
        };
        fetchPerfil();
    }, [principal]);
    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditFormData({ ...editFormData, [name]: value });
    };
    const handleSaveChanges = async () => {
        try {
            const result = await HechoenOaxaca_icp_backend.actualizarPerfil(principal, editFormData.nombreCompleto, editFormData.lugarOrigen, editFormData.telefono);
            if ("ok" in result) {
                setPerfil(editFormData);
                setShowEditModal(false);
            }
            else {
                console.error("Error al actualizar perfil:", result.err);
            }
        }
        catch (error) {
            console.error("Error al actualizar perfil:", error);
        }
    };
    return (<DashboardLayout title="Bienvenido, Artesano">
      <div className="text-right mb-4">
        <Button onClick={() => setShowEditModal(true)}>Editar Perfil</Button>
      </div>

      <Routes>
        <Route path="/nuevo-producto" element={<CrearProducto />}/>
        <Route path="/mis-productos" element={<Products />}/>
        <Route path="/wallet" element={<Wallet />}/>
        <Route path="/notificaciones" element={<div>Notificaciones en construcción</div>}/>
      </Routes>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Perfil</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Nombre Completo</Form.Label>
              <Form.Control type="text" name="nombreCompleto" value={editFormData.nombreCompleto} onChange={handleEditChange}/>
            </Form.Group>
            <Form.Group>
              <Form.Label>Lugar de Origen</Form.Label>
              <Form.Control type="text" name="lugarOrigen" value={editFormData.lugarOrigen} onChange={handleEditChange}/>
            </Form.Group>
            <Form.Group>
              <Form.Label>Teléfono</Form.Label>
              <Form.Control type="tel" name="telefono" value={editFormData.telefono} onChange={handleEditChange}/>
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
    </DashboardLayout>);
};
export default Artesano;
