import React, { useState } from 'react';
import { Modal, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import Carousel from 'react-bootstrap/Carousel';
import { QRCodeSVG } from 'qrcode.react';
import { FaShieldAlt, FaQrcode } from 'react-icons/fa';
import { processProductImages } from '../utils/imageUtils';
import { useAuthContext } from "./authContext";

const Compra = ({ show, onClose, product, onAddToCart }) => {
  const { actor, isAuthenticated } = useAuthContext();
  const [addingToCart, setAddingToCart] = useState(false);
  const [showAuthAlert, setShowAuthAlert] = useState(false);
  const [mostrarQR, setMostrarQR] = useState(false);

  if (!product) return null;

  // ✅ Procesar producto para asegurar imágenes correctas
  const productoProcesado = processProductImages(product);
  const precioICP = productoProcesado.precioICP;
  const tieneCertificado = productoProcesado.hash && productoProcesado.firma;

  // ✅ FUNCIÓN MEJORADA PARA AGREGAR AL CARRITO (usando backend)
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      setShowAuthAlert(true);
      setTimeout(() => setShowAuthAlert(false), 5000);
      return;
    }

    setAddingToCart(true);
    
    try {
      // 🔥 Usar el backend directamente (no el contexto)
      const resultado = await actor.agregarAlCarrito(productoProcesado.id);
      
      if ("ok" in resultado) {
        // Si se pasa onAddToCart, llamarlo (por compatibilidad)
        if (onAddToCart) {
          await onAddToCart(productoProcesado);
        }
        setTimeout(() => {
          setAddingToCart(false);
          onClose();
          alert("✅ Producto agregado al carrito");
        }, 500);
      } else if ("err" in resultado) {
        const mensaje = traducirError(resultado.err);
        alert(`❌ ${mensaje}`);
        setAddingToCart(false);
      }
    } catch (error) {
      console.error('Error agregando al carrito:', error);
      alert("Error de conexión. Intenta nuevamente.");
      setAddingToCart(false);
    }
  };

  const traducirError = (err) => {
    if (!err) return "Error desconocido";
    if (typeof err === "object") {
      if ("ErrorValidacion" in err) return err.ErrorValidacion;
      if ("StockInsuficiente" in err) return "No hay suficiente stock.";
      if ("ProductoNoExiste" in err) return "El producto ya no está disponible.";
      if ("PermisoDenegado" in err) return "No tienes permiso.";
    }
    return JSON.stringify(err);
  };

  const handleClose = () => {
    setShowAuthAlert(false);
    setMostrarQR(false);
    onClose();
  };

  // URL para el QR (página de verificación pública)
  const verificarUrl = `${window.location.origin}/verificar/${productoProcesado.id}`;

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          🛍️ Detalles del Producto
          {tieneCertificado && (
            <Badge bg="success" className="ms-2">
              <FaShieldAlt className="me-1" /> Certificado
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* ALERTA DE AUTENTICACIÓN */}
        {showAuthAlert && (
          <Alert variant="warning" className="mb-3">
            <Alert.Heading>¡Inicia sesión!</Alert.Heading>
            <p>Debes iniciar sesión para agregar productos al carrito.</p>
            <hr />
            <div className="d-flex gap-2">
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => window.location.href = '/'}
              >
                Iniciar Sesión
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setShowAuthAlert(false)}
              >
                Cerrar
              </Button>
            </div>
          </Alert>
        )}

        <div className="row">
          <div className="col-md-6">
            <h4 className="text-primary">{productoProcesado.nombre}</h4>
            <p><strong>📝 Descripción:</strong> {productoProcesado.descripcion}</p>
            <p><strong>📦 Tipo:</strong> {productoProcesado.tipo}</p>
            <p><strong>🏷️ Precio:</strong> 
              <span className="fw-bold text-success h5 ms-2">
                ICP {precioICP?.toFixed(2) || '0.00'}
              </span>
            </p>
            
            {productoProcesado.cantidadDisponible !== undefined && (
              <p>
                <strong>📊 Disponible:</strong> 
                <span className={`fw-bold ms-2 ${
                  productoProcesado.cantidadDisponible > 0 ? 'text-success' : 'text-danger'
                }`}>
                  {productoProcesado.cantidadDisponible} unidades
                </span>
              </p>
            )}

            {/* 🔥 SECCIÓN DE CERTIFICADO DE AUTENTICIDAD */}
            {tieneCertificado ? (
              <div className="mt-3 p-2 bg-light rounded border">
                <h6 className="text-success">
                  <FaShieldAlt className="me-2" />
                  Certificado de Autenticidad
                </h6>
                <div className="small">
                  <p><strong>Hash:</strong> <code className="text-break">{productoProcesado.hash}</code></p>
                  {productoProcesado.firma && (
                    <p><strong>Firma digital:</strong> <code className="text-break">{productoProcesado.firma}</code></p>
                  )}
                  {productoProcesado.certificado && (
                    <p><strong>Certificado:</strong> {productoProcesado.certificado}</p>
                  )}
                  {productoProcesado.fechaCertificacion && (
                    <p><strong>Fecha de certificación:</strong> {new Date(Number(productoProcesado.fechaCertificacion) / 1_000_000).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  )}
                </div>

                {/* QR */}
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
                    <div className="mt-2 d-flex justify-content-center">
                      <QRCodeSVG
                        value={verificarUrl}
                        size={150}
                        level="H"
                        marginSize={2}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-muted small">
                <FaShieldAlt className="me-1" /> Este producto no cuenta con certificado de autenticidad.
              </div>
            )}
          </div>

          <div className="col-md-6">
            {productoProcesado.imagenes && productoProcesado.imagenes.length > 0 ? (
              <div className="mt-3">
                <h6>🖼️ Imágenes del producto:</h6>
                <Carousel variant="dark" interval={null} indicators={productoProcesado.imagenes.length > 1}>
                  {productoProcesado.imagenes.map((src, idx) => (
                    <Carousel.Item key={idx}>
                      <div className="d-flex justify-content-center">
                        <img
                          src={src}
                          alt={`Imagen ${idx + 1} de ${productoProcesado.nombre}`}
                          style={{
                            maxHeight: '250px',
                            maxWidth: '100%',
                            objectFit: 'contain',
                            borderRadius: '10px',
                            border: '1px solid #dee2e6'
                          }}
                          onError={(e) => {
                            console.error(`Error loading image ${idx}:`, src);
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    </Carousel.Item>
                  ))}
                </Carousel>
              </div>
            ) : (
              <div className="text-center text-muted mt-3 p-4 border rounded">
                <div className="bg-light d-flex align-items-center justify-content-center" 
                     style={{ height: '200px', borderRadius: '10px' }}>
                  <div>
                    <p className="h1">📷</p>
                    <p>No hay imágenes disponibles para este producto</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={addingToCart}>
          ✕ Cerrar
        </Button>
        
        <Button 
          variant="success" 
          onClick={handleAddToCart}
          disabled={addingToCart || (productoProcesado.cantidadDisponible !== undefined && productoProcesado.cantidadDisponible <= 0)}
          className="d-flex align-items-center gap-2"
        >
          {addingToCart ? (
            <>
              <Spinner animation="border" size="sm" />
              Agregando...
            </>
          ) : (
            <>
              🛒 Agregar al Carrito
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default Compra;