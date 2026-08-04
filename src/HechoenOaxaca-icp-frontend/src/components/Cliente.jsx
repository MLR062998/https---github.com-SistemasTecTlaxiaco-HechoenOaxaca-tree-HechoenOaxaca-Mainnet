// src/components/ClienteDashboard.jsx - VERSIÓN CORREGIDA (con carrito backend)
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import { FaUser, FaMapMarkerAlt, FaPhone, FaSearch, FaFilter } from "react-icons/fa";
import DashboardLayout from "./DashboardLayout";
import { useAuthContext } from "./authContext";
import Compra from "./Compra";
import { processProductsList } from "../utils/imageUtils";
import "../cliente.scss";

const ClienteDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { actor, principalId } = useAuthContext();

  const [productos, setProductos] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({
    nombreCompleto: "",
    lugarOrigen: "",
    telefono: "",
  });

  // ============================================================
  // Cargar datos (productos y perfil)
  // ============================================================
  useEffect(() => {
    const fetchData = async () => {
      if (!actor || !principalId) return;
      try {
        setLoading(true);
        const productosRes = await actor.listarProductos();
        const perfilRes = await actor.obtenerUsuario();

        const productosProcesados = processProductsList(productosRes);
        setProductos(productosProcesados);
        
        if ("ok" in perfilRes) {
          setPerfil(perfilRes.ok);
          setEditFormData({
            nombreCompleto: perfilRes.ok.nombreCompleto,
            lugarOrigen: perfilRes.ok.lugarOrigen,
            telefono: perfilRes.ok.telefono,
          });
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [actor, principalId]);

  // ============================================================
  // Filtros
  // ============================================================
  const filteredProducts = productos.filter((producto) => {
    const matchSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory ? producto.tipo === selectedCategory : true;
    return matchSearch && matchCategory;
  });

  // ============================================================
  // Editar perfil
  // ============================================================
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleSaveChanges = async () => {
    try {
      const result = await actor.actualizarPerfil(
        editFormData.nombreCompleto,
        editFormData.lugarOrigen,
        editFormData.telefono
      );

      if ("ok" in result) {
        setPerfil(editFormData);
        setShowEditModal(false);
        alert("Perfil actualizado correctamente");
      } else {
        console.error("Error al actualizar el perfil:", result.err);
        alert("Error al actualizar el perfil");
      }
    } catch (error) {
      console.error("Error actualizando perfil:", error);
      alert("Error al actualizar el perfil");
    }
  };

  // ============================================================
  // ✅ NUEVA FUNCIÓN: Agregar al carrito usando el BACKEND
  // ============================================================
  const agregarAlCarritoBackend = async (producto) => {
    try {
      const resultado = await actor.agregarAlCarrito(producto.id);
      if ("ok" in resultado) {
        alert("✅ Producto agregado al carrito");
        // Opcional: redirigir al carrito
        navigate("/carrito");
      } else if ("err" in resultado) {
        const mensaje = traducirError(resultado.err);
        alert(`❌ ${mensaje}`);
      }
    } catch (error) {
      console.error("Error al agregar al carrito:", error);
      alert("Error de conexión. Intenta nuevamente.");
    }
  };

  // ============================================================
  // Función auxiliar para errores del backend
  // ============================================================
  const traducirError = (err) => {
    if (!err) return "Error desconocido";
    if (typeof err === "object") {
      if ("ErrorValidacion" in err) return err.ErrorValidacion;
      if ("StockInsuficiente" in err) return "No hay suficiente stock.";
      if ("ProductoNoExiste" in err) return "El producto ya no está disponible.";
      if ("PermisoDenegado" in err) return "No tienes permiso para agregar este producto.";
      if ("ErrorLedger" in err) return `Error de pago: ${err.ErrorLedger?.mensaje || err.ErrorLedger?.codigo}`;
      if ("ErrorInterno" in err) return "Error interno del sistema.";
    }
    return JSON.stringify(err);
  };

  // ============================================================
  // Handlers para modales
  // ============================================================
  const abrirDetalleProducto = (producto) => {
    setSelectedProduct(producto);
    setShowDetailModal(true);
  };

  // ============================================================
  // Renderizado
  // ============================================================
  return (
    <DashboardLayout>
      <div className="cliente-dashboard">
        {/* Header con perfil compacto */}
        <div className="dashboard-header">
          {perfil && (
            <div className="compact-profile">
              <div className="profile-avatar">
                <FaUser size={24} />
              </div>
              <div className="profile-info-compact">
                <div className="profile-item">
                  <FaUser className="profile-icon" />
                  <span className="profile-label">Nombre:</span>
                  <span className="profile-value">{perfil.nombreCompleto}</span>
                </div>
                <div className="profile-item">
                  <FaMapMarkerAlt className="profile-icon" />
                  <span className="profile-label">Origen:</span>
                  <span className="profile-value">{perfil.lugarOrigen}</span>
                </div>
                <div className="profile-item">
                  <FaPhone className="profile-icon" />
                  <span className="profile-label">Teléfono:</span>
                  <span className="profile-value">{perfil.telefono}</span>
                </div>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="edit-profile-btn"
                  onClick={() => setShowEditModal(true)}
                >
                  Editar
                </Button>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="action-buttons-compact">
            <Button variant="light" className="action-btn-compact" onClick={() => navigate("/notificaciones-cliente")}>
              🔔 Notificaciones
            </Button>
            <Button variant="light" className="action-btn-compact" onClick={() => navigate("/carrito")}>
              🛒 Carrito
            </Button>
          </div>
        </div>

        {/* Búsqueda y Filtros mejorados */}
        <div className="search-filter-compact">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <Form.Control
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input-compact"
            />
          </div>
          <div className="filter-box">
            <FaFilter className="filter-icon" />
            <Form.Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select-compact"
            >
              <option value="">Todas las categorías</option>
              <option value="Dulces">Dulces Tradicionales</option>
              <option value="Artesania">Artesanías</option>
              <option value="Textil">Textiles</option>
            </Form.Select>
          </div>
        </div>

        {/* Productos en grid compacto */}
        <div className="products-section-compact">
          <h4 className="section-title-compact">
            <span className="products-count">{filteredProducts.length}</span> Productos Disponibles
          </h4>
          
          {loading ? (
            <div className="loading-container">
              <Spinner animation="border" variant="primary" />
              <p>Cargando productos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <p>No se encontraron productos</p>
              {(searchTerm || selectedCategory) && (
                <Button variant="outline-secondary" onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("");
                }}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="products-grid-compact">
              {filteredProducts.map((producto) => (
                <div key={producto.id} className="product-card-compact-wrapper">
                  <Card className="product-card-compact">
                    {producto.imagenes && producto.imagenes[0] ? (
                      <div 
                        className="product-image-compact-container"
                        onClick={() => abrirDetalleProducto(producto)}
                      >
                        <Card.Img
                          variant="top"
                          src={producto.imagenes[0]}
                          alt={producto.nombre}
                          className="product-image-compact"
                        />
                      </div>
                    ) : (
                      <div 
                        className="product-image-placeholder-compact"
                        onClick={() => abrirDetalleProducto(producto)}
                      >
                        📷
                      </div>
                    )}
                    
                    <Card.Body className="product-card-body-compact">
                      <Card.Title className="product-title-compact">{producto.nombre}</Card.Title>
                      
                      <Card.Text className="product-description-compact">
                        {producto.descripcion?.length > 60 
                          ? `${producto.descripcion.substring(0, 60)}...` 
                          : producto.descripcion}
                      </Card.Text>
                      
                      <div className="product-footer-compact">
                        <Card.Text className="product-price-compact">
                          <span className="currency">ICP</span>
                          <span className="amount">{producto.precioICP?.toFixed(2)}</span>
                        </Card.Text>
                        
                        <div className="product-actions-compact">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            className="detail-btn-compact"
                            onClick={() => abrirDetalleProducto(producto)}
                          >
                            Ver
                          </Button>
                          <Button 
                            variant="success" 
                            size="sm"
                            className="cart-btn-compact"
                            onClick={() => agregarAlCarritoBackend(producto)}
                          >
                            + Carrito
                          </Button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Edición de Perfil */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="sm">
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
                  placeholder="Tu nombre completo"
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Lugar de Origen</Form.Label>
                <Form.Control
                  type="text"
                  name="lugarOrigen"
                  value={editFormData.lugarOrigen}
                  onChange={handleEditChange}
                  placeholder="Tu ciudad o pueblo"
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Teléfono</Form.Label>
                <Form.Control
                  type="text"
                  name="telefono"
                  value={editFormData.telefono}
                  onChange={handleEditChange}
                  placeholder="Tu número de teléfono"
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveChanges}>
              Guardar
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal de Detalle de Producto */}
        <Compra
          show={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          product={selectedProduct}
        />
      </div>
    </DashboardLayout>
  );
};

export default ClienteDashboard;