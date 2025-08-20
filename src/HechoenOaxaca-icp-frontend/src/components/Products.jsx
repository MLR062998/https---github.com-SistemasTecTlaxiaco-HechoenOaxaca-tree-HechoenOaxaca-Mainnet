import React, { useEffect, useState } from "react";
import { Button, Modal, Alert, Spinner } from "react-bootstrap";
import { useAuthContext } from "./authContext";

const Products = () => {
  const { actor, principalId, rol } = useAuthContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);

  const fetchProducts = async () => {
    if (!actor || !principalId || rol !== "Artesano") return;

    setLoading(true);
    setError("");
    try {
      const result = await actor.listarProductosPorArtesano(principalId);
      
      const processed = result.map((product) => ({
        ...product,
        imagenes: product.imagenes.map((img) => {
          try {
            const blob = new Blob([img], { type: "image/jpeg" });
            return URL.createObjectURL(blob);
          } catch {
            return null;
          }
        }),
      }));

      setProducts(processed);
    } catch (err) {
      console.error("Error cargando productos:", err);
      setError("Error al cargar los productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [actor, principalId, rol]);

  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    setError("");
    try {
      const form = document.getElementById("formEditar");
      const nombre = form.nombre.value;
      const precio = parseFloat(form.precio.value);
      const descripcion = form.descripcion.value;
      const tipo = form.tipo.value;

      let imageBlobs = [];
      if (selectedImages.length > 0) {
        imageBlobs = await Promise.all(
          selectedImages.map(async (image) => {
            const buffer = await image.arrayBuffer();
            return Array.from(new Uint8Array(buffer));
          })
        );
      }

      const result = await actor.updateProducto(
        selectedProduct.id,
        nombre,
        precio,
        descripcion,
        tipo,
        imageBlobs.length > 0 ? imageBlobs : selectedProduct.imagenes
      );

      if ("ok" in result) {
        await fetchProducts();
        setShowModalEditar(false);
      } else {
        setError("Error al actualizar: " + JSON.stringify(result.err));
      }
    } catch (err) {
      console.error("Error actualizando producto:", err);
      setError("Error al actualizar el producto");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    setError("");
    try {
      const result = await actor.eliminarProducto(selectedProduct.id);
      if ("ok" in result) {
        await fetchProducts();
        setShowModalEliminar(false);
      } else {
        setError("Error al eliminar: " + JSON.stringify(result.err));
      }
    } catch (err) {
      console.error("Error eliminando producto:", err);
      setError("Error al eliminar el producto");
    } finally {
      setLoading(false);
    }
  };

  if (rol !== "Artesano") {
    return (
      <div className="alert alert-warning mt-4">
        Solo los artesanos pueden gestionar productos
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2>Mis Productos</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" />
          <p>Cargando productos...</p>
        </div>
      ) : products.length === 0 ? (
        <Alert variant="info">No tienes productos registrados</Alert>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Descripción</th>
                <th>Imágenes</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.nombre}</td>
                  <td>${product.precio.toFixed(2)}</td>
                  <td>{product.descripcion}</td>
                  <td>
                    {product.imagenes.filter(Boolean).map((src, index) => (
                      <img
                        key={index}
                        src={src}
                        alt={`Producto ${index + 1}`}
                        className="img-thumbnail me-2"
                        style={{ width: "50px", height: "50px" }}
                      />
                    ))}
                  </td>
                  <td>
                    <Button
                      variant="primary"
                      size="sm"
                      className="me-2"
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowModalEditar(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowModalEliminar(true);
                      }}
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Edición */}
      <Modal show={showModalEditar} onHide={() => setShowModalEditar(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Producto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProduct && (
            <form id="formEditar">
              <div className="mb-3">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="form-control"
                  name="nombre"
                  defaultValue={selectedProduct.nombre}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Precio</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  name="precio"
                  defaultValue={selectedProduct.precio}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-control"
                  name="descripcion"
                  defaultValue={selectedProduct.descripcion}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Nuevas Imágenes (opcional)</label>
                <input
                  type="file"
                  className="form-control"
                  multiple
                  accept="image/*"
                  onChange={(e) => setSelectedImages(Array.from(e.target.files))}
                />
                <small className="text-muted">Máximo 3 imágenes (2MB c/u)</small>
              </div>
            </form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalEditar(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleUpdateProduct} disabled={loading}>
            {loading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Eliminación */}
      <Modal show={showModalEliminar} onHide={() => setShowModalEliminar(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Estás seguro que deseas eliminar el producto "{selectedProduct?.nombre}"?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalEliminar(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDeleteProduct} disabled={loading}>
            {loading ? "Eliminando..." : "Eliminar"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Products;