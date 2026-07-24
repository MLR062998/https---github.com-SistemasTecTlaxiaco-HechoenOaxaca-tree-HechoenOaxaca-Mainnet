// src/components/Artesano.jsx
import React, { useEffect, useState } from "react";
import { Route, Routes, useNavigate, useLocation } from "react-router-dom";
import CrearProducto from "./CrearProducto";
import Products from "./Products";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import DashboardLayout from "./DashboardLayout";
import { useAuthContext } from "./authContext";
import "../artesano.scss";

import { processProductsList } from "../utils/imageUtils";

// ========= COMPONENTE ProductosPreview =========
const ProductosPreview = ({ productos, onVerTodos, onCrearNuevo, onVerProducto, onEditarProducto }) => {
  return (
    <div className="productos-preview mt-4">
      <div className="productos-preview-header">
        <h5 className="productos-preview-title">
          📦 Mis Productos Recientes
          <span className="productos-preview-badge">{productos.length}</span>
        </h5>
        <div className="productos-preview-actions">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={onCrearNuevo}
            className="btn-crear-producto me-2"
          >
            + Nuevo Producto
          </Button>
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={onVerTodos}
            className="btn-ver-todos"
          >
            Ver todos →
          </Button>
        </div>
      </div>
      
      {productos.length > 0 ? (
        <div className="row g-3">
          {productos.slice(0, 3).map((producto) => (
            <div key={producto.id} className="col-md-4">
              <div className="producto-card h-100">
                <div className="producto-card-image">
                  {producto.imagenes && producto.imagenes.length > 0 && producto.imagenes[0] ? (
                    <img 
                      src={producto.imagenes[0]} 
                      alt={producto.nombre}
                      onError={(e) => {
                        console.log("Error cargando imagen en dashboard");
                        e.target.style.display = 'none';
                        e.target.parentNode.querySelector('.producto-card-image-placeholder').classList.remove('d-none');
                      }}
                    />
                  ) : null}
                  <div className={`producto-card-image-placeholder ${producto.imagenes && producto.imagenes.length > 0 ? 'd-none' : ''}`}>
                    <span>📷</span>
                  </div>
                  <span className={`producto-card-badge ${producto.activo !== false ? 'badge-success' : 'badge-secondary'}`}>
                    {producto.activo !== false ? 'Disponible' : 'Agotado'}
                  </span>
                </div>
                <div className="producto-card-body">
                  <h6 className="producto-card-title">{producto.nombre}</h6>
                  <p className="producto-card-description">
                    {producto.descripcion && producto.descripcion.length > 50 
                      ? `${producto.descripcion.substring(0, 50)}...` 
                      : producto.descripcion || "Sin descripción"}
                  </p>
                  <div className="producto-card-footer">
                    <span className="producto-card-price">{producto.precioICP?.toFixed(2)} ICP</span>
                    <div className="producto-card-actions">
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="btn-icon"
                        onClick={() => onVerProducto(producto)}
                        title="Ver detalles"
                      >
                        👁️
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        className="btn-icon"
                        onClick={() => onEditarProducto(producto)}
                        title="Editar"
                      >
                        ✏️
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="productos-preview-empty">
          <span className="empty-icon">🎨</span>
          <p className="empty-text">Aún no tienes productos creados</p>
          <Button 
            variant="primary" 
            onClick={onCrearNuevo}
            className="btn-crear-primero"
          >
            Crear tu primer producto
          </Button>
        </div>
      )}
    </div>
  );
};

// ========= COMPONENTE AccionesRapidas =========
const AccionesRapidas = ({ onNavigate }) => (
  <div className="acciones-rapidas mt-4">
    <h5 className="acciones-rapidas-title">⚡ Acciones Rápidas</h5>
    <div className="row g-2">
      <div className="col-6 col-md-3">
        <Button 
          variant="outline-primary" 
          className="accion-rapida-btn w-100"
          onClick={() => onNavigate("nuevo-producto")}
        >
          <div className="accion-rapida-icon">🛠️</div>
          <div className="accion-rapida-text">Crear Producto</div>
        </Button>
      </div>
      <div className="col-6 col-md-3">
        <Button 
          variant="outline-success" 
          className="accion-rapida-btn w-100"
          onClick={() => onNavigate("mis-productos")}
        >
          <div className="accion-rapida-icon">📦</div>
          <div className="accion-rapida-text">Mis Productos</div>
        </Button>
      </div>
      <div className="col-6 col-md-3">
        <Button 
          variant="outline-warning" 
          className="accion-rapida-btn w-100"
          onClick={() => onNavigate("notificaciones")}
        >
          <div className="accion-rapida-icon">🔔</div>
          <div className="accion-rapida-text">Notificaciones</div>
        </Button>
      </div>
    </div>
  </div>
);

// ========= COMPONENTE PRINCIPAL Artesano =========
const Artesano = () => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [productos, setProductos] = useState([]);
  const [editFormData, setEditFormData] = useState({
    nombreCompleto: "",
    lugarOrigen: "",
    telefono: "",
  });

  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // 🔥 CAMBIO: extraemos 'principal' (objeto) en lugar de 'principalId'
  const { actor, principal, isLoading, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;
  const isDashboard = currentPath === "/artesano-dashboard";
  const isSubRoute = currentPath.startsWith("/artesano-dashboard/");

  // Cargar perfil
  useEffect(() => {
    const fetchPerfil = async () => {
      if (!actor || !principal) return; // ahora usamos principal (objeto)
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
        }
      } catch (error) {
        console.error("❌ Error al cargar el perfil:", error);
      }
    };

    if (isAuthenticated) {
      fetchPerfil();
    }
  }, [actor, principal, isAuthenticated]);

  // Cargar productos con el mismo procesamiento que Products.jsx
  // ✅ CORREGIDO: Se pasa el objeto principal (no el string)
  useEffect(() => {
    const fetchProductos = async () => {
      if (!actor || !principal || !isAuthenticated) return;
      
      try {
        console.log("📌 Llamando a listarProductosPorArtesano con principal (objeto):", principal);
        console.log("📌 principal.toText():", principal.toText());

        const result = await actor.listarProductosPorArtesano(principal);
        console.log("Productos desde backend (Artesano):", result);
        
        const productosData = processProductsList(result);
        console.log("Productos procesados (Artesano):", productosData);
        
        setProductos(productosData);
        
      } catch (error) {
        console.error("❌ Error al cargar productos:", error);
      }
    };

    if (isDashboard) {
      fetchProductos();
    }
  }, [actor, principal, isAuthenticated, isDashboard]);

  // Redirección si no está autenticado
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleSaveChanges = async () => {
    if (!actor) return;
    try {
      console.log("Guardando cambios:", editFormData);
      const result = await actor.actualizarPerfil(
        editFormData.nombreCompleto,
        editFormData.lugarOrigen,
        editFormData.telefono
      );
      if ("ok" in result) {
        setPerfil({ ...perfil, ...editFormData });
        setShowEditModal(false);
      } else {
        console.error("Error al actualizar perfil:", result.err);
      }
    } catch (error) {
      console.error("❌ Error al actualizar perfil:", error);
    }
  };

  const handleVerProducto = (producto) => {
    setSelectedProduct(producto);
    setShowProductModal(true);
  };

  const handleEditarProducto = (producto) => {
    navigate("mis-productos");
  };

  if (isLoading) return (
    <DashboardLayout>
      <div className="artesano-dashboard">
        <div className="loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3">Cargando dashboard...</p>
        </div>
      </div>
    </DashboardLayout>
  );

  if (!isAuthenticated) return null;
  if (!perfil) return (
    <DashboardLayout>
      <div className="artesano-dashboard">
        <div className="loading">
          <p>Cargando perfil...</p>
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="artesano-dashboard">
        {/* Botones superiores */}
        <div className="botones-superiores">
          {isDashboard && (
            <Button 
              variant="outline-primary" 
              onClick={() => setShowEditModal(true)}
              className="btn-editar ms-auto"
            >
              ✏️ Editar Perfil
            </Button>
          )}
        </div>

        <Routes>
          {/* Ruta principal del dashboard */}
          <Route
            index
            element={
              <div className="dashboard-container">
                {/* Header con información del artesano */}
                <div className="perfil">
                  <h4>👤 Perfil Artesano</h4>
                  <p><strong>Nombre:</strong> {perfil.nombreCompleto}</p>
                  <p><strong>Origen:</strong> {perfil.lugarOrigen}</p>
                  <p><strong>Teléfono:</strong> {perfil.telefono}</p>
                </div>

                {/* Vista previa de productos */}
                <ProductosPreview 
                  productos={productos}
                  onVerTodos={() => navigate("mis-productos")}
                  onCrearNuevo={() => navigate("nuevo-producto")}
                  onVerProducto={handleVerProducto}
                  onEditarProducto={handleEditarProducto}
                />

                {/* Acciones rápidas */}
                <AccionesRapidas onNavigate={navigate} />

                {/* Modal para ver producto desde dashboard */}
                <Modal show={showProductModal} onHide={() => setShowProductModal(false)} size="lg">
                  <Modal.Header closeButton>
                    <Modal.Title>Detalles del Producto</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    {selectedProduct && (
                      <div className="row">
                        <div className="col-md-6">
                          <h5>{selectedProduct.nombre}</h5>
                          <p><strong>Precio:</strong> {selectedProduct.precioICP?.toFixed(2)} ICP</p>
                          <p><strong>Tipo:</strong> {selectedProduct.tipo}</p>
                          <p><strong>Descripción:</strong> {selectedProduct.descripcion}</p>
                          <p>
                            <strong>Estado:</strong> 
                            <span className={`badge ${selectedProduct.activo !== false ? 'bg-success' : 'bg-secondary'} ms-2`}>
                              {selectedProduct.activo !== false ? 'Disponible' : 'Agotado'}
                            </span>
                          </p>
                        </div>
                        <div className="col-md-6">
                          <h6>Imágenes</h6>
                          <div className="row g-2">
                            {selectedProduct.imagenes && selectedProduct.imagenes.length > 0 ? (
                              selectedProduct.imagenes.map((img, idx) => (
                                <div key={idx} className="col-4">
                                  <img 
                                    src={img} 
                                    alt={`Producto ${idx + 1}`}
                                    className="img-fluid rounded"
                                    style={{ height: "80px", objectFit: "cover", width: "100%" }}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              ))
                            ) : (
                              <p className="text-muted">Sin imágenes</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowProductModal(false)}>
                      Cerrar
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={() => {
                        setShowProductModal(false);
                        navigate("mis-productos");
                      }}
                    >
                      Gestionar Productos
                    </Button>
                  </Modal.Footer>
                </Modal>
              </div>
            }
          />
          
          {/* Subrutas */}
          <Route path="nuevo-producto" element={<CrearProducto />} />
          <Route path="mis-productos" element={<Products />} />
          <Route path="notificaciones" element={
            <div className="text-center py-5">
              <span className="fs-1">🔧</span>
              <h4 className="mt-3">Notificaciones en construcción</h4>
              <p className="text-muted">Pronto podrás ver tus notificaciones aquí</p>
            </div>
          } />
        </Routes>

        {/* Modal de edición de perfil */}
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
      </div>
    </DashboardLayout>
  );
};

export default Artesano;