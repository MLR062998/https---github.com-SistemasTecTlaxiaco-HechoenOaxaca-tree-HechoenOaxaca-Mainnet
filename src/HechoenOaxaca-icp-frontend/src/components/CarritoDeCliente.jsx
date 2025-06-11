// src/components/CarritoDeCliente.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { FaTrash, FaArrowLeft } from "react-icons/fa";
import { useAuthContext } from "./authContext";
import { useCarrito } from "../context/CarritoContext";
import "../cliente.scss";

const CarritoDeCliente = () => {
  const navigate = useNavigate();
  const { actor, authState } = useAuthContext();
  const { carrito, eliminarDelCarrito, vaciarCarrito, total, setCarrito } = useCarrito();
  const [error, setError] = useState("");

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
        localStorage.removeItem("carrito");
        navigate("/checkout-confirmado", { state: { total } });
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
      <div className="botones-superiores d-flex justify-content-between align-items-center">
        <Button className="btn-carrito" onClick={() => navigate("/cliente-dashboard")}> <FaArrowLeft /> Volver al Dashboard </Button>
        {carrito.length > 0 && (
          <Button variant="outline-danger" onClick={vaciarCarrito}>
            Vaciar Carrito
          </Button>
        )}
      </div>

      <h2 className="text-center">Mi Carrito</h2>

      {error && <p className="text-danger text-center">{error}</p>}

      {carrito.length === 0 ? (
        <p className="text-center">Tu carrito está vacío.</p>
      ) : (
        <div className="productos-en-carrito">
          {carrito.map((producto) => (
            <Card key={producto.id} className="mb-3">
              <Card.Body className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  {producto.imagenes?.[0] && (
                    <img
                      src={producto.imagenes[0]}
                      alt={producto.nombre}
                      style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: 8 }}
                    />
                  )}
                  <div>
                    <Card.Title>{producto.nombre}</Card.Title>
                    <Card.Text>
                      <strong>Precio:</strong> {producto.precio?.toFixed(2)} ICP
                    </Card.Text>
                  </div>
                </div>
                <Button variant="danger" onClick={() => eliminarDelCarrito(producto.id)}>
                  <FaTrash />
                </Button>
              </Card.Body>
            </Card>
          ))}
          <div className="total text-center mt-4">
            <h4>Total: {total.toFixed(2)} ICP</h4>
            <h6>{carrito.length} producto(s)</h6>
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
