import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthClient } from "@dfinity/auth-client";
import { Actor } from "@dfinity/agent";
import { HechoenOaxaca_icp_backend } from "../../../declarations/HechoenOaxaca-icp-backend";
import { Button, Card, Form, Alert, Container, Row, Col } from "react-bootstrap";

const Wallet = () => {
  const navigate = useNavigate();
  const [principalId, setPrincipalId] = useState(null);
  const [balance, setBalance] = useState(0);
  const [recargaMonto, setRecargaMonto] = useState(0);
  const [transferirMonto, setTransferirMonto] = useState(0);
  const [destinatarioId, setDestinatarioId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const initAuthClient = async () => {
      const authClient = await AuthClient.create();
      if (authClient.isAuthenticated()) {
        const identity = authClient.getIdentity();
        setPrincipalId(identity.getPrincipal().toText());
        Actor.agentOf(HechoenOaxaca_icp_backend).replaceIdentity(identity);

        // Obtener el saldo real
        const realBalance = await HechoenOaxaca_icp_backend.obtenerSaldo();
        setBalance(realBalance);
      }
    };

    initAuthClient();
  }, []);

  const handleLogin = async () => {
    const authClient = await AuthClient.create();
    const APP_NAME = "Hecho en Oaxaca";
    const APP_LOGO = "/path-to-logo.png";
    const identityProvider = `https://nfid.one/authenticate?applicationName=${APP_NAME}&applicationLogo=${APP_LOGO}`;

    authClient.login({
      identityProvider,
      onSuccess: () => {
        const identity = authClient.getIdentity();
        setPrincipalId(identity.getPrincipal().toText());
        Actor.agentOf(HechoenOaxaca_icp_backend).replaceIdentity(identity);
      },
    });
  };

  const handleRecargarSaldo = async () => {
    if (recargaMonto <= 0) {
      setError("El monto de recarga debe ser mayor que 0.");
      return;
    }

    try {
      await HechoenOaxaca_icp_backend.recargarSaldo(recargaMonto);
      const nuevoSaldo = await HechoenOaxaca_icp_backend.obtenerSaldo();
      setBalance(nuevoSaldo);
      setSuccess(`Recarga exitosa: ${recargaMonto} ICP añadidos.`);
      setError("");
    } catch (err) {
      setError("Error al recargar el saldo. Inténtalo de nuevo.");
      console.error(err);
    }
  };

  const handleTransferirSaldo = async () => {
    if (transferirMonto <= 0 || !destinatarioId) {
      setError("Monto inválido o ID del destinatario vacío.");
      return;
    }

    try {
      await HechoenOaxaca_icp_backend.transferirSaldo(destinatarioId, transferirMonto);
      const nuevoSaldo = await HechoenOaxaca_icp_backend.obtenerSaldo();
      setBalance(nuevoSaldo);
      setSuccess(`Transferencia exitosa: ${transferirMonto} ICP enviados.`);
      setError("");
    } catch (err) {
      setError("Error al transferir el saldo. Verifica el ID del destinatario.");
      console.error(err);
    }
  };

  if (!principalId) {
    return (
      <Container className="mt-5 text-center">
        <h1>Debes iniciar sesión para acceder a la billetera.</h1>
        <Button variant="primary" className="mt-3" onClick={handleLogin}>
          Iniciar Sesión
        </Button>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white">
              <h3>Tu Billetera</h3>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <p className="lead">
                <strong>Principal ID:</strong> {principalId}
              </p>
              <p className="lead">
                <strong>Saldo:</strong> {balance} ICP
              </p>

              {/* Sección de Recarga */}
              <Card className="mb-4">
                <Card.Header>Recargar Saldo</Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Monto a Recargar (ICP)</Form.Label>
                      <Form.Control
                        type="number"
                        value={recargaMonto}
                        onChange={(e) => setRecargaMonto(Number(e.target.value))}
                        min="0"
                      />
                    </Form.Group>
                    <Button variant="success" onClick={handleRecargarSaldo}>
                      Recargar Fondos
                    </Button>
                  </Form>
                </Card.Body>
              </Card>

              {/* Sección de Transferencia */}
              <Card>
                <Card.Header>Transferir Saldo</Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Monto a Transferir (ICP)</Form.Label>
                      <Form.Control
                        type="number"
                        value={transferirMonto}
                        onChange={(e) => setTransferirMonto(Number(e.target.value))}
                        min="0"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>ID del Destinatario</Form.Label>
                      <Form.Control
                        type="text"
                        value={destinatarioId}
                        onChange={(e) => setDestinatarioId(e.target.value)}
                        placeholder="Ingresa el Principal ID del destinatario"
                      />
                    </Form.Group>
                    <Button variant="warning" onClick={handleTransferirSaldo}>
                      Transferir Fondos
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Wallet;