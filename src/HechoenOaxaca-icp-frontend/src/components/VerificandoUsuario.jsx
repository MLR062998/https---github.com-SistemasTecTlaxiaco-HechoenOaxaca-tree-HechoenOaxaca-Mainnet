// src/components/VerificandoUsuario.jsx
import React from "react";
import Spinner from "react-bootstrap/Spinner";
import "../index.scss";

const VerificandoUsuario = () => {
  return (
    <div
      className="d-flex flex-column justify-content-start align-items-center"
      style={{ height: "100vh", paddingTop: "5vh" }}
    >
      <Spinner animation="border" variant="primary" style={{ width: "2.5rem", height: "2.5rem" }} />
      <h5 className="mt-3">Verificando identidad de usuario...</h5>
    </div>
  );
};

export default VerificandoUsuario;
