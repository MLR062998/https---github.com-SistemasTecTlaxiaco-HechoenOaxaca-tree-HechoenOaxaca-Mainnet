import React, { useState } from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import Carousel from 'react-bootstrap/Carousel';
import { useCarrito } from '../context/CarritoContext';
import { processProductImages } from '../utils/imageUtils';
import { useAuthContext } from "./authContext";

const Compra = ({ show, onClose, product, onAddToCart }) => {
  const { agregarAlCarrito } = useCarrito();
  const { isAuthenticated } = useAuthContext();
  const [addingToCart, setAddingToCart] = useState(false);
  const [showAuthAlert, setShowAuthAlert] = useState(false);

  if (!product) return null;

  // ✅ CORREGIDO: Procesar producto para asegurar imágenes correctas
  const productoProcesado = processProductImages(product);
  const precioICP = productoProcesado.precioICP;

  // ✅ FUNCIÓN MEJORADA PARA AGREGAR AL CARRITO
  const handleAddToCart = async () => {
    // Verificar autenticación primero
    if (!isAuthenticated) {
      setShowAuthAlert(true);
      setTimeout(() => setShowAuthAlert(false), 5000);
      return;
    }

    setAddingToCart(true);
    
    try {
      // Si se pasa la prop onAddToCart, usarla (para el modal en ClienteDashboard)
      if (onAddToCart) {
        await onAddToCart(productoProcesado);
      } else {
        // Si no, usar la función del contexto directamente
        await agregarAlCarrito(productoProcesado);
      }
      
      // Cerrar modal después de agregar
      setTimeout(() => {
        setAddingToCart(false);
        onClose();
      }, 500);
      
    } catch (error) {
      console.error('Error agregando al carrito:', error);
      setAddingToCart(false);
    }
  };

  const handleClose = () => {
    setShowAuthAlert(false);
    onClose();
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>🛍️ Detalles del Producto</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* ✅ ALERTA DE AUTENTICACIÓN */}
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
                            // Mostrar placeholder si hay error
                            const placeholder = e.target.parentNode;
                            if (placeholder) {
                              placeholder.innerHTML = `
                                <div class="bg-light d-flex align-items-center justify-content-center text-muted" 
                                     style="height: 250px; width: 100%; border-radius: 10px;">
                                  📷 Imagen no disponible
                                </div>
                              `;
                            }
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
        
        {/* ✅ BOTÓN MEJORADO PARA AGREGAR AL CARRITO */}
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