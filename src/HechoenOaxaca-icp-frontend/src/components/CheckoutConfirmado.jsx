// src/components/CheckoutConfirmado.jsx
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { Container, Button } from "react-bootstrap";

const CheckoutConfirmado = () => {
  const location = useLocation();
  const total = location.state?.total || 0;

  return (
    <Container className="text-center mt-5">
      <h2>✅ Compra completada</h2>
      <p>Gracias por tu compra.</p>
      <p>Total pagado: {total} ICP</p>
      <Link to="/">
        <Button variant="primary">Volver al inicio</Button>
      </Link>
    </Container>
  );
};

export default CheckoutConfirmado;
