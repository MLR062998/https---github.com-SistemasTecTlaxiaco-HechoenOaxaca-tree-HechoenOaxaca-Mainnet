// src/components/Home.jsx
import { useCanister } from "@connect2ic/react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import "bootstrap/dist/css/bootstrap.min.css";
import Compra from './Compra';
import '../index.scss';

const Home = () => {
  const [marketplaceBackend] = useCanister('HechoenOaxaca-icp-backend');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const fetchProducts = async () => {
    if (!marketplaceBackend) {
      console.warn('Marketplace backend no está disponible aún.');
      return;
    }

    setLoading(true);
    try {
      const productsRes = await marketplaceBackend.readProductos();

      const processedProducts = productsRes.map(product => ({
        ...product,
        imagenes: product.imagenes.map(imagen =>
          URL.createObjectURL(new Blob([new Uint8Array(imagen)], { type: "image/jpeg" }))
        )
      }));

      setProducts(processedProducts);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleShowDetails = (product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  const handlePurchase = (product) => {
    setShowModal(false);
    navigate('/compra', { state: { product } });
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
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Cargando...</span>
            </Spinner>
          </div>
        ) : (
          <div className="row">
            {products.map((product) => (
              <div key={product.id} className="col-md-4 mb-4">
                <Card>
                  {product.imagenes.length > 0 && (
                    <Card.Img
                      variant="top"
                      src={product.imagenes[0]}
                      alt={`Imagen de ${product.nombre}`}
                      style={{ maxHeight: "200px", objectFit: "cover" }}
                    />
                  )}
                  <Card.Body>
                    <Card.Title>{product.nombre}</Card.Title>
                    <Card.Text>{product.descripcion}</Card.Text>
                    <Card.Text>Precio: ICP {product.precio}</Card.Text>
                    <Button variant="primary" onClick={() => handleShowDetails(product)}>
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
        onPurchase={handlePurchase}
      />
    </section>
  );
};

export default Home;
