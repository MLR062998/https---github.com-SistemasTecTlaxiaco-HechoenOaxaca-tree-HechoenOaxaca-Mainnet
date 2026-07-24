import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";

const Intermediario = () => {
  const navigate = useNavigate();

  return (
    <div className="intermediario-dashboard text-center py-5">
      <div className="container">
        <div className="alert alert-info" style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h3>🚧 Módulo en construcción</h3>
          <p className="mt-3">
            El panel para Intermediarios estará disponible próximamente.
            Esta sección permitirá gestionar entregas y coordinar entre artesanos y clientes.
          </p>
          <Button 
            variant="primary" 
            onClick={() => navigate("/")}
            className="mt-3"
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Intermediario;