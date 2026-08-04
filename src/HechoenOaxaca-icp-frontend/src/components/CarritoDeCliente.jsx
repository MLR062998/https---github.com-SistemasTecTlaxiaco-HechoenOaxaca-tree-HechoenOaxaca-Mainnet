import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import { FaTrash, FaExclamationTriangle, FaHistory, FaCheckCircle, FaShieldAlt } from "react-icons/fa";
import { Badge } from "react-bootstrap";

import { useAuthContext } from "./authContext";
import PagoQR from "./PagoQR";

const CarritoDeCliente = () => {
  const navigate = useNavigate();
  const { actor, authState } = useAuthContext();

  // Estados para carrito proveniente del backend
  const [carritoItems, setCarritoItems] = useState([]);
  const [productosCarrito, setProductosCarrito] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargandoCarrito, setCargandoCarrito] = useState(false);

  // Estados para errores, procesamiento, modales
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);

  // Modales
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [showModalVaciar, setShowModalVaciar] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState(null);

  // Datos del pago iniciado
  const [pagoIniciado, setPagoIniciado] = useState(null);
  const [showModalPago, setShowModalPago] = useState(false);

  // Historial
  const [transacciones, setTransacciones] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [tabActivo, setTabActivo] = useState("carrito");

  // ============================================================
  // Función para cargar el carrito real desde el backend
  // ============================================================
  const cargarCarrito = useCallback(async () => {
    if (!actor) {
      console.warn("⏳ Actor no disponible, no se puede cargar carrito.");
      return;
    }
    setCargandoCarrito(true);
    try {
      console.log("📞 Obteniendo items del carrito desde el backend...");
      const items = await actor.verCarrito();
      console.log("✅ Items del carrito (raw):", items);

      console.log("📞 Obteniendo lista de productos...");
      const productos = await actor.listarProductos();
      console.log("✅ Productos disponibles (raw):", productos);

      const productosEnCarrito = items
        .map((item) => {
          const producto = productos.find((p) => p.id === item.productoId);
          if (!producto) {
            console.warn(`⚠️ Producto no encontrado para item con ID: ${item.productoId}`);
            return null;
          }
          return {
            ...producto,
            precioSnapshot: item.precioSnapshot,
          };
        })
        .filter(Boolean);

      console.log("✅ Productos en carrito procesados:", productosEnCarrito);

      const totalE8s = productosEnCarrito.reduce((acc, p) => acc + Number(p.precioSnapshot), 0);
      const totalICP = totalE8s / 100_000_000;

      setCarritoItems(items);
      setProductosCarrito(productosEnCarrito);
      setTotal(totalICP);
    } catch (err) {
      console.error("❌ Error al cargar carrito:", err);
      setError("No se pudo cargar el carrito. Intenta más tarde.");
    } finally {
      setCargandoCarrito(false);
    }
  }, [actor]);

  // Recargar carrito al montar y cada vez que cambie el actor
  useEffect(() => {
    cargarCarrito();
  }, [cargarCarrito]);

  // ============================================================
  // Eliminar producto del carrito
  // ============================================================
  const ejecutarEliminacion = async () => {
    if (!productoAEliminar) return;
    setProcesando(true);
    try {
      await actor.quitarDelCarrito(productoAEliminar.id);
      await cargarCarrito();
      setProductoAEliminar(null);
      setShowModalEliminar(false);
    } catch (err) {
      console.error(err);
      setError("No se pudo eliminar el producto.");
    } finally {
      setProcesando(false);
    }
  };

  const ejecutarVaciarCarrito = async () => {
    setProcesando(true);
    try {
      await actor.vaciarCarrito();
      await cargarCarrito();
      setShowModalVaciar(false);
    } catch (err) {
      console.error(err);
      setError("No se pudo vaciar el carrito.");
    } finally {
      setProcesando(false);
    }
  };

  // ============================================================
  // Iniciar compra (checkout) -> muestra QR
  // ============================================================
  const procederAlCheckout = async () => {
    if (authState.status !== "authenticated" || !actor) {
      setError("Debes iniciar sesión.");
      return;
    }
    if (productosCarrito.length === 0) {
      setError("El carrito está vacío.");
      return;
    }
    setProcesando(true);
    setError("");
    try {
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

  // ============================================================
  // Manejo cuando el pago se confirma automáticamente (desde PagoQR)
  // ============================================================
  const handlePagoConfirmado = async () => {
    // Vaciar carrito del backend y recargar estado local
    await actor.vaciarCarrito();
    await cargarCarrito();

    setShowModalPago(false);
    setPagoIniciado(null);

    navigate("/checkout-confirmado", {
      state: {
        total: total,
        productos: productosCarrito,
      },
    });
  };

  // ============================================================
  // Funciones auxiliares
  // ============================================================
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

  const confirmarEliminarProducto = (producto) => {
    setProductoAEliminar(producto);
    setShowModalEliminar(true);
  };

  const formatearPrecio = (producto) => {
    try {
      const precio = Number(producto.precioSnapshot || 0) / 100000000;
      return precio.toFixed(2);
    } catch {
      return "0.00";
    }
  };

  const formatearMonto = (montoE8s) => {
    return (Number(montoE8s) / 100000000).toFixed(2);
  };

  const formatearFecha = (timestamp) => {
    try {
      const fecha = new Date(Number(timestamp) / 1000000);
      return fecha.toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Fecha inválida";
    }
  };

  // Cargar historial
  useEffect(() => {
    const cargarTransacciones = async () => {
      if (!actor) return;
      setCargandoHistorial(true);
      try {
        const resultado = await actor.resumenTransacciones();
        setTransacciones(resultado || []);
      } catch (e) {
        console.error(e);
        setTransacciones([]);
      } finally {
        setCargandoHistorial(false);
      }
    };
    if (tabActivo === "historial") {
      cargarTransacciones();
    }
  }, [actor, tabActivo]);

  // ============================================================
  // Renderizado
  // ============================================================
  return (
    <div className="container mt-4">
      <h2 className="text-center mb-4">🛒 Mi Carrito</h2>

      <Tabs activeKey={tabActivo} onSelect={(k) => setTabActivo(k)} className="mb-4" justify>
        <Tab eventKey="carrito" title={`Carrito (${productosCarrito.length})`}>
          {error && (
            <Alert variant="danger">
              <FaExclamationTriangle className="me-2" />
              {error}
            </Alert>
          )}

          {cargandoCarrito ? (
            <div className="text-center p-5">
              <Spinner animation="border" />
              <p>Cargando carrito...</p>
            </div>
          ) : productosCarrito.length === 0 ? (
            <div className="text-center p-5 border rounded">
              <h4>Tu carrito está vacío</h4>
              <Button onClick={() => navigate("/cliente-dashboard")}>
                Explorar productos
              </Button>
            </div>
          ) : (
            <>
              {productosCarrito.map((producto) => {
                const tieneCertificado = producto.hash && producto.firma;
                return (
                  <Card key={producto.id} className="mb-3">
                    <Card.Body className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <h6 className="mb-0">{producto.nombre}</h6>
                          {tieneCertificado && (
                            <Badge bg="success" className="ms-1">
                              <FaShieldAlt className="me-1" size={10} /> Cert
                            </Badge>
                          )}
                        </div>
                        <p className="text-success">ICP {formatearPrecio(producto)}</p>
                      </div>
                      <Button
                        variant="outline-danger"
                        onClick={() => confirmarEliminarProducto(producto)}
                        disabled={procesando}
                      >
                        <FaTrash />
                      </Button>
                    </Card.Body>
                  </Card>
                );
              })}

              <Card className="mt-4 border-success">
                <Card.Body className="text-center">
                  <h4>Total ICP {total.toFixed(2)}</h4>
                  <Button
                    variant="success"
                    size="lg"
                    disabled={procesando || cargandoCarrito}
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

      {/* Modal eliminar producto */}
      <Modal show={showModalEliminar} onHide={() => setShowModalEliminar(false)}>
        <Modal.Header closeButton>Confirmar eliminación</Modal.Header>
        <Modal.Body>¿Eliminar producto del carrito?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalEliminar(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={ejecutarEliminacion} disabled={procesando}>
            {procesando ? <Spinner size="sm" /> : "Eliminar"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal vaciar carrito */}
      <Modal show={showModalVaciar} onHide={() => setShowModalVaciar(false)}>
        <Modal.Header closeButton>Vaciar carrito</Modal.Header>
        <Modal.Body>¿Seguro que deseas vaciar el carrito?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalVaciar(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={ejecutarVaciarCarrito} disabled={procesando}>
            {procesando ? <Spinner size="sm" /> : "Vaciar"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal pago con QR (automático) */}
      <Modal show={showModalPago} onHide={() => setShowModalPago(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Pago con ICP</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pagoIniciado && (
            <PagoQR
              pago={pagoIniciado}
              actor={actor}
              onConfirmado={handlePagoConfirmado}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalPago(false)}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CarritoDeCliente;