import React, { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "./authContext";
import { createActor } from "declarations/HechoenOaxaca-icp-backend";
import { Principal } from "@dfinity/principal";
import {
  Button,
  Card,
  Form,
  Alert,
  Container,
  Row,
  Col,
  Tab,
  Tabs
} from "react-bootstrap";

const Wallet = () => {
  const { identity, principalId, isAuthenticated } = useAuthContext();
  const [balance, setBalance] = useState(0);
  const [recargaMonto, setRecargaMonto] = useState(0);
  const [destinatarioId, setDestinatarioId] = useState("");
  const [transferirMonto, setTransferirMonto] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("recargar");

  const actor = useMemo(() => {
    if (!identity) return null;
    return createActor({ identity });
  }, [identity]);

  const loadSaldo = async () => {
    if (!actor) return;
    try {
      const result = await actor.obtenerSaldo();
      setBalance(result);
    } catch (err) {
      console.error("Error al obtener saldo:", err);
    }
  };

  useEffect(() => {
    loadSaldo();
  }, [actor]);

  const isValidPrincipal = (pid) => {
    try {
      Principal.fromText(pid);
      return true;
    } catch {
      return false;
    }
  };

  const handleRecargarSaldo = async () => {
    if (!recargaMonto || recargaMonto <= 0) {
      setError("Monto inválido");
      return;
    }
    try {
      await actor.depositarFondos(recargaMonto);
      await loadSaldo();
      setSuccess(`✅ Recarga exitosa de ${recargaMonto} ICP`);
      setError("");
      setRecargaMonto(0);
    } catch (err) {
      console.error("Error recarga:", err);
      setError("❌ Error al recargar saldo.");
    }
  };

  const handleTransferirSaldo = async () => {
    if (!isValidPrincipal(destinatarioId)) {
      setError("ID de destinatario no válido.");
      return;
    }

    if (!transferirMonto || transferirMonto <= 0) {
      setError("Debes ingresar un monto válido.");
      return;
    }

    try {
      const result = await actor.transferirSaldo(
        Principal.fromText(destinatarioId),
        transferirMonto
      );
      
      if ("ok" in result) {
        await loadSaldo();
        setSuccess(`✅ Transferencia exitosa de ${transferirMonto} ICP`);
        setError("");
        setTransferirMonto(0);
        setDestinatarioId("");
      } else {
        setError(`❌ Error: ${formatError(result.err)}`);
      }
    } catch (err) {
      console.error("Error transferencia:", err);
      setError("❌ Error al realizar la transferencia.");
    }
  };

  const formatError = (err) => {
    switch (err) {
      case "SaldoInsuficiente": return "Saldo insuficiente";
      case "PermisoDenegado": return "No autorizado";
      case "ErrorValidacion": return "Datos inválidos";
      default: return err;
    }
  };

  if (!isAuthenticated) {
    return (
      <Container className="mt-5 text-center">
        <h2>🔒 Debes iniciar sesión para ver tu billetera</h2>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>💳 Tu Billetera</span>
              <span className="badge bg-primary">Saldo: {balance} ICP</span>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
              >
                <Tab eventKey="recargar" title="Recargar Saldo">
                  <Form className="mt-3">
                    <Form.Group className="mb-3">
                      <Form.Label>Monto a recargar (ICP)</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        value={recargaMonto}
                        onChange={(e) => setRecargaMonto(Number(e.target.value))}
                      />
                    </Form.Group>
                    <Button variant="success" onClick={handleRecargarSaldo}>
                      Recargar Saldo
                    </Button>
                  </Form>
                </Tab>
                <Tab eventKey="transferir" title="Transferir ICP">
                  <Form className="mt-3">
                    <Form.Group className="mb-3">
                      <Form.Label>ID del Destinatario</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Ej: xh3fc-3qaaa-aaaak..."
                        value={destinatarioId}
                        onChange={(e) => setDestinatarioId(e.target.value)}
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Monto a transferir (ICP)</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        value={transferirMonto}
                        onChange={(e) => setTransferirMonto(Number(e.target.value))}
                      />
                    </Form.Group>
                    <Button variant="primary" onClick={handleTransferirSaldo}>
                      Transferir ICP
                    </Button>
                  </Form>
                </Tab>
              </Tabs>

              <div className="mt-4">
                <h5>Información de tu cuenta</h5>
                <p><strong>Principal ID:</strong> {principalId}</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Wallet;