// src/components/ClienteDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import { FaBell, FaShoppingCart, FaUser } from "react-icons/fa";
import DashboardLayout from "./DashboardLayout";
import { useAuthContext } from "./authContext";
import Compra from "./Compra";
import { useCarrito } from "../context/CarritoContext";
import { processProductsList } from "../utils/imageUtils"; // ✅ Importar utilidad

const ClienteDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { actor, principalId, isLoading } = useAuthContext();
  const { agregarAlCarrito } = useCarrito();

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

  const isDashboard = location.pathname === "/cliente-dashboard";

  useEffect(() => {
    const fetchData = async () => {
      if (!actor || !principalId) return;
      try {
        setLoading(true);
        const productosRes = await actor.listarProductos();
        const perfilRes = await actor.obtenerUsuario();

        // ✅ CORREGIDO: Usar la utilidad unificada para procesar productos
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
      // ✅ Verificar si existe el método editarPerfil, si no, usar registrarUsuario
      if (actor.editarPerfil) {
        const result = await actor.editarPerfil(
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
      } else {
        // Si no existe editarPerfil, intentar con registrarUsuario (para actualizar)
        const result = await actor.registrarUsuario(
          editFormData.nombreCompleto,
          editFormData.lugarOrigen,
          editFormData.telefono,
          "Cliente"
        );

        if ("ok" in result) {
          setPerfil(editFormData);
          setShowEditModal(false);
          alert("Perfil actualizado correctamente");
        } else {
          console.error("Error al actualizar el perfil:", result.err);
          alert("Error al actualizar el perfil");
        }
      }
    } catch (error) {
      console.error("Error actualizando perfil:", error);
      alert("Error al actualizar el perfil");
    }
  };

  const abrirDetalleProducto = (producto) => {
    setSelectedProduct(producto);
    setShowDetailModal(true);
  };

  const agregarAlCarritoDesdeCard = (producto) => {
    agregarAlCarrito(producto);
    alert("Producto agregado al carrito");
  };

  return (
    <DashboardLayout title="Bienvenido, Cliente">
      {!isDashboard && (
        <div className="mb-3 text-end">
          <Button variant="outline-secondary" onClick={() => navigate("/cliente-dashboard")}>
            🏠 Volver al Dashboard
          </Button>
        </div>
      )}

      {/* Información del perfil */}
      {perfil && (
        <Card className="mb-4">
          <Card.Body>
            <h5>👤 Tu Perfil</h5>
            <p><strong>Nombre:</strong> {perfil.nombreCompleto}</p>
            <p><strong>Lugar de origen:</strong> {perfil.lugarOrigen}</p>
            <p><strong>Teléfono:</strong> {perfil.telefono}</p>
            <Button variant="outline-primary" size="sm" onClick={() => setShowEditModal(true)}>
              Editar Perfil
            </Button>
          </Card.Body>
        </Card>
      )}

      <div className="botones-superiores mb-4">
        <Button variant="primary" className="me-2" onClick={() => navigate("/wallet")}>
          💰 Wallet
        </Button>
        <Button variant="primary" className="me-2" onClick={() => navigate("/notificaciones-cliente")}>
          🔔 Notificaciones
        </Button>
        <Button variant="primary" className="me-2" onClick={() => navigate("/carrito")}>
          🛒 Carrito
        </Button>
        
      </div>

      {/* Búsqueda y Filtros */}
      <div className="search-filter-container mb-4">
        <div className="row g-3">
          <div className="col-md-6">
            <Form.Control
              type="text"
              placeholder="🔍 Buscar productos por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <Form.Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              <option value="Dulces">Dulces Tradicionales</option>
              <option value="Artesania">Artesanías</option>
              <option value="Textil">Textiles</option>
              <option value="Barro">Barro y Cerámica</option>
              <option value="Madera">Madera</option>
            </Form.Select>
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="productos-disponibles">
        <h4>🛍️ Productos Disponibles</h4>
        
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" variant="primary" />
            <p>Cargando productos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center text-muted p-4 border rounded">
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
          <div className="row">
            {filteredProducts.map((producto) => (
              <div key={producto.id} className="col-lg-4 col-md-6 mb-4">
                <Card className="h-100 shadow-sm">
                  {/* Imagen del producto */}
                  {producto.imagenes && producto.imagenes[0] ? (
                    <Card.Img
                      variant="top"
                      src={producto.imagenes[0]}
                      alt={producto.nombre}
                      style={{ 
                        height: "200px", 
                        objectFit: "cover",
                        cursor: "pointer"
                      }}
                      onClick={() => abrirDetalleProducto(producto)}
                    />
                  ) : (
                    <div 
                      className="bg-light d-flex align-items-center justify-content-center text-muted"
                      style={{ height: "200px", cursor: "pointer" }}
                      onClick={() => abrirDetalleProducto(producto)}
                    >
                      📷 Sin imagen
                    </div>
                  )}
                  
                  <Card.Body className="d-flex flex-column">
                    <Card.Title>{producto.nombre}</Card.Title>
                    
                    <Card.Text className="flex-grow-1">
                      {producto.descripcion?.length > 80 
                        ? `${producto.descripcion.substring(0, 80)}...` 
                        : producto.descripcion}
                    </Card.Text>
                    
                    <div className="mt-auto">
                      <Card.Text className="fw-bold text-primary">
                        💰 ICP {producto.precioICP?.toFixed(2)}
                      </Card.Text>
                      
                      <div className="d-grid gap-2">
                        <Button 
                          variant="outline-primary" 
                          onClick={() => abrirDetalleProducto(producto)}
                        >
                          👁️ Ver Detalles
                        </Button>
                        <Button 
                          variant="success" 
                          onClick={() => agregarAlCarritoDesdeCard(producto)}
                        >
                          🛒 Agregar al Carrito
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
            Guardar Cambios
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Detalle de Producto */}
      <Compra
        show={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        product={selectedProduct}
      />
    </DashboardLayout>
  );
};

export default ClienteDashboard;