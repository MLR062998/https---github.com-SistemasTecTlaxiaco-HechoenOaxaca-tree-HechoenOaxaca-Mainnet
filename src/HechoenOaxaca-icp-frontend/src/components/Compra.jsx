import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import Carousel from 'react-bootstrap/Carousel';
import { useCarrito } from '../context/CarritoContext';
import { processProductImages } from '../utils/imageUtils';

const Compra = ({ show, onClose, product }) => {
  const { agregarAlCarrito } = useCarrito();

  if (!product) return null;

  // ✅ CORREGIDO: Procesar producto para asegurar imágenes correctas
  const productoProcesado = processProductImages(product);
  const precioICP = productoProcesado.precioICP;

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Detalles del Producto</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h4>{productoProcesado.nombre}</h4>
        <p><strong>Descripción:</strong> {productoProcesado.descripcion}</p>
        <p><strong>Tipo:</strong> {productoProcesado.tipo}</p>
        <p><strong>Precio:</strong> ICP {precioICP.toFixed(2)}</p>

        {productoProcesado.imagenes && productoProcesado.imagenes.length > 0 ? (
          <div className="mt-3">
            <h6>Imágenes del producto:</h6>
            <Carousel variant="dark" interval={null}>
              {productoProcesado.imagenes.map((src, idx) => (
                <Carousel.Item key={idx}>
                  <div className="d-flex justify-content-center">
                    <img
                      src={src}
                      alt={`Imagen ${idx + 1} de ${productoProcesado.nombre}`}
                      style={{
                        maxHeight: '300px',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        borderRadius: '10px',
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
            <p>No hay imágenes disponibles para este producto</p>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        <Button 
          variant="success" 
          onClick={() => {
            agregarAlCarrito(productoProcesado);
            onClose();
          }}
        >
          Agregar al Carrito
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default Compra;