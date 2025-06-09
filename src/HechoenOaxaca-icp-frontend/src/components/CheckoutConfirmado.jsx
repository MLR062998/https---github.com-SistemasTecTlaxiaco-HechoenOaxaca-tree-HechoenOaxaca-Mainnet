import React from "react";
import { useLocation, Link } from "react-router-dom";
import { Container, Button, Row, Col, Card } from "react-bootstrap";

const CheckoutConfirmado = () => {
  const { state } = useLocation();
  const total = state?.total || 0;

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <Card className="text-center shadow">
            <Card.Body>
              <h2 className="text-success">✅ Compra Exitosa</h2>
              <p className="mt-3">Gracias por tu compra.</p>
              <h5>Total pagado: <strong>{parseFloat(total).toFixed(2)} ICP</strong></h5>
              <Link to="/" className="mt-4 d-inline-block">
                <Button variant="primary">Volver al inicio</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CheckoutConfirmado;
