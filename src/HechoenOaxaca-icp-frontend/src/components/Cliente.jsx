import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HechoenOaxaca_icp_backend } from "../../../declarations/HechoenOaxaca-icp-backend";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import Modal from "react-bootstrap/Modal";
import { FaBell, FaRegMoneyBillAlt, FaShoppingCart } from "react-icons/fa"; // Agregar FaShoppingCart
import "../cliente.scss";

const Cliente = ({ principalId }) => {
  const [productos, setProductos] = useState([]);
  const [historialPedidos, setHistorialPedidos] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPedidoModal, setShowPedidoModal] = useState(false);
  const [pedidoDetalles, setPedidoDetalles] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const productosRes = await HechoenOaxaca_icp_backend.readProductos();
        const pedidosRes = await HechoenOaxaca_icp_backend.getPedidosByCliente(
          principalId
        );
        const perfilRes = await HechoenOaxaca_icp_backend.obtenerPerfil(
          principalId
        );

        setProductos(productosRes);
        setHistorialPedidos(pedidosRes);
        setPerfil(perfilRes);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [principalId]);

  const handleVerDetallesPedido = (pedidoId) => {
    const pedido = historialPedidos.find((p) => p.id === pedidoId);
    setPedidoDetalles(pedido);
    setShowPedidoModal(true);
  };

  return (
    <div className="cliente-dashboard">
      <h2>Bienvenido, Cliente</h2>

      {/* Botones superiores */}
      <div className="botones-superiores" style={{ textAlign: "center", marginBottom: "20px" }}>
        <Button
          className="btn-wallet"
          onClick={() => navigate("/wallet")}
          style={{ margin: "0 10px" }}
        >
          <FaRegMoneyBillAlt size={20} /> Wallet
        </Button>
        <Button
          className="btn-notificaciones"
          onClick={() => navigate("/notificaciones-cliente")}
          style={{ margin: "0 10px" }}
        >
          <FaBell size={20} /> Notificaciones
        </Button>
        <Button
          className="btn-carrito"
          onClick={() => navigate("/carrito")} // Ajusta la ruta según tu necesidad
          style={{ margin: "0 10px" }}
        >
          <FaShoppingCart size={20} /> Carrito
        </Button>
      </div>

      {/* Perfil del cliente */}
      {perfil && (
        <div className="perfil">
          <h4>Mi Perfil</h4>
          <p>
            <strong>Nombre:</strong> {perfil.nombreCompleto}
          </p>
          <p>
            <strong>Teléfono:</strong> {perfil.telefono}
          </p>
          <p>
            <strong>Lugar de Origen:</strong> {perfil.lugarOrigen}
          </p>
        </div>
      )}

      {/* Productos disponibles */}
      <div className="productos-disponibles" style={{ textAlign: "center" }}>
        <h4>Explorar Productos</h4>
        {loading ? (
          <p>Cargando productos...</p>
        ) : (
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Descripción</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr key={producto.id}>
                  <td>{producto.nombre}</td>
                  <td>${producto.precio.toFixed(2)}</td>
                  <td>{producto.descripcion}</td>
                  <td>
                    <Button
                      variant="primary"
                      onClick={() =>
                        navigate(`/producto/${producto.id}`, {
                          state: producto,
                        })
                      }
                    >
                      Ver más
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {/* Historial de pedidos */}
      <div className="historial-pedidos">
        <h4>Mi Historial de Pedidos</h4>
        {loading ? (
          <p>Cargando historial de pedidos...</p>
        ) : historialPedidos.length > 0 ? (
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>ID Pedido</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {historialPedidos.map((pedido) => (
                <tr key={pedido.id}>
                  <td>{pedido.id}</td>
                  <td>{new Date(pedido.fecha).toLocaleDateString()}</td>
                  <td>${pedido.total.toFixed(2)}</td>
                  <td>{pedido.estado}</td>
                  <td>
                    <Button
                      variant="info"
                      onClick={() => handleVerDetallesPedido(pedido.id)}
                    >
                      Ver detalles
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p>No hay pedidos registrados.</p>
        )}
      </div>

      {/* Modal para detalles del pedido */}
      <Modal show={showPedidoModal} onHide={() => setShowPedidoModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Detalles del Pedido</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pedidoDetalles ? (
            <>
              <p>
                <strong>ID Pedido:</strong> {pedidoDetalles.id}
              </p>
              <p>
                <strong>Fecha:</strong>{" "}
                {new Date(pedidoDetalles.fecha).toLocaleDateString()}
              </p>
              <p>
                <strong>Total:</strong> ${pedidoDetalles.total.toFixed(2)}
              </p>
              <p>
                <strong>Estado:</strong> {pedidoDetalles.estado}
              </p>
              <h5>Productos:</h5>
              <ul>
                {pedidoDetalles.productos.map((producto) => (
                  <li key={producto.id}>{producto.nombre}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>No se encontraron detalles para este pedido.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPedidoModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Cliente;