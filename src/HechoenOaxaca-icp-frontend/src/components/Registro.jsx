import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "./authContext";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";

const Registro = () => {
  const [formData, setFormData] = useState({
    nombreCompleto: "",
    lugarOrigen: "",
    telefono: "",
    rol: "Artesano",
  });

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { actor, principalId, authState } = useAuthContext();

  // ✅ Verificación mejorada de autenticación
  const isUserAuthenticated = principalId && 
                            principalId !== "2vxsx-fae" && 
                            !principalId.endsWith("-cai");

  useEffect(() => {
    if (!isUserAuthenticated && authState.status !== "initializing") {
      console.log("Usuario no autenticado, redirigiendo a home");
      navigate("/");
    }
  }, [isUserAuthenticated, authState.status, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getErrorMessage = (err) => {
    if (!err) return "Error desconocido.";
    if ("UsuarioYaExiste" in err) return "⚠️ El usuario ya está registrado.";
    if ("RolNoValido" in err) return "❌ El rol seleccionado no es válido.";
    if ("PermisoDenegado" in err) return "❌ No tienes permisos para registrar.";
    if ("ErrorValidacion" in err) return `⚠️ ${err.ErrorValidacion}`;
    return "❌ Error desconocido al registrar.";
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (formData.nombreCompleto.length < 3) {
      setError("❌ El nombre debe tener al menos 3 caracteres");
      setIsSubmitting(false);
      return;
    }

    if (formData.telefono.length < 7) {
      setError("❌ El teléfono debe tener al menos 7 dígitos");
      setIsSubmitting(false);
      return;
    }

    try {
      if (!actor || !principalId) {
        throw new Error("Identidad o actor no disponibles. Por favor, vuelve a iniciar sesión.");
      }

      console.log("📤 Enviando registro:", formData);
      const res = await actor.registrarUsuario(
        formData.nombreCompleto,
        formData.lugarOrigen,
        formData.telefono,
        formData.rol
      );

      console.log("📦 Respuesta del registro:", res);

      if ("ok" in res) {
        localStorage.setItem("rol", formData.rol);
        console.log("✅ Registro exitoso, redirigiendo a dashboard");
        
        const dashboardRoute = `/${formData.rol.toLowerCase()}-dashboard`;
        navigate(dashboardRoute);
        
        // ✅ Recargar para actualizar estado de autenticación
        setTimeout(() => {
          window.location.reload();
        }, 500);
        
      } else {
        setError(getErrorMessage(res.err));
      }
    } catch (err) {
      console.error("Error en registro:", err);
      setError(`❌ ${err.message || "Error al registrar usuario"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authState.status === "initializing") {
    return (
      <Container className="d-flex justify-content-center align-items-center mt-5">
        <Card className="p-4 text-center">
          <p>⏳ Inicializando autenticación...</p>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="d-flex justify-content-center align-items-center mt-5">
      <Card className="p-4 shadow-lg" style={{ width: "100%", maxWidth: "500px" }}>
        <h2 className="text-center mb-4">Registro de Usuario</h2>
        
        {!isUserAuthenticated ? (
          <div className="alert alert-warning text-center">
            <strong>⚠️ Debes autenticarte primero</strong>
            <p>Vuelve a la página principal para iniciar sesión con NFID</p>
          </div>
        ) : (
          <div className="alert alert-success text-center">
            <strong>✅ Usuario autenticado</strong>
            <p>ID: {principalId}</p>
          </div>
        )}

        <Form onSubmit={handleRegister}>
          <Form.Group className="mb-3">
            <Form.Label>Nombre Completo *</Form.Label>
            <Form.Control
              type="text"
              name="nombreCompleto"
              value={formData.nombreCompleto}
              onChange={handleChange}
              required
              minLength={3}
              placeholder="Mínimo 3 caracteres"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Lugar de Origen *</Form.Label>
            <Form.Control
              type="text"
              name="lugarOrigen"
              value={formData.lugarOrigen}
              onChange={handleChange}
              required
              minLength={3}
              placeholder="Ej: Oaxaca de Juárez"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Teléfono *</Form.Label>
            <Form.Control
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              required
              minLength={7}
              placeholder="Mínimo 7 dígitos"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Rol *</Form.Label>
            <Form.Select name="rol" value={formData.rol} onChange={handleChange}>
              <option value="Artesano">Artesano</option>
              <option value="Cliente">Cliente</option>
              <option value="Intermediario">Intermediario</option>
            </Form.Select>
          </Form.Group>

          {error && (
            <div className="alert alert-danger text-center">
              {error}
            </div>
          )}

          <Button 
            variant="primary" 
            type="submit" 
            className="w-100" 
            disabled={isSubmitting || !isUserAuthenticated}
          >
            {isSubmitting ? "Registrando..." : "Registrar"}
          </Button>

          {!isUserAuthenticated && (
            <div className="text-center mt-3">
              <small className="text-muted">
                Debes autenticarte antes de poder registrarte
              </small>
            </div>
          )}
        </Form>
      </Card>
    </Container>
  );
};

export default Registro;