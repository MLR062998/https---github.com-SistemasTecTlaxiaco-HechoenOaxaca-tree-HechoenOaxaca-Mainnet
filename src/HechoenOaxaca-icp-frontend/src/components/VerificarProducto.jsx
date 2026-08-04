// src/components/VerificarProducto.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Container, Card, Spinner, Alert, Badge } from "react-bootstrap";
import { FaShieldAlt, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { HttpAgent, Actor } from "@dfinity/agent";
import { idlFactory } from "declarations/HechoenOaxaca-icp-backend-v2";
import { AnonymousIdentity } from "@dfinity/agent";

const VerificarProducto = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [producto, setProducto] = useState(null);

  const BACKEND_CANISTER_ID =
    import.meta.env.VITE_BACKEND_CANISTER_ID ||
    "2ekj4-4qaaa-aaaae-qj2pq-cai";

  useEffect(() => {
    const verificar = async () => {
      try {
        const agent = new HttpAgent({
          identity: new AnonymousIdentity(),
          host: "https://icp-api.io",
        });

        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
          await agent.fetchRootKey();
        }

        const actor = Actor.createActor(idlFactory, {
          agent,
          canisterId: BACKEND_CANISTER_ID,
        });

        const result = await actor.verificarProducto(id);

        if ("ok" in result) {
          const data = result.ok;
          setProducto({
            id: id,
            valido: data.valido,
            hashGuardado: data.hashGuardado,
            hashCalculado: data.hashCalculado,
            artesano: typeof data.artesano === 'object' && data.artesano.toText
              ? data.artesano.toText()
              : String(data.artesano),
            fecha: data.fecha,
          });
        } else {
          setError("Producto no encontrado o no verificado");
        }
      } catch (err) {
        console.error("Error verificando producto:", err);
        setError("No se pudo conectar con el backend. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    verificar();
  }, [id]);

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Verificando autenticidad del producto...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          <FaTimesCircle className="me-2" />
          {error}
        </Alert>
        <Link to="/" className="btn btn-secondary">
          Volver al inicio
        </Link>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Card className="shadow-lg">
        <Card.Header className="bg-success text-white text-center py-3">
          <h2>
            <FaShieldAlt className="me-2" />
            Verificación de Autenticidad
          </h2>
        </Card.Header>
        <Card.Body className="p-4">
          {producto && (
            <>
              <div className="text-center mb-4">
                {producto.valido ? (
                  <Badge bg="success" className="p-3 fs-5">
                    <FaCheckCircle className="me-2" />
                    ✔ Producto auténtico
                  </Badge>
                ) : (
                  <Badge bg="danger" className="p-3 fs-5">
                    <FaTimesCircle className="me-2" />
                    ✘ Producto no auténtico
                  </Badge>
                )}
              </div>

              <div className="mb-3">
                <h5>ID del producto</h5>
                <code className="text-break">{id}</code>
              </div>

              <div className="mb-3">
                <h5>Hash guardado</h5>
                <code className="text-break">{producto.hashGuardado}</code>
              </div>

              <div className="mb-3">
                <h5>Hash calculado</h5>
                <code className="text-break">{producto.hashCalculado}</code>
              </div>

              <div className="mb-3">
                <h5>Artesano</h5>
                <code className="text-break">{producto.artesano}</code>
              </div>

              {producto.fecha && (
                <div className="mb-3">
                  <h5>Fecha de certificación</h5>
                  <p>
                    {new Date(Number(producto.fecha) / 1_000_000).toLocaleDateString(
                      "es-MX",
                      { year: "numeric", month: "long", day: "numeric" }
                    )}
                  </p>
                </div>
              )}

              <hr />
              <p className="text-muted text-center">
                Este producto ha sido verificado por el sistema de autenticidad de{" "}
                <strong>Hecho en Oaxaca</strong>.
              </p>

              <div className="text-center mt-4">
                <Link to={`/producto/${id}`} className="btn btn-primary me-2">
                  Ver detalle del producto
                </Link>
                <Link to="/" className="btn btn-secondary">
                  Volver al inicio
                </Link>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default VerificarProducto;