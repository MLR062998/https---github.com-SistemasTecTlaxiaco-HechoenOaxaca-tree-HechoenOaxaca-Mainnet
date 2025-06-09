import React, { useEffect, useState } from "react";
import { useCanister, useConnect } from "@connect2ic/react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Home from "./Home";

const Products = () => {
  const [marketplaceBackend] = useCanister("HechoenOaxaca-icp-backend");
  const { principal } = useConnect();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState("");
  const [idProduct, setIdProduct] = useState("");
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  // Cargar productos desde el backend
  const fetchProducts = async () => {
    setLoading("Cargando...");
    try {
      const productsRes = await marketplaceBackend.listarProductos();

      // Filtrar productos del usuario actual
      const userProducts = productsRes.filter(
        (product) => product.artesano.toText() === principal.toText()
      );

      // Procesar imágenes
      const processedProducts = userProducts.map((product) => ({
        ...product,
        imagenes: product.imagenes.map((img) => {
          try {
            const blob = new Blob([new Uint8Array(img)], { type: "image/jpeg" });
            return URL.createObjectURL(blob);
          } catch (error) {
            console.error("Error procesando imagen:", error);
            return null;
          }
        }),
      }));

      setProducts(processedProducts);
      setLoading("");
    } catch (e) {
      console.error("Error al cargar productos:", e);
      setLoading("Error al cargar los productos.");
    }
  };

  useEffect(() => {
    if (principal) {
      fetchProducts();
    }
  }, [principal]);

  // Manejar cambio de imágenes
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 3) {
      alert("Puedes subir un máximo de 3 imágenes.");
      return;
    }
    setSelectedImages(files);
  };

  // Actualizar producto
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

      await marketplaceBackend.updateProducto(
        idProduct,
        nombre,
        precio,
        descripcion,
        tipo,
        imageBlobs
      );

      setLoading("");
      setShowModalEditar(false);
      fetchProducts();
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      setLoading("Error al actualizar el producto. Intenta nuevamente.");
    }
  };

  // Mostrar modal de edición
  const handleShowModalEditar = (idProducto) => {
    setShowModalEditar(true);
    setIdProduct(idProducto);
    
    const product = products.find((p) => p.id.toText() === idProducto.toText());
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
      await marketplaceBackend.deleteProducto(idProduct);
      setShowModalEliminar(false);
      fetchProducts();
      setLoading("");
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      setLoading("Error al eliminar el producto. Intenta nuevamente.");
    }
  };

  return (
    <>
      {principal ? (
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
                        <tr key={product.id.toText()}>
                          <td>{product.nombre}</td>
                          <td>{product.precio}</td>
                          <td>{product.descripcion}</td>
                          <td>
                            {product.imagenes.length > 0 ? (
                              product.imagenes.map(
                                (src, index) =>
                                  src && (
                                    <img
                                      key={index}
                                      src={src}
                                      alt={`Imagen de ${product.nombre}`}
                                      style={{ maxWidth: "50px", maxHeight: "50px", marginRight: "5px" }}
                                    />
                                  )
                              )
                            ) : (
                              <span>Sin imagen</span>
                            )}
                          </td>
                          <td>{product.tipo}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleShowModalEditar(product.id)}
                            >
                              Editar
                            </button>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => handleShowModalEliminar(product.id)}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Modal para editar producto */}
            <Modal show={showModalEditar} onHide={() => setShowModalEditar(false)}>
              <Modal.Header closeButton>
                <Modal.Title>Actualizar producto</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <form id="formEditar">
                  <ul className="list-unstyled">
                    <li className="form-group mb-3">
                      <label htmlFor="nombre">Nombre del producto</label>
                      <input type="text" className="form-control" id="nombre" required />
                    </li>
                    <li className="form-group mb-3">
                      <label htmlFor="precio">Precio</label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          className="form-control" 
                          id="precio" 
                          required 
                          min="0"
                        />
                      </div>
                    </li>
                    <li className="form-group mb-3">
                      <label htmlFor="descripcion">Descripción</label>
                      <input type="text" className="form-control" id="descripcion" required />
                    </li>
                    <li className="form-group mb-3">
                      <label htmlFor="tipo">Tipo de producto</label>
                      <select className="form-control" id="tipo" required>
                        <option value="textil">Textil</option>
                        <option value="artesania">Artesanía</option>
                        <option value="dulces">Dulces tradicionales</option>
                      </select>
                    </li>
                    <li className="form-group mb-3">
                      <label htmlFor="imagenes">Imágenes (máximo 3)</label>
                      <input
                        type="file"
                        className="form-control"
                        id="imagenes"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                      />
                      <small className="text-muted">Selecciona nuevas imágenes para reemplazar las existentes</small>
                    </li>
                  </ul>
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

            {/* Modal para eliminar producto */}
            <Modal show={showModalEliminar} onHide={() => setShowModalEliminar(false)}>
              <Modal.Header closeButton>
                <Modal.Title>Confirmar eliminación</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                ¿Estás seguro que deseas eliminar este producto? Esta acción no se puede deshacer.
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowModalEliminar(false)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={deleteProduct}>
                  Eliminar definitivamente
                </Button>
              </Modal.Footer>
            </Modal>
          </div>
        </div>
      ) : (
        <Home />
      )}
    </>
  );
};

export default Products;