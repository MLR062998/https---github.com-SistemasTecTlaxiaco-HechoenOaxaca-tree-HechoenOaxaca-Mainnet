// src/components/ProductoDetalle.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Container, Row, Col, Spinner, Alert } from "react-bootstrap";
import { FaShoppingCart, FaCreditCard, FaArrowLeft, FaExclamationTriangle } from "react-icons/fa";
import { useAuthContext } from "./authContext";
import { useCarrito } from "../context/CarritoContext";

const ProductoDetalle = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { actor, authState } = useAuthContext();
  const { agregarAlCarrito } = useCarrito();
  
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  const producto = location.state;

  // ✅ CORREGIDO: Función mejorada para agregar al carrito
  const handleAgregarAlCarrito = () => {
    if (!producto) {
      setError("Producto no disponible");
      return;
    }
    
    try {
      // ✅ Asegurar que el producto tenga precioICP
      const productoConPrecio = {
        ...producto,
        precioICP: producto.precioICP || (Number(producto.precio || 0) / 100_000_000)
      };
      
      agregarAlCarrito(productoConPrecio);
      setError("");
      alert("✅ Producto agregado al carrito");
      navigate("/carrito");
    } catch (err) {
      console.error("Error agregando al carrito:", err);
      setError("Error al agregar producto al carrito");
    }
  };

  // ✅ CORREGIDO: Función mejorada para compra directa
  const handleCompraDirecta = async () => {
    if (!producto) {
      setError("Producto no disponible");
      return;
    }

    if (authState.status !== "authenticated" || !actor) {
      setError("Debes iniciar sesión para realizar una compra");
      return;
    }

    setProcesando(true);
    setError("");

    try {
      console.log("🛒 Iniciando compra directa del producto:", producto.id);
      const ids = [producto.id];
      
      const res = await actor.realizarCompra(ids);
      console.log("📦 Respuesta del backend:", res);

      // ✅ MEJORADO: Manejo robusto de la respuesta
      if (res && "ok" in res) {
        // ✅ Compra exitosa
        console.log("✅ Compra directa exitosa!");
        navigate("/checkout-confirmado", { 
          state: { 
            total: producto.precioICP || (Number(producto.precio || 0) / 100_000_000),
            productos: 1,
            detalles: res.ok
          } 
        });
      } else if (res && "err" in res) {
        // ✅ Error explícito del backend
        const errorMsg = obtenerMensajeError(res.err);
        console.error("❌ Error en compra directa:", res.err);
        setError(`Error al procesar la compra: ${errorMsg}`);
      } else {
        // ✅ Respuesta inesperada
        console.error("⚠️ Respuesta inesperada del backend:", res);
        setError("Respuesta inesperada del sistema. Intenta nuevamente.");
      }
    } catch (err) {
      console.error("❌ Error excepcional en compra directa:", err);
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
        return "El producto no existe o no está disponible";
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

  if (!producto) {
    return (
      <Container className="mt-5 text-center">
        <Alert variant="warning">
          <FaExclamationTriangle className="me-2" />
          Producto no encontrado
        </Alert>
        <Button onClick={() => navigate("/cliente-dashboard")} className="mt-3">
          <FaArrowLeft className="me-2" />
          Volver al Dashboard
        </Button>
      </Container>
    );
  }

  // ✅ Calcular precio seguro
  const precioICP = producto.precioICP || (Number(producto.precio || 0) / 100_000_000);

  return (
    <Container className="mt-4">
      {/* Botón de volver */}
      <Button 
        variant="outline-secondary" 
        onClick={() => navigate("/cliente-dashboard")}
        className="mb-4"
      >
        <FaArrowLeft className="me-2" />
        Volver al Dashboard
      </Button>

      {error && (
        <Alert variant="danger" className="mb-4">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}

      <Row>
        {/* Columna de imagen */}
        <Col md={6}>
          <Card className="shadow-sm">
            {producto.imagenes?.length > 0 ? (
              <Card.Img
                variant="top"
                src={producto.imagenes[0]}
                alt={producto.nombre}
                style={{ 
                  maxHeight: "500px", 
                  objectFit: "contain",
                  padding: "20px"
                }}
              />
            ) : (
              <div className="text-center p-5 bg-light">
                <span className="text-muted">📷 Sin imagen disponible</span>
              </div>
            )}
          </Card>
        </Col>

        {/* Columna de información */}
        <Col md={6}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="d-flex flex-column">
              <h1 className="text-primary mb-3">{producto.nombre}</h1>
              
              <div className="mb-3">
                <h5>📖 Descripción</h5>
                <p className="text-muted">{producto.descripcion}</p>
              </div>

              <div className="mb-3">
                <h5>🏷️ Categoría</h5>
                <span className="badge bg-info">{producto.tipo}</span>
              </div>

              <div className="mb-3">
                <h5>💰 Precio</h5>
                <h3 className="text-success">ICP {precioICP.toFixed(2)}</h3>
              </div>

              <div className="mb-4">
                <h5>👨‍🎨 Artesano</h5>
                <p className="text-muted small">
                  {typeof producto.artesano === 'string' 
                    ? producto.artesano 
                    : 'Artista local de Oaxaca'}
                </p>
              </div>

              {/* Botones de acción */}
              <div className="mt-auto d-grid gap-3">
                <Button 
                  variant="success" 
                  size="lg" 
                  onClick={handleAgregarAlCarrito}
                  disabled={procesando}
                  className="d-flex align-items-center justify-content-center"
                >
                  <FaShoppingCart className="me-2" />
                  Agregar al Carrito
                </Button>
                
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={handleCompraDirecta}
                  disabled={procesando}
                  className="d-flex align-items-center justify-content-center"
                >
                  {procesando ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <FaCreditCard className="me-2" />
                      Comprar Ahora
                    </>
                  )}
                </Button>
              </div>

              {procesando && (
                <Alert variant="info" className="mt-3 small">
                  ⏳ Procesando tu compra... Esto puede tomar unos segundos.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProductoDetalle;