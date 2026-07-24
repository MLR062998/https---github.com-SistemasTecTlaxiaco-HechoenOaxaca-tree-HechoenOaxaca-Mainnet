import React, { useEffect, useState } from "react";
import { useAuthContext } from "./authContext";
import { Principal } from "@dfinity/principal";
import { AccountIdentifier } from "@dfinity/ledger-icp";
import { HttpAgent } from "@dfinity/agent";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import {
  Button,
  Card,
  Form,
  Alert,
  Container,
  Row,
  Col,
  Tab,
  Tabs,
  Badge,
  InputGroup,
  Spinner,
} from "react-bootstrap";
import { FaCopy, FaCheck, FaArrowDown, FaArrowUp, FaHistory, FaExternalLinkAlt, FaSearch } from "react-icons/fa";

const MySwal = withReactContent(Swal);

// Configuración para mainnet
const NETWORK = "ic";
const LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai"; // ICP Ledger en mainnet

const Wallet = () => {
  const { identity, principalId, isAuthenticated, actor: contextActor, isLoading: authLoading } = useAuthContext();
  
  // Estados para saldo
  const [balance, setBalance] = useState(0);
  const [balanceEnE8s, setBalanceEnE8s] = useState(0n);
  const [balanceLedger, setBalanceLedger] = useState(null);
  
  // Estados para RECIBIR
  const [accountIdentifier, setAccountIdentifier] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [pollingActivo, setPollingActivo] = useState(false);
  
  // Estados para RETIRAR
  const [destinatarioId, setDestinatarioId] = useState("");
  const [retirarMonto, setRetirarMonto] = useState(0);
  const [ultimoRetiro, setUltimoRetiro] = useState(null);
  
  // Estados generales
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("recibir");
  const [cargando, setCargando] = useState(false);
  const [historialRetiros, setHistorialRetiros] = useState([]);
  const [conectando, setConectando] = useState(false);
  const [actorReady, setActorReady] = useState(false);
  const [verificandoLedger, setVerificandoLedger] = useState(false);

  // ============================================
  // VERIFICAR QUE EL ACTOR ESTÁ LISTO
  // ============================================
  useEffect(() => {
    if (contextActor) {
      console.log("✅ Actor disponible desde contexto:", Object.keys(contextActor));
      
      const funciones = Object.keys(contextActor);
      console.log("📋 Funciones del backend:", funciones);
      
      if (typeof contextActor.obtenerSaldo === 'function') {
        console.log("✅ función obtenerSaldo disponible");
        setActorReady(true);
      } else {
        console.log("❌ función obtenerSaldo NO disponible");
      }
    } else {
      console.log("⏳ Esperando actor del contexto...", { authLoading });
    }
  }, [contextActor, authLoading]);

  // ============================================
  // FUNCIONES PARA SALDO
  // ============================================
  const loadSaldo = async () => {
    if (!contextActor) {
      console.log("❌ No hay actor disponible en loadSaldo");
      setError("Conectando con el backend...");
      return;
    }
    
    if (typeof contextActor.obtenerSaldo !== 'function') {
      console.error("❌ La función obtenerSaldo no existe");
      setError("Error de configuración: backend no responde");
      return;
    }
    
    setConectando(true);
    try {
      console.log("🔄 Solicitando saldo...");
      const result = await contextActor.obtenerSaldo();
      console.log("💰 Saldo recibido (e8s):", result.toString());
      
      setBalanceEnE8s(result);
      const balanceICP = Number(result) / 100_000_000;
      setBalance(balanceICP);
      
      if (result > 0 && pollingActivo) {
        setSuccess(`🎉 ¡ICP recibidos! Saldo actual: ${balanceICP.toFixed(4)} ICP`);
        setPollingActivo(false);
      }
    } catch (err) {
      console.error("❌ Error al obtener saldo:", err);
      setError(`Error al conectar: ${err.message || "Error desconocido"}`);
    } finally {
      setConectando(false);
    }
  };

  // ============================================
  // FUNCIÓN PARA CONSULTAR LEDGER DIRECTAMENTE
  // ============================================
  const consultarLedgerDirecto = async () => {
    if (!accountIdentifier) {
      setError("Primero genera tu Account Identifier");
      return;
    }
    
    if (!identity) {
      setError("No hay identidad disponible");
      return;
    }
    
    setVerificandoLedger(true);
    setError("");
    setSuccess("");
    
    try {
      console.log("🔍 CONSULTANDO LEDGER DIRECTAMENTE...");
      console.log("📍 Account Identifier:", accountIdentifier);
      
      const agent = HttpAgent.createSync({ 
        host: "https://ic0.app",
        identity,
        verifyQuerySignatures: false
      });
      
      await agent.syncTime();
      
      const { LedgerCanister } = await import("@dfinity/ledger-icp");
      
      const ledger = LedgerCanister.create({
        agent,
        canisterId: Principal.fromText(LEDGER_CANISTER_ID)
      });
      
      const accountIdBlob = AccountIdentifier.fromHex(accountIdentifier);
      const balance = await ledger.accountBalance(accountIdBlob);
      
      console.log("💰 Balance del ledger (directo):", balance.toString());
      
      setBalanceLedger(balance);
      
      if (balance > 0) {
        const balanceICP = Number(balance) / 100_000_000;
        setSuccess(`✅ LEDGER: ${balanceICP.toFixed(4)} ICP`);
      } else {
        setError("El ledger también muestra 0. Verifica la transacción en el explorador.");
      }
      
    } catch (err) {
      console.error("❌ Error consultando ledger:", err);
      setError(`Error consultando ledger: ${err.message || "Error desconocido"}`);
    } finally {
      setVerificandoLedger(false);
    }
  };

  // ============================================
  // FUNCIÓN PARA VERIFICAR EN EXPLORADOR
  // ============================================
  const verificarEnExplorador = () => {
    if (!accountIdentifier) {
      setError("Primero genera tu Account Identifier");
      return;
    }
    const url = `https://dashboard.internetcomputer.org/account/${accountIdentifier}`;
    window.open(url, '_blank');
  };

  // ============================================
  // FUNCIONES PARA RECIBIR (Account Identifier)
  // ============================================
  const calcularAccountIdentifier = async () => {
    if (!principalId) {
      console.log("No hay principalId");
      return;
    }
    
    console.log("Calculando AccountIdentifier para:", principalId);
    setCargando(true);
    
    try {
      if (contextActor) {
        try {
          const funciones = Object.keys(contextActor);
          const accountFunc = funciones.find(f => 
            f.toLowerCase().includes('account') || 
            f.toLowerCase().includes('identifier')
          );
          
          if (accountFunc) {
            console.log(`✅ Usando función: ${accountFunc}`);
            const result = await contextActor[accountFunc](principalId);
            
            if (result) {
              if (typeof result === 'string') {
                const hexMatch = result.match(/[0-9a-f]{64}/i);
                if (hexMatch) {
                  setAccountIdentifier(hexMatch[0]);
                } else {
                  setAccountIdentifier(result);
                }
              } else {
                setAccountIdentifier(String(result));
              }
              setCargando(false);
              return;
            }
          }
        } catch (e) {
          console.log("Error con backend:", e);
        }
      }
      
      try {
        console.log("🔧 Calculando AccountIdentifier localmente...");
        
        const principal = Principal.fromText(principalId);
        const subaccount = new Uint8Array(32);
        
        const accountId = AccountIdentifier.fromPrincipal({
          principal,
          subaccount: subaccount
        });
        
        const accountIdHex = accountId.toHex();
        console.log("✅ AccountIdentifier generado:", accountIdHex);
        
        if (accountIdHex && accountIdHex.length === 64) {
          setAccountIdentifier(accountIdHex);
          setSuccess("✅ Dirección generada correctamente");
        } else {
          throw new Error("Formato incorrecto");
        }
        
      } catch (e) {
        console.error("❌ Error en cálculo local:", e);
        setAccountIdentifier("Error al generar dirección");
      }
      
    } catch (err) {
      console.error("Error general:", err);
      setAccountIdentifier("ERROR");
    } finally {
      setCargando(false);
    }
  };

  // Polling automático
  useEffect(() => {
    let interval;
    if (activeTab === "recibir" && pollingActivo && contextActor && actorReady) {
      loadSaldo();
      interval = setInterval(loadSaldo, 30000);
    }
    return () => clearInterval(interval);
  }, [activeTab, pollingActivo, contextActor, actorReady]);

  // Cargar datos iniciales
  useEffect(() => {
    if (contextActor && actorReady && principalId) {
      console.log("🔄 Cargando datos iniciales...");
      loadSaldo();
      calcularAccountIdentifier();
    }
  }, [contextActor, actorReady, principalId]);

  // ============================================
  // FUNCIÓN PARA RETIRAR ICP (CORREGIDA)
  // ============================================
  const handleRetirarICP = async () => {
    // Validaciones básicas
    if (!contextActor) {
      setError("Backend no disponible");
      return;
    }
    
    if (!destinatarioId) {
      setError("Por favor ingresa una dirección destino");
      return;
    }
    
    if (retirarMonto <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }
    
    // Validar que tenga saldo suficiente (incluyendo fee)
    const montoE8s = BigInt(Math.round(retirarMonto * 100_000_000));
    const feeE8s = 10000n; // TRANSFER_FEE del backend
    const totalE8s = montoE8s + feeE8s;
    
    if (totalE8s > balanceEnE8s) {
      setError(`Saldo insuficiente. Necesitas ${(retirarMonto + 0.0001).toFixed(4)} ICP (incluyendo fee)`);
      return;
    }
    
    setCargando(true);
    setError("");
    setSuccess("⌛ Procesando retiro... Esto puede tomar unos segundos");
    
    try {
      console.log("🔄 Iniciando retiro:", {
        destino: destinatarioId,
        montoICP: retirarMonto,
        montoE8s: montoE8s.toString()
      });
      
      // Validar y convertir la dirección destino
      let bytes;
      const esHexValido = /^[0-9a-fA-F]{64}$/.test(destinatarioId);
      
      if (esHexValido) {
        // Es un Account Identifier de 64 caracteres hex
        bytes = new Uint8Array(
          destinatarioId.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
        );
      } else {
        // Intentar convertir si es un Principal ID
        try {
          const principal = Principal.fromText(destinatarioId);
          const subaccount = new Uint8Array(32);
          const accountId = AccountIdentifier.fromPrincipal({
            principal,
            subaccount
          });
          const accountIdHex = accountId.toHex();
          bytes = new Uint8Array(
            accountIdHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
          );
        } catch (e) {
          setError("Formato inválido. Debe ser un Account Identifier de 64 caracteres o un Principal ID válido");
          setCargando(false);
          return;
        }
      }
      
      // Llamar al backend
      const result = await contextActor.retirarICP([...bytes], montoE8s);
      
      console.log("📦 Respuesta del backend:", result);
      
      if ("ok" in result) {
        // Éxito
        await loadSaldo();
        
        const blockHeight = result.ok.toString();
        const fechaRetiro = new Date().toLocaleString();
        const explorerUrl = `https://dashboard.internetcomputer.org/transaction/${blockHeight}`;
        
        setSuccess(`✅ ¡Retiro exitoso! Block height: ${blockHeight}`);
        
        const nuevoRetiro = {
          block: blockHeight,
          monto: retirarMonto,
          destino: destinatarioId.substring(0, 10) + "..." + destinatarioId.substring(54),
          fecha: fechaRetiro,
          hash: blockHeight,
          url: explorerUrl
        };
        
        setUltimoRetiro(nuevoRetiro);
        setHistorialRetiros(prev => [nuevoRetiro, ...prev].slice(0, 5));
        
        // Limpiar campos
        setDestinatarioId("");
        setRetirarMonto(0);
        
        // Mostrar mensaje de éxito
        MySwal.fire({
          title: '✅ ¡Retiro exitoso!',
          html: `
            <p>Se han enviado <strong>${retirarMonto} ICP</strong> correctamente.</p>
            <p>Block height: <code>${blockHeight}</code></p>
            <p class="text-muted small">La transacción puede tomar unos minutos en confirmarse.</p>
            <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer">
              Ver en explorador
            </a>
          `,
          icon: 'success',
          confirmButtonColor: '#28a745'
        });
        
      } else {
        // Error del backend
        console.error("❌ Error en retiro:", result.err);
        
        let mensajeError = "Error al procesar el retiro";
        
        if (typeof result.err === 'object') {
          if ('SaldoInsuficiente' in result.err) {
            mensajeError = `Saldo insuficiente. Disponible: ${balance.toFixed(4)} ICP`;
          } else if ('ErrorLedger' in result.err) {
            mensajeError = `Error del ledger: ${result.err.ErrorLedger.mensaje || JSON.stringify(result.err.ErrorLedger)}`;
          } else if ('PermisoDenegado' in result.err) {
            mensajeError = "No tienes permiso para realizar este retiro";
          } else {
            mensajeError = JSON.stringify(result.err);
          }
        }
        
        setError(`❌ ${mensajeError}`);
      }
      
    } catch (err) {
      console.error("❌ Error de red al retirar ICP:", err);
      setError(`❌ Error de conexión: ${err.message || "Intenta nuevamente"}`);
    } finally {
      setCargando(false);
    }
  };

  // ============================================
  // FUNCIÓN CORREGIDA PARA COPIAR AL PORTAPAPELES
  // ============================================
  const copiarAlPortapapeles = async (texto) => {
    if (!texto || texto.includes("Error")) {
      setError("No hay una dirección válida para copiar");
      return;
    }
    
    try {
      // Usar el método moderno con verificación de permisos
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 3000);
        
        // Usar toast en lugar de SweetAlert para no interferir con permisos
        const toast = MySwal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true
        });
        
        toast.fire({
          icon: 'success',
          title: '✅ Dirección copiada'
        });
      } else {
        // Fallback para navegadores antiguos
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        setCopiado(true);
        setTimeout(() => setCopiado(false), 3000);
        
        alert('Dirección copiada al portapapeles');
      }
    } catch (err) {
      console.error("Error copying:", err);
      
      // Mostrar la dirección en un popup si no se puede copiar
      MySwal.fire({
        title: '📋 Dirección',
        html: `<p style="word-break: break-all;">${texto}</p>`,
        icon: 'info',
        confirmButtonText: 'Copiar manualmente'
      });
    }
  };

  // ============================================
  // FUNCIÓN PARA VERIFICAR TRANSACCIÓN EN EXPLORADOR
  // ============================================
  const verificarTransaccion = (blockHeight) => {
    window.open(`https://dashboard.internetcomputer.org/transaction/${blockHeight}`, '_blank');
  };

  // ============================================
  // FUNCIONES UTILITARIAS
  // ============================================
  const iniciarPolling = () => {
    setPollingActivo(true);
    setSuccess("🔍 Buscando ICP entrantes... Actualizando cada 30 segundos");
  };

  const formatearAccountId = (id) => {
    if (!id || id.length < 64) return id;
    return `${id.substring(0, 8)}...${id.substring(56)}`;
  };

  // ============================================
  // RENDER
  // ============================================
  if (!isAuthenticated) {
    return (
      <Container className="mt-5 text-center">
        <Card className="shadow p-5">
          <h2>🔒 Inicia Sesión</h2>
          <p className="text-muted">Debes iniciar sesión para ver tu billetera</p>
        </Card>
      </Container>
    );
  }

  if (authLoading || !actorReady) {
    return (
      <Container className="mt-5 text-center">
        <Card className="shadow p-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Conectando con Internet Computer...</p>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <Card className="shadow">
            <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white">
              <div>
                <span className="h5 mb-0">💳 Mi Billetera ICP</span>
                <Badge bg="info" className="ms-2">Mainnet</Badge>
              </div>
              <div>
                <Badge bg="light" text="dark" className="me-2 p-2">
                  {conectando ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <>Saldo: <strong>{balance.toFixed(4)} ICP</strong></>
                  )}
                </Badge>
                <Button 
                  size="sm" 
                  variant="light" 
                  onClick={loadSaldo}
                  disabled={conectando}
                  title="Actualizar saldo"
                >
                  🔄
                </Button>
              </div>
            </Card.Header>
            
            <Card.Body>
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError("")}>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess("")}>
                  {success}
                </Alert>
              )}
              
              <Tabs 
                activeKey={activeTab} 
                onSelect={(k) => { 
                  setActiveTab(k); 
                  setError(""); 
                  setSuccess("");
                  setPollingActivo(false);
                }} 
                className="mb-4"
                fill
              >
                {/* TAB RECIBIR */}
                <Tab eventKey="recibir" title={<span><FaArrowDown className="me-1" /> Recibir ICP</span>}>
                  <div className="p-3">
                    <h5 className="text-center mb-4">📥 Recibe ICP desde Binance u otra wallet</h5>
                    
                    <Card className="bg-light border-success">
                      <Card.Body>
                        <p className="text-muted mb-2">Tu dirección para recibir ICP:</p>
                        
                        <div className="bg-white p-3 rounded border">
                          <code style={{ 
                            fontSize: '14px', 
                            wordBreak: 'break-all',
                            display: 'block',
                            textAlign: 'center'
                          }}>
                            {cargando ? 'Generando dirección...' : (accountIdentifier || 'Generando dirección...')}
                          </code>
                        </div>
                        
                        <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => copiarAlPortapapeles(accountIdentifier)}
                            disabled={!accountIdentifier || accountIdentifier.includes("Error") || cargando}
                          >
                            {copiado ? <FaCheck className="text-success" /> : <FaCopy className="me-1" />}
                            {copiado ? 'Copiado' : 'Copiar dirección'}
                          </Button>
                          
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            onClick={iniciarPolling}
                            disabled={pollingActivo || cargando}
                          >
                            {pollingActivo ? 'Buscando...' : '🔍 Buscar ICP entrantes'}
                          </Button>

                          <Button 
                            variant="warning" 
                            size="sm"
                            onClick={consultarLedgerDirecto}
                            disabled={!accountIdentifier || verificandoLedger || cargando}
                          >
                            {verificandoLedger ? (
                              <>
                                <Spinner animation="border" size="sm" className="me-1" />
                                Verificando...
                              </>
                            ) : (
                              <>
                                <FaSearch className="me-1" />
                                Verificar Ledger
                              </>
                            )}
                          </Button>

                          <Button 
                            variant="info" 
                            size="sm"
                            onClick={verificarEnExplorador}
                            disabled={!accountIdentifier}
                          >
                            <FaExternalLinkAlt className="me-1" />
                            Ver en Explorador
                          </Button>
                        </div>
                        
                        {pollingActivo && (
                          <Alert variant="info" className="mt-3 mb-0 py-2">
                            <small>⏳ Buscando transferencias...</small>
                          </Alert>
                        )}
                      </Card.Body>
                    </Card>
                  </div>
                </Tab>

                {/* TAB RETIRAR - AHORA IMPLEMENTADO */}
                <Tab eventKey="retirar" title={<span><FaArrowUp className="me-1" /> Retirar ICP</span>}>
                  <div className="p-3">
                    <h5 className="text-center mb-4">💸 Retirar ICP a Binance u otra wallet</h5>
                    
                    <Card className="border-danger">
                      <Card.Body>
                        <Form>
                          <Form.Group className="mb-3">
                            <Form.Label>Dirección destino</Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="Account Identifier (64 hex) o Principal ID"
                              value={destinatarioId}
                              onChange={(e) => setDestinatarioId(e.target.value)}
                            />
                            <Form.Text className="text-muted">
                              Puedes usar un Account Identifier de 64 caracteres o un Principal ID
                            </Form.Text>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label>Monto a retirar (ICP)</Form.Label>
                            <InputGroup>
                              <Form.Control
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={retirarMonto}
                                onChange={(e) => setRetirarMonto(Number(e.target.value))}
                                max={balance - 0.0001}
                              />
                              <InputGroup.Text>ICP</InputGroup.Text>
                            </InputGroup>
                            <Form.Text className="text-muted">
                              Saldo disponible: {balance.toFixed(4)} ICP (incluye fee de 0.0001 ICP)
                            </Form.Text>
                          </Form.Group>

                          <div className="d-grid gap-2">
                            <Button 
                              variant="danger" 
                              size="lg"
                              onClick={handleRetirarICP}
                              disabled={cargando || !destinatarioId || retirarMonto <= 0 || retirarMonto > balance - 0.0001}
                            >
                              {cargando ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" />
                                  Procesando retiro...
                                </>
                              ) : (
                                <>
                                  <FaArrowUp className="me-2" />
                                  Retirar ICP
                                </>
                              )}
                            </Button>
                          </div>
                        </Form>

                        {/* Último retiro */}
                        {ultimoRetiro && (
                          <div className="mt-4 p-3 bg-light rounded">
                            <h6 className="mb-2">📤 Último retiro:</h6>
                            <div className="small">
                              <div><strong>Monto:</strong> {ultimoRetiro.monto} ICP</div>
                              <div><strong>Destino:</strong> {ultimoRetiro.destino}</div>
                              <div><strong>Block:</strong> {ultimoRetiro.block}</div>
                              <div><strong>Fecha:</strong> {ultimoRetiro.fecha}</div>
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="p-0 mt-1"
                                onClick={() => verificarTransaccion(ultimoRetiro.block)}
                              >
                                Ver en explorador <FaExternalLinkAlt size={12} />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Historial de retiros */}
                        {historialRetiros.length > 0 && (
                          <div className="mt-4">
                            <h6 className="mb-2">
                              <FaHistory className="me-1" /> Historial de retiros
                            </h6>
                            <div className="small">
                              {historialRetiros.map((retiro, idx) => (
                                <div key={idx} className="d-flex justify-content-between align-items-center border-bottom py-1">
                                  <span>{retiro.fecha} - {retiro.monto} ICP</span>
                                  <Button 
                                    variant="link" 
                                    size="sm" 
                                    className="p-0"
                                    onClick={() => verificarTransaccion(retiro.block)}
                                  >
                                    <FaExternalLinkAlt size={10} />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </div>
                </Tab>
              </Tabs>

              <div className="mt-4 p-3 bg-light rounded">
                <h6>📋 Información de tu cuenta</h6>
                <div className="small">
                  <p className="mb-1"><strong>Principal ID:</strong> <code>{principalId}</code></p>
                  <p className="mb-1"><strong>Account Identifier:</strong> <code className="text-success">{formatearAccountId(accountIdentifier) || 'Generando...'}</code></p>
                  <p className="mb-1"><strong>Tipo de cuenta:</strong> Cliente</p>
                  <p className="mb-0"><strong>Saldo en e8s:</strong> {balanceEnE8s.toString()}</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Wallet;