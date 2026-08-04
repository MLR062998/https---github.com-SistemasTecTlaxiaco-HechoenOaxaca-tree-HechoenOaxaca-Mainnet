// src/components/ProductoDetalle.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Container, Row, Col, Spinner, Alert, Badge } from "react-bootstrap";
import { FaShoppingCart, FaCreditCard, FaArrowLeft, FaExclamationTriangle, FaShieldAlt, FaQrcode } from "react-icons/fa";
import { QRCodeSVG } from "qrcode.react";
import { useAuthContext } from "./authContext";

const ProductoDetalle = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { actor, authState } = useAuthContext();
  
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarQR, setMostrarQR] = useState(false);

  const producto = location.state;

  // ============================================================
  // Agregar al carrito usando el BACKEND
  // ============================================================
  const handleAgregarAlCarrito = async () => {
    if (!producto) {
      setError("Producto no disponible");
      return;
    }

    try {
      console.log("🛒 Agregando producto al carrito (backend):", producto.id);
      const resultado = await actor.agregarAlCarrito(producto.id);
      
      if ("ok" in resultado) {
        alert("✅ Producto agregado al carrito");
        navigate("/carrito");
      } else if ("err" in resultado) {
        const mensaje = traducirError(resultado.err);
        setError(`Error: ${mensaje}`);
      }
    } catch (err) {
      console.error("Error agregando al carrito:", err);
      setError("Error de conexión. Intenta nuevamente.");
    }
  };

  const traducirError = (err) => {
    if (!err) return "Error desconocido";
    if (typeof err === "object") {
      if ("ErrorValidacion" in err) return err.ErrorValidacion;
      if ("StockInsuficiente" in err) return "No hay suficiente stock.";
      if ("ProductoNoExiste" in err) return "El producto ya no está disponible.";
      if ("PermisoDenegado" in err) return "No tienes permiso para agregar este producto.";
      if ("ErrorLedger" in err) return `Error de pago: ${err.ErrorLedger?.mensaje || err.ErrorLedger?.codigo}`;
      if ("ErrorInterno" in err) return "Error interno del sistema.";
    }
    return JSON.stringify(err);
  };

  // ============================================================
  // Compra directa (pasa el producto al checkout)
  // ============================================================
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
      const res = await actor.realizarCompra([producto.id]);
      console.log("📦 Respuesta del backend:", res);

      if (res && "ok" in res) {
        console.log("✅ Compra directa exitosa!");
        // ✅ PASAMOS EL PRODUCTO COMPLETO EN EL STATE
        navigate("/checkout-confirmado", { 
          state: { 
            total: producto.precioICP || (Number(producto.precio || 0) / 100_000_000),
            productos: [producto], // array con el producto
            detalles: res.ok
          } 
        });
      } else if (res && "err" in res) {
        const errorMsg = obtenerMensajeError(res.err);
        console.error("❌ Error en compra directa:", res.err);
        setError(`Error al procesar la compra: ${errorMsg}`);
      } else {
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

  const obtenerMensajeError = (error) => {
    if (!error) return "Error desconocido";
    if (typeof error === 'object') {
      if ('ErrorValidacion' in error) return `Error de validación: ${error.ErrorValidacion}`;
      if ('ErrorLedger' in error) return `Error de pago: ${error.ErrorLedger.mensaje || error.ErrorLedger.codigo}`;
      if ('ProductoNoExiste' in error) return "El producto no existe o no está disponible";
      if ('SaldoInsuficiente' in error) return "Saldo insuficiente para completar la compra";
      if ('PermisoDenegado' in error) return "No tienes permisos para realizar esta compra";
      if ('UsuarioNoExiste' in error) return "Debes estar registrado para realizar compras";
    }
    if (typeof error === 'string') return error;
    return JSON.stringify(error);
  };

  // ============================================================
  // Renderizado
  // ============================================================
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

  const precioICP = producto.precioICP || (Number(producto.precio || 0) / 100_000_000);
  const tieneCertificado = producto.hash && producto.firma;
  const verificarUrl = `${window.location.origin}/verificar/${producto.id}`;

  return (
    <Container className="mt-4">
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
                style={{ maxHeight: "500px", objectFit: "contain", padding: "20px" }}
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
              <div className="d-flex justify-content-between align-items-start mb-3">
                <h1 className="text-primary">{producto.nombre}</h1>
                {tieneCertificado && (
                  <Badge bg="success" className="p-2">
                    <FaShieldAlt className="me-1" /> Certificado
                  </Badge>
                )}
              </div>

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

              <div className="mb-3">
                <h5>👨‍🎨 Artesano</h5>
                <p className="text-muted small">
                  {typeof producto.artesano === 'string' 
                    ? producto.artesano 
                    : 'Artista local de Oaxaca'}
                </p>
              </div>

              {/* Certificado */}
              {tieneCertificado ? (
                <div className="mb-3 p-3 bg-light rounded border">
                  <h5 className="text-success">
                    <FaShieldAlt className="me-2" />
                    Certificado de Autenticidad
                  </h5>
                  <div className="small">
                    <p><strong>Hash:</strong> <code className="text-break">{producto.hash}</code></p>
                    {producto.firma && (
                      <p><strong>Firma digital:</strong> <code className="text-break">{producto.firma}</code></p>
                    )}
                    {producto.certificado && (
                      <p><strong>Certificado:</strong> {producto.certificado}</p>
                    )}
                    {producto.fechaCertificacion && (
                      <p><strong>Fecha de certificación:</strong> {new Date(Number(producto.fechaCertificacion) / 1_000_000).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => setMostrarQR(!mostrarQR)}
                    >
                      <FaQrcode className="me-1" />
                      {mostrarQR ? 'Ocultar QR' : 'Ver QR de verificación'}
                    </Button>
                    {mostrarQR && (
                      <div className="mt-3 d-flex justify-content-center">
                        <QRCodeSVG
                          value={verificarUrl}
                          size={180}
                          level="H"
                          marginSize={2}
                          bgColor="#ffffff"
                          fgColor="#000000"
                        />
                      </div>
                    )}
                    <div className="mt-1 small text-muted">
                      Escanea este código para verificar la autenticidad del producto
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-3 p-3 bg-light rounded border">
                  <h5 className="text-muted">
                    <FaShieldAlt className="me-2" />
                    Sin certificado
                  </h5>
                  <p className="small text-muted mb-0">Este producto no cuenta con certificado de autenticidad.</p>
                </div>
              )}

              {/* Botones */}
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