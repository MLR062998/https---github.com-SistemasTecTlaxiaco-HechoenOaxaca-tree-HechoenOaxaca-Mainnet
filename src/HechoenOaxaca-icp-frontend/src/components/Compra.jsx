// src/components/Compra.jsx
import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import Carousel from 'react-bootstrap/Carousel';
import { useCarrito } from '../context/CarritoContext';

const Compra = ({ show, onClose, product }) => {
  const { agregarAlCarrito } = useCarrito();

  if (!product) return null;

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Detalles del Producto</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h4>{product.nombre}</h4>
        <p><strong>Artesano:</strong> {String(product.artesano)}</p>
        <p><strong>Descripción:</strong> {product.descripcion}</p>
        <p><strong>Tipo:</strong> {product.tipo}</p>
        <p><strong>Precio:</strong> ICP {product.precio}</p>
        {product.stock !== undefined && (
          <p><strong>Stock disponible:</strong> {product.stock}</p>
        )}

        {product.imagenes?.length > 0 && (
          <Carousel variant="dark" className="mt-3">
            {product.imagenes.map((img, idx) => (
              <Carousel.Item key={idx}>
                <img
                  className="d-block w-100"
                  src={img}
                  alt={`Imagen ${idx + 1}`}
                  style={{
                    maxHeight: '400px',
                    objectFit: 'contain',
                    borderRadius: 10,
                  }}
                />
              </Carousel.Item>
            ))}
          </Carousel>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        <Button variant="success" onClick={() => agregarAlCarrito(product)}>
          Agregar al Carrito
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default Compra;
