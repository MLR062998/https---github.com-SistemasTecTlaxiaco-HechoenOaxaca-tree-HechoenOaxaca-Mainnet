// src/components/ClienteDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { FaBell, FaRegMoneyBillAlt, FaShoppingCart, FaUser } from "react-icons/fa";
import DashboardLayout from "./DashboardLayout";
import { useAuthContext } from "./authContext";

const ClienteDashboard = () => {
  const navigate = useNavigate();
  const { actor, principalId, isLoading } = useAuthContext();

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
      if (!actor || !principalId) return;
      try {
        setLoading(true);
        const productosRes = await actor.listarProductos();
        const perfilRes = await actor.obtenerUsuario();
        setProductos(productosRes);
        setPerfil(perfilRes.ok);
        setEditFormData({
          nombreCompleto: perfilRes.ok.nombreCompleto,
          lugarOrigen: perfilRes.ok.lugarOrigen,
          telefono: perfilRes.ok.telefono,
        });
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [actor, principalId]);

  const agregarAlCarrito = (producto) => setCarrito([...carrito, producto]);

  const filteredProducts = productos.filter((producto) => {
    const matchSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory ? producto.tipo === selectedCategory : true;
    return matchSearch && matchCategory;
  });

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleSaveChanges = async () => {
    try {
      const result = await actor.editarPerfil(
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
      <div className="cliente-dashboard">
        <div className="botones-superiores">
          <Button className="btn-wallet" onClick={() => navigate("/wallet")}>💰 Wallet</Button>
          <Button className="btn-notificaciones" onClick={() => navigate("/notificaciones-cliente")}>🔔 Notificaciones</Button>
          <Button className="btn-carrito" onClick={() => navigate("/carrito", { state: { carrito } })}>🛒 Carrito</Button>
          <Button onClick={() => setShowEditModal(true)}>👤 Perfil</Button>
        </div>

        <div className="search-filter-container">
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
            <option value="dulces">Dulces Tradicionales</option>
            <option value="artesania">Artesanías</option>
            <option value="textil">Textiles</option>
          </Form.Select>
        </div>

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

        <div className="productos-disponibles">
          <h4>Explorar Productos</h4>
          {loading ? (
            <p className="text-center">Cargando productos...</p>
          ) : (
            <div className="d-flex flex-wrap justify-content-center gap-3">
              {filteredProducts.map((producto) => (
                <Card key={producto.id} className="card">
                  <Card.Img
                    variant="top"
                    src={producto.imagenes?.[0]}
                    alt={producto.nombre}
                    className="card-img-top"
                  />
                  <Card.Body className="card-body">
                    <Card.Title>{producto.nombre}</Card.Title>
                    <Card.Text>
                      <strong>Precio:</strong> ${producto.precio.toFixed(2)}<br />
                      {producto.descripcion}
                    </Card.Text>
                    <Button
                      className="btn-primary"
                      onClick={() => navigate(`/producto/${producto.id}`, { state: producto })}
                    >
                      Ver más
                    </Button>
                    <Button
                      className="btn-success"
                      onClick={() => agregarAlCarrito(producto)}
                    >
                      Agregar al Carrito
                    </Button>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClienteDashboard;
