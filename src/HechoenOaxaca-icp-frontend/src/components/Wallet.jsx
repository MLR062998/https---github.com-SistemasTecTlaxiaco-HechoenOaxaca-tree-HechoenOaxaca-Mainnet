import React, { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "./authContext";
import { createActor } from "declarations/HechoenOaxaca-icp-backend";
import { Principal } from "@dfinity/principal";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import {
  Button,
  Card,
  Form,
  Alert,
  Container,
  Row,
  Col,
  Tab,
  Tabs,
} from "react-bootstrap";

const MySwal = withReactContent(Swal);

const Wallet = () => {
  const { identity, principalId, isAuthenticated } = useAuthContext();
  const [balance, setBalance] = useState(0);
  const [recargaMonto, setRecargaMonto] = useState(0);
  const [destinatarioId, setDestinatarioId] = useState("");
  const [transferirMonto, setTransferirMonto] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("recargar");
  const [ultimoRetiro, setUltimoRetiro] = useState(null);

  const actor = useMemo(() => identity ? createActor({ identity }) : null, [identity]);

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

  // Aquí van handleRecargarSaldo, handleTransferirSaldo y handleRecargaFaucet igual que antes...

  // NUEVO: handleRetirarICP
  const handleRetirarICP = async () => {
    if (!destinatarioId || transferirMonto <= 0) {
      setError("Completa destino y monto válidos.");
      return;
    }
    setError(""); setSuccess("⌛ Procesando retiro...");
    try {
      const e8s = BigInt(Math.round(transferirMonto * 100_000_000));
      const bytes = destinatarioId.match(/.{1,2}/g)?.map((b) => parseInt(b, 16));
      if (!bytes || bytes.length !== 32) {
        setError("Account Identifier inválido.");
        return;
      }
      const result = await actor.retirarICP(bytes, e8s);
      if ("ok" in result) {
        await loadSaldo();
        setSuccess(`✅ Retiro exitoso. BlockHeight: ${result.ok}`);
        setUltimoRetiro({ block: result.ok, fecha: new Date().toLocaleString() });
      } else {
        setError(`❌ Error: ${JSON.stringify(result.err)}`);
      }
    } catch (err) {
      console.error(err);
      setError("❌ Error de red al retirar ICP.");
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
              <div>
                <span className="badge bg-primary me-2">Saldo: {balance} ICP</span>
                <Button size="sm" variant="outline-light" onClick={loadSaldo}>🔄</Button>
              </div>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              <Tabs activeKey={activeTab} onSelect={(k) => { setActiveTab(k); setError(""); setSuccess(""); }} className="mb-3">
                <Tab eventKey="recargar" title="Recargar Saldo">
                  {/* Recarga existente */}
                </Tab>
                <Tab eventKey="transferir" title="Transferir ICP">
                  {/* Transferencia existente */}
                </Tab>

                {/* NUEVO TAB de Retiro */}
                <Tab eventKey="retirar" title="Retirar ICP">
                  <Form className="mt-3">
                    <Form.Group className="mb-3">
                      <Form.Label>Account Identifier destino</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Ej: 2f3b...d7"
                        value={destinatarioId}
                        onChange={(e) => setDestinatarioId(e.target.value)}
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Monto a retirar (ICP)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={transferirMonto}
                        onChange={(e) => setTransferirMonto(Number(e.target.value))}
                      />
                    </Form.Group>
                    <Button variant="danger" onClick={handleRetirarICP}>
                      Retirar ICP
                    </Button>
                  </Form>
                  {ultimoRetiro && (
                    <div className="mt-3 text-muted small">
                      Último retiro: Block #{ultimoRetiro.block} – {ultimoRetiro.fecha}
                    </div>
                  )}
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
