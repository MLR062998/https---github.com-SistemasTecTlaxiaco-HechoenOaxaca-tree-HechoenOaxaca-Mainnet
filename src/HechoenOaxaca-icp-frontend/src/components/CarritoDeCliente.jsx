// src/components/CarritoDeCliente.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { FaTrash } from "react-icons/fa";
import { useAuthContext } from "./authContext";
import "../cliente.scss";

const CarritoDeCliente = ({ carrito, setCarrito }) => {
  const navigate = useNavigate();
  const { actor, authState } = useAuthContext();
  const [error, setError] = useState("");

  const eliminarProducto = (id) => {
    const nuevoCarrito = carrito.filter((producto) => producto.id !== id);
    setCarrito(nuevoCarrito);
  };

  const calcularTotal = () => {
    return carrito.reduce((total, producto) => total + producto.precio, 0);
  };

  const procederAlCheckout = async () => {
    if (authState.status !== "authenticated" || !actor) {
      setError("Debes iniciar sesión para proceder con el pago.");
      return;
    }

    try {
      const ids = carrito.map((producto) => producto.id);
      const respuesta = await actor.realizarCompra(ids);

      if ("ok" in respuesta) {
        setCarrito([]);
        navigate("/checkout-confirmado", { state: { total: calcularTotal() } });
      } else {
        console.error("Error al procesar la compra:", respuesta.err);
        setError(`Error al procesar la compra: ${respuesta.err}`);
      }
    } catch (err) {
      console.error("❌ Error al realizar la compra:", err);
      setError("Hubo un error al procesar el pago.");
    }
  };

  return (
    <div className="carrito-de-cliente">
      <h2 className="text-center">Mi Carrito</h2>

      {error && <p className="text-danger text-center">{error}</p>}

      {carrito.length === 0 ? (
        <p className="text-center">Tu carrito está vacío.</p>
      ) : (
        <div className="productos-en-carrito">
          {carrito.map((producto) => (
            <Card key={producto.id} className="mb-3">
              <Card.Body className="d-flex justify-content-between align-items-center">
                <div>
                  <Card.Title>{producto.nombre}</Card.Title>
                  <Card.Text>
                    <strong>Precio:</strong> {producto.precio.toFixed(2)} ICP
                  </Card.Text>
                </div>
                <Button variant="danger" onClick={() => eliminarProducto(producto.id)}>
                  <FaTrash />
                </Button>
              </Card.Body>
            </Card>
          ))}
          <div className="total text-center">
            <h4>Total: {calcularTotal().toFixed(2)} ICP</h4>
            <Button variant="success" onClick={procederAlCheckout}>
              Proceder al Checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarritoDeCliente;
