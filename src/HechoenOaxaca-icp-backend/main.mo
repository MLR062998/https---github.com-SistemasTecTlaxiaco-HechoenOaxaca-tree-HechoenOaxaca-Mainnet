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
import Time "mo:base/Time";
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Buffer "mo:base/Buffer";
import Error "mo:base/Error";

import AID "mo:principal/AccountIdentifier";
import Ledger "./Ledger";  // ✅ MANTENEMOS Ledger

actor class HechoenOaxacaBackend() = this {

  // ========= CONFIGURACIÓN =========
  let TRANSFER_FEE : Nat64 = 10_000;
  let ALLOW_MULTI_ARTESANOS : Bool = true;

  // Conexión al Ledger ICP oficial
  let ledger = actor("ryjl3-tyaaa-aaaaa-aaaba-cai") : Ledger.Self;

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
    fechaCreacion : Int;
    activo : Bool;
  };

  public type Transaccion = {
    id : Text;
    comprador : Principal;
    vendedor : Principal;
    productoId : Text;
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
    #PermisoDenegado;
    #ErrorValidacion : Text;
    #ErrorLedger : { codigo : Text; mensaje : Text; };
    #MultiplesArtesanos;
    #ErrorInterno : Text;
  };

  // ========= ESTADO =========
  private var usuarios = HashMap.HashMap<Principal, Usuario>(0, Principal.equal, Principal.hash);
  private var productos = HashMap.HashMap<Text, Producto>(0, Text.equal, Text.hash);
  private var transacciones = HashMap.HashMap<Text, Transaccion>(0, Text.equal, Text.hash);
  private var logs = Buffer.Buffer<Text>(0);

  stable var stableUsuarios : [(Principal, Usuario)] = [];
  stable var stableProductos : [(Text, Producto)] = [];
  stable var stableTransacciones : [(Text, Transaccion)] = [];
  stable var stableLogs : [Text] = [];

  // ========= FUNCIONES DE CONVERSIÓN =========
  private func natToNat64(n : Nat) : Nat64 {
    Nat64.fromNat(n)
  };

  private func nat64ToNat(n64 : Nat64) : Nat {
    Nat64.toNat(n64)
  };

  // ✅ CORREGIDO: Función incrementNat64 con tipo de retorno explícito
  private func incrementNat64(map : HashMap.HashMap<Principal, Nat64>, key : Principal, value : Nat64) : () {
    let current = Option.get(map.get(key), 0:Nat64);
    map.put(key, current + value);
  };

  // ========= PRIVADAS =========
  private func logEvento(msg : Text) {
    logs.add(Int.toText(Time.now()) # ": " # msg);
  };

  private func generateId(prefix : Text) : async Text {
    let random = await Random.blob();
    let randomNat32 = Blob.hash(random);
    let randomNat64 = natToNat64(Nat32.toNat(randomNat32));
    let timestamp = Int.toText(Time.now());
    prefix # timestamp # "-" # Nat64.toText(randomNat64)
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
    if (Text.size(lugarOrigen) < 3)    return #err(#ErrorValidacion("Lugar de origen debe tener al menos 3 caracteres"));
    if (Text.size(telefono) < 7)       return #err(#ErrorValidacion("Teléfono debe tener al menos 7 dígitos"));

    let rolUsuario : ?Rol = switch (rol) {
      case "Artesano"      ?#Artesano;
      case "Intermediario" ?#Intermediario;
      case "Cliente"       ?#Cliente;
      case _               null;
    };
    switch (rolUsuario) {
      case null return #err(#RolNoValido);
      case (?r) {
        let accountIdBytes = AID.fromPrincipal(caller, null);
        let accountIdBlob = Blob.fromArray(accountIdBytes);
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
        logEvento("🆕 Usuario: " # Principal.toText(caller) # " - Rol: " # rol);
        #ok(())
      }
    }
  };

  public shared query ({ caller }) func obtenerUsuario() : async Result.Result<Usuario, AplicationError> {
    switch (usuarios.get(caller)) { case (?u) #ok(u); case null #err(#UsuarioNoExiste) }
  };

  public shared query func obtenerUsuarioPorPrincipal(p : Principal) : async Result.Result<Usuario, AplicationError> {
    switch (usuarios.get(p)) { case (?u) #ok(u); case null #err(#UsuarioNoExiste) }
  };

  public shared query func obtenerAccountIdentifier(p : Principal) : async Text {
    let aid = AID.fromPrincipal(p, null);
    AID.toText(aid)
  };

  // ========= PRODUCTOS =========
  public shared ({ caller }) func crearProducto(
    nombre : Text,
    precio : Nat64,
    tipo : Text,
    descripcion : Text,
    imagenes : [Text]
  ) : async Result.Result<Producto, AplicationError> {
    try {
      switch (usuarios.get(caller)) {
        case (?u) { if (u.rol != #Artesano) return #err(#PermisoDenegado) };
        case null return #err(#UsuarioNoExiste);
      };

      // ✅ CORREGIDO: Usar Text.toIter().size() para contar caracteres Unicode (acentos)
      if (Iter.size(Text.toIter(nombre)) < 3) return #err(#ErrorValidacion("Nombre muy corto (mín 3 caracteres)"));
      if (precio == 0) return #err(#ErrorValidacion("Precio debe ser positivo"));
      if (Iter.size(Text.toIter(descripcion)) < 10) return #err(#ErrorValidacion("Descripción muy corta (mín 10 caracteres)"));
      if (imagenes.size() == 0 or imagenes.size() > 3) return #err(#ErrorValidacion("Debe haber entre 1-3 imágenes"));

      let id = await generateId("prod-");

      let producto : Producto = {
        id;
        nombre;
        precio;
        descripcion;
        tipo;
        imagenes;
        artesano = caller;
        fechaCreacion = Time.now();
        activo = true;
      };

      productos.put(id, producto);
      logEvento("🆕 Producto " # id # " por " # Principal.toText(caller));
      #ok(producto)
    } catch (e) {
      logEvento("❌ crearProducto: " # Error.message(e));
      #err(#ErrorInterno("Error inesperado al crear producto"))
    }
  };

  // ========= ACTUALIZAR PRODUCTO =========
  public shared ({ caller }) func actualizarProducto(
    id : Text,
    nombre : Text,
    precio : Nat64, 
    descripcion : Text,
    tipo : Text,
    imagenes : [Text]
  ) : async Result.Result<Producto, AplicationError> {
    try {
      switch (productos.get(id)) {
        case (?productoExistente) {
          if (productoExistente.artesano != caller) {
            return #err(#PermisoDenegado);
          };
          
          // ✅ CORREGIDO: Usar Text.toIter().size() para contar caracteres Unicode (acentos)
          if (Iter.size(Text.toIter(nombre)) < 3) return #err(#ErrorValidacion("Nombre muy corto (mín 3 caracteres)"));
          if (precio == 0) return #err(#ErrorValidacion("Precio debe ser positivo"));
          if (Iter.size(Text.toIter(descripcion)) < 10) return #err(#ErrorValidacion("Descripción muy corta (mín 10 caracteres)"));
          if (imagenes.size() == 0 or imagenes.size() > 3) return #err(#ErrorValidacion("Debe haber entre 1-3 imágenes"));

          let productoActualizado : Producto = {
            id = id;
            nombre = nombre;
            precio = precio;
            descripcion = descripcion;
            tipo = tipo;
            imagenes = imagenes;
            artesano = caller;
            fechaCreacion = productoExistente.fechaCreacion;
            activo = productoExistente.activo;
          };

          productos.put(id, productoActualizado);
          logEvento("✏️ Producto actualizado: " # id # " por " # Principal.toText(caller));
          #ok(productoActualizado)
        };
        case null return #err(#ProductoNoExiste);
      }
    } catch (e) {
      logEvento("❌ actualizarProducto: " # Error.message(e));
      #err(#ErrorInterno("Error inesperado al actualizar producto"))
    }
  };

  // ========= ELIMINAR PRODUCTO =========
  public shared ({ caller }) func eliminarProducto(id : Text) : async Result.Result<(), AplicationError> {
    try {
      switch (productos.get(id)) {
        case (?producto) {
          if (producto.artesano != caller) {
            return #err(#PermisoDenegado);
          };

          let productoDesactivado : Producto = {
            id = producto.id;
            nombre = producto.nombre;
            precio = producto.precio;
            descripcion = producto.descripcion;
            tipo = producto.tipo;
            imagenes = producto.imagenes;
            artesano = producto.artesano;
            fechaCreacion = producto.fechaCreacion;
            activo = false;
          };

          productos.put(id, productoDesactivado);
          logEvento("🗑️ Producto eliminado/desactivado: " # id # " por " # Principal.toText(caller));
          #ok(())
        };
        case null return #err(#ProductoNoExiste);
      }
    } catch (e) {
      logEvento("❌ eliminarProducto: " # Error.message(e));
      #err(#ErrorInterno("Error inesperado al eliminar producto"))
    }
  };

  // ========= LISTAR PRODUCTOS =========
  public shared query func listarProductos() : async [Producto] {
    Iter.toArray(productos.vals())
  };

  // ========= LISTAR PRODUCTOS POR ARTESANO =========
  public shared query ({ caller }) func listarProductosPorArtesano() : async [Producto] {
    switch (usuarios.get(caller)) {
      case (?usuario) {
        if (usuario.rol != #Artesano) {
          return [];
        }
      };
      case null return [];
    };

    let productosArtesano = Buffer.Buffer<Producto>(0);
    
    for (producto in productos.vals()) {
      if (producto.artesano == caller and producto.activo) {
        productosArtesano.add(producto);
      }
    };
    
    Buffer.toArray(productosArtesano)
  };

  // ========= COMPRAS / PAGOS =========
  public shared ({ caller }) func realizarCompra(productoIds : [Text]) : async Result.Result<(), AplicationError> {
    try {
      switch (usuarios.get(caller)) {
        case null return #err(#UsuarioNoExiste);
        case (?u) {
          switch (u.rol) {
            case (#Cliente) {};
            case (#Intermediario) {};
            case _ return #err(#PermisoDenegado);
          }
        }
      };
      if (productoIds.size() == 0) return #err(#ErrorValidacion("Carrito vacío"));

      let productosSeleccionados = Buffer.Buffer<Producto>(productoIds.size());
      let artesanosTotales = HashMap.HashMap<Principal, Nat64>(0, Principal.equal, Principal.hash);

      for (pid in productoIds.vals()) {
        switch (productos.get(pid)) {
          case null return #err(#ProductoNoExiste);
          case (?prod) {
            if (not prod.activo) return #err(#ProductoNoExiste);
            if (prod.artesano == caller) return #err(#PermisoDenegado);
            productosSeleccionados.add(prod);
            incrementNat64(artesanosTotales, prod.artesano, prod.precio);
          }
        }
      };

      if (not ALLOW_MULTI_ARTESANOS) {
        var countArt : Nat = 0;
        for ((_, _) in artesanosTotales.entries()) { countArt += 1 };
        if (countArt > 1) return #err(#MultiplesArtesanos);
      };

      let timestamp = Time.now();
      for ((artesano, montoTotal) in artesanosTotales.entries()) {
        let cuenta = Blob.fromArray(AID.fromPrincipal(artesano, null));

        let res = await ledger.transfer({
          memo = 0;
          amount = { e8s = nat64ToNat(montoTotal) };
          fee = { e8s = nat64ToNat(TRANSFER_FEE) };
          from_subaccount = null;
          to = cuenta;
          created_at_time = null;
        });

        switch (res) {
          case (#Ok(block)) {
            let block64 = natToNat64(block);
            logEvento("✅ Pago a artesano " # Principal.toText(artesano) # " por " # Nat64.toText(montoTotal) # " e8s. block=" # Nat64.toText(block64));
            for (prod in Buffer.toArray(productosSeleccionados).vals()) {
              if (prod.artesano == artesano) {
                let txId = await generateId("tx-");
                transacciones.put(txId, {
                  id = txId;
                  comprador = caller;
                  vendedor = artesano;
                  productoId = prod.id;
                  monto = prod.precio;
                  fecha = timestamp;
                  blockHeight = ?block64;
                  estado = "Pagado";
                });
              }
            };
          };
          case (#Err(#BadFee { expected_fee })) {
            return #err(#ErrorLedger({ codigo = "BAD_FEE"; mensaje = "Fee esperado: " # Nat64.toText(natToNat64(expected_fee.e8s)) }));
          };
          case (#Err(#InsufficientFunds { balance })) {
            return #err(#ErrorLedger({ codigo = "INSUFFICIENT_FUNDS"; mensaje = "Balance: " # Nat64.toText(natToNat64(balance.e8s)) }));
          };
          case (#Err(e)) {
            return #err(#ErrorLedger({ codigo = "LEDGER_ERROR"; mensaje = debug_show(e) }));
          };
        };
      };

      #ok(())
    } catch (e) {
      logEvento("❌ realizarCompra: " # Error.message(e));
      #err(#ErrorInterno("Error inesperado al procesar compra"))
    }
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
  };
  
  system func postupgrade() {
    usuarios := HashMap.fromIter<Principal, Usuario>(stableUsuarios.vals(), 0, Principal.equal, Principal.hash);
    productos := HashMap.fromIter<Text, Producto>(stableProductos.vals(), 0, Text.equal, Text.hash);
    transacciones := HashMap.fromIter<Text, Transaccion>(stableTransacciones.vals(), 0, Text.equal, Text.hash);
    logs := Buffer.fromArray(stableLogs);
  };
};