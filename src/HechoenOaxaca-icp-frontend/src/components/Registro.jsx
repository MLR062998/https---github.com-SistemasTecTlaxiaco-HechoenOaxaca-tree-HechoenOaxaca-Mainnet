import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Principal } from "@dfinity/principal";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory, canisterId } from "../../../declarations/HechoenOaxaca-icp-backend";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";

const Registro = ({ onRegister }) => {
  const [formData, setFormData] = useState({
    nombreCompleto: "",
    lugarOrigen: "",
    telefono: "",
    rol: "artesano", // Rol por defecto
  });

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const principal = localStorage.getItem("principalId");
      if (!principal) throw new Error("No se encontró el principalId en localStorage.");

      const principalObj = Principal.fromText(principal);
      const agent = new HttpAgent({ host: "http://127.0.0.1:4943" });
      if (process.env.NODE_ENV === "development") await agent.fetchRootKey();

      const backendActor = Actor.createActor(idlFactory, { agent, canisterId });

      const result = await backendActor.registrarUsuario(
        formData.nombreCompleto,
        formData.lugarOrigen,
        formData.telefono,
        formData.rol
      );

      if ("err" in result) {
        console.error("❌ Error en la respuesta del backend:", result.err);
        setError(result.err);
        return;
      }

      if ("ok" in result) {
        console.log("✅ Usuario registrado correctamente:", result.ok);
        localStorage.setItem("userRole", formData.rol);
        if (typeof onRegister === "function") onRegister(formData.rol);
        navigate(`/${formData.rol.toLowerCase()}-dashboard`);
      } else {
        console.error("❌ Respuesta inesperada del backend:", result);
        setError("Error inesperado al registrar el usuario.");
      }
    } catch (err) {
      console.error("❌ Error al registrar usuario:", err);
      setError(`Error: ${err.message || "Error de conexión."}`);
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
            <Form.Control type="text" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleChange} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Lugar de Origen</Form.Label>
            <Form.Control type="text" name="lugarOrigen" value={formData.lugarOrigen} onChange={handleChange} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Teléfono</Form.Label>
            <Form.Control type="tel" name="telefono" value={formData.telefono} onChange={handleChange} required />
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