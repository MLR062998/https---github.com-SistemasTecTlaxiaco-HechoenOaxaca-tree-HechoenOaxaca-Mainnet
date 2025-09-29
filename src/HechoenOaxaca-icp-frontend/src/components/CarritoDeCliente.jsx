// src/components/CarritoDeCliente.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import { FaTrash, FaShoppingCart, FaExclamationTriangle } from "react-icons/fa";
import { useAuthContext } from "./authContext";
import { useCarrito } from "../context/CarritoContext";

const CarritoDeCliente = () => {
  const navigate = useNavigate();
  const { actor, authState } = useAuthContext();
  const { carrito, eliminarDelCarrito, vaciarCarrito, total, resumenCarrito } = useCarrito();
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [showModalVaciar, setShowModalVaciar] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState(null);

  // ✅ CORREGIDO: Función mejorada con diagnóstico
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
      console.log("🛒 === DIAGNÓSTICO DE COMPRA ===");
      
      // 1. Verificar carrito actual
      console.log("1. Carrito completo:", carrito);
      console.log("2. IDs a enviar:", carrito.map(p => p.id));
      console.log("3. Nombres de productos:", carrito.map(p => p.nombre));
      
      // 2. Obtener productos actuales del backend para comparar
      console.log("4. Obteniendo productos del backend...");
      const productosBackend = await actor.listarProductos();
      console.log("5. Productos en backend:", productosBackend);
      console.log("6. IDs en backend:", productosBackend.map(p => p.id));
      
      // 3. Verificar coincidencias
      const idsBackend = productosBackend.map(p => p.id);
      const idsCarrito = carrito.map(p => p.id);
      
      const coincidencias = idsCarrito.filter(id => idsBackend.includes(id));
      const noCoinciden = idsCarrito.filter(id => !idsBackend.includes(id));
      
      console.log("7. IDs que coinciden:", coincidencias);
      console.log("8. IDs que NO coinciden:", noCoinciden);
      
      if (noCoinciden.length > 0) {
        setError(`Error: Los siguientes productos no existen en el sistema: ${noCoinciden.join(', ')}. Por favor, actualiza la página.`);
        setProcesando(false);
        return;
      }

      if (coincidencias.length === 0) {
        setError("Error: No hay productos válidos para comprar. Tu carrito puede estar desactualizado.");
        setProcesando(false);
        return;
      }

      // 4. Proceder con la compra solo si hay coincidencias
      console.log("9. Iniciando compra con IDs válidos:", coincidencias);
      const resultado = await actor.realizarCompra(coincidencias);
      console.log("10. Respuesta del backend:", resultado);

      if ("ok" in resultado) {
        console.log("✅ Compra exitosa!");
        vaciarCarrito();
        navigate("/checkout-confirmado", { 
          state: { 
            total: total,
            productos: carrito.length,
            detalles: resultado.ok
          } 
        });
      } else {
        const errorMsg = obtenerMensajeError(resultado.err);
        console.error("❌ Error en la compra:", resultado.err);
        setError(`Error al procesar la compra: ${errorMsg}`);
      }
    } catch (err) {
      console.error("❌ Error excepcional en la compra:", err);
      setError(`Error de conexión: ${err.message || "Intenta nuevamente más tarde."}`);
    } finally {
      setProcesando(false);
    }
  };

  // ✅ NUEVO: Función para traducir errores del backend
  const obtenerMensajeError = (error) => {
    if (!error) return "Error desconocido";
    
    if (typeof error === 'object') {
      if ('ErrorValidacion' in error) {
        return `Error de validación: ${error.ErrorValidacion}`;
      }
      if ('ErrorLedger' in error) {
        return `Error de pago: ${error.ErrorLedger.mensaje || error.ErrorLedger.codigo}`;
      }
      if ('ProductoNoExiste' in error) {
        return "Uno o más productos no existen o no están disponibles";
      }
      if ('SaldoInsuficiente' in error) {
        return "Saldo insuficiente para completar la compra";
      }
      if ('PermisoDenegado' in error) {
        return "No tienes permisos para realizar esta compra";
      }
      if ('UsuarioNoExiste' in error) {
        return "Debes estar registrado para realizar compras";
      }
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    return JSON.stringify(error);
  };

  // ✅ Funciones de confirmación
  const confirmarEliminarProducto = (producto) => {
    setProductoAEliminar(producto);
    setShowModalEliminar(true);
  };

  const ejecutarEliminacion = () => {
    if (productoAEliminar) {
      eliminarDelCarrito(productoAEliminar.id);
      setShowModalEliminar(false);
      setProductoAEliminar(null);
    }
  };

  const confirmarVaciarCarrito = () => {
    setShowModalVaciar(true);
  };

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
        <Alert variant="danger" className="text-center">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
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
                    <Alert variant="info" className="mt-2 small">
                      ⏳ Procesando transacción en la blockchain... Esto puede tomar unos segundos.
                    </Alert>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* Modal de confirmación para eliminar producto */}
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

      {/* Modal de confirmación para vaciar carrito */}
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