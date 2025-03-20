import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory, canisterId } from "../../../declarations/HechoenOaxaca-icp-backend";
import { useAuthContext } from "./authContext";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";

const Registro = ({ onRegister }) => {
  const [formData, setFormData] = useState({
    nombreCompleto: "",
    lugarOrigen: "",
    telefono: "",
    rol: "artesano",
  });

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, identity, principalId } = useAuthContext();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!principalId) throw new Error("No se encontró el principalId.");

      const agent = new HttpAgent({ identity });
      if (process.env.NODE_ENV === "development") await agent.fetchRootKey();

      const backendActor = Actor.createActor(idlFactory, { agent, canisterId });

      const result = await backendActor.registrarUsuario(
        formData.nombreCompleto,
        formData.lugarOrigen,
        formData.telefono,
        formData.rol
      );

      if ("ok" in result) {
        localStorage.setItem("userRole", formData.rol);
        navigate(`/${formData.rol.toLowerCase()}-dashboard`);
      } else {
        setError("Error inesperado al registrar el usuario.");
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center mt-5">
      <Card className="p-4 shadow-lg" style={{ width: "100%", maxWidth: "500px" }}>
        <h2 className="text-center mb-4">Registro de Usuario</h2>
        <Form onSubmit={handleRegister}>
          <Form.Group className="mb-3">
            <Form.Label>Nombre Completo</Form.Label>
            <Form.Control
              type="text"
              name="nombreCompleto"
              value={formData.nombreCompleto}
              onChange={handleChange}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Lugar de Origen</Form.Label>
            <Form.Control
              type="text"
              name="lugarOrigen"
              value={formData.lugarOrigen}
              onChange={handleChange}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Teléfono</Form.Label>
            <Form.Control
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Rol</Form.Label>
            <Form.Select name="rol" value={formData.rol} onChange={handleChange}>
              <option value="artesano">Artesano</option>
              <option value="cliente">Cliente</option>
              <option value="intermediario">Intermediario</option>
            </Form.Select>
          </Form.Group>
          {error && <p className="text-danger text-center">{error}</p>}
          <Button variant="primary" type="submit" className="w-100" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar"}
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default Registro;
