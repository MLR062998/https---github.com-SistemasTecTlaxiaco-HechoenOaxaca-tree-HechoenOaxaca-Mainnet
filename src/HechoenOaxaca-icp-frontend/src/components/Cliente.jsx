// src/components/ClienteDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { FaBell, FaShoppingCart, FaUser } from "react-icons/fa";
import DashboardLayout from "./DashboardLayout";
import { useAuthContext } from "./authContext";

const blobToBase64 = (blobArray) => {
  const uint8 = new Uint8Array(blobArray);
  const blob = new Blob([uint8], { type: "image/jpeg" });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

const ClienteDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { actor, principalId, isLoading } = useAuthContext();

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

        const productosConImagen = await Promise.all(
          productosRes.map(async (producto) => {
            const imagenBase64 = producto.imagenes?.[0]
              ? await blobToBase64(producto.imagenes[0])
              : null;
            return { ...producto, imgUrl: imagenBase64 };
          })
        );

        setProductos(productosConImagen);
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

  const abrirDetalleProducto = (producto) => {
    setSelectedProduct(producto);
    setShowDetailModal(true);
  };

  return (
    <DashboardLayout title="Bienvenido, Cliente">
      {!isDashboard && (
        <div className="mb-3 text-end">
          <Button variant="outline-secondary" onClick={() => navigate("/cliente-dashboard")}>🏠 Volver al Dashboard</Button>
        </div>
      )}

      <div className="botones-superiores">
        <Button onClick={() => navigate("/wallet")}>💰 Wallet</Button>
        <Button onClick={() => navigate("/notificaciones-cliente")}>🔔 Notificaciones</Button>
        <Button onClick={() => navigate("/carrito")}>🛒 Carrito</Button>
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

      <div className="productos-disponibles">
        <h4>Explorar Productos</h4>
        {loading ? (
          <p className="text-center">Cargando productos...</p>
        ) : (
          <div className="d-flex flex-wrap justify-content-center gap-3">
            {filteredProducts.map((producto) => (
              <Card key={producto.id} className="card">
                {producto.imgUrl ? (
                  <Card.Img
                    variant="top"
                    src={producto.imgUrl}
                    alt={producto.nombre}
                    className="card-img-top"
                  />
                ) : (
                  <div className="text-center text-muted" style={{ height: 150 }}>
                    Sin imagen
                  </div>
                )}
                <Card.Body className="card-body">
                  <Card.Title>{producto.nombre}</Card.Title>
                  <Card.Text>
                    <strong>Precio:</strong> ${producto.precio.toFixed(2)}<br />
                    {producto.descripcion?.slice(0, 60)}...
                  </Card.Text>
                  <Button className="btn-primary me-2" onClick={() => abrirDetalleProducto(producto)}>Ver más</Button>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClienteDashboard;
