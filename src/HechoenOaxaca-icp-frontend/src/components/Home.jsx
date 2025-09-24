import React, { useEffect, useState } from "react";
import { useAuthContext } from "./authContext";
import { useNavigate } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Compra from "./Compra";
import { processProductsList } from "../utils/imageUtils";
import "../index.scss";
import "bootstrap/dist/css/bootstrap.min.css";

const Home = () => {
  const { actor } = useAuthContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const fetchProducts = async () => {
    if (!actor?.listarProductos) return;

    setLoading(true);
    try {
      const result = await actor.listarProductos();
      if (!Array.isArray(result)) throw new Error("listarProductos no devolvió una lista");

      // ✅ CORREGIDO: Procesar imágenes correctamente
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

  const handleShowDetails = (product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  return (
    <section className="mt-5 text-center">
      <div className="eslogan-container">
        <h1 className="eslogan-text">Hecho a mano, Hecho con el corazón</h1>
        <p className="eslogan-subtext">Artesanías únicas que cuentan historias</p>
      </div>

      <div className="container mt-4">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: "200px" }}>
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          <div className="row">
            {products.map((product) => (
              <div key={product.id} className="col-md-4 mb-4">
                <Card className="h-100">
                  {/* ✅ CORREGIDO: Mostrar primera imagen correctamente */}
                  {product.imagenes && product.imagenes[0] ? (
                    <Card.Img
                      variant="top"
                      src={product.imagenes[0]}
                      alt={`Imagen de ${product.nombre}`}
                      style={{ 
                        height: "200px", 
                        objectFit: "cover",
                        width: "100%"
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : (
                    <div className="bg-light d-flex align-items-center justify-content-center" 
                         style={{ height: "200px" }}>
                      <span className="text-muted">Sin imagen</span>
                    </div>
                  )}
                  
                  <Card.Body className="d-flex flex-column">
                    <Card.Title>{product.nombre}</Card.Title>
                    <Card.Text className="flex-grow-1">
                      {product.descripcion.length > 100 
                        ? `${product.descripcion.substring(0, 100)}...` 
                        : product.descripcion}
                    </Card.Text>
                    <Card.Text className="fw-bold">Precio: ICP {product.precioICP?.toFixed(2)}</Card.Text>
                    <Button 
                      variant="primary" 
                      onClick={() => handleShowDetails(product)}
                      className="mt-auto"
                    >
                      Ver Detalles
                    </Button>
                  </Card.Body>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      <Compra
        show={showModal}
        onClose={() => setShowModal(false)}
        product={selectedProduct}
      />
    </section>
  );
};

export default Home;