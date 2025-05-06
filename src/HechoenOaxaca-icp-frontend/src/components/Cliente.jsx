import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HechoenOaxacaIcpBackend } from "../../../declarations/HechoenOaxaca-icp-backend";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { FaBell, FaRegMoneyBillAlt, FaShoppingCart, FaUser } from "react-icons/fa";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { useConnect } from "@connect2ic/react";
import DashboardLayout from "./DashboardLayout";

const ClienteDashboard = () => {
  const { principal } = useConnect();
  const navigate = useNavigate();

  const [productos, setProductos] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(false);
  const [carrito, setCarrito] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nombreCompleto: "",
    lugarOrigen: "",
    telefono: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const productosRes = await HechoenOaxacaIcpBackend.readProductos();
        const perfilRes = await HechoenOaxacaIcpBackend.obtenerPerfil(principal);

        setProductos(productosRes);
        setPerfil(perfilRes);
        setEditFormData({
          nombreCompleto: perfilRes.nombreCompleto,
          lugarOrigen: perfilRes.lugarOrigen,
          telefono: perfilRes.telefono,
        });
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };

    if (principal) {
      fetchData();
    }
  }, [principal]);

  const agregarAlCarrito = (producto) => setCarrito([...carrito, producto]);

  const filteredProducts = productos.filter((producto) => {
    const matchSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory ? producto.categoria === selectedCategory : true;
    return matchSearch && matchCategory;
  });

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleSaveChanges = async () => {
    try {
      const result = await HechoenOaxacaIcpBackend.actualizarPerfil(
        principal,
        editFormData.nombreCompleto,
        editFormData.lugarOrigen,
        editFormData.telefono
      );

      if ("ok" in result) {
        setPerfil(editFormData);
        setShowEditModal(false);
      } else {
        console.error("Error al actualizar el perfil:", result.err);
      }
    } catch (error) {
      console.error("Error actualizando perfil:", error);
    }
  };

  return (
    <DashboardLayout title="Bienvenido, Cliente">
      {/* Controles de búsqueda y filtros */}
      <div className="d-flex justify-content-between align-items-center my-3 flex-wrap gap-3">
        <div className="d-flex gap-2">
          <Form.Control
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Form.Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            <option value="dulces tradicionales">Dulces Tradicionales</option>
            <option value="artesanías">Artesanías</option>
            <option value="textiles">Textiles</option>
          </Form.Select>
        </div>

        <div className="d-flex gap-2">
          <Button onClick={() => navigate("/wallet")}>
            <FaRegMoneyBillAlt /> Wallet
          </Button>
          <Button onClick={() => navigate("/notificaciones-cliente")}>
            <FaBell /> Notificaciones
          </Button>
          <Button onClick={() => navigate("/carrito", { state: { carrito } })}>
            <FaShoppingCart /> Carrito
          </Button>
          <Button onClick={() => setShowEditModal(true)}>
            <FaUser /> Perfil
          </Button>
        </div>
      </div>

      {/* Modal de edición */}
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

      {/* Listado de productos */}
      <h4 className="text-center mt-4">Explorar Productos</h4>
      {loading ? (
        <p className="text-center">Cargando productos...</p>
      ) : (
        <div className="d-flex flex-wrap justify-content-center gap-3">
          {filteredProducts.map((producto) => (
            <Card key={producto.id} style={{ width: "18rem" }}>
              <Card.Body>
                <Card.Title>{producto.nombre}</Card.Title>
                <Card.Text>
                  <strong>Precio:</strong> ${producto.precio.toFixed(2)}<br />
                  {producto.descripcion}
                </Card.Text>
                <Button
                  variant="primary"
                  onClick={() => navigate(`/producto/${producto.id}`, { state: producto })}
                >
                  Ver más
                </Button>{" "}
                <Button variant="success" onClick={() => agregarAlCarrito(producto)}>
                  Agregar al Carrito
                </Button>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ClienteDashboard;
