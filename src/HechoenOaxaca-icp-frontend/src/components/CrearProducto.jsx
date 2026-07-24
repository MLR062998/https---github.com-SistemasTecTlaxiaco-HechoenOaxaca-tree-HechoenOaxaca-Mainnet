// src/components/CrearProducto.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Form, Button, Alert, Row, Col } from "react-bootstrap";
import { useAuthContext } from "./authContext";
import "../cliente.scss";

const CrearProducto = () => {
  const { actor } = useAuthContext();
  const [images, setImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");
  const navigate = useNavigate();

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

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
    Promise.all(selected.map(file => convertToBase64(file)))
      .then((base64s) => {
        const pureBase64s = base64s.map(b64 => {
          const parts = b64.split(',');
          return parts.length > 1 ? parts[1] : b64;
        });
        setImages(pureBase64s);
        setPreviewImages(base64s);
        setError("");
      })
      .catch(() => setError("Error al procesar imágenes."));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const nombre = form.nombre.value.trim();
    const precioICP = parseFloat(form.precio.value);
    const descripcion = form.descripcion.value.trim();
    const tipo = form.tipo.value;
    const stock = parseInt(form.stock.value, 10);
    const firma = form.firma.value.trim() || null;
    const certificado = form.certificado.value.trim() || null;

    if (!nombre || nombre.length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.");
      return;
    }
    if (isNaN(precioICP) || precioICP <= 0) {
      setError("Ingresa un precio válido mayor a 0 ICP.");
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
    if (isNaN(stock) || stock <= 0) {
      setError("El stock debe ser un número positivo.");
      return;
    }

    setError("");
    setLoading("Registrando producto...");

    try {
      const precioE8s = BigInt(Math.floor(precioICP * 100_000_000));
      const stockNat = BigInt(stock);

      // ✅ CORRECCIÓN FINAL: usar [] para null y [texto] para valor
      const result = await actor.crearProducto(
        nombre,
        precioE8s,
        tipo,
        descripcion,
        images,
        firma ? [firma] : [],      // ✅ opt text → [] = null
        certificado ? [certificado] : [], // ✅ opt text → [] = null
        stockNat
      );

      if ("ok" in result) {
        const producto = result.ok;
        alert("✅ Producto registrado correctamente");
        form.reset();
        setImages([]);
        setPreviewImages([]);
        navigate(`/producto/${producto.id}`);
      } else {
        const errorMsg = handleError(result.err);
        setError(`Error: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Error al crear producto:", err);
      setError(err.message || "Ocurrió un error al registrar el producto. Intenta nuevamente.");
    } finally {
      setLoading("");
    }
  };

  const handleError = (error) => {
    if (typeof error === 'object' && 'ErrorValidacion' in error) {
      return error.ErrorValidacion;
    }
    if (typeof error === 'object' && 'PermisoDenegado' in error) {
      return "No tienes permisos de artesano.";
    }
    return JSON.stringify(error);
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
                  <Form.Control type="text" name="nombre" placeholder="Ej. Blusa bordada a mano" required />
                </Form.Group>
                <Form.Group className="mb-3 form-group">
                  <Form.Label>Precio (ICP) *</Form.Label>
                  <div className="input-group price-input">
                    <span className="input-group-text">ICP</span>
                    <Form.Control type="number" step="0.0001" name="precio" placeholder="Ej. 0.5" min="0" required />
                  </div>
                  <Form.Text className="text-muted">El precio en ICP (1 ICP ≈ 1,000,000 e8s). Ejemplo: 0.5 ICP</Form.Text>
                </Form.Group>
                <Form.Group className="mb-3 form-group">
                  <Form.Label>Stock disponible *</Form.Label>
                  <Form.Control type="number" name="stock" placeholder="Ej. 10" min="1" required />
                  <Form.Text className="text-muted">Cantidad de unidades que tienes para vender.</Form.Text>
                </Form.Group>
                <Form.Group className="mb-3 form-group">
                  <Form.Label>Descripción *</Form.Label>
                  <Form.Control as="textarea" rows={4} name="descripcion" placeholder="Describe tu producto con detalles como materiales, colores, medidas, etc. Mínimo 10 caracteres." required />
                </Form.Group>
                <Form.Group className="mb-3 form-group">
                  <Form.Label>Tipo de producto *</Form.Label>
                  <Form.Select name="tipo" required>
                    <option value="">Selecciona una opción</option>
                    <option value="Textil">Textil</option>
                    <option value="Artesania">Artesanía</option>
                    <option value="Dulces">Dulces tradicionales</option>
                    <option value="Ceramica">Cerámica</option>
                    <option value="Joyeria">Joyería</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3 form-group">
                  <Form.Label>Firma digital (opcional)</Form.Label>
                  <Form.Control as="textarea" rows={2} name="firma" placeholder="Ej. Hash de autenticidad o firma del artesano" />
                  <Form.Text className="text-muted">Puedes pegar un hash, una firma digital o cualquier texto que certifique tu autoría.</Form.Text>
                </Form.Group>
                <Form.Group className="mb-3 form-group">
                  <Form.Label>Certificado (opcional)</Form.Label>
                  <Form.Control as="textarea" rows={2} name="certificado" placeholder="Ej. Número de certificado o texto de autenticidad" />
                  <Form.Text className="text-muted">Si tu producto tiene un certificado de autenticidad, regístralo aquí.</Form.Text>
                </Form.Group>
                <Form.Group className="mb-4 form-group">
                  <Form.Label>Imágenes *</Form.Label>
                  <Form.Control type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageChange} required />
                  <Form.Text className="text-muted">Sube entre 1 y 3 imágenes (JPEG, PNG o WEBP). Máximo 2MB cada una.</Form.Text>
                  {previewImages.length > 0 && (
                    <div className="mt-3 d-flex flex-wrap gap-2">
                      {previewImages.map((src, index) => (
                        <img key={index} src={src} alt={`Vista previa ${index + 1}`} className="img-thumbnail preview-image" style={{ maxWidth: "150px", maxHeight: "150px" }} />
                      ))}
                    </div>
                  )}
                </Form.Group>
                <div className="d-grid gap-2">
                  <Button variant="success" type="submit" size="lg" disabled={!!loading}>
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