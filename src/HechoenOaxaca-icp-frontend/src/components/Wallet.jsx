// src/components/Wallet.jsx
import React, { useState, useEffect } from "react";
import { useAuthContext } from "./authContext";
import { createActor, canisterId } from "declarations/HechoenOaxaca-icp-backend";
import {
  Button,
  Card,
  Form,
  Alert,
  Container,
  Row,
  Col,
} from "react-bootstrap";

const Wallet = () => {
  const { identity, principalId, isAuthenticated } = useAuthContext();
  const [balance, setBalance] = useState(0);
  const [recargaMonto, setRecargaMonto] = useState(0);
  const [transferirMonto, setTransferirMonto] = useState(0);
  const [destinatarioId, setDestinatarioId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !identity) return;
    const actor = createActor({ identity });
    actor.obtenerSaldo().then(setBalance).catch(console.error);
  }, [identity, isAuthenticated]);

  const actor = useMemo(() => {
    if (!identity) return null;
    return createActor({ identity });
  }, [identity]);

  const handleRecargarSaldo = async () => {
    try {
      await actor.depositarFondos(recargaMonto);
      const nuevoSaldo = await actor.obtenerSaldo();
      setBalance(nuevoSaldo);
      setSuccess(`Recarga exitosa: ${recargaMonto} ICP`);
      setError("");
    } catch (err) {
      setError("Error al recargar saldo.");
    }
  };

  const handleTransferirSaldo = async () => {
    try {
      await actor.agregarSaldo(destinatarioId, transferirMonto);
      const nuevoSaldo = await actor.obtenerSaldo();
      setBalance(nuevoSaldo);
      setSuccess(`Transferencia exitosa: ${transferirMonto} ICP`);
      setError("");
    } catch (err) {
      setError("Error al transferir saldo.");
    }
  };

  if (!isAuthenticated) {
    return (
      <Container className="mt-5 text-center">
        <h2>Debes iniciar sesión para ver tu billetera</h2>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow">
            <Card.Header>Tu Billetera</Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              <p><strong>ID:</strong> {principalId}</p>
              <p><strong>Saldo:</strong> {balance} ICP</p>

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Monto a Recargar</Form.Label>
                  <Form.Control
                    type="number"
                    value={recargaMonto}
                    onChange={(e) => setRecargaMonto(Number(e.target.value))}
                  />
                  <Button className="mt-2" onClick={handleRecargarSaldo}>
                    Recargar
                  </Button>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Monto a Transferir</Form.Label>
                  <Form.Control
                    type="number"
                    value={transferirMonto}
                    onChange={(e) => setTransferirMonto(Number(e.target.value))}
                  />
                  <Form.Label>ID Destinatario</Form.Label>
                  <Form.Control
                    type="text"
                    value={destinatarioId}
                    onChange={(e) => setDestinatarioId(e.target.value)}
                  />
                  <Button className="mt-2" variant="warning" onClick={handleTransferirSaldo}>
                    Transferir
                  </Button>
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Wallet;
