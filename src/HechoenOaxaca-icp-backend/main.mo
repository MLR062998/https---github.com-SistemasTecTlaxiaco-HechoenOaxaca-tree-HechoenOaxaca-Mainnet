import Principal "mo:base/Principal";
import Result "mo:base/Result";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Int "mo:base/Int";
import Random "mo:base/Random";
import Blob "mo:base/Blob";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Nat32 "mo:base/Nat32";
import Nat8 "mo:base/Nat8";
import Time "mo:base/Time";
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Buffer "mo:base/Buffer";
import Error "mo:base/Error";
import AccountIdentifier "mo:account-identifier";

import Ledger "./Ledger";

actor class HechoenOaxacaBackend() = this {

  // ========= CONFIGURACIÓN =========
  let TRANSFER_FEE : Nat64 = 10_000;
  let TIEMPO_EXPIRACION : Int = 300_000_000_000; // 5 minutos
  let MAX_PAGOS_ACTIVOS_POR_USUARIO : Nat = 5;
  let MAX_BLOQUES_POR_SCAN : Nat64 = 50;
  let MAX_LOGS : Nat = 1000;
  let MAX_STRING_LEN : Nat = 100;

  let ledger = actor("ryjl3-tyaaa-aaaaa-aaaba-cai") : Ledger.Self;

  // ========= FUNCIONES DE HASH =========
  private func hashPrincipal(p : Principal) : Nat32 {
    Blob.hash(Principal.toBlob(p))
  };
  private func hashText(t : Text) : Nat32 {
    Blob.hash(Text.encodeUtf8(t))
  };
  private func hashNat64(n : Nat64) : Nat32 {
    let nNat = Nat64.toNat(n);
    let bytes = [
      Nat8.fromNat((nNat >> 56) & 0xFF),
      Nat8.fromNat((nNat >> 48) & 0xFF),
      Nat8.fromNat((nNat >> 40) & 0xFF),
      Nat8.fromNat((nNat >> 32) & 0xFF),
      Nat8.fromNat((nNat >> 24) & 0xFF),
      Nat8.fromNat((nNat >> 16) & 0xFF),
      Nat8.fromNat((nNat >> 8) & 0xFF),
      Nat8.fromNat(nNat & 0xFF)
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
  private func genId(prefix : Text) : async Text {
    let r = await Random.blob();
    prefix # Int.toText(Time.now()) # "-" # Nat32.toText(Blob.hash(r))
  };
  private func log(t : Text) {
    if (logs.size() >= MAX_LOGS) {
      ignore logs.remove(0);
    };
    logs.add(Int.toText(Time.now()) # ": " # t);
  };

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
    #distribuido;
    #fallido;
    #expirado;
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

  // Variables estables para upgrades
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

  // Control de escaneo
  private var ultimoBloqueEscaneado : Nat64 = 0;

  // ========= AUXILIARES =========
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
          case null {};
        };
        pagosPorMemo.delete(pago.memo);
        let count = Option.get(pagosPorUsuario.get(pago.comprador), 0);
        if (count > 0) pagosPorUsuario.put(pago.comprador, count - 1);
        pagosPendientes.delete(id);
        log("⏰ Pago expirado y eliminado: " # id);
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
            });
          };
        };
        case null {};
      };
    };
  };
  private func consumirStock(productosIds : [Text]) {
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
              stock = prod.stock - 1;
              reservado = prod.reservado - 1;
              fechaCreacion = prod.fechaCreacion;
              activo = prod.activo;
            });
          };
        };
        case null {};
      };
    };
  };
  private func confirmarStock(productosIds : [Text]) : Bool {
    for (pid in productosIds.vals()) {
      switch (productos.get(pid)) {
        case (?prod) {
          if (not prod.activo) return false;
          let disponible = if (prod.stock > prod.reservado) prod.stock - prod.reservado else 0;
          if (disponible < 1) return false;
        };
        case null return false;
      };
    };
    true
  };

  // ========= FUNCIONES INTERNAS DE PAGO =========
  private func _confirmarPago(pagoId : Text, blockHeight : Nat64) : async Result.Result<Text, AplicationError> {
    try {
      limpiarPagosExpirados();
      switch (pagosPendientes.get(pagoId)) {
        case null return #err(#ErrorValidacion("Pago no encontrado"));
        case (?pago) {
          // Expiración
          if (Time.now() - pago.fechaCreacion > TIEMPO_EXPIRACION) {
            liberarReservas(pago.productos);
            switch (pago.blockHeight) {
              case (?bh) { pagosPorBlock.delete(bh); };
              case null {};
            };
            pagosPorMemo.delete(pago.memo);
            pagosPendientes.put(pagoId, { pago with estado = #expirado });
            let count = Option.get(pagosPorUsuario.get(pago.comprador), 0);
            if (count > 0) pagosPorUsuario.put(pago.comprador, count - 1);
            return #err(#ErrorValidacion("Pago expirado"));
          };
          // Bloqueo anti-doble
          switch (pago.estado) {
            case (#iniciado) {
              pagosPendientes.put(pagoId, { pago with estado = #procesando });
            };
            case _ return #err(#ErrorValidacion("El pago ya fue procesado"));
          };
          // Verificar block no usado
          switch (pagosPorBlock.get(blockHeight)) {
            case (?_) {
              pagosPendientes.put(pagoId, { pago with estado = #fallido });
              return #err(#ErrorValidacion("Block ya usado"));
            };
            case null {};
          };
          // Consultar bloque
          let tx = await ledger.query_blocks({ start = blockHeight; length = 1 });
          if (tx.blocks.size() == 0) {
            pagosPendientes.put(pagoId, { pago with estado = #fallido });
            return #err(#ErrorValidacion("Block inválido"));
          };
          let block = tx.blocks[0];
          // Validar timestamp del bloque
          if (block.timestamp.timestamp_nanos < Nat64.fromIntWrap(pago.fechaCreacion)) {
            pagosPendientes.put(pagoId, { pago with estado = #fallido });
            return #err(#ErrorValidacion("Transacción antigua no válida"));
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
              // Tolerancia: aceptar si monto es mayor o igual (puede incluir fees adicionales)
              if (transfer.amount.e8s < pago.montoTotal) {
                pagosPendientes.put(pagoId, { pago with estado = #fallido });
                return #err(#ErrorValidacion("Monto insuficiente"));
              };
              if (block.transaction.memo != pago.memo) {
                pagosPendientes.put(pagoId, { pago with estado = #fallido });
                return #err(#ErrorValidacion("Memo inválido"));
              };
              // Marcar pagado
              pagosPendientes.put(pagoId, {
                id = pago.id;
                comprador = pago.comprador;
                productos = pago.productos;
                montoTotal = pago.montoTotal;
                estado = #pagado;
                blockHeight = ?blockHeight;
                memo = pago.memo;
                fechaCreacion = pago.fechaCreacion;
              });
              pagosPorBlock.put(blockHeight, pagoId);
              log("✅ Pago confirmado: " # pagoId # " block=" # Nat64.toText(blockHeight));
              // Distribuir
              return await distribuirPago(pagoId);
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

  // ========= AUTO-DETECCIÓN DE PAGOS =========
  private func verificarPagosAutomaticamente() : async () {
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
      if (pagosPorBlock.get(blockIndex) != null) {
        blockIndex += 1;
        continue;
      }
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
      blockIndex += 1;
    };
    ultimoBloqueEscaneado := start + lengthFinal;
  };

  // ========= HEARTBEAT =========
  system func heartbeat() : async () {
    if (pagosPendientes.size() > 0) {
      await verificarPagosAutomaticamente();
    }
  };

  // ========= USUARIOS =========
  public shared ({ caller }) func registrarUsuario(
    nombreCompleto : Text,
    lugarOrigen : Text,
    telefono : Text,
    rol : Text
  ) : async Result.Result<(), AplicationError> {
    if (usuarios.get(caller) != null) return #err(#UsuarioYaExiste);
    if (Text.size(nombreCompleto) < 3) return #err(#ErrorValidacion("Nombre completo debe tener al menos 3 caracteres"));
    if (Text.size(nombreCompleto) > MAX_STRING_LEN) return #err(#ErrorValidacion("Nombre muy largo (máx " # Nat.toText(MAX_STRING_LEN) # ")"));
    if (Text.size(lugarOrigen) < 3)    return #err(#ErrorValidacion("Lugar de origen debe tener al menos 3 caracteres"));
    if (Text.size(lugarOrigen) > MAX_STRING_LEN) return #err(#ErrorValidacion("Lugar muy largo"));
    if (Text.size(telefono) < 7)       return #err(#ErrorValidacion("Teléfono debe tener al menos 7 dígitos"));
    if (Text.size(telefono) > 20)      return #err(#ErrorValidacion("Teléfono muy largo"));
    let rolUsuario : ?Rol = switch (rol) {
      case "Artesano"      ?#Artesano;
      case "Intermediario" ?#Intermediario;
      case "Cliente"       ?#Cliente;
      case _               null;
    };
    switch (rolUsuario) {
      case null return #err(#RolNoValido);
      case (?r) {
        let accountIdBlob = accountOf(caller);
        let nuevoUsuario : Usuario = {
          nombreCompleto = nombreCompleto;
          lugarOrigen = lugarOrigen;
          telefono = telefono;
          rol = r;
          fechaRegistro = Time.now();
          verificado = false;
          accountId = accountIdBlob;
        };
        usuarios.put(caller, nuevoUsuario);
        log("🆕 Usuario: " # Principal.toText(caller) # " - Rol: " # rol);
        #ok(())
      }
    }
  };

  public shared ({ caller }) func actualizarPerfil(
    nombreCompleto : Text,
    lugarOrigen : Text,
    telefono : Text
  ) : async Result.Result<(), AplicationError> {
    try {
      switch (usuarios.get(caller)) {
        case (?usuarioExistente) {
          if (Text.size(nombreCompleto) < 3) return #err(#ErrorValidacion("Nombre completo debe tener al menos 3 caracteres"));
          if (Text.size(nombreCompleto) > MAX_STRING_LEN) return #err(#ErrorValidacion("Nombre muy largo"));
          if (Text.size(lugarOrigen) < 3)    return #err(#ErrorValidacion("Lugar de origen debe tener al menos 3 caracteres"));
          if (Text.size(lugarOrigen) > MAX_STRING_LEN) return #err(#ErrorValidacion("Lugar muy largo"));
          if (Text.size(telefono) < 7)       return #err(#ErrorValidacion("Teléfono debe tener al menos 7 dígitos"));
          if (Text.size(telefono) > 20)      return #err(#ErrorValidacion("Teléfono muy largo"));
          let usuarioActualizado : Usuario = {
            nombreCompleto = nombreCompleto;
            lugarOrigen = lugarOrigen;
            telefono = telefono;
            rol = usuarioExistente.rol;
            fechaRegistro = usuarioExistente.fechaRegistro;
            verificado = usuarioExistente.verificado;
            accountId = usuarioExistente.accountId;
          };
          usuarios.put(caller, usuarioActualizado);
          log("✏️ Perfil actualizado: " # Principal.toText(caller));
          #ok(())
        };
        case null return #err(#UsuarioNoExiste);
      }
    } catch (e) {
      log("❌ actualizarPerfil: " # Error.message(e));
      #err(#ErrorInterno("Error inesperado al actualizar perfil"))
    }
  };

  public shared query ({ caller }) func obtenerUsuario() : async Result.Result<Usuario, AplicationError> {
    switch (usuarios.get(caller)) { case (?u) { #ok(u) }; case null { #err(#UsuarioNoExiste) } }
  };
  public shared query func obtenerUsuarioPorPrincipal(p : Principal) : async Result.Result<Usuario, AplicationError> {
    switch (usuarios.get(p)) { case (?u) { #ok(u) }; case null { #err(#UsuarioNoExiste) } }
  };

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
    try {
      switch (usuarios.get(caller)) {
        case (?u) { if (u.rol != #Artesano) return #err(#PermisoDenegado); };
        case null return #err(#UsuarioNoExiste);
      };
      if (Text.size(nombre) < 3) return #err(#ErrorValidacion("Nombre muy corto (mín 3 caracteres)"));
      if (Text.size(nombre) > MAX_STRING_LEN) return #err(#ErrorValidacion("Nombre muy largo"));
      if (precio == 0) return #err(#ErrorValidacion("Precio debe ser positivo"));
      if (Text.size(descripcion) < 10) return #err(#ErrorValidacion("Descripción muy corta (mín 10 caracteres)"));
      if (Text.size(descripcion) > 500) return #err(#ErrorValidacion("Descripción muy larga (máx 500)"));
      if (imagenes.size() == 0 or imagenes.size() > 3) return #err(#ErrorValidacion("Debe haber entre 1-3 imágenes"));
      for (img in imagenes.vals()) {
        if (Text.size(img) == 0 or Text.size(img) > 500) {
          return #err(#ErrorValidacion("URL de imagen inválida"));
        };
      };
      if (stock == 0) return #err(#ErrorValidacion("Stock debe ser mayor a 0"));
      let id = await genId("prod-");
      let producto : Producto = {
        id = id;
        nombre = nombre;
        precio = precio;
        descripcion = descripcion;
        tipo = tipo;
        imagenes = imagenes;
        artesano = caller;
        firma = firma;
        certificado = certificado;
        stock = stock;
        reservado = 0;
        fechaCreacion = Time.now();
        activo = true;
      };
      productos.put(id, producto);
      log("🆕 Producto " # id # " por " # Principal.toText(caller));
      #ok(producto)
    } catch (e) {
      log("❌ crearProducto: " # Error.message(e));
      #err(#ErrorInterno("Error inesperado al crear producto"))
    }
  };

  public shared ({ caller }) func actualizarProducto(
    id : Text,
    nombre : Text,
    precio : Nat64,
    descripcion : Text,
    tipo : Text,
    imagenes : [Text],
    firma : ?Text,
    certificado : ?Text,
    stock : Nat
  ) : async Result.Result<Producto, AplicationError> {
    try {
      switch (productos.get(id)) {
        case (?productoExistente) {
          if (productoExistente.artesano != caller) return #err(#PermisoDenegado);
          if (Text.size(nombre) < 3) return #err(#ErrorValidacion("Nombre muy corto (mín 3 caracteres)"));
          if (Text.size(nombre) > MAX_STRING_LEN) return #err(#ErrorValidacion("Nombre muy largo"));
          if (precio == 0) return #err(#ErrorValidacion("Precio debe ser positivo"));
          if (Text.size(descripcion) < 10) return #err(#ErrorValidacion("Descripción muy corta (mín 10 caracteres)"));
          if (Text.size(descripcion) > 500) return #err(#ErrorValidacion("Descripción muy larga"));
          if (imagenes.size() == 0 or imagenes.size() > 3) return #err(#ErrorValidacion("Debe haber entre 1-3 imágenes"));
          for (img in imagenes.vals()) {
            if (Text.size(img) == 0 or Text.size(img) > 500) {
              return #err(#ErrorValidacion("URL de imagen inválida"));
            };
          };
          if (stock < productoExistente.reservado) return #err(#ErrorValidacion("Stock no puede ser menor a reservado"));
          let productoActualizado : Producto = {
            id = id;
            nombre = nombre;
            precio = precio;
            descripcion = descripcion;
            tipo = tipo;
            imagenes = imagenes;
            artesano = caller;
            firma = firma;
            certificado = certificado;
            stock = stock;
            reservado = productoExistente.reservado;
            fechaCreacion = productoExistente.fechaCreacion;
            activo = productoExistente.activo;
          };
          productos.put(id, productoActualizado);
          log("✏️ Producto actualizado: " # id # " por " # Principal.toText(caller));
          #ok(productoActualizado)
        };
        case null return #err(#ProductoNoExiste);
      };
    } catch (e) {
      log("❌ actualizarProducto: " # Error.message(e));
      #err(#ErrorInterno("Error inesperado al actualizar producto"))
    }
  };

  public shared ({ caller }) func eliminarProducto(id : Text) : async Result.Result<(), AplicationError> {
    try {
      switch (productos.get(id)) {
        case (?producto) {
          if (producto.artesano != caller) return #err(#PermisoDenegado);
          let productoDesactivado : Producto = {
            id = producto.id;
            nombre = producto.nombre;
            precio = producto.precio;
            descripcion = producto.descripcion;
            tipo = producto.tipo;
            imagenes = producto.imagenes;
            artesano = producto.artesano;
            firma = producto.firma;
            certificado = producto.certificado;
            stock = producto.stock;
            reservado = producto.reservado;
            fechaCreacion = producto.fechaCreacion;
            activo = false;
          };
          productos.put(id, productoDesactivado);
          log("🗑️ Producto eliminado/desactivado: " # id # " por " # Principal.toText(caller));
          #ok(())
        };
        case null return #err(#ProductoNoExiste);
      };
    } catch (e) {
      log("❌ eliminarProducto: " # Error.message(e));
      #err(#ErrorInterno("Error inesperado al eliminar producto"))
    }
  };

  public shared query func listarProductos() : async [Producto] {
    let buf = Buffer.Buffer<Producto>(0);
    for (p in productos.vals()) {
      if (p.activo) buf.add(p);
    };
    Buffer.toArray(buf)
  };
  public shared query ({ caller }) func listarProductosPorArtesano() : async [Producto] {
    switch (usuarios.get(caller)) {
      case (?usuario) { if (usuario.rol != #Artesano) return [] };
      case null return [];
    };
    let productosArtesano = Buffer.Buffer<Producto>(0);
    for (producto in productos.vals()) {
      if (producto.artesano == caller and producto.activo) productosArtesano.add(producto);
    };
    Buffer.toArray(productosArtesano)
  };

  // ========= CARRITO =========
  public shared ({ caller }) func agregarAlCarrito(productoId : Text) : async Result.Result<(), AplicationError> {
    switch (productos.get(productoId)) {
      case null return #err(#ProductoNoExiste);
      case (?prod) {
        if (not prod.activo) return #err(#ProductoNoExiste);
        if (prod.artesano == caller) return #err(#PermisoDenegado);
        let disponible = if (prod.stock > prod.reservado) prod.stock - prod.reservado else 0;
        if (disponible < 1) return #err(#StockInsuficiente);
      };
    };
    let carritoActual = switch (carritos.get(caller)) {
      case null { { items = []; ultimaActualizacion = Time.now() } };
      case (?c) { c };
    };
    if (Array.find<ItemCarrito>(carritoActual.items, func x = x.productoId == productoId) != null) {
      return #err(#ErrorValidacion("El producto ya está en el carrito"));
    };
    let producto = Option.unwrap(productos.get(productoId));
    let nuevoItem : ItemCarrito = {
      productoId = productoId;
      precioSnapshot = producto.precio;
    };
    let nuevosItems = Array.append<ItemCarrito>(carritoActual.items, [nuevoItem]);
    let nuevoCarrito : Carrito = {
      items = nuevosItems;
      ultimaActualizacion = Time.now();
    };
    carritos.put(caller, nuevoCarrito);
    log("🛒 Producto agregado al carrito: " # productoId # " por " # Principal.toText(caller));
    #ok(())
  };

  public shared ({ caller }) func quitarDelCarrito(productoId : Text) : async Result.Result<(), AplicationError> {
    switch (carritos.get(caller)) {
      case null return #err(#ErrorValidacion("Carrito vacío"));
      case (?carrito) {
        let nuevosItems = Array.filter<ItemCarrito>(carrito.items, func x = x.productoId != productoId);
        if (nuevosItems.size() == carrito.items.size()) {
          return #err(#ErrorValidacion("Producto no estaba en el carrito"));
        };
        let nuevoCarrito : Carrito = {
          items = nuevosItems;
          ultimaActualizacion = Time.now();
        };
        if (nuevosItems.size() == 0) {
          carritos.delete(caller);
        } else {
          carritos.put(caller, nuevoCarrito);
        };
        log("🗑️ Producto quitado del carrito: " # productoId # " por " # Principal.toText(caller));
        #ok(())
      };
    }
  };

  public shared query ({ caller }) func verCarrito() : async [ItemCarrito] {
    switch (carritos.get(caller)) {
      case null { [] };
      case (?c) { c.items };
    }
  };

  public shared ({ caller }) func vaciarCarrito() : async () {
    carritos.delete(caller);
    log("🧹 Carrito vaciado por " # Principal.toText(caller));
  };

  // ========= SALDO Y CUENTAS =========
  public shared ({ caller }) func obtenerSaldo() : async Nat64 {
    try {
      switch (usuarios.get(caller)) {
        case (null) { return 0 };
        case (?usuario) {
          let balance = await ledger.account_balance({ account = accountOf(caller) });
          return balance.e8s;
        };
      };
    } catch (e) {
      log("❌ Error en obtenerSaldo: " # Error.message(e));
      0
    }
  };
  public shared ({ caller }) func obtenerMiAccountIdentifier() : async Text { toHex(accountOf(caller)) };
  public shared query func obtenerAccountIdentifier(p : Principal) : async Text { toHex(accountOf(p)) };
  public shared query func obtenerCuentaCanister() : async Text { toHex(accountOf(Principal.fromActor(this))) };

  // ========= COMPRA =========
  public shared ({ caller }) func iniciarCompra() : async Result.Result<{
    pagoId : Text;
    montoTotal : Nat64;
    accountIdCanister : Text;
    memo : Nat64;
  }, AplicationError> {
    try {
      switch (usuarios.get(caller)) {
        case null return #err(#UsuarioNoExiste);
        case (?u) {
          switch (u.rol) {
            case (#Cliente) {};
            case (#Intermediario) {};
            case _ return #err(#PermisoDenegado);
          };
        };
      };
      let carrito = switch (carritos.get(caller)) {
        case null return #err(#ErrorValidacion("Carrito vacío"));
        case (?c) { c };
      };
      if (carrito.items.size() == 0) return #err(#ErrorValidacion("Carrito vacío"));
      if (carrito.items.size() > 20) return #err(#ErrorValidacion("Demasiados productos (máx 20)"));
      let pagosActivos = Option.get(pagosPorUsuario.get(caller), 0);
      if (pagosActivos >= MAX_PAGOS_ACTIVOS_POR_USUARIO) {
        return #err(#ErrorValidacion("Demasiados pagos activos. Espera a que se procesen o cancelen."));
      };
      let idsProductos = Array.map<ItemCarrito, Text>(carrito.items, func x = x.productoId);
      // Validar que los productos aún existan, estén activos, tengan stock y que el precio no haya cambiado
      for (item in carrito.items.vals()) {
        switch (productos.get(item.productoId)) {
          case null return #err(#ProductoNoExiste);
          case (?prod) {
            if (not prod.activo) return #err(#ProductoNoExiste);
            if (prod.precio != item.precioSnapshot) {
              return #err(#ErrorValidacion("El precio del producto ha cambiado. Actualiza tu carrito."));
            };
            let disponible = if (prod.stock > prod.reservado) prod.stock - prod.reservado else 0;
            if (disponible < 1) return #err(#StockInsuficiente);
          };
        };
      };
      var totalCompra : Nat64 = 0;
      let artesanosSet = HashMap.HashMap<Principal, Bool>(0, Principal.equal, hashPrincipal);
      for (item in carrito.items.vals()) {
        totalCompra := totalCompra + item.precioSnapshot;
        switch (productos.get(item.productoId)) {
          case (?prod) { artesanosSet.put(prod.artesano, true); };
          case null return #err(#ProductoNoExiste);
        };
      };
      let numArtesanos = Nat64.fromNat(artesanosSet.size());
      let totalFees = TRANSFER_FEE * numArtesanos;
      let montoTotal = totalCompra + totalFees;
      switch (reservarProductos(idsProductos)) {
        case (#err(e)) return #err(e);
        case (#ok) {};
      };
      let pagoId = await genId("pago-");
      let random = await Random.blob();
      let memo = Nat64.fromNat(Nat32.toNat(Blob.hash(random)));
      let nuevoPago : PagoPendiente = {
        id = pagoId;
        comprador = caller;
        productos = idsProductos;
        montoTotal = montoTotal;
        estado = #iniciado;
        blockHeight = null;
        memo = memo;
        fechaCreacion = Time.now();
      };
      pagosPendientes.put(pagoId, nuevoPago);
      pagosPorMemo.put(memo, pagoId);
      pagosPorUsuario.put(caller, pagosActivos + 1);
      limpiarPagosExpirados();
      log("🛒 Compra iniciada: " # pagoId # " por " # Principal.toText(caller) # " monto=" # Nat64.toText(montoTotal));
      #ok({
        pagoId;
        montoTotal;
        accountIdCanister = toHex(accountOf(Principal.fromActor(this)));
        memo;
      })
    } catch (e) {
      #err(#ErrorInterno("Error al iniciar compra: " # Error.message(e)))
    }
  };

  // Versión pública con validación de caller (mantenida para compatibilidad)
  public shared ({ caller }) func confirmarPago(
    pagoId : Text,
    blockHeight : Nat64
  ) : async Result.Result<Text, AplicationError> {
    switch (pagosPendientes.get(pagoId)) {
      case null return #err(#ErrorValidacion("Pago no encontrado"));
      case (?pago) {
        if (pago.comprador != caller) return #err(#PermisoDenegado);
      };
    };
    await _confirmarPago(pagoId, blockHeight)
  };

  private func distribuirPago(pagoId : Text) : async Result.Result<Text, AplicationError> {
    switch (pagosPendientes.get(pagoId)) {
      case null return #err(#ErrorValidacion("Pago no encontrado"));
      case (?pago) {
        if (pago.estado != #pagado) {
          return #err(#ErrorValidacion("Pago no válido"));
        };
        let mapa = HashMap.HashMap<Principal, Nat64>(0, Principal.equal, hashPrincipal);
        for (pid in pago.productos.vals()) {
          switch (productos.get(pid)) {
            case (?prod) incrementNat64(mapa, prod.artesano, prod.precio);
            case null {
              log("⚠️ Producto perdido durante distribución: " # pid);
              return #err(#ErrorInterno("Producto perdido"));
            };
          };
        };
        let fallos = Buffer.Buffer<(Principal, Nat64)>(0);
        for ((artesano, monto) in mapa.entries()) {
          let res = await ledger.transfer({
            memo = 0;
            amount = { e8s = monto };
            fee = { e8s = TRANSFER_FEE };
            from_subaccount = null;
            to = accountOf(artesano);
            created_at_time = null;
          });
          switch (res) {
            case (#Ok(block)) {
              let txId = await genId("tx-");
              transacciones.put(txId, {
                id = txId;
                comprador = pago.comprador;
                vendedor = artesano;
                productoIds = pago.productos;
                monto = monto;
                fecha = Time.now();
                blockHeight = ?block;
                estado = "Pagado";
              });
              log("💰 Transferencia a " # Principal.toText(artesano) # " por " # Nat64.toText(monto) # " e8s, block=" # Nat64.toText(block));
            };
            case (#Err(e)) {
              fallos.add((artesano, monto));
              log("❌ fallo distribución a " # Principal.toText(artesano) # ": " # debug_show(e));
            };
          };
        };
        if (fallos.size() > 0) {
          transfersPendientes.put(pagoId, Buffer.toArray(fallos));
          pagosPendientes.put(pagoId, { pago with estado = #fallido });
          return #err(#ErrorLedger({ codigo = "PARTIAL_FAIL"; mensaje = "Algunas transferencias fallaron. Use reintentarDistribucion." }));
        };
        // Todo ok: reducir stock definitivo y liberar reservas
        consumirStock(pago.productos);
        pagosPorMemo.delete(pago.memo); // Limpiar índice de memo
        pagosPendientes.put(pagoId, { pago with estado = #distribuido });
        let count = Option.get(pagosPorUsuario.get(pago.comprador), 0);
        if (count > 0) pagosPorUsuario.put(pago.comprador, count - 1);
        log("🎉 Pago distribuido completamente: " # pagoId);
        #ok("Distribución completa")
      };
    };
  };

  public shared ({ caller }) func reintentarDistribucion(pagoId : Text) : async Result.Result<Text, AplicationError> {
    switch (pagosPendientes.get(pagoId)) {
      case null return #err(#ErrorValidacion("Pago no encontrado"));
      case (?pago) {
        if (pago.comprador != caller) return #err(#PermisoDenegado);
        if (pago.estado != #fallido) return #err(#ErrorValidacion("Solo se pueden reintentar pagos fallidos"));
      };
    };
    switch (transfersPendientes.get(pagoId)) {
      case null return #err(#ErrorValidacion("No hay transferencias pendientes para este pago"));
      case (?fallos) {
        let mapa = HashMap.HashMap<Principal, Nat64>(0, Principal.equal, hashPrincipal);
        for ((artesano, monto) in fallos.vals()) {
          incrementNat64(mapa, artesano, monto);
        };
        let nuevosFallos = Buffer.Buffer<(Principal, Nat64)>(0);
        for ((artesano, monto) in mapa.entries()) {
          let res = await ledger.transfer({
            memo = 0;
            amount = { e8s = monto };
            fee = { e8s = TRANSFER_FEE };
            from_subaccount = null;
            to = accountOf(artesano);
            created_at_time = null;
          });
          switch (res) {
            case (#Ok(block)) {
              let txId = await genId("tx-");
              transacciones.put(txId, {
                id = txId;
                comprador = Option.unwrap(pagosPendientes.get(pagoId)).comprador;
                vendedor = artesano;
                productoIds = Option.unwrap(pagosPendientes.get(pagoId)).productos;
                monto = monto;
                fecha = Time.now();
                blockHeight = ?block;
                estado = "Pagado";
              });
              log("💰 Reintento exitoso a " # Principal.toText(artesano) # " por " # Nat64.toText(monto));
            };
            case (#Err(e)) {
              nuevosFallos.add((artesano, monto));
              log("❌ reintento falló a " # Principal.toText(artesano) # ": " # debug_show(e));
            };
          };
        };
        if (nuevosFallos.size() > 0) {
          transfersPendientes.put(pagoId, Buffer.toArray(nuevosFallos));
          return #err(#ErrorLedger({ codigo = "PARTIAL_FAIL_RETRY"; mensaje = "Algunos reintentos fallaron. Intente nuevamente." }));
        };
        transfersPendientes.delete(pagoId);
        let pago = Option.unwrap(pagosPendientes.get(pagoId));
        consumirStock(pago.productos);
        pagosPorMemo.delete(pago.memo);
        pagosPendientes.put(pagoId, { pago with estado = #distribuido });
        let count = Option.get(pagosPorUsuario.get(pago.comprador), 0);
        if (count > 0) pagosPorUsuario.put(pago.comprador, count - 1);
        #ok("Distribución completada después de reintento")
      };
    };
  };

  public shared ({ caller }) func cancelarPago(pagoId : Text) : async Result.Result<(), AplicationError> {
    switch (pagosPendientes.get(pagoId)) {
      case (?pago) {
        if (pago.comprador != caller) return #err(#PermisoDenegado);
        if (pago.estado != #iniciado) return #err(#ErrorValidacion("No cancelable"));
        liberarReservas(pago.productos);
        switch (pago.blockHeight) {
          case (?bh) { pagosPorBlock.delete(bh); };
          case null {};
        };
        pagosPorMemo.delete(pago.memo);
        pagosPendientes.delete(pagoId);
        let count = Option.get(pagosPorUsuario.get(caller), 0);
        if (count > 0) pagosPorUsuario.put(caller, count - 1);
        log("🗑️ Pago cancelado: " # pagoId # " por " # Principal.toText(caller));
        #ok(())
      };
      case null return #err(#ErrorValidacion("No existe"));
    }
  };

  public shared query ({ caller }) func obtenerEstadoPago(pagoId : Text) : async ?EstadoPago {
    switch (pagosPendientes.get(pagoId)) {
      case null { null };
      case (?pago) { ?pago.estado };
    }
  };
  public shared query ({ caller }) func obtenerMisPagos() : async [PagoPendiente] {
    let buf = Buffer.Buffer<PagoPendiente>(0);
    for (pago in pagosPendientes.vals()) {
      if (pago.comprador == caller) buf.add(pago);
    };
    Buffer.toArray(buf)
  };
  public shared query ({ caller }) func resumenTransacciones() : async [Transaccion] {
    let buf = Buffer.Buffer<Transaccion>(0);
    for (tx in transacciones.vals()) {
      if (tx.comprador == caller or tx.vendedor == caller) buf.add(tx);
    };
    Buffer.toArray(buf)
  };
  public shared query func obtenerLogs() : async [Text] { Buffer.toArray(logs) };

  // ========= UPGRADES =========
  system func preupgrade() {
    stableUsuarios := Iter.toArray(usuarios.entries());
    stableProductos := Iter.toArray(productos.entries());
    stableTransacciones := Iter.toArray(transacciones.entries());
    stableLogs := Buffer.toArray(logs);
    stablePagosPendientes := Iter.toArray(pagosPendientes.entries());
    stablePagosPorBlock := Iter.toArray(pagosPorBlock.entries());
    stablePagosPorMemo := Iter.toArray(pagosPorMemo.entries());
    stableCarritos := Iter.toArray(carritos.entries());
    stableTransfersPendientes := Iter.toArray(transfersPendientes.entries());
    stablePagosPorUsuario := Iter.toArray(pagosPorUsuario.entries());
  };
  system func postupgrade() {
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
  };
};