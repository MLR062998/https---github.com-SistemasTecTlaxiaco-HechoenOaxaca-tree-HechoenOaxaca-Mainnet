// src/components/CarritoDeCliente.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import { FaTrash, FaShoppingCart } from "react-icons/fa";
import { useAuthContext } from "./authContext";
import { useCarrito } from "../context/CarritoContext";

const CarritoDeCliente = () => {
  const navigate = useNavigate();
  const { actor, authState } = useAuthContext();
  const { carrito, eliminarDelCarrito, vaciarCarrito, total, resumenCarrito } = useCarrito();
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);
  
  // ✅ NUEVO: Estados para modales de confirmación
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [showModalVaciar, setShowModalVaciar] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState(null);

  const procederAlCheckout = async () => {
    if (authState.status !== "authenticated" || !actor) {
      setError("Debes iniciar sesión para proceder con el pago.");
      return;
    }

    if (carrito.length === 0) {
      setError("El carrito está vacío.");
      return;
    }

    setProcesando(true);
    setError("");

    try {
      const ids = carrito.map((producto) => producto.id);
      const respuesta = await actor.realizarCompra(ids);

      if ("ok" in respuesta) {
        vaciarCarrito();
        navigate("/checkout-confirmado", { 
          state: { 
            total: total,
            productos: carrito.length
          } 
        });
      } else {
        console.error("Error al procesar la compra:", respuesta.err);
        setError(`Error al procesar la compra: ${JSON.stringify(respuesta.err)}`);
      }
    } catch (err) {
      console.error("❌ Error al realizar la compra:", err);
      setError("Hubo un error al procesar el pago. Intenta nuevamente.");
    } finally {
      setProcesando(false);
    }
  };

  // ✅ NUEVO: Función para confirmar eliminación de producto
  const confirmarEliminarProducto = (producto) => {
    setProductoAEliminar(producto);
    setShowModalEliminar(true);
  };

  // ✅ NUEVO: Función para ejecutar eliminación después de confirmación
  const ejecutarEliminacion = () => {
    if (productoAEliminar) {
      eliminarDelCarrito(productoAEliminar.id);
      setShowModalEliminar(false);
      setProductoAEliminar(null);
    }
  };

  // ✅ NUEVO: Función para confirmar vaciar carrito
  const confirmarVaciarCarrito = () => {
    setShowModalVaciar(true);
  };

  // ✅ NUEVO: Función para ejecutar vaciado después de confirmación
  const ejecutarVaciarCarrito = () => {
    vaciarCarrito();
    setShowModalVaciar(false);
  };

  // Función segura para formatear precios
  const formatearPrecio = (producto) => {
    try {
      const precioICP = producto.precioICP || (Number(producto.precio || 0) / 100_000_000);
      return precioICP.toFixed(2);
    } catch (error) {
      return "0.00";
    }
  };

  return (
    <div className="carrito-de-cliente container mt-4">
      {/* ✅ MODIFICADO: Botones superiores sin "Volver al Dashboard" */}
      <div className="botones-superiores d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button 
            variant="primary" 
            onClick={() => navigate("/cliente-dashboard")}
            className="me-2"
          >
            <FaShoppingCart className="me-2" />
            Seguir Comprando
          </Button>
        </div>
        
        {carrito.length > 0 && (
          <Button variant="outline-danger" onClick={confirmarVaciarCarrito}>
            🗑️ Vaciar Carrito
          </Button>
        )}
      </div>

      <h2 className="text-center mb-4">🛒 Mi Carrito de Compras</h2>

      {error && (
        <div className="alert alert-danger text-center" role="alert">
          {error}
        </div>
      )}

      {carrito.length === 0 ? (
        <div className="text-center p-5 border rounded bg-light">
          <h4 className="text-muted mb-3">Tu carrito está vacío</h4>
          <p className="text-muted mb-4">No hay productos en tu carrito de compras</p>
          <Button variant="primary" onClick={() => navigate("/cliente-dashboard")}>
            <FaShoppingCart className="me-2" />
            Explorar Productos
          </Button>
        </div>
      ) : (
        <div className="productos-en-carrito">
          {/* Lista de productos en el carrito */}
          {carrito.map((producto) => (
            <Card key={producto.id} className="mb-3 shadow-sm">
              <Card.Body className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3 flex-grow-1">
                  {producto.imagenes?.[0] && (
                    <img
                      src={producto.imagenes[0]}
                      alt={producto.nombre}
                      style={{ 
                        width: "80px", 
                        height: "80px", 
                        objectFit: "cover", 
                        borderRadius: "8px" 
                      }}
                      className="shadow-sm"
                    />
                  )}
                  
                  <div className="flex-grow-1">
                    <Card.Title className="h6 mb-1 text-primary">
                      {producto.nombre}
                    </Card.Title>
                    <Card.Text className="mb-1 text-muted small">
                      {producto.descripcion?.length > 60 
                        ? `${producto.descripcion.substring(0, 60)}...` 
                        : producto.descripcion}
                    </Card.Text>
                    <Card.Text className="mb-0 fw-bold text-success">
                      💰 ICP {formatearPrecio(producto)}
                    </Card.Text>
                  </div>
                  
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => confirmarEliminarProducto(producto)}
                    title="Eliminar del carrito"
                  >
                    <FaTrash />
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ))}
          
          {/* Resumen y checkout */}
          <Card className="mt-4 border-success shadow">
            <Card.Body className="text-center">
              <h4 className="text-success mb-3">📋 Resumen de tu Pedido</h4>
              <div className="row justify-content-center">
                <div className="col-md-6">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Productos en carrito:</span>
                    <strong>{resumenCarrito.totalItems}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span>Total a pagar:</span>
                    <strong className="text-success h5">ICP {total.toFixed(2)}</strong>
                  </div>
                  
                  <Button 
                    variant="success" 
                    size="lg" 
                    onClick={procederAlCheckout}
                    disabled={procesando}
                    className="w-100 mt-3 py-2"
                  >
                    {procesando ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Procesando tu compra...
                      </>
                    ) : (
                      <>
                        💳 Proceder al Pago
                      </>
                    )}
                  </Button>
                  
                  {procesando && (
                    <p className="text-muted mt-2 small">
                      ⏳ Esta operación puede tomar unos segundos...
                    </p>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* ✅ NUEVO: Modal de confirmación para eliminar producto */}
      <Modal show={showModalEliminar} onHide={() => setShowModalEliminar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>🗑️ Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Estás seguro de que deseas eliminar el producto <strong>"{productoAEliminar?.nombre}"</strong> de tu carrito?</p>
          <p className="text-muted small">Esta acción no se puede deshacer.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalEliminar(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={ejecutarEliminacion}>
            <FaTrash className="me-2" />
            Sí, Eliminar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ✅ NUEVO: Modal de confirmación para vaciar carrito */}
      <Modal show={showModalVaciar} onHide={() => setShowModalVaciar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>🚮 Vaciar Carrito</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Estás seguro de que deseas vaciar completamente tu carrito?</p>
          <p className="text-warning">
            <strong>Se eliminarán {carrito.length} producto(s) de tu carrito.</strong>
          </p>
          <p className="text-muted small">Esta acción no se puede deshacer.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalVaciar(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={ejecutarVaciarCarrito}>
            <FaTrash className="me-2" />
            Sí, Vaciar Carrito
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CarritoDeCliente;