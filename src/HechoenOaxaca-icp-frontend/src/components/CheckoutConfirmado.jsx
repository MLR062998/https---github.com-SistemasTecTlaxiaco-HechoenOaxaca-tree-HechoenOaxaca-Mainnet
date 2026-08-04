import React, { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Container, Button, Row, Col, Card, Badge, Alert } from "react-bootstrap";
import { QRCodeSVG } from "qrcode.react";
import { FaShieldAlt, FaQrcode, FaDownload, FaArrowLeft } from "react-icons/fa";

const CheckoutConfirmado = () => {
  const { state } = useLocation();
  const { total, productos, detalles } = state || {};

  const [mostrarQR, setMostrarQR] = useState({});

  // Si no hay productos, usamos array vacío
  const listaProductos = productos || (detalles ? [detalles] : []);

  // Calcular total si no viene
  const totalFinal = total || listaProductos.reduce((acc, p) => acc + (p.precioICP || 0), 0);

  // Función para descargar certificado
  const descargarCertificado = (producto) => {
    if (!producto) return;
    const contenido = `
=== CERTIFICADO DE AUTENTICIDAD ===
Producto: ${producto.nombre}
ID: ${producto.id}
Artesano: ${producto.artesano || 'No especificado'}
Hash: ${producto.hash || 'No disponible'}
Firma digital: ${producto.firma || 'No disponible'}
Certificado: ${producto.certificado || 'No disponible'}
Fecha de certificación: ${producto.fechaCertificacion ? new Date(Number(producto.fechaCertificacion) / 1_000_000).toLocaleDateString('es-MX') : 'No disponible'}
===================================
    `;
    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificado-${producto.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleQR = (id) => {
    setMostrarQR(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow border-success">
            <Card.Header className="bg-success text-white text-center py-3">
              <h2 className="mb-0">✅ Compra Exitosa</h2>
            </Card.Header>
            <Card.Body>
              <p className="text-center text-muted">
                Gracias por tu compra. A continuación los detalles:
              </p>

              {/* Resumen de productos */}
              <div className="mt-4">
                <h5>📦 Productos comprados</h5>
                {listaProductos.length === 0 ? (
                  <Alert variant="info">No se encontraron productos.</Alert>
                ) : (
                  listaProductos.map((producto, index) => {
                    const tieneCertificado = producto.hash && producto.firma;
                    const precio = producto.precioICP || (Number(producto.precio || 0) / 100_000_000);
                    const verificarUrl = `${window.location.origin}/verificar/${producto.id}`;

                    return (
                      <Card key={producto.id || index} className="mb-3">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h5 className="mb-1">{producto.nombre || 'Producto'}</h5>
                              <p className="text-muted small">ID: {producto.id || 'N/A'}</p>
                              <p className="fw-bold text-success">ICP {precio.toFixed(2)}</p>
                              {tieneCertificado && (
                                <Badge bg="success" className="mb-2">
                                  <FaShieldAlt className="me-1" /> Certificado de autenticidad
                                </Badge>
                              )}
                            </div>
                            {tieneCertificado && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => descargarCertificado(producto)}
                              >
                                <FaDownload className="me-1" /> Descargar certificado
                              </Button>
                            )}
                          </div>

                          {/* Certificado y QR */}
                          {tieneCertificado && (
                            <div className="mt-3 p-3 bg-light rounded border">
                              <h6 className="text-success">
                                <FaShieldAlt className="me-2" />
                                Certificado de Autenticidad
                              </h6>
                              <div className="small">
                                <p><strong>Hash:</strong> <code className="text-break">{producto.hash}</code></p>
                                {producto.firma && (
                                  <p><strong>Firma digital:</strong> <code className="text-break">{producto.firma}</code></p>
                                )}
                                {producto.certificado && (
                                  <p><strong>Certificado:</strong> {producto.certificado}</p>
                                )}
                                {producto.fechaCertificacion && (
                                  <p><strong>Fecha de certificación:</strong> {new Date(Number(producto.fechaCertificacion) / 1_000_000).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                )}
                              </div>

                              {/* QR */}
                              <div className="mt-2 text-center">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => toggleQR(producto.id)}
                                >
                                  <FaQrcode className="me-1" />
                                  {mostrarQR[producto.id] ? 'Ocultar QR' : 'Ver QR de verificación'}
                                </Button>
                                {mostrarQR[producto.id] && (
                                  <div className="mt-2 d-flex justify-content-center">
                                    <QRCodeSVG
                                      value={verificarUrl}
                                      size={160}
                                      level="H"
                                      marginSize={2}
                                      bgColor="#ffffff"
                                      fgColor="#000000"
                                    />
                                  </div>
                                )}
                                <div className="mt-1 small text-muted">
                                  Escanea este código para verificar la autenticidad del producto
                                </div>
                              </div>
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Total */}
              <Card className="mt-4 border-success">
                <Card.Body className="text-center">
                  <h4>
                    Total pagado: <strong className="text-success">ICP {parseFloat(totalFinal).toFixed(2)}</strong>
                  </h4>
                </Card.Body>
              </Card>

              {/* Botones de acción */}
              <div className="d-flex justify-content-center gap-3 mt-4">
                <Link to="/cliente-dashboard">
                  <Button variant="primary">
                    <FaArrowLeft className="me-2" />
                    Seguir comprando
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="outline-secondary">
                    Ir al inicio
                  </Button>
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CheckoutConfirmado;