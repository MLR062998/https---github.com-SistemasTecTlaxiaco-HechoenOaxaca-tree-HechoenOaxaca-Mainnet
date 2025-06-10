// src/components/Products.jsx
import React, { useEffect, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { useAuthContext } from "./authContext";
import Home from "./Home";

const Products = () => {
  const { actor, principalId } = useAuthContext();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState("");
  const [idProduct, setIdProduct] = useState("");
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  const fetchProducts = async () => {
    if (!actor || !principalId) return;

    setLoading("Cargando...");
    try {
      const result = await actor.listarProductos();

      const userProducts = result.filter(
        (product) => product.artesano.toText() === principalId.toText()
      );

      const processed = userProducts.map((product) => ({
        ...product,
        imagenes: product.imagenes.map((img) => {
          try {
            const blob = new Blob([new Uint8Array(img)], { type: "image/jpeg" });
            return URL.createObjectURL(blob);
          } catch {
            return null;
          }
        }),
      }));

      setProducts(processed);
    } catch (err) {
      console.error("❌ Error cargando productos:", err);
      setLoading("Error al cargar los productos.");
    } finally {
      setLoading("");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [actor, principalId]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 3) {
      alert("Máximo 3 imágenes permitidas.");
      return;
    }
    setSelectedImages(files);
  };

  const updateProduct = async () => {
    const form = document.getElementById("formEditar");
    const nombre = form.nombre.value;
    const precio = parseFloat(form.precio.value);
    const descripcion = form.descripcion.value;
    const tipo = form.tipo.value;

    setLoading("Actualizando producto...");
    try {
      const imageBlobs = await Promise.all(
        selectedImages.map(async (image) => {
          const buffer = await image.arrayBuffer();
          return Array.from(new Uint8Array(buffer));
        })
      );

      await actor.updateProducto(idProduct, nombre, precio, descripcion, tipo, imageBlobs);

      setShowModalEditar(false);
      fetchProducts();
    } catch (err) {
      console.error("❌ Error actualizando producto:", err);
      setLoading("Error actualizando el producto.");
    } finally {
      setLoading("");
    }
  };

  const handleShowModalEditar = (idProducto) => {
    setShowModalEditar(true);
    setIdProduct(idProducto);

    const product = products.find((p) => p.id === idProducto);
    if (product) {
      const form = document.getElementById("formEditar");
      form.nombre.value = product.nombre;
      form.precio.value = product.precio;
      form.descripcion.value = product.descripcion;
      form.tipo.value = product.tipo;
    }
  };

  const handleShowModalEliminar = (idProducto) => {
    setShowModalEliminar(true);
    setIdProduct(idProducto);
  };

  const deleteProduct = async () => {
    setLoading("Eliminando producto...");
    try {
      await actor.deleteProducto(idProduct);
      setShowModalEliminar(false);
      fetchProducts();
    } catch (err) {
      console.error("❌ Error eliminando producto:", err);
      setLoading("Error eliminando producto.");
    } finally {
      setLoading("");
    }
  };

  return principalId ? (
    <div className="row mt-5">
      <div className="col">
        {loading && <div className="alert alert-primary">{loading}</div>}

        <div className="card">
          <div className="card-header">Mis productos</div>
          <div className="card-body">
            {products.length === 0 ? (
              <div className="alert alert-info">No tienes productos registrados</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Precio</th>
                    <th>Descripción</th>
                    <th>Imágenes</th>
                    <th>Tipo</th>
                    <th colSpan="2">Opciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.nombre}</td>
                      <td>{product.precio}</td>
                      <td>{product.descripcion}</td>
                      <td>
                        {product.imagenes.length > 0
                          ? product.imagenes.map(
                              (src, index) =>
                                src && (
                                  <img
                                    key={index}
                                    src={src}
                                    alt={`Imagen ${index + 1}`}
                                    style={{
                                      maxWidth: "50px",
                                      maxHeight: "50px",
                                      marginRight: "5px",
                                    }}
                                  />
                                )
                            )
                          : "Sin imagen"}
                      </td>
                      <td>{product.tipo}</td>
                      <td>
                        <Button size="sm" onClick={() => handleShowModalEditar(product.id)}>
                          Editar
                        </Button>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleShowModalEliminar(product.id)}
                        >
                          Eliminar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal editar */}
        <Modal show={showModalEditar} onHide={() => setShowModalEditar(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Actualizar producto</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <form id="formEditar">
              <div className="mb-3">
                <label htmlFor="nombre">Nombre</label>
                <input className="form-control" id="nombre" required />
              </div>
              <div className="mb-3">
                <label htmlFor="precio">Precio</label>
                <input className="form-control" type="number" id="precio" required min="0" />
              </div>
              <div className="mb-3">
                <label htmlFor="descripcion">Descripción</label>
                <input className="form-control" id="descripcion" required />
              </div>
              <div className="mb-3">
                <label htmlFor="tipo">Tipo</label>
                <select className="form-control" id="tipo" required>
                  <option value="textil">Textil</option>
                  <option value="artesania">Artesanía</option>
                  <option value="dulces">Dulces tradicionales</option>
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="imagenes">Imágenes (máx 3)</label>
                <input
                  className="form-control"
                  type="file"
                  id="imagenes"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
              </div>
            </form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModalEditar(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={updateProduct}>
              Guardar cambios
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal eliminar */}
        <Modal show={showModalEliminar} onHide={() => setShowModalEliminar(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Eliminar producto</Modal.Title>
          </Modal.Header>
          <Modal.Body>¿Estás seguro que deseas eliminar este producto?</Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModalEliminar(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={deleteProduct}>
              Eliminar
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  ) : (
    <Home />
  );
};

export default Products;