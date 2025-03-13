import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HechoenOaxaca_icp_backend } from "../../../declarations/HechoenOaxaca-icp-backend";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { FaBell, FaRegMoneyBillAlt, FaShoppingCart, FaSearch, FaEdit, FaUser } from "react-icons/fa";
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import "../cliente.scss";

const Cliente = ({ principalId }) => {
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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const productosRes = await HechoenOaxaca_icp_backend.readProductos();
        const perfilRes = await HechoenOaxaca_icp_backend.obtenerPerfil(principalId);
        
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

    fetchData();
  }, [principalId]);

  // Función para agregar un producto al carrito
  const agregarAlCarrito = (producto) => {
    setCarrito([...carrito, producto]);
  };

  // Función para filtrar productos por categoría y término de búsqueda
  const filteredProducts = productos.filter(producto => {
    const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? producto.categoria === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

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
    <div className="cliente-dashboard">
      <h2 className="text-center">Bienvenido, Cliente</h2>

      {/* Contenedor superior (barras de búsqueda y botones) */}
      <div className="top-container d-flex justify-content-between align-items-center my-3">
        {/* Barras de búsqueda y filtro (izquierda) */}
        <div className="search-filter-container d-flex gap-3">
          <Form.Control
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "300px" }}
          />
          <Form.Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ width: "200px" }}
          >
            <option value="">Todas las categorías</option>
            <option value="dulces tradicionales">Dulces Tradicionales</option>
            <option value="artesanías">Artesanías</option>
            <option value="textiles">Textiles</option>
          </Form.Select>
        </div>

        {/* Botones superiores (derecha) */}
        <div className="botones-superiores d-flex gap-3">
          <Button className="btn-wallet" onClick={() => navigate("/wallet")}> 
            <FaRegMoneyBillAlt size={20} /> Wallet
          </Button>
          <Button className="btn-notificaciones" onClick={() => navigate("/notificaciones-cliente")}> 
            <FaBell size={20} /> Notificaciones
          </Button>
          <Button className="btn-carrito" onClick={() => navigate("/carrito", { state: { carrito } })}> 
            <FaShoppingCart size={20} /> Carrito
          </Button>
          <Button className="btn-perfil" onClick={handleEditClick}> 
            <FaUser size={20} /> Perfil
          </Button>
        </div>
      </div>

      {/* Perfil del cliente con opción de editar */}
      {perfil && (
        <div className="perfil text-center">
          <h4>Mi Perfil</h4>
          <p><strong>Nombre:</strong> {perfil.nombreCompleto}</p>
          <p><strong>Teléfono:</strong> {perfil.telefono}</p>
          <p><strong>Lugar de Origen:</strong> {perfil.lugarOrigen}</p>
        </div>
      )}

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

      {/* Productos disponibles */}
      <div className="productos-disponibles">
        <h4 className="text-center">Explorar Productos</h4>
        {loading ? (
          <p className="text-center">Cargando productos...</p>
        ) : (
          <div className="d-flex flex-wrap justify-content-center gap-3">
            {filteredProducts.map((producto) => (
              <Card key={producto.id} style={{ width: "18rem" }}>
                <Card.Body>
                  <Card.Title>{producto.nombre}</Card.Title>
                  <Card.Text>
                    <strong>Precio:</strong> ${producto.precio.toFixed(2)}
                  </Card.Text>
                  <Card.Text>{producto.descripcion}</Card.Text>
                  <Button variant="primary" onClick={() => navigate(`/producto/${producto.id}`, { state: producto })}>
                    Ver más
                  </Button>
                  <Button variant="success" onClick={() => agregarAlCarrito(producto)}>
                    Agregar al Carrito
                  </Button>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Cliente;