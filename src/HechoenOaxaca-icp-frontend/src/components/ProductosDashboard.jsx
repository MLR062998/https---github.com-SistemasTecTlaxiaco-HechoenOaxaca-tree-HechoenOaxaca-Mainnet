import React, { useState } from 'react';
import { Card, Button, Modal } from 'react-bootstrap';

const ProductosDashboard = ({ productos, agregarAlCarrito }) => {
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);

  const abrirDetalleProducto = (producto) => {
    setProductoSeleccionado(producto);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setProductoSeleccionado(null);
  };

  return (
    <div className="d-flex flex-wrap gap-3">
      {productos.map((producto) => (
        <Card key={producto.id} style={{ width: '18rem' }}>
          <Card.Body className="card-body">
            <Card.Title>{producto.nombre}</Card.Title>
            <Card.Text>
              <strong>Precio:</strong> ${producto.precio.toFixed(2)}<br />
              {producto.descripcion?.slice(0, 60)}...
            </Card.Text>
            <Button className="btn-primary me-2" onClick={() => abrirDetalleProducto(producto)}>
              Ver más
            </Button>
          </Card.Body>
        </Card>
      ))}

      {/* Modal */}
      <Modal show={mostrarModal} onHide={cerrarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{productoSeleccionado?.nombre}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p><strong>Precio:</strong> ${productoSeleccionado?.precio.toFixed(2)}</p>
          <p><strong>Descripción:</strong> {productoSeleccionado?.descripcion}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrarModal}>Cerrar</Button>
          <Button variant="primary" onClick={() => {
            agregarAlCarrito(productoSeleccionado);
            cerrarModal();
          }}>
            Agregar al carrito
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProductosDashboard;
