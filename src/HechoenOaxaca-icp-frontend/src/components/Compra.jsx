// src/components/Compra.jsx
import React from 'react';
import { Modal, Button } from 'react-bootstrap';
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
        <p><strong>Artesano:</strong> {product.artesano}</p>
        <p><strong>Descripción:</strong> {product.descripcion}</p>
        <p><strong>Tipo:</strong> {product.tipo}</p>
        <p><strong>Precio:</strong> ICP {product.precio}</p>
        {product.imagenes?.[0] && (
          <img
            src={product.imagenes[0]}
            alt={product.nombre}
            style={{ maxWidth: '100%', borderRadius: 10, marginTop: 10 }}
          />
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
