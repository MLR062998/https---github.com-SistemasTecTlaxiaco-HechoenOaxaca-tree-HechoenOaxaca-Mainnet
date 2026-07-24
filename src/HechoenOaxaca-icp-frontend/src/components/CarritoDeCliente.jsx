import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import Form from "react-bootstrap/Form";
import { FaTrash, FaShoppingCart, FaExclamationTriangle, FaHistory, FaCheckCircle, FaCopy } from "react-icons/fa";

import { useAuthContext } from "./authContext";
import { useCarrito } from "../context/CarritoContext";

const CarritoDeCliente = () => {
  const navigate = useNavigate();
  const { actor, authState } = useAuthContext();
  const { carrito, eliminarDelCarrito, vaciarCarrito, total, resumenCarrito } = useCarrito();

  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  // Modales
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [showModalVaciar, setShowModalVaciar] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState(null);

  // Datos del pago iniciado
  const [pagoIniciado, setPagoIniciado] = useState(null); // { pagoId, montoTotal, accountIdCanister, memo }
  const [showModalPago, setShowModalPago] = useState(false);
  const [blockHeight, setBlockHeight] = useState("");

  // Historial
  const [transacciones, setTransacciones] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [tabActivo, setTabActivo] = useState("carrito");

  // Cargar historial de transacciones (resumenTransacciones)
  useEffect(() => {
    const cargarTransacciones = async () => {
      if (!actor) return;
      setCargandoHistorial(true);
      try {
        const resultado = await actor.resumenTransacciones();
        // El backend devuelve un array de transacciones directamente (no es Result)
        setTransacciones(resultado || []);
      } catch (e) {
        console.error("Error cargando transacciones:", e);
        setTransacciones([]);
      } finally {
        setCargandoHistorial(false);
      }
    };

    if (tabActivo === "historial") {
      cargarTransacciones();
    }
  }, [actor, tabActivo]);

  // Iniciar compra (checkout)
  const procederAlCheckout = async () => {
    if (authState.status !== "authenticated" || !actor) {
      setError("Debes iniciar sesión.");
      return;
    }
    if (carrito.length === 0) {
      setError("El carrito está vacío.");
      return;
    }
    setProcesando(true);
    setError("");

    try {
      // Llamar a iniciarCompra (sin parámetros)
      const resultado = await actor.iniciarCompra();
      if ("ok" in resultado) {
        const pago = resultado.ok;
        setPagoIniciado(pago);
        setShowModalPago(true);
      } else {
        setError(traducirError(resultado.err));
      }
    } catch (e) {
      console.error(e);
      setError("Error de conexión con la blockchain.");
    } finally {
      setProcesando(false);
    }
  };

  // Confirmar pago (después de que el usuario pagó desde su wallet)
  const confirmarPago = async () => {
    if (!pagoIniciado) return;
    const height = Number(blockHeight);
    if (isNaN(height) || height <= 0) {
      setError("Ingresa un número de bloque válido.");
      return;
    }
    setConfirmando(true);
    setError("");
    try {
      const resultado = await actor.confirmarPago(pagoIniciado.pagoId, BigInt(height));
      if ("ok" in resultado) {
        // Éxito: vaciar carrito local y navegar
        vaciarCarrito();
        setShowModalPago(false);
        setPagoIniciado(null);
        setBlockHeight("");
        navigate("/checkout-confirmado", {
          state: {
            total,
            productos: carrito.length,
            detalles: resultado.ok
          }
        });
      } else {
        setError(traducirError(resultado.err));
      }
    } catch (e) {
      console.error(e);
      setError("Error confirmando pago.");
    } finally {
      setConfirmando(false);
    }
  };

  const traducirError = (err) => {
    if (!err) return "Error desconocido";
    if (typeof err === "object") {
      if ("SaldoInsuficiente" in err) return "Saldo insuficiente.";
      if ("ProductoNoExiste" in err) return "Producto no disponible.";
      if ("StockInsuficiente" in err) return "No hay suficiente stock.";
      if ("UsuarioNoExiste" in err) return "Debes registrarte.";
      if ("PermisoDenegado" in err) return "Permiso denegado.";
      if ("ErrorValidacion" in err) return err.ErrorValidacion;
      if ("ErrorInterno" in err) return "Error interno del sistema.";
    }
    return JSON.stringify(err);
  };

  // Copiar texto al portapapeles
  const copiarAlPortapapeles = (texto) => {
    navigator.clipboard.writeText(texto);
    alert("Copiado al portapapeles");
  };

  const confirmarEliminarProducto = (producto) => {
    setProductoAEliminar(producto);
    setShowModalEliminar(true);
  };

  const ejecutarEliminacion = () => {
    if (!productoAEliminar) return;
    eliminarDelCarrito(productoAEliminar.id);
    setProductoAEliminar(null);
    setShowModalEliminar(false);
  };

  const ejecutarVaciarCarrito = () => {
    vaciarCarrito();
    setShowModalVaciar(false);
  };

  const formatearPrecio = (producto) => {
    try {
      const precio = Number(producto.precio || 0) / 100000000;
      return precio.toFixed(2);
    } catch {
      return "0.00";
    }
  };

  const formatearFecha = (timestamp) => {
    try {
      const fecha = new Date(Number(timestamp) / 1000000);
      return fecha.toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "Fecha inválida";
    }
  };

  const formatearMonto = (montoE8s) => {
    return (Number(montoE8s) / 100000000).toFixed(2);
  };

  return (
    <div className="container mt-4">
      <h2 className="text-center mb-4">🛒 Mi Carrito</h2>

      <Tabs
        activeKey={tabActivo}
        onSelect={(k) => setTabActivo(k)}
        className="mb-4"
        justify
      >
        <Tab eventKey="carrito" title={`Carrito (${carrito.length})`}>
          {error && (
            <Alert variant="danger">
              <FaExclamationTriangle className="me-2" />
              {error}
            </Alert>
          )}

          {carrito.length === 0 ? (
            <div className="text-center p-5 border rounded">
              <h4>Tu carrito está vacío</h4>
              <Button onClick={() => navigate("/cliente-dashboard")}>
                Explorar productos
              </Button>
            </div>
          ) : (
            <>
              {carrito.map((producto) => (
                <Card key={producto.id} className="mb-3">
                  <Card.Body className="d-flex justify-content-between">
                    <div>
                      <h6>{producto.nombre}</h6>
                      <p className="text-success">
                        ICP {formatearPrecio(producto)}
                      </p>
                    </div>
                    <Button
                      variant="outline-danger"
                      onClick={() => confirmarEliminarProducto(producto)}
                    >
                      <FaTrash />
                    </Button>
                  </Card.Body>
                </Card>
              ))}

              <Card className="mt-4 border-success">
                <Card.Body className="text-center">
                  <h4>Total ICP {total.toFixed(2)}</h4>
                  <Button
                    variant="success"
                    size="lg"
                    disabled={procesando}
                    onClick={procederAlCheckout}
                  >
                    {procesando ? <Spinner size="sm" /> : "Proceder al pago"}
                  </Button>
                </Card.Body>
              </Card>
            </>
          )}
        </Tab>

        <Tab eventKey="historial" title={`Historial (${transacciones.length})`}>
          {cargandoHistorial ? (
            <div className="text-center p-5">
              <Spinner />
            </div>
          ) : transacciones.length === 0 ? (
            <div className="text-center p-5 border rounded">
              <h4>No hay transacciones aún</h4>
            </div>
          ) : (
            transacciones.map((tx) => (
              <Card key={tx.id} className="mb-3">
                <Card.Header>
                  <div className="d-flex justify-content-between">
                    <span>
                      <FaHistory className="me-2" />
                      {tx.estado === "Pagado" ? (
                        <FaCheckCircle className="text-success me-2" />
                      ) : null}
                      {tx.estado || "Transacción"}
                    </span>
                    <small>{formatearFecha(tx.fecha)}</small>
                  </div>
                </Card.Header>
                <Card.Body>
                  <p>
                    <strong>Monto:</strong> ICP {formatearMonto(tx.monto)}
                  </p>
                  <p>
                    <strong>Vendedor:</strong> {tx.vendedor.toString().slice(0, 8)}...
                  </p>
                  <p>
                    <strong>Productos:</strong> {tx.productoIds?.length || 1} artículo(s)
                  </p>
                  {tx.blockHeight && (
                    <p>
                      <strong>Bloque:</strong> {tx.blockHeight.toString()}
                    </p>
                  )}
                </Card.Body>
              </Card>
            ))
          )}
        </Tab>
      </Tabs>

      {/* Modal para eliminar producto */}
      <Modal show={showModalEliminar} onHide={() => setShowModalEliminar(false)}>
        <Modal.Header closeButton>Confirmar eliminación</Modal.Header>
        <Modal.Body>¿Eliminar producto del carrito?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalEliminar(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={ejecutarEliminacion}>
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para vaciar carrito */}
      <Modal show={showModalVaciar} onHide={() => setShowModalVaciar(false)}>
        <Modal.Header closeButton>Vaciar carrito</Modal.Header>
        <Modal.Body>¿Seguro que deseas vaciar el carrito?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalVaciar(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={ejecutarVaciarCarrito}>
            Vaciar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para mostrar datos del pago y confirmar */}
      <Modal show={showModalPago} onHide={() => setShowModalPago(false)} size="lg">
        <Modal.Header closeButton>Pago iniciado</Modal.Header>
        <Modal.Body>
          <p>Realiza la transferencia desde tu wallet:</p>
          <div className="bg-light p-3 rounded mb-3">
            <p><strong>Cuenta del canister:</strong></p>
            <div className="d-flex align-items-center">
              <code className="flex-grow-1 text-break">{pagoIniciado?.accountIdCanister}</code>
              <Button
                variant="outline-secondary"
                size="sm"
                className="ms-2"
                onClick={() => copiarAlPortapapeles(pagoIniciado?.accountIdCanister)}
              >
                <FaCopy />
              </Button>
            </div>
          </div>
          <div className="bg-light p-3 rounded mb-3">
            <p><strong>Monto total:</strong> ICP {formatearMonto(pagoIniciado?.montoTotal)}</p>
            <p><strong>Memo:</strong> {pagoIniciado?.memo}</p>
          </div>
          <p className="text-muted">
            Después de enviar los ICP, ingresa el número de bloque (block height) de la transacción:
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Block Height</Form.Label>
            <Form.Control
              type="number"
              placeholder="Ejemplo: 12345678"
              value={blockHeight}
              onChange={(e) => setBlockHeight(e.target.value)}
            />
          </Form.Group>
          {error && <Alert variant="danger">{error}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalPago(false)}>
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={confirmarPago}
            disabled={confirmando || !blockHeight}
          >
            {confirmando ? <Spinner size="sm" /> : "Confirmar pago"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CarritoDeCliente;