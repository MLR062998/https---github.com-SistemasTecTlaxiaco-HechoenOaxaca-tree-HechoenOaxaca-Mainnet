import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Form, Button, Alert, Row, Col } from "react-bootstrap";
import { useAuthContext } from "./authContext";
import "../cliente.scss"; // Importamos los estilos

const CrearProducto = () => {
  const { actor } = useAuthContext();
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");
  const [previewImages, setPreviewImages] = useState([]);
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const selected = Array.from(e.target.files);
    
    if (selected.length > 3) {
      setError("Máximo 3 imágenes permitidas.");
      return;
    }

    for (const file of selected) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Formato inválido. Solo JPG, PNG y WEBP.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("Cada imagen debe ser menor a 2MB.");
        return;
      }
    }

    // Generar vistas previas
    const previews = selected.map(file => URL.createObjectURL(file));
    
    setImages(selected);
    setPreviewImages(previews);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const nombre = form.nombre.value.trim();
    const precio = parseFloat(form.precio.value);
    const descripcion = form.descripcion.value.trim();
    const tipo = form.tipo.value;

    // Validaciones
    if (!nombre || nombre.length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.");
      return;
    }

    if (isNaN(precio)) {
      setError("Ingresa un precio válido.");
      return;
    }

    if (precio <= 0) {
      setError("El precio debe ser mayor a cero.");
      return;
    }

    if (!descripcion || descripcion.length < 10) {
      setError("La descripción debe tener al menos 10 caracteres.");
      return;
    }

    if (images.length === 0) {
      setError("Debes subir al menos una imagen.");
      return;
    }

    setError("");
    setLoading("Registrando producto...");

    try {
      // Convertir imágenes a blobs
      const imageBlobs = await Promise.all(
        images.map(async (img) => {
          const buffer = await img.arrayBuffer();
          return Array.from(new Uint8Array(buffer));
        })
      );

      // Validar tamaño de blobs antes de enviar
      for (const blob of imageBlobs) {
        if (blob.length > 2_000_000) { // ~2MB
          throw new Error("Una o más imágenes exceden el tamaño permitido");
        }
      }

      // Llamar al backend
      const result = await actor.crearProducto(
        nombre,
        precio,
        descripcion,
        tipo,
        imageBlobs
      );

      if ("ok" in result) {
        alert("✅ Producto registrado correctamente");
        form.reset();
        setImages([]);
        setPreviewImages([]);
        navigate("/mis-productos");
      } else {
        setError(`Error: ${JSON.stringify(result.err)}`);
      }
    } catch (err) {
      console.error("Error al crear producto:", err);
      setError(err.message || "Ocurrió un error al registrar el producto. Intenta nuevamente.");
    } finally {
      setLoading("");
    }
  };

  return (
    <Container className="mt-4 mb-5 crear-producto-container">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow-sm product-card">
            <Card.Header className="bg-primary text-white card-header">
              <h4 className="mb-0">Registrar nuevo producto</h4>
            </Card.Header>
            <Card.Body>
              {loading && <Alert variant="info" className="text-center loading-alert">{loading}</Alert>}
              {error && <Alert variant="danger" className="error-alert">{error}</Alert>}

              <Form onSubmit={handleSubmit} className="product-form">
                <Form.Group className="mb-3 form-group">
                  <Form.Label>Nombre del producto *</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="nombre" 
                    placeholder="Ej. Blusa bordada a mano" 
                    required 
                    className="form-control"
                  />
                </Form.Group>

                <Form.Group className="mb-3 form-group">
                  <Form.Label>Precio (MXN) *</Form.Label>
                  <div className="input-group price-input">
                    <span className="input-group-text">$</span>
                    <Form.Control 
                      type="number" 
                      step="0.01" 
                      name="precio" 
                      placeholder="Ej. 350.00" 
                      min="0"
                      required 
                      className="form-control"
                    />
                  </div>
                </Form.Group>

                <Form.Group className="mb-3 form-group">
                  <Form.Label>Descripción *</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    name="descripcion" 
                    placeholder="Describe tu producto con detalles como materiales, colores, medidas, etc."
                    required 
                    className="form-control"
                  />
                </Form.Group>

                <Form.Group className="mb-3 form-group">
                  <Form.Label>Tipo de producto *</Form.Label>
                  <Form.Select name="tipo" required className="form-select">
                    <option value="">Selecciona una opción</option>
                    <option value="textil">Textil</option>
                    <option value="artesania">Artesanía</option>
                    <option value="dulces">Dulces tradicionales</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-4 form-group">
                  <Form.Label>Imágenes *</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageChange}
                    required
                    className="form-control"
                  />
                  <Form.Text className="text-muted image-hint">
                    Sube entre 1 y 3 imágenes (JPEG, PNG o WEBP). Máximo 2MB cada una.
                  </Form.Text>

                  {/* Vista previa de imágenes */}
                  {previewImages.length > 0 && (
                    <div className="mt-3 d-flex flex-wrap gap-2 image-previews">
                      {previewImages.map((src, index) => (
                        <img
                          key={index}
                          src={src}
                          alt={`Vista previa ${index + 1}`}
                          className="img-thumbnail preview-image"
                        />
                      ))}
                    </div>
                  )}
                </Form.Group>

                <div className="d-grid gap-2 submit-button">
                  <Button 
                    variant="success" 
                    type="submit" 
                    size="lg"
                    disabled={loading}
                    className="submit-btn"
                  >
                    {loading ? "Registrando..." : "Guardar producto"}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CrearProducto;