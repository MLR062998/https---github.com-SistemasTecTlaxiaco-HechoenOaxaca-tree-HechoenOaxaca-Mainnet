// src/components/ProductoDetalle.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Container, Row, Col } from "react-bootstrap";
import { useAuthContext } from "./authContext";

const ProductoDetalle = ({ carrito, setCarrito }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { actor } = useAuthContext();

  const producto = location.state;

  const handleAgregarAlCarrito = () => {
    if (!producto) return;
    setCarrito((prev) => [...prev, producto]);
    alert("Producto agregado al carrito");
    navigate("/carrito", { state: { carrito: [...carrito, producto] } });
  };

  const handleCompraDirecta = async () => {
    try {
      const ids = [producto.id];
      const res = await actor.realizarCompra(ids);

      if ("ok" in res) {
        navigate("/checkout-confirmado", { state: { total: producto.precio } });
      } else {
        alert(`❌ Error al comprar: ${res.err}`);
      }
    } catch (err) {
      console.error("❌ Error al procesar compra directa:", err);
      alert("Error inesperado al comprar.");
    }
  };

  if (!producto) {
    return (
      <Container className="mt-5 text-center">
        <p>Producto no encontrado.</p>
        <Button onClick={() => navigate("/")}>Volver al inicio</Button>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Row>
        <Col md={6}>
          {producto.imagenes?.length > 0 && (
            <Card.Img
              src={producto.imagenes[0]}
              alt={producto.nombre}
              style={{ maxHeight: "400px", objectFit: "cover" }}
            />
          )}
        </Col>
        <Col md={6}>
          <h2>{producto.nombre}</h2>
          <p><strong>Descripción:</strong> {producto.descripcion}</p>
          <p><strong>Tipo:</strong> {producto.tipo}</p>
          <p><strong>Precio:</strong> {producto.precio} ICP</p>
          <p><strong>Artesano:</strong> {producto.artesano}</p>
          <div className="d-flex gap-3">
            <Button variant="success" onClick={handleAgregarAlCarrito}>
              Agregar al Carrito
            </Button>
            <Button variant="primary" onClick={handleCompraDirecta}>
              Comprar Ahora
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default ProductoDetalle;
