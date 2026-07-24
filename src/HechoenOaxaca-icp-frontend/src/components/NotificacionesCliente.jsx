import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";

const NotificacionesCliente = () => {
  const navigate = useNavigate();

  return (
    <div className="notificaciones-cliente text-center py-5">
      <div className="container">
        <div className="alert alert-info" style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h3>🔔 Módulo en construcción</h3>
          <p className="mt-3">
            El sistema de notificaciones estará disponible próximamente.
            Recibirás alertas sobre el estado de tus pedidos y promociones.
          </p>
          <Button 
            variant="primary" 
            onClick={() => navigate("/cliente-dashboard")}
            className="mt-3"
          >
            Volver a mi panel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificacionesCliente;