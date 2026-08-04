import React, { useEffect, useState } from "react";
import { useAuthContext } from "./authContext";
import { useNavigate } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Carousel from "react-bootstrap/Carousel";
import Alert from "react-bootstrap/Alert";
import { FaShoppingCart, FaEye, FaStar, FaTruck, FaShieldAlt, FaHeart } from "react-icons/fa";
import Compra from "./Compra";
import { processProductsList } from "../utils/imageUtils";
import "../index.scss";
import "bootstrap/dist/css/bootstrap.min.css";

const Home = () => {
  const { actor, isAuthenticated } = useAuthContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAuthAlert, setShowAuthAlert] = useState(false);
  const navigate = useNavigate();

  // ✅ Frases mejoradas para el carrusel
  const carouselMessages = [
    {
      title: "Artesanías Oaxaqueñas",
      subtitle: "Hecho a mano con tradición y corazón",
      icon: <FaHeart className="carousel-icon" />,
      color: "#e0c144"
    },
    {
      title: "Productos Únicos",
      subtitle: "Cada pieza cuenta una historia especial",
      icon: <FaStar className="carousel-icon" />,
      color: "#28a745"
    },
    {
      title: "Origen Auténtico",
      subtitle: "Directo de las manos de nuestros artesanos",
      icon: <FaShieldAlt className="carousel-icon" />,
      color: "#007bff"
    },
    {
      title: "Envíos Nacionales",
      subtitle: "Recibe donde estés en todo México",
      icon: <FaTruck className="carousel-icon" />,
      color: "#6f42c1"
    }
  ];

  const fetchProducts = async () => {
    if (!actor?.listarProductos) return;

    setLoading(true);
    try {
      const result = await actor.listarProductos();
      if (!Array.isArray(result)) throw new Error("listarProductos no devolvió una lista");

      const productosProcesados = processProductsList(result);
      setProducts(productosProcesados);
    } catch (err) {
      console.error("❌ Error al cargar productos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [actor]);

  // ============================================================
  // ✅ FUNCIONES MODIFICADAS: Usan el backend directamente
  // ============================================================
  
  const handleAddToCart = async (product, e) => {
    if (e) {
      e.stopPropagation();
    }

    if (!isAuthenticated) {
      setShowAuthAlert(true);
      setTimeout(() => setShowAuthAlert(false), 5000);
      return;
    }

    try {
      const resultado = await actor.agregarAlCarrito(product.id);
      if ("ok" in resultado) {
        alert("✅ Producto agregado al carrito");
      } else if ("err" in resultado) {
        const mensaje = traducirError(resultado.err);
        alert(`❌ ${mensaje}`);
      }
    } catch (error) {
      console.error("Error agregando al carrito:", error);
      alert("❌ Error de conexión. Intenta nuevamente.");
    }
  };

  const handleAddToCartFromModal = async (product) => {
    try {
      const resultado = await actor.agregarAlCarrito(product.id);
      if ("ok" in resultado) {
        alert("✅ Producto agregado al carrito");
        setShowModal(false);
      } else if ("err" in resultado) {
        const mensaje = traducirError(resultado.err);
        alert(`❌ ${mensaje}`);
      }
    } catch (error) {
      console.error("Error agregando al carrito:", error);
      alert("❌ Error de conexión. Intenta nuevamente.");
    }
  };

  const traducirError = (err) => {
    if (!err) return "Error desconocido";
    if (typeof err === "object") {
      if ("ErrorValidacion" in err) return err.ErrorValidacion;
      if ("StockInsuficiente" in err) return "No hay suficiente stock.";
      if ("ProductoNoExiste" in err) return "El producto ya no está disponible.";
      if ("PermisoDenegado" in err) return "No tienes permiso.";
    }
    return JSON.stringify(err);
  };

  const handleShowDetails = (product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  // Agrupar productos por categoría para mostrar mejor
  const featuredProducts = products.slice(0, 8); // Solo mostrar 8 productos destacados

  return (
    <div className="home-container">
      {/* ✅ Hero Section Mejorada */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Descubre la Magia de <span className="highlight">Oaxaca</span>
          </h1>
          <p className="hero-subtitle">
            Artesanías únicas, tradición viva y calidad excepcional
          </p>
        </div>
      </section>

      {/* ✅ Beneficios en tarjetas compactas */}
      <section className="benefits-section py-4">
        <div className="container">
          <div className="row g-3 justify-content-center">
            {carouselMessages.map((message, index) => (
              <div key={index} className="col-md-3 col-sm-6">
                <div 
                  className="benefit-card text-center p-3 rounded"
                  style={{ 
                    background: `linear-gradient(135deg, ${message.color}20, transparent)`,
                    borderLeft: `4px solid ${message.color}`
                  }}
                >
                  <div className="benefit-icon mb-2" style={{ color: message.color }}>
                    {message.icon}
                  </div>
                  <h5 className="benefit-title mb-1">{message.title}</h5>
                  <p className="benefit-text small text-muted mb-0">{message.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ Productos Destacados Compactos */}
      <section className="featured-products py-4">
        <div className="container">
          <div className="section-header text-center mb-4">
            <h2 className="section-title">Productos Destacados</h2>
            <p className="section-subtitle text-muted">
              Las mejores artesanías seleccionadas para ti
            </p>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Cargando productos...</p>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-5">
              <h4>No hay productos disponibles</h4>
              <p className="text-muted">Pronto tendremos nuevas artesanías</p>
            </div>
          ) : (
            <div className="products-grid-compact">
              {featuredProducts.map((product) => (
                <div key={product.id} className="product-card-compact-wrapper">
                  <Card className="product-card-compact">
                    {/* Imagen del producto */}
                    {product.imagenes && product.imagenes[0] ? (
                      <div 
                        className="product-image-compact-container"
                        onClick={() => handleShowDetails(product)}
                      >
                        <Card.Img
                          variant="top"
                          src={product.imagenes[0]}
                          alt={product.nombre}
                          className="product-image-compact"
                        />
                        <div className="product-overlay">
                          <Button 
                            variant="light" 
                            size="sm"
                            className="overlay-btn"
                          >
                            <FaEye />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="product-image-placeholder-compact"
                        onClick={() => handleShowDetails(product)}
                      >
                        <span className="placeholder-text">📷</span>
                      </div>
                    )}
                    
                    <Card.Body className="product-card-body-compact">
                      <Card.Title className="product-title-compact">
                        {product.nombre}
                      </Card.Title>
                      
                      <Card.Text className="product-category-compact">
                        <small className="text-muted">{product.tipo || "Artesanía"}</small>
                      </Card.Text>
                      
                      <Card.Text className="product-description-compact">
                        {product.descripcion?.length > 60 
                          ? `${product.descripcion.substring(0, 60)}...` 
                          : product.descripcion}
                      </Card.Text>
                      
                      <div className="product-footer-compact">
                        <div className="product-price-compact">
                          <span className="price-amount">ICP {product.precioICP?.toFixed(2)}</span>
                        </div>
                        
                        <div className="product-actions-compact">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            className="detail-btn-compact"
                            onClick={() => handleShowDetails(product)}
                          >
                            <FaEye className="me-1" /> Ver
                          </Button>
                          <Button 
                            variant="success" 
                            size="sm"
                            className="cart-btn-compact"
                            onClick={(e) => handleAddToCart(product, e)}
                          >
                            <FaShoppingCart className="me-1" /> Carrito
                          </Button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              ))}
            </div>
          )}

          {products.length > 8 && (
            <div className="text-center mt-4">
              <Button 
                variant="outline-primary"
                onClick={() => navigate("/productos")}
              >
                Ver Todos los Productos ({products.length})
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ✅ Alerta de autenticación */}
      {showAuthAlert && (
        <div className="auth-alert-container">
          <Alert 
            variant="warning" 
            className="alert-compact"
            onClose={() => setShowAuthAlert(false)} 
            dismissible
          >
            <Alert.Heading className="h6 mb-2">
              <FaShoppingCart className="me-2" />
              Inicia sesión para continuar
            </Alert.Heading>
            <p className="mb-2 small">
              Debes estar autenticado para agregar productos al carrito.
            </p>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => navigate("/")}
              className="mt-1"
            >
              Iniciar Sesión
            </Button>
          </Alert>
        </div>
      )}

      {/* ✅ CTA Final */}
      <section className="cta-section py-5">
        <div className="container text-center">
          <h3 className="cta-title mb-3">¿Listo para descubrir más?</h3>
          <p className="cta-text mb-4">
            Explora nuestra colección completa de artesanías oaxaqueñas
          </p>
          <div className="cta-buttons">
            <Button 
              variant="primary" 
              size="lg"
              className="me-3"
              onClick={() => navigate("/productos")}
            >
              Ver Catálogo Completo
            </Button>
            {isAuthenticated && (
              <Button 
                variant="outline-primary" 
                size="lg"
                onClick={() => navigate("/carrito")}
              >
                <FaShoppingCart className="me-2" />
                Ir al Carrito
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ✅ Modal de Compra */}
      <Compra
        show={showModal}
        onClose={() => setShowModal(false)}
        product={selectedProduct}
        onAddToCart={handleAddToCartFromModal}
      />
    </div>
  );
};

export default Home;