import React, { useEffect, useState } from "react";
import { Button, Modal, Alert, Spinner } from "react-bootstrap";
import { useAuthContext } from "./authContext";
import { processProductsList } from "../utils/imageUtils";

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
      const result = await actor.listarProductosPorArtesano();
      
      // ✅ CORREGIDO: Procesar imágenes correctamente
      const processed = processProductsList(result);
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

      const precioNat64 = BigInt(Math.floor(precio * 100_000_000));

      let imageBlobs = [];
      if (selectedImages.length > 0) {
        imageBlobs = await Promise.all(
          selectedImages.map(async (image) => {
            const buffer = await image.arrayBuffer();
            return Array.from(new Uint8Array(buffer));
          })
        );
      }

      const result = await actor.actualizarProducto(
        selectedProduct.id,
        nombre,
        precioNat64,
        descripcion,
        tipo,
        imageBlobs.length > 0 ? imageBlobs : selectedProduct.imagenes
      );

      if ("ok" in result) {
        await fetchProducts();
        setShowModalEditar(false);
        setSelectedImages([]);
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
                  <td className="align-middle">{product.nombre}</td>
                  <td className="align-middle">ICP {product.precioICP?.toFixed(2)}</td>
                  <td className="align-middle">
                    {product.descripcion.length > 50 
                      ? `${product.descripcion.substring(0, 50)}...` 
                      : product.descripcion}
                  </td>
                  <td className="align-middle">
                    <div className="d-flex flex-wrap gap-2">
                      {product.imagenes.map((src, index) => (
                        <img
                          key={index}
                          src={src}
                          alt={`Vista ${index + 1}`}
                          className="img-thumbnail"
                          style={{ 
                            width: "60px", 
                            height: "60px", 
                            objectFit: "cover" 
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ))}
                      {product.imagenes.length === 0 && (
                        <span className="text-muted">Sin imágenes</span>
                      )}
                    </div>
                  </td>
                  <td className="align-middle">
                    <Button
                      variant="primary"
                      size="sm"
                      className="me-2 mb-1"
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
                      className="mb-1"
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

      {/* Modal de Editar */}
      <Modal show={showModalEditar} onHide={() => setShowModalEditar(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Editar Producto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProduct && (
            <form id="formEditar">
              <div className="mb-3">
                <label className="form-label fw-bold">Nombre</label>
                <input 
                  type="text" 
                  name="nombre" 
                  className="form-control" 
                  defaultValue={selectedProduct.nombre}
                  required
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-bold">Precio (ICP)</label>
                <input 
                  type="number" 
                  name="precio" 
                  className="form-control" 
                  step="0.01"
                  min="0"
                  defaultValue={selectedProduct.precioICP}
                  required
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-bold">Descripción</label>
                <textarea 
                  name="descripcion" 
                  className="form-control" 
                  rows="3"
                  defaultValue={selectedProduct.descripcion}
                  required
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-bold">Tipo de Producto</label>
                <select name="tipo" className="form-control" defaultValue={selectedProduct.tipo} required>
                  <option value="">Selecciona un tipo</option>
                  <option value="artesania">Artesanía</option>
                  <option value="textil">Textil</option>
                  <option value="ceramica">Dulces tradicionales</option>
                </select>
              </div>
              
              <div className="mb-3">
                <label className="form-label fw-bold">Imágenes actuales</label>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {selectedProduct.imagenes && selectedProduct.imagenes.length > 0 ? (
                    selectedProduct.imagenes.map((src, index) => (
                      <img
                        key={index}
                        src={src}
                        alt={`Actual ${index + 1}`}
                        className="img-thumbnail"
                        style={{ width: "80px", height: "80px", objectFit: "cover" }}
                      />
                    ))
                  ) : (
                    <span className="text-muted">No hay imágenes actuales</span>
                  )}
                </div>
                
                <label className="form-label fw-bold mt-2">Agregar nuevas imágenes (opcional)</label>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*"
                  className="form-control"
                  onChange={(e) => setSelectedImages(Array.from(e.target.files || []))}
                />
                {selectedImages.length > 0 && (
                  <small className="text-muted">
                    {selectedImages.length} imagen(es) seleccionada(s) para agregar
                  </small>
                )}
              </div>
            </form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowModalEditar(false);
            setSelectedImages([]);
          }}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUpdateProduct} 
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner as="span" size="sm" animation="border" className="me-2" />
                Guardando...
              </>
            ) : (
              "Guardar Cambios"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Eliminar */}
      <Modal show={showModalEliminar} onHide={() => setShowModalEliminar(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProduct && (
            <div>
              <p>¿Estás seguro de eliminar el producto?</p>
              <p className="fw-bold text-danger">{selectedProduct.nombre}</p>
              <p className="text-muted">Esta acción no se puede deshacer.</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModalEliminar(false)}>
            Cancelar
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteProduct} 
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner as="span" size="sm" animation="border" className="me-2" />
                Eliminando...
              </>
            ) : (
              "Eliminar Producto"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Products;