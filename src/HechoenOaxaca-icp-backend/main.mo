import Principal "mo:base/Principal";
import Result "mo:base/Result";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Blob "mo:base/Blob";          
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Buffer "mo:base/Buffer";
import Error "mo:base/Error";
import AccountIdentifier "mo:account-identifier";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Nat32 "mo:base/Nat32";
import Nat8 "mo:base/Nat8";

import Ledger "./Ledger";

persistent actor class HechoenOaxacaBackend() = this {

  // ========= CONFIGURACIÓN =========
  transient let TRANSFER_FEE : Nat64 = 10_000;
  transient let TIEMPO_EXPIRACION : Int = 300_000_000_000; // 5 minutos
  transient let MAX_PAGOS_ACTIVOS_POR_USUARIO : Nat = 5;
  transient let MAX_BLOQUES_POR_SCAN : Nat64 = 50;
  transient let MAX_LOGS : Nat = 1000;
  transient let MAX_STRING_LEN : Nat = 100;
  transient let MAX_IMAGE_LENGTH : Nat = 2_500_000; // 🔥 2.5M caracteres para base64
  transient let MAX_DESCRIPTION_LEN : Nat = 2_000;  // 🔥 2000 caracteres para descripción
  transient let BASE_BP : Nat64 = 10_000; // 100% en basis points

  // Admin y comisión (variables estables)
  var ADMIN : Principal = Principal.fromActor(this);
  stable var COMISION_BP : Nat64 = 500; // 5%
  stable var totalComisiones : Nat64 = 0;
  stable var totalVentas : Nat64 = 0;

  transient let ledger = actor("ryjl3-tyaaa-aaaaa-aaaba-cai") : Ledger.Self;

  // Contador local para IDs y memo (evita Random.blob)
  private var idCounter : Nat = 0;
  private func genId(prefix : Text, caller : Principal) : Text {
    idCounter += 1;
    prefix # Int.toText(Time.now()) # "-" # Nat.toText(idCounter) # "-" # Principal.toText(caller)
  };

  // ========= FUNCIONES DE HASH =========
  private func hashPrincipal(p : Principal) : Nat32 {
    Blob.hash(Principal.toBlob(p))
  };
  private func hashText(t : Text) : Nat32 {
    Blob.hash(Text.encodeUtf8(t))
  };
  private func hashNat64(n : Nat64) : Nat32 {
    let bytes = [
      Nat8.fromNat(Nat64.toNat((n >> 56) & 0xff)),
      Nat8.fromNat(Nat64.toNat((n >> 48) & 0xff)),
      Nat8.fromNat(Nat64.toNat((n >> 40) & 0xff)),
      Nat8.fromNat(Nat64.toNat((n >> 32) & 0xff)),
      Nat8.fromNat(Nat64.toNat((n >> 24) & 0xff)),
      Nat8.fromNat(Nat64.toNat((n >> 16) & 0xff)),
      Nat8.fromNat(Nat64.toNat((n >> 8) & 0xff)),
      Nat8.fromNat(Nat64.toNat(n & 0xff))
    ];
    Blob.hash(Blob.fromArray(bytes))
  };

  // ========= UTILIDADES =========
  private func accountOf(p : Principal) : Blob {
    AccountIdentifier.accountIdentifier(p, AccountIdentifier.defaultSubaccount())
  };
  private func toHex(b : Blob) : Text {
    let hex = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"];
    var out = "";
    for (byte in Blob.toArray(b).vals()) {
      out #= hex[Nat8.toNat(byte >> 4)] # hex[Nat8.toNat(byte & 0x0F)];
    };
    out
  };
  private func log(t : Text) {
    if (logs.size() >= MAX_LOGS) {
      ignore logs.remove(0);
    };
    logs.add(Int.toText(Time.now()) # ": " # t);
  };
  private func esAdmin(p : Principal) : Bool { p == ADMIN };

  // ========= TIPOS =========
  public type Rol = { #Artesano; #Intermediario; #Cliente };
  public type Usuario = {
    nombreCompleto : Text;
    lugarOrigen : Text;
    telefono : Text;
    rol : Rol;
    fechaRegistro : Int;
    verificado : Bool;
    accountId : Blob;
  };
  public type Producto = {
    id : Text;
    nombre : Text;
    precio : Nat64;
    descripcion : Text;
    artesano : Principal;
    tipo : Text;
    imagenes : [Text];
    firma : ?Text;
    certificado : ?Text;
    stock : Nat;
    reservado : Nat;
    fechaCreacion : Int;
    activo : Bool;
    hash : Text;           // Huella digital
    fechaCertificacion : Int;
  };
  public type Transaccion = {
    id : Text;
    comprador : Principal;
    vendedor : Principal;
    productoIds : [Text];
    monto : Nat64;
    fecha : Int;
    blockHeight : ?Nat64;
    estado : Text;
  };
  public type AplicationError = {
    #UsuarioNoExiste;
    #UsuarioYaExiste;
    #RolNoValido;
    #SaldoInsuficiente;
    #ProductoNoExiste;
    #StockInsuficiente;
    #PermisoDenegado;
    #ErrorValidacion : Text;
    #ErrorLedger : { codigo : Text; mensaje : Text; };
    #ErrorInterno : Text;
  };
  public type EstadoPago = {
    #iniciado;
    #procesando;
    #pagado;
    #enviado;
    #entregado;
    #fallido;
    #expirado;
    #reembolsado;
  };
  public type EstadoEscrow = {
    #EnEscrow;
    #Liberado;
    #Reembolsado;
  };
  public type PagoPendiente = {
    id : Text;
    comprador : Principal;
    productos : [Text];
    montoTotal : Nat64;
    estado : EstadoPago;
    blockHeight : ?Nat64;
    memo : Nat64;
    fechaCreacion : Int;
    vendedores : ?[Principal];
    montosPorVendedor : ?[(Principal, Nat64)];
    estadoEscrow : ?EstadoEscrow;
  };
  public type ItemCarrito = {
    productoId : Text;
    precioSnapshot : Nat64;
  };
  public type Carrito = {
    items : [ItemCarrito];
    ultimaActualizacion : Int;
  };

  // ========= ESTADO =========
  transient var usuarios = HashMap.HashMap<Principal, Usuario>(0, Principal.equal, hashPrincipal);
  transient var productos = HashMap.HashMap<Text, Producto>(0, Text.equal, hashText);
  transient var transacciones = HashMap.HashMap<Text, Transaccion>(0, Text.equal, hashText);
  transient var logs = Buffer.Buffer<Text>(0);
  transient var pagosPendientes = HashMap.HashMap<Text, PagoPendiente>(0, Text.equal, hashText);
  transient var pagosPorBlock = HashMap.HashMap<Nat64, Text>(0, Nat64.equal, hashNat64);
  transient var pagosPorMemo = HashMap.HashMap<Nat64, Text>(0, Nat64.equal, hashNat64);
  transient var carritos = HashMap.HashMap<Principal, Carrito>(0, Principal.equal, hashPrincipal);
  transient var transfersPendientes = HashMap.HashMap<Text, [(Principal, Nat64)]>(0, Text.equal, hashText);
  transient var pagosPorUsuario = HashMap.HashMap<Principal, Nat>(0, Principal.equal, hashPrincipal);
  
  // 🔥 NUEVO: Contador de productos por artesano (evita recorrer todos los productos)
  transient var contadorProductosPorArtesano = HashMap.HashMap<Principal, Nat>(0, Principal.equal, hashPrincipal);
  
  // Índices para escalabilidad
  transient var productosPorArtesano = HashMap.HashMap<Principal, Buffer.Buffer<Text>>(0, Principal.equal, hashPrincipal);
  transient var productosPorTipo = HashMap.HashMap<Text, Buffer.Buffer<Text>>(0, Text.equal, hashText);
  transient var ventasPorVendedor = HashMap.HashMap<Principal, Buffer.Buffer<Transaccion>>(0, Principal.equal, hashPrincipal);
  
  // Estable para upgrades
  stable var stableUltimoBloqueEscaneado : Nat64 = 0;
  private transient var ultimoBloqueEscaneado : Nat64 = stableUltimoBloqueEscaneado;
  stable var stableIdCounter : Nat = 0;
  
  stable var stableUsuarios : [(Principal, Usuario)] = [];
  stable var stableProductos : [(Text, Producto)] = [];
  stable var stableTransacciones : [(Text, Transaccion)] = [];
  stable var stableLogs : [Text] = [];
  stable var stablePagosPendientes : [(Text, PagoPendiente)] = [];
  stable var stablePagosPorBlock : [(Nat64, Text)] = [];
  stable var stablePagosPorMemo : [(Nat64, Text)] = [];
  stable var stableCarritos : [(Principal, Carrito)] = [];
  stable var stableTransfersPendientes : [(Text, [(Principal, Nat64)])] = [];
  stable var stablePagosPorUsuario : [(Principal, Nat)] = [];

  // ========= AUXILIARES =========
  private func generarHashProducto(nombre : Text, descripcion : Text, tipo : Text, artesano : Principal, fecha : Int) : Text {
    let data = nombre # "|" # descripcion # "|" # tipo # "|" # Principal.toText(artesano) # "|" # Int.toText(fecha);
    let hash = Blob.hash(Text.encodeUtf8(data));
    Nat32.toText(hash)
  };
  private func incrementNat64(map : HashMap.HashMap<Principal, Nat64>, key : Principal, value : Nat64) : () {
    let current = Option.get(map.get(key), 0:Nat64);
    map.put(key, current + value);
  };
  private func limpiarPagosExpirados() {
    let ahora = Time.now();
    for ((id, pago) in pagosPendientes.entries()) {
      if (ahora - pago.fechaCreacion > TIEMPO_EXPIRACION) {
        liberarReservas(pago.productos);
        switch (pago.blockHeight) {
          case (?bh) { pagosPorBlock.delete(bh); };
          case null { () };
        };
        pagosPorMemo.delete(pago.memo);
        let count = Option.get(pagosPorUsuario.get(pago.comprador), 0);
        if (count > 0) pagosPorUsuario.put(pago.comprador, count - 1);
        pagosPendientes.delete(id);
        log("⏰ Pago expirado: " # id);
      }
    }
  };
  private func reservarProductos(productosIds : [Text]) : Result.Result<(), AplicationError> {
    for (pid in productosIds.vals()) {
      switch (productos.get(pid)) {
        case (?prod) {
          if (not prod.activo) return #err(#ProductoNoExiste);
          let disponible = if (prod.stock > prod.reservado) prod.stock - prod.reservado else 0;
          if (disponible < 1) return #err(#StockInsuficiente);
          productos.put(pid, {
            id = prod.id;
            nombre = prod.nombre;
            precio = prod.precio;
            descripcion = prod.descripcion;
            artesano = prod.artesano;
            tipo = prod.tipo;
            imagenes = prod.imagenes;
            firma = prod.firma;
            certificado = prod.certificado;
            stock = prod.stock;
            reservado = prod.reservado + 1;
            fechaCreacion = prod.fechaCreacion;
            activo = prod.activo;
            hash = prod.hash;
            fechaCertificacion = prod.fechaCertificacion;
          });
        };
        case null return #err(#ProductoNoExiste);
      };
    };
    #ok(())
  };
  private func liberarReservas(productosIds : [Text]) {
    for (pid in productosIds.vals()) {
      switch (productos.get(pid)) {
        case (?prod) {
          if (prod.reservado > 0) {
            productos.put(pid, {
              id = prod.id;
              nombre = prod.nombre;
              precio = prod.precio;
              descripcion = prod.descripcion;
              artesano = prod.artesano;
              tipo = prod.tipo;
              imagenes = prod.imagenes;
              firma = prod.firma;
              certificado = prod.certificado;
              stock = prod.stock;
              reservado = prod.reservado - 1;
              fechaCreacion = prod.fechaCreacion;
              activo = prod.activo;
              hash = prod.hash;
              fechaCertificacion = prod.fechaCertificacion;
            });
          };
        };
        case null { () };
      };
    };
  };
  private func consumirStock(productosIds : [Text]) {
    for (pid in productosIds.vals()) {
      switch (productos.get(pid)) {
        case (?prod) {
          if (prod.reservado > 0 and prod.stock > 0) {
            productos.put(pid, {
              id = prod.id;
              nombre = prod.nombre;
              precio = prod.precio;
              descripcion = prod.descripcion;
              artesano = prod.artesano;
              tipo = prod.tipo;
              imagenes = prod.imagenes;
              firma = prod.firma;
              certificado = prod.certificado;
              stock = prod.stock - 1;
              reservado = prod.reservado - 1;
              fechaCreacion = prod.fechaCreacion;
              activo = prod.activo;
              hash = prod.hash;
              fechaCertificacion = prod.fechaCertificacion;
            });
          };
        };
        case null { () };
      };
    };
  };
  private func actualizarIndicesProducto(prod : Producto, oldArtesano : ?Principal, oldTipo : ?Text) {
    // Índice por artesano
    switch (oldArtesano) {
      case (?art) {
        let buf = productosPorArtesano.get(art);
        switch (buf) {
          case null {};
          case (?b) {
            let nuevo = Buffer.Buffer<Text>(0);
            for (id in b.vals()) if (id != prod.id) nuevo.add(id);
            productosPorArtesano.put(art, nuevo);
          };
        };
      };
      case null {};
    };
    let artBuf = switch (productosPorArtesano.get(prod.artesano)) {
      case null { let b = Buffer.Buffer<Text>(0); productosPorArtesano.put(prod.artesano, b); b };
      case (?b) b;
    };
    artBuf.add(prod.id);
    // Índice por tipo
    switch (oldTipo) {
      case (?tip) {
        let buf = productosPorTipo.get(tip);
        switch (buf) {
          case null {};
          case (?b) {
            let nuevo = Buffer.Buffer<Text>(0);
            for (id in b.vals()) if (id != prod.id) nuevo.add(id);
            productosPorTipo.put(tip, nuevo);
          };
        };
      };
      case null {};
    };
    let tipoBuf = switch (productosPorTipo.get(prod.tipo)) {
      case null { let b = Buffer.Buffer<Text>(0); productosPorTipo.put(prod.tipo, b); b };
      case (?b) b;
    };
    tipoBuf.add(prod.id);
  };

  // ========= FUNCIONES INTERNAS DE PAGO =========
  private func _confirmarPago(pagoId : Text, blockHeight : Nat64) : async Result.Result<Text, AplicationError> {
    try {
      limpiarPagosExpirados();
      switch (pagosPendientes.get(pagoId)) {
        case null return #err(#ErrorValidacion("Pago no encontrado"));
        case (?pago) {
          if (Time.now() - pago.fechaCreacion > TIEMPO_EXPIRACION) {
            liberarReservas(pago.productos);
            switch (pago.blockHeight) {
              case (?bh) { pagosPorBlock.delete(bh); };
              case null { () };
            };
            pagosPorMemo.delete(pago.memo);
            let count = Option.get(pagosPorUsuario.get(pago.comprador), 0);
            if (count > 0) pagosPorUsuario.put(pago.comprador, count - 1);
            pagosPendientes.put(pagoId, { pago with estado = #expirado });
            return #err(#ErrorValidacion("Pago expirado"));
          };
          switch (pago.estado) {
            case (#iniciado) {
              pagosPendientes.put(pagoId, { pago with estado = #procesando });
            };
            case _ return #err(#ErrorValidacion("Ya procesado"));
          };
          switch (pagosPorBlock.get(blockHeight)) {
            case (?_) {
              pagosPendientes.put(pagoId, { pago with estado = #fallido });
              return #err(#ErrorValidacion("Block ya usado"));
            };
            case null { () };
          };
          let tx = await ledger.query_blocks({ start = blockHeight; length = 1 });
          if (tx.blocks.size() == 0) {
            pagosPendientes.put(pagoId, { pago with estado = #fallido });
            return #err(#ErrorValidacion("Block inválido"));
          };
          let block = tx.blocks[0];
          if (block.timestamp.timestamp_nanos < Nat64.fromIntWrap(pago.fechaCreacion)) {
            pagosPendientes.put(pagoId, { pago with estado = #fallido });
            return #err(#ErrorValidacion("Transacción antigua"));
          };
          switch (block.transaction.operation) {
            case (#Transfer transfer) {
              let cuentaCanister = accountOf(Principal.fromActor(this));
              let cuentaComprador = accountOf(pago.comprador);
              if (transfer.to != cuentaCanister) {
                pagosPendientes.put(pagoId, { pago with estado = #fallido });
                return #err(#ErrorValidacion("Destino incorrecto"));
              };
              if (transfer.from != cuentaComprador) {
                pagosPendientes.put(pagoId, { pago with estado = #fallido });
                return #err(#ErrorValidacion("Origen incorrecto"));
              };
              if (transfer.amount.e8s < pago.montoTotal) {
                pagosPendientes.put(pagoId, { pago with estado = #fallido });
                return #err(#ErrorValidacion("Monto insuficiente"));
              };
              if (block.transaction.memo != pago.memo) {
                pagosPendientes.put(pagoId, { pago with estado = #fallido });
                return #err(#ErrorValidacion("Memo inválido"));
              };
              
              let mapaVendedores = HashMap.HashMap<Principal, Nat64>(0, Principal.equal, hashPrincipal);
              for (pid in pago.productos.vals()) {
                switch (productos.get(pid)) {
                  case (?prod) { incrementNat64(mapaVendedores, prod.artesano, prod.precio); };
                  case null { };
                };
              };
              let vendedoresList = Iter.toArray(mapaVendedores.keys());
              let montosList = Iter.toArray(mapaVendedores.entries());
              
              let pagoActualizado : PagoPendiente = {
                id = pago.id;
                comprador = pago.comprador;
                productos = pago.productos;
                montoTotal = pago.montoTotal;
                estado = #pagado;
                blockHeight = ?blockHeight;
                memo = pago.memo;
                fechaCreacion = pago.fechaCreacion;
                vendedores = ?vendedoresList;
                montosPorVendedor = ?montosList;
                estadoEscrow = ?#EnEscrow;
              };
              pagosPendientes.put(pagoId, pagoActualizado);
              pagosPorBlock.put(blockHeight, pagoId);
              log("✅ Pago confirmado en escrow: " # pagoId);
              return #ok("Pago en escrow");
            };
            case _ {
              pagosPendientes.put(pagoId, { pago with estado = #fallido });
              return #err(#ErrorValidacion("No es transferencia"));
            };
          };
        };
      };
    } catch (e) {
      #err(#ErrorInterno(Error.message(e)))
    }
  };

  // Optimización: solo consultar el ledger si hay pagos pendientes
  private func verificarPagosAutomaticamente() : async () {
    if (pagosPendientes.size() == 0) return;
    let latest = await ledger.query_blocks({ start = 0; length = 0 });
    let chainLength = latest.chain_length;
    if (chainLength <= ultimoBloqueEscaneado) return;
    let start = ultimoBloqueEscaneado;
    if (chainLength <= start) return;
    let length = chainLength - start;
    let lengthFinal = if (length > MAX_BLOQUES_POR_SCAN) MAX_BLOQUES_POR_SCAN else length;
    let bloques = await ledger.query_blocks({ start = start; length = lengthFinal });
    var blockIndex = start;
    for (block in bloques.blocks.vals()) {
      if (pagosPorBlock.get(blockIndex) == null) {
        switch (block.transaction.operation) {
          case (#Transfer transfer) {
            switch (pagosPorMemo.get(block.transaction.memo)) {
              case (?pagoId) {
                ignore await _confirmarPago(pagoId, blockIndex);
              };
              case null {};
            };
          };
          case _ {};
        };
      };
      blockIndex += 1;
    };
    ultimoBloqueEscaneado := start + lengthFinal;
  };

  // ========= USUARIOS =========
  public shared ({ caller }) func registrarUsuario(
    nombreCompleto : Text,
    lugarOrigen : Text,
    telefono : Text,
    rol : Text
  ) : async Result.Result<(), AplicationError> {
    if (usuarios.get(caller) != null) return #err(#UsuarioYaExiste);
    if (Text.size(nombreCompleto) < 3 or Text.size(nombreCompleto) > MAX_STRING_LEN) return #err(#ErrorValidacion("Nombre inválido"));
    if (Text.size(lugarOrigen) < 3 or Text.size(lugarOrigen) > MAX_STRING_LEN) return #err(#ErrorValidacion("Origen inválido"));
    if (Text.size(telefono) < 7 or Text.size(telefono) > 20) return #err(#ErrorValidacion("Teléfono inválido"));
    let rolUsuario : ?Rol = switch (rol) {
      case "Artesano" ?#Artesano;
      case "Intermediario" ?#Intermediario;
      case "Cliente" ?#Cliente;
      case _ null;
    };
    switch (rolUsuario) {
      case null return #err(#RolNoValido);
      case (?r) {
        usuarios.put(caller, {
          nombreCompleto = nombreCompleto;
          lugarOrigen = lugarOrigen;
          telefono = telefono;
          rol = r;
          fechaRegistro = Time.now();
          verificado = false;
          accountId = accountOf(caller);
        });
        log("🆕 Usuario: " # Principal.toText(caller));
        #ok(())
      }
    }
  };

  public shared ({ caller }) func actualizarPerfil(nombreCompleto : Text, lugarOrigen : Text, telefono : Text) : async Result.Result<(), AplicationError> {
  switch (usuarios.get(caller)) {
    case null { return #err(#UsuarioNoExiste); };
    case (?u) {
      if (Text.size(nombreCompleto) < 3 or Text.size(nombreCompleto) > MAX_STRING_LEN) return #err(#ErrorValidacion("Nombre inválido"));
      if (Text.size(lugarOrigen) < 3 or Text.size(lugarOrigen) > MAX_STRING_LEN) return #err(#ErrorValidacion("Origen inválido"));
      if (Text.size(telefono) < 7 or Text.size(telefono) > 20) return #err(#ErrorValidacion("Teléfono inválido"));
      usuarios.put(caller, {
        nombreCompleto = nombreCompleto;
        lugarOrigen = lugarOrigen;
        telefono = telefono;
        rol = u.rol;
        fechaRegistro = u.fechaRegistro;
        verificado = u.verificado;
        accountId = u.accountId;
      });
      return #ok(());
    };
  };
};

  public query ({ caller }) func obtenerUsuario() : async Result.Result<Usuario, AplicationError> {
  switch (usuarios.get(caller)) {
    case null { return #err(#UsuarioNoExiste); };
    case (?u) { return #ok(u); };
  };
};
  public query func obtenerUsuarioPorPrincipal(p : Principal) : async Result.Result<Usuario, AplicationError> {
  switch (usuarios.get(p)) {
    case null { return #err(#UsuarioNoExiste); };
    case (?u) { return #ok(u); };
  };
};

  // ========= ADMIN =========
  public shared ({ caller }) func cambiarComision(nueva : Nat64) : async Result.Result<(), AplicationError> {
    if (not esAdmin(caller)) return #err(#PermisoDenegado);
    if (nueva > 2000) return #err(#ErrorValidacion("Comisión máxima 20%"));
    COMISION_BP := nueva;
    log("💰 Comisión cambiada a " # Nat64.toText(nueva));
    #ok(())
  };
  public shared ({ caller }) func cambiarAdmin(nuevo : Principal) : async Result.Result<(), AplicationError> {
    if (not esAdmin(caller)) return #err(#PermisoDenegado);
    ADMIN := nuevo;
    log("👑 Admin cambiado a " # Principal.toText(nuevo));
    #ok(())
  };
  public query func obtenerComision() : async Nat64 { COMISION_BP };
  public query func obtenerAdmin() : async Principal { ADMIN };
  public query func obtenerMetricas() : async (Nat64, Nat64) { (totalVentas, totalComisiones) };

  // ========= PRODUCTOS =========
  public shared ({ caller }) func crearProducto(
    nombre : Text,
    precio : Nat64,
    tipo : Text,
    descripcion : Text,
    imagenes : [Text],
    firma : ?Text,
    certificado : ?Text,
    stock : Nat
  ) : async Result.Result<Producto, AplicationError> {
    if (productos.size() >= 10000) return #err(#ErrorValidacion("Límite global"));
    
    // 🔥 Usar contador en lugar de recorrer todos los productos
    let productosArtesano = Option.get(contadorProductosPorArtesano.get(caller), 0);
    if (productosArtesano >= 100) return #err(#ErrorValidacion("Límite de 100 productos"));
    
    switch (usuarios.get(caller)) {
    case (?u) { if (u.rol != #Artesano) return #err(#PermisoDenegado); };
    case null { return #err(#UsuarioNoExiste); };
  };
    if (Text.size(nombre) < 3 or Text.size(nombre) > MAX_STRING_LEN) return #err(#ErrorValidacion("Nombre inválido"));
    if (precio == 0) return #err(#ErrorValidacion("Precio positivo"));
    // 🔥 Usar MAX_DESCRIPTION_LEN en lugar de 500
    if (Text.size(descripcion) < 10 or Text.size(descripcion) > MAX_DESCRIPTION_LEN) return #err(#ErrorValidacion("Descripción inválida"));
    if (imagenes.size() < 1 or imagenes.size() > 3) return #err(#ErrorValidacion("1-3 imágenes"));
    // 🔥 Usar MAX_IMAGE_LENGTH (2.5M) en lugar de 20k
    for (img in imagenes.vals()) if (Text.size(img) == 0 or Text.size(img) > MAX_IMAGE_LENGTH) return #err(#ErrorValidacion("URL inválida"));
    if (stock == 0) return #err(#ErrorValidacion("Stock positivo"));
    let ahora = Time.now();
    let hash = generarHashProducto(nombre, descripcion, tipo, caller, ahora);
    let id = genId("prod-", caller);
    let prod : Producto = {
      id = id;
      nombre = nombre;
      precio = precio;
      descripcion = descripcion;
      artesano = caller;
      tipo = tipo;
      imagenes = imagenes;
      firma = firma;
      certificado = certificado;
      stock = stock;
      reservado = 0;
      fechaCreacion = ahora;
      activo = true;
      hash = hash;
      fechaCertificacion = ahora;
    };
    productos.put(id, prod);
    actualizarIndicesProducto(prod, null, null);
    
    // 🔥 Incrementar contador
    contadorProductosPorArtesano.put(caller, productosArtesano + 1);
    
    log("🆕 Producto " # id);
    #ok(prod)
  };

  public shared ({ caller }) func actualizarProducto(
    id : Text, nombre : Text, precio : Nat64, descripcion : Text, tipo : Text,
    imagenes : [Text], firma : ?Text, certificado : ?Text, stock : Nat
  ) : async Result.Result<Producto, AplicationError> {
      switch (productos.get(id)) {
        case null { return #err(#ProductoNoExiste); };
        case (?prod) {
        if (prod.artesano != caller) return #err(#PermisoDenegado);
        if (Text.size(nombre) < 3 or Text.size(nombre) > MAX_STRING_LEN) return #err(#ErrorValidacion("Nombre inválido"));
        if (precio == 0) return #err(#ErrorValidacion("Precio positivo"));
        // 🔥 Usar MAX_DESCRIPTION_LEN en lugar de 500
        if (Text.size(descripcion) < 10 or Text.size(descripcion) > MAX_DESCRIPTION_LEN) return #err(#ErrorValidacion("Descripción inválida"));
        if (imagenes.size() < 1 or imagenes.size() > 3) return #err(#ErrorValidacion("1-3 imágenes"));
        // 🔥 Usar MAX_IMAGE_LENGTH (2.5M) en lugar de 20k
        for (img in imagenes.vals()) if (Text.size(img) == 0 or Text.size(img) > MAX_IMAGE_LENGTH) return #err(#ErrorValidacion("URL inválida"));
        if (stock < prod.reservado) return #err(#ErrorValidacion("Stock insuficiente"));
        let actualizado : Producto = {
          id = prod.id;
          nombre = nombre;
          precio = precio;
          descripcion = descripcion;
          artesano = prod.artesano;
          tipo = tipo;
          imagenes = imagenes;
          firma = firma;
          certificado = certificado;
          stock = stock;
          reservado = prod.reservado;
          fechaCreacion = prod.fechaCreacion;
          activo = prod.activo;
          hash = prod.hash;       // No se modifica
          fechaCertificacion = prod.fechaCertificacion;
        };
        productos.put(id, actualizado);
        actualizarIndicesProducto(actualizado, ?prod.artesano, ?prod.tipo);
        #ok(actualizado)
      };
    }
  };

 public shared ({ caller }) func eliminarProducto(id : Text) : async Result.Result<(), AplicationError> {
        switch (productos.get(id)) {
          case null { return #err(#ProductoNoExiste); };
          case (?prod) {
            if (prod.artesano != caller) return #err(#PermisoDenegado);
            let desactivado = { prod with activo = false };
            productos.put(id, desactivado);
            actualizarIndicesProducto(desactivado, ?prod.artesano, ?prod.tipo);
            
            // 🔥 Decrementar contador
            let current = Option.get(contadorProductosPorArtesano.get(caller), 0);
            if (current > 0) contadorProductosPorArtesano.put(caller, current - 1);
            
            return #ok(());
          };
        };
      };

  // ========= PRODUCTOS - LISTADO (AHORA QUERY) =========
  
  // Función privada con la lógica real (no shared, no query)
  private func _listarProductosPaginado(pagina : Nat, limite : Nat) : [Producto] {
    let inicio = pagina * limite;
    let fin = inicio + limite;
    let buf = Buffer.Buffer<Producto>(0);
    var i = 0;
    for (p in productos.vals()) {
      if (p.activo) {
        if (i >= inicio and i < fin) buf.add(p);
        i += 1;
      };
    };
    Buffer.toArray(buf)
  };

  // Función pública query que expone la lógica
  public query func listarProductosPaginado(pagina : Nat, limite : Nat) : async [Producto] {
    _listarProductosPaginado(pagina, limite)
  };

  public query func listarProductos() : async [Producto] {
    _listarProductosPaginado(0, 1000)
  };

  public query func listarProductosPorArtesano(artesano : Principal) : async [Producto] {
    switch (productosPorArtesano.get(artesano)) {
      case null { [] };
      case (?buf) {
        let ids = Buffer.toArray(buf);
        let result = Buffer.Buffer<Producto>(0);
        for (id in ids.vals()) {
          switch (productos.get(id)) {
            case (?p) { if (p.activo) result.add(p) };
            case null {};
          };
        };
        Buffer.toArray(result)
      };
    }
  };

  public query func listarProductosPorTipo(tipo : Text) : async [Producto] {
    switch (productosPorTipo.get(tipo)) {
      case null { [] };
      case (?buf) {
        let ids = Buffer.toArray(buf);
        let result = Buffer.Buffer<Producto>(0);
        for (id in ids.vals()) {
          switch (productos.get(id)) {
            case (?p) { if (p.activo) result.add(p) };
            case null {};
          };
        };
        Buffer.toArray(result)
      };
    }
  };


  // ========= VERIFICACIÓN DE AUTENTICIDAD =========
 public query func verificarProducto(id : Text) : async Result.Result<{ valido : Bool; hashGuardado : Text; hashCalculado : Text; artesano : Principal; fecha : Int }, AplicationError> {
  switch (productos.get(id)) {
    case null { return #err(#ProductoNoExiste); };
    case (?prod) {
      let hashCalc = generarHashProducto(prod.nombre, prod.descripcion, prod.tipo, prod.artesano, prod.fechaCertificacion);
      return #ok({
        valido = hashCalc == prod.hash;
        hashGuardado = prod.hash;
        hashCalculado = hashCalc;
        artesano = prod.artesano;
        fecha = prod.fechaCertificacion;
      });
    };
  };
};
  public query func obtenerCertificado(id : Text) : async Result.Result<Text, AplicationError> {
  switch (productos.get(id)) {
    case null { return #err(#ProductoNoExiste); };
    case (?prod) {
      let cert = "=== CERTIFICADO DE AUTENTICIDAD ===\nProducto ID: " # prod.id # "\nArtesano: " # Principal.toText(prod.artesano) # "\nFecha: " # Int.toText(prod.fechaCertificacion) # "\nHash: " # prod.hash # "\nVerificado en Hecho en Oaxaca";
      return #ok(cert);
    };
  };
};

  // ========= CARRITO =========
  public shared ({ caller }) func agregarAlCarrito(productoId : Text) : async Result.Result<(), AplicationError> {
    // Validar producto
    let prod = switch (productos.get(productoId)) {
      case null return #err(#ProductoNoExiste);
      case (?p) p;
    };
    if (not prod.activo) return #err(#ProductoNoExiste);
    if (prod.artesano == caller) return #err(#PermisoDenegado);
    let disponible = if (prod.stock > prod.reservado) prod.stock - prod.reservado else 0;
    if (disponible < 1) return #err(#StockInsuficiente);

    // Obtener carrito actual
    let carritoActual = switch (carritos.get(caller)) {
      case null { { items = []; ultimaActualizacion = Time.now() } };
      case (?c) c;
    };
    // Verificar duplicado
    if (Array.find<ItemCarrito>(carritoActual.items, func x = x.productoId == productoId) != null) 
      return #err(#ErrorValidacion("Ya en carrito"));

    let nuevoItem = { productoId = productoId; precioSnapshot = prod.precio };
    let nuevosItems = Buffer.Buffer<ItemCarrito>(0);
    for (i in carritoActual.items.vals()) nuevosItems.add(i);
    nuevosItems.add(nuevoItem);
    carritos.put(caller, { items = Buffer.toArray(nuevosItems); ultimaActualizacion = Time.now() });
    #ok(())
  };

 public shared ({ caller }) func quitarDelCarrito(productoId : Text) : async Result.Result<(), AplicationError> {
  switch (carritos.get(caller)) {
    case null { return #err(#ErrorValidacion("Carrito vacío")); };
    case (?carrito) {
      let nuevos = Array.filter<ItemCarrito>(carrito.items, func x = x.productoId != productoId);
      if (nuevos.size() == carrito.items.size()) return #err(#ErrorValidacion("No encontrado"));
      if (nuevos.size() == 0) carritos.delete(caller)
      else carritos.put(caller, { items = nuevos; ultimaActualizacion = Time.now() });
      return #ok(());
    };
  };
};

 public query ({ caller }) func verCarrito() : async [ItemCarrito] {
  switch (carritos.get(caller)) {
    case null { [] };
    case (?c) { c.items };
  };
};

  public shared ({ caller }) func vaciarCarrito() : async () { carritos.delete(caller) };

  // ========= SALDO =========
  public shared ({ caller }) func obtenerSaldo() : async Nat64 {
    try {
      let balance = await ledger.account_balance({ account = accountOf(caller) });
      balance.e8s
    } catch (e) { 0 }
  };
  public shared ({ caller }) func obtenerMiAccountIdentifier() : async Text { toHex(accountOf(caller)) };
  public query func obtenerAccountIdentifier(p : Principal) : async Text { toHex(accountOf(p)) };
  public query func obtenerCuentaCanister() : async Text { toHex(accountOf(Principal.fromActor(this))) };

  // ========= COMPRA =========
  public shared ({ caller }) func iniciarCompra() : async Result.Result<{ pagoId : Text; montoTotal : Nat64; accountIdCanister : Text; memo : Nat64 }, AplicationError> {
  switch (usuarios.get(caller)) {
    case null { return #err(#UsuarioNoExiste); };
    case (?u) {
      if (u.rol != #Cliente and u.rol != #Intermediario) return #err(#PermisoDenegado);
    };
  };
    let carrito = switch (carritos.get(caller)) {
      case null return #err(#ErrorValidacion("Carrito vacío"));
      case (?c) c;
    };
    if (carrito.items.size() == 0) return #err(#ErrorValidacion("Carrito vacío"));
    if (carrito.items.size() > 20) return #err(#ErrorValidacion("Demasiados productos"));
    let pagosActivos = Option.get(pagosPorUsuario.get(caller), 0);
    if (pagosActivos >= MAX_PAGOS_ACTIVOS_POR_USUARIO) return #err(#ErrorValidacion("Demasiados pagos activos"));
    let idsProductos = Array.map<ItemCarrito, Text>(carrito.items, func x = x.productoId);
    for (item in carrito.items.vals()) {
      switch (productos.get(item.productoId)) {
        case null return #err(#ProductoNoExiste);
        case (?prod) {
          if (not prod.activo) return #err(#ProductoNoExiste);
          if (prod.precio != item.precioSnapshot) return #err(#ErrorValidacion("Precio cambiado"));
          let disponible = if (prod.stock > prod.reservado) prod.stock - prod.reservado else 0;
          if (disponible < 1) return #err(#StockInsuficiente);
        };
      };
    };
    var totalCompra : Nat64 = 0;
    let artesanosSet = HashMap.HashMap<Principal, Bool>(0, Principal.equal, hashPrincipal);
    for (item in carrito.items.vals()) {
      totalCompra += item.precioSnapshot;
      switch (productos.get(item.productoId)) {
        case (?prod) { artesanosSet.put(prod.artesano, true); };
        case null {};
      };
    };
    let numArtesanos = Nat64.fromNat(artesanosSet.size());
    let totalFees = TRANSFER_FEE * numArtesanos;
    let montoTotal = totalCompra + totalFees;
    switch (reservarProductos(idsProductos)) {
      case (#err(e)) return #err(e);
      case (#ok) {};
    };
    let pagoId = genId("pago-", caller);
    let memo = Nat64.fromNat(idCounter) + Nat64.fromIntWrap(Time.now()); // único
    let nuevoPago : PagoPendiente = {
      id = pagoId;
      comprador = caller;
      productos = idsProductos;
      montoTotal = montoTotal;
      estado = #iniciado;
      blockHeight = null;
      memo = memo;
      fechaCreacion = Time.now();
      vendedores = null;
      montosPorVendedor = null;
      estadoEscrow = null;
    };
    pagosPendientes.put(pagoId, nuevoPago);
    pagosPorMemo.put(memo, pagoId);
    pagosPorUsuario.put(caller, pagosActivos + 1);
    limpiarPagosExpirados();
    #ok({
      pagoId;
      montoTotal;
      accountIdCanister = toHex(accountOf(Principal.fromActor(this)));
      memo;
    })
  };

  public shared ({ caller }) func confirmarPago(pagoId : Text, blockHeight : Nat64) : async Result.Result<Text, AplicationError> {
  switch (pagosPendientes.get(pagoId)) {
    case null { return #err(#ErrorValidacion("No existe")); };
    case (?p) { if (p.comprador != caller) return #err(#PermisoDenegado); };
  };
  await _confirmarPago(pagoId, blockHeight)
};

  // ========= ESCROW =========
  public shared ({ caller }) func marcarEnviado(pagoId : Text) : async Result.Result<(), AplicationError> {
    switch (pagosPendientes.get(pagoId)) {
      case null { return #err(#ErrorValidacion("No existe")); };
      case (?pago) {
        let esVendedor = switch (pago.vendedores) {
          case null false;
          case (?v) { Array.find<Principal>(v, func x = x == caller) != null };
        };
        if (not esVendedor) return #err(#PermisoDenegado);
        if (pago.estado != #pagado) return #err(#ErrorValidacion("No está en escrow"));
        pagosPendientes.put(pagoId, { pago with estado = #enviado });
        return #ok(());
      };
    };
  };

  public shared ({ caller }) func confirmarEntrega(pagoId : Text) : async Result.Result<Text, AplicationError> {
  switch (pagosPendientes.get(pagoId)) {
    case null { return #err(#ErrorValidacion("No existe")); };
    case (?pago) {
      if (pago.comprador != caller) return #err(#PermisoDenegado);
      if (pago.estado != #enviado) return #err(#ErrorValidacion("No enviado"));
      if (pago.estadoEscrow != ?#EnEscrow) return #err(#ErrorValidacion("Escrow inválido"));

      // Anti-reentrancy
      switch (pago.estado) {
        case (#procesando) return #err(#ErrorValidacion("Ya procesando"));
        case _ {};
      };
      pagosPendientes.put(pagoId, { pago with estado = #procesando });

      let balanceCanister = await ledger.account_balance({ account = accountOf(Principal.fromActor(this)) });
      if (balanceCanister.e8s < pago.montoTotal) {
        pagosPendientes.put(pagoId, { pago with estado = #enviado });
        return #err(#ErrorInterno("Fondos insuficientes en canister"));
      };

      let montos = switch (pago.montosPorVendedor) {
        case null { pagosPendientes.put(pagoId, { pago with estado = #enviado }); return #err(#ErrorInterno("Sin montos")); };
        case (?m) m;
      };

      let fallos = Buffer.Buffer<(Principal, Nat64)>(0);

      for ((vendedor, montoTotal) in montos.vals()) {
        let comision = (montoTotal * COMISION_BP) / BASE_BP;
        let pagoVendedor = montoTotal - comision;
        if (pagoVendedor <= TRANSFER_FEE) {
          fallos.add((vendedor, montoTotal));
        } else {
          let montoNeto = pagoVendedor - TRANSFER_FEE;
          let resVendedor = await ledger.transfer({
            memo = 0;
            amount = { e8s = montoNeto };
            fee = { e8s = TRANSFER_FEE };
            from_subaccount = null;
            to = accountOf(vendedor);
            created_at_time = null;
          });
          switch (resVendedor) {
            case (#Ok(block)) {
              let txId = genId("tx-", caller);
              let tx : Transaccion = {
                id = txId;
                comprador = pago.comprador;
                vendedor = vendedor;
                productoIds = pago.productos;
                monto = montoNeto;
                fecha = Time.now();
                blockHeight = ?block;
                estado = "Entregado";
              };
              transacciones.put(txId, tx);
              totalVentas += montoTotal;
              totalComisiones += comision;
              let bufVen = switch (ventasPorVendedor.get(vendedor)) {
                case null { let b = Buffer.Buffer<Transaccion>(0); ventasPorVendedor.put(vendedor, b); b };
                case (?b) b;
              };
              bufVen.add(tx);
              log("💰 Pagado a " # Principal.toText(vendedor));

              // Comisión al admin
              if (comision > 0) {
                let resAdmin = await ledger.transfer({
                  memo = 0;
                  amount = { e8s = comision };
                  fee = { e8s = TRANSFER_FEE };
                  from_subaccount = null;
                  to = accountOf(ADMIN);
                  created_at_time = null;
                });
                switch (resAdmin) {
                  case (#Err(e)) log("⚠️ Error enviando comisión: " # debug_show(e));
                  case (#Ok(_)) {};
                };
              };
            };
            case (#Err(e)) {
              fallos.add((vendedor, montoTotal));
              log("❌ Fallo transferencia a " # Principal.toText(vendedor));
            };
          };
        };
      };

      if (fallos.size() > 0) {
        transfersPendientes.put(pagoId, Buffer.toArray(fallos));
        ignore async { await reintentarDistribucion(pagoId); };
        pagosPendientes.put(pagoId, { pago with estado = #fallido; estadoEscrow = ?#EnEscrow });
        return #err(#ErrorLedger({ codigo = "PARTIAL"; mensaje = "Algunos pagos fallaron, reintentando" }));
      };

      consumirStock(pago.productos);
      pagosPendientes.put(pagoId, { pago with estado = #entregado; estadoEscrow = ?#Liberado });
      pagosPorMemo.delete(pago.memo);
      let count = Option.get(pagosPorUsuario.get(pago.comprador), 0);
      if (count > 0) pagosPorUsuario.put(pago.comprador, count - 1);
      return #ok("Entrega confirmada");
    };
  };
};

 public shared ({ caller }) func reembolsarPorNoEnvio(pagoId : Text) : async Result.Result<Text, AplicationError> {
  switch (pagosPendientes.get(pagoId)) {
    case null { return #err(#ErrorValidacion("No existe")); };
    case (?pago) {
      if (pago.comprador != caller) return #err(#PermisoDenegado);
      if (pago.estado != #pagado) return #err(#ErrorValidacion("Solo en escrow"));
      let tiempoLimite = 7 * 24 * 3600 * 1_000_000_000;
      if (Time.now() - pago.fechaCreacion < tiempoLimite) return #err(#ErrorValidacion("Plazo no vencido"));
      let res = await ledger.transfer({
        memo = 0;
        amount = { e8s = pago.montoTotal };
        fee = { e8s = TRANSFER_FEE };
        from_subaccount = null;
        to = accountOf(pago.comprador);
        created_at_time = null;
      });
      switch (res) {
        case (#Ok(block)) {
          liberarReservas(pago.productos);
          pagosPendientes.put(pagoId, { pago with estado = #reembolsado; estadoEscrow = ?#Reembolsado });
          pagosPorMemo.delete(pago.memo);
          let count = Option.get(pagosPorUsuario.get(pago.comprador), 0);
          if (count > 0) pagosPorUsuario.put(pago.comprador, count - 1);
          return #ok("Reembolsado");
        };
        case (#Err(e)) { return #err(#ErrorLedger({ codigo = "REFUND_FAIL"; mensaje = debug_show(e) })); };
      };
    };
  };
};

  public shared ({ caller }) func reintentarDistribucion(pagoId : Text) : async Result.Result<Text, AplicationError> {
  switch (pagosPendientes.get(pagoId)) {
    case null { return #err(#ErrorValidacion("No existe")); };
    case (?pago) {
      if (pago.comprador != caller) return #err(#PermisoDenegado);
      if (pago.estado != #fallido) return #err(#ErrorValidacion("No fallido"));
      switch (transfersPendientes.get(pagoId)) {
        case null { return #err(#ErrorValidacion("Sin pendientes")); };
        case (?fallos) {
          let mapa = HashMap.HashMap<Principal, Nat64>(0, Principal.equal, hashPrincipal);
          for ((v, m) in fallos.vals()) incrementNat64(mapa, v, m);
          let nuevos = Buffer.Buffer<(Principal, Nat64)>(0);
          for ((vendedor, montoTotal) in mapa.entries()) {
            let comision = (montoTotal * COMISION_BP) / BASE_BP;
            let pagoVendedor = montoTotal - comision;
            if (pagoVendedor <= TRANSFER_FEE) {
              nuevos.add((vendedor, montoTotal));
            } else {
              let montoNeto = pagoVendedor - TRANSFER_FEE;
              let resVen = await ledger.transfer({
                memo = 0;
                amount = { e8s = montoNeto };
                fee = { e8s = TRANSFER_FEE };
                from_subaccount = null;
                to = accountOf(vendedor);
                created_at_time = null;
              });
              switch (resVen) {
                case (#Ok(block)) {
                  let txId = genId("tx-", caller);
                  let tx : Transaccion = {
                    id = txId;
                    comprador = pago.comprador;
                    vendedor = vendedor;
                    productoIds = pago.productos;
                    monto = montoNeto;
                    fecha = Time.now();
                    blockHeight = ?block;
                    estado = "Entregado";
                  };
                  transacciones.put(txId, tx);
                  totalVentas += montoTotal;
                  totalComisiones += comision;
                  let bufVen = switch (ventasPorVendedor.get(vendedor)) {
                    case null { let b = Buffer.Buffer<Transaccion>(0); ventasPorVendedor.put(vendedor, b); b };
                    case (?b) b;
                  };
                  bufVen.add(tx);
                  if (comision > 0) {
                    ignore await ledger.transfer({
                      memo = 0;
                      amount = { e8s = comision };
                      fee = { e8s = TRANSFER_FEE };
                      from_subaccount = null;
                      to = accountOf(ADMIN);
                      created_at_time = null;
                    });
                  };
                };
                case (#Err(e)) {
                  nuevos.add((vendedor, montoTotal));
                };
              };
            };
          };
          if (nuevos.size() > 0) {
            transfersPendientes.put(pagoId, Buffer.toArray(nuevos));
            return #err(#ErrorLedger({ codigo = "PARTIAL_RETRY"; mensaje = "Algunos reintentos fallaron" }));
          };
          transfersPendientes.delete(pagoId);
          consumirStock(pago.productos);
          pagosPendientes.put(pagoId, { pago with estado = #entregado; estadoEscrow = ?#Liberado });
          pagosPorMemo.delete(pago.memo);
          let count = Option.get(pagosPorUsuario.get(pago.comprador), 0);
          if (count > 0) pagosPorUsuario.put(pago.comprador, count - 1);
          return #ok("Reintento exitoso");
        };
      };
    };
  };
};

  public shared ({ caller }) func cancelarPago(pagoId : Text) : async Result.Result<(), AplicationError> {
  switch (pagosPendientes.get(pagoId)) {
    case null { return #err(#ErrorValidacion("No existe")); };
    case (?pago) {
      if (pago.comprador != caller) return #err(#PermisoDenegado);
      if (pago.estado != #iniciado) return #err(#ErrorValidacion("No cancelable"));
      liberarReservas(pago.productos);
      switch (pago.blockHeight) {
        case (?bh) { pagosPorBlock.delete(bh); };
        case null { };
      };
      pagosPorMemo.delete(pago.memo);
      pagosPendientes.delete(pagoId);
      let count = Option.get(pagosPorUsuario.get(caller), 0);
      if (count > 0) pagosPorUsuario.put(caller, count - 1);
      return #ok(());
    };
  };
};

  public query ({ caller }) func obtenerEstadoPago(pagoId : Text) : async ?EstadoPago {
  switch (pagosPendientes.get(pagoId)) {
    case null { null };
    case (?p) { ?p.estado };
  };
};
  public query ({ caller }) func obtenerMisPagos() : async [PagoPendiente] {
    let buf = Buffer.Buffer<PagoPendiente>(0);
    for (p in pagosPendientes.vals()) if (p.comprador == caller) buf.add(p);
    Buffer.toArray(buf)
  };
  public query ({ caller }) func resumenTransacciones() : async [Transaccion] {
    let buf = Buffer.Buffer<Transaccion>(0);
    for (t in transacciones.vals()) if (t.comprador == caller or t.vendedor == caller) buf.add(t);
    Buffer.toArray(buf)
  };
  public query ({ caller }) func obtenerMisVentas() : async [Transaccion] {
  switch (ventasPorVendedor.get(caller)) {
    case null { [] };
    case (?b) { Buffer.toArray(b) };
  };
};
  public query func obtenerLogs() : async [Text] { Buffer.toArray(logs) };

  // ========= HEARTBEAT OPTIMIZADO =========
  system func heartbeat() : async () {
  try {
    // Solo ejecutar si hay pagos pendientes
    if (pagosPendientes.size() > 0) {
      await verificarPagosAutomaticamente();
    };
  } catch (e) {
    log("❌ Heartbeat error: " # Error.message(e));
  }
};

  // ========= UPGRADES =========
  system func postupgrade() {
    ultimoBloqueEscaneado := stableUltimoBloqueEscaneado;
    idCounter := stableIdCounter;
    usuarios := HashMap.fromIter<Principal, Usuario>(stableUsuarios.vals(), 0, Principal.equal, hashPrincipal);
    productos := HashMap.fromIter<Text, Producto>(stableProductos.vals(), 0, Text.equal, hashText);
    transacciones := HashMap.fromIter<Text, Transaccion>(stableTransacciones.vals(), 0, Text.equal, hashText);
    logs := Buffer.fromArray(stableLogs);
    pagosPendientes := HashMap.fromIter<Text, PagoPendiente>(stablePagosPendientes.vals(), 0, Text.equal, hashText);
    pagosPorBlock := HashMap.fromIter<Nat64, Text>(stablePagosPorBlock.vals(), 0, Nat64.equal, hashNat64);
    pagosPorMemo := HashMap.fromIter<Nat64, Text>(stablePagosPorMemo.vals(), 0, Nat64.equal, hashNat64);
    carritos := HashMap.fromIter<Principal, Carrito>(stableCarritos.vals(), 0, Principal.equal, hashPrincipal);
    transfersPendientes := HashMap.fromIter<Text, [(Principal, Nat64)]>(stableTransfersPendientes.vals(), 0, Text.equal, hashText);
    pagosPorUsuario := HashMap.fromIter<Principal, Nat>(stablePagosPorUsuario.vals(), 0, Principal.equal, hashPrincipal);
    
    // 🔥 Reconstruir contador de productos por artesano
    for ((_, prod) in productos.entries()) {
      let art = prod.artesano;
      let count = Option.get(contadorProductosPorArtesano.get(art), 0);
      contadorProductosPorArtesano.put(art, count + 1);
    };
    
    // Reconstruir índices
    for ((_, prod) in productos.entries()) {
      actualizarIndicesProducto(prod, null, null);
    };
    for ((_, tx) in transacciones.entries()) {
      let buf = switch (ventasPorVendedor.get(tx.vendedor)) {
        case null { let b = Buffer.Buffer<Transaccion>(0); ventasPorVendedor.put(tx.vendedor, b); b };
        case (?b) b;
      };
      buf.add(tx);
    };
  };
};