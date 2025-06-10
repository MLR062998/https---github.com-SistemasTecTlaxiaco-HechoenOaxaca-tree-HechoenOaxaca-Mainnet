// src/components/Home.jsx
import React, { useEffect, useState } from "react";
import { useAuthContext } from "./authContext";
import { useNavigate } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import Compra from "./Compra";
import "../index.scss";
import "bootstrap/dist/css/bootstrap.min.css";

const blobToBase64 = (blobArray) => {
  const uint8 = new Uint8Array(blobArray);
  const blob = new Blob([uint8], { type: "image/jpeg" });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

const Home = () => {
  const { actor } = useAuthContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const fetchProducts = async () => {
    if (!actor?.listarProductosActivos) return;

    setLoading(true);
    try {
      const result = await actor.listarProductosActivos();
      if (!Array.isArray(result)) throw new Error("listarProductosActivos no devolvió una lista");

      const productosProcesados = await Promise.all(
        result.map(async (producto) => {
          const imagenBase64 = producto.imagenes[0]
            ? await blobToBase64(producto.imagenes[0])
            : null;
          return {
            ...producto,
            imgUrl: imagenBase64,
          };
        })
      );

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

  const handlePurchase = (product) => {
    setShowModal(false);
    navigate("/compra", { state: { product } });
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
                <Card>
                  {product.imgUrl ? (
                    <Card.Img
                      variant="top"
                      src={product.imgUrl}
                      alt={`Imagen de ${product.nombre}`}
                      style={{ maxHeight: "200px", objectFit: "cover" }}
                    />
                  ) : (
                    <div className="bg-light" style={{ height: "200px" }}>
                      <span className="text-muted">Sin imagen</span>
                    </div>
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
