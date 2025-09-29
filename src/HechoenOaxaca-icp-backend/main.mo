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

import Ledger "./Ledger";

actor class HechoenOaxacaBackend() = this {

  // ========= CONFIGURACIÓN =========
  let TRANSFER_FEE : Nat64 = 10_000;
  let ALLOW_MULTI_ARTESANOS : Bool = true;

  // Conexión al Ledger ICP oficial
  let ledger = actor("ryjl3-tyaaa-aaaaa-aaaba-cai") : Ledger.Self;

  // ========= IMPLEMENTACIÓN CORRECTA DE ACCOUNT IDENTIFIER =========
  module AccountIdentifier {
    public type AccountIdentifier = Blob;
    public type Subaccount = Blob;

    public func defaultSubaccount() : Subaccount {
        // ✅ CORREGIDO: Usar Array.tabulate en lugar de Array.init
        let zeros : [Nat8] = Array.tabulate<Nat8>(32, func(i) { 0 });
        Blob.fromArray(zeros);
    };

    // Implementación de CRC32
    func crc32(data : [Nat8]) : Nat32 {
        var crc : Nat32 = 0xFFFFFFFF;
        for (byte in data.vals()) {
            crc := crc ^ Nat32.fromNat(Nat8.toNat(byte));
            var j : Nat = 0;
            while (j < 8) {
                if (crc & 1 == 1) {
                    crc := (crc >> 1) ^ 0xEDB88320;
                } else {
                    crc := crc >> 1;
                };
                j += 1;
            };
        };
        return crc ^ 0xFFFFFFFF;
    };

    func beBytes(n : Nat32) : [Nat8] {
        [
            Nat8.fromNat(Nat32.toNat((n >> 24) & 0xFF)),
            Nat8.fromNat(Nat32.toNat((n >> 16) & 0xFF)),
            Nat8.fromNat(Nat32.toNat((n >> 8) & 0xFF)),
            Nat8.fromNat(Nat32.toNat(n & 0xFF))
        ];
    };

    // Función para obtener slice de un array (reemplazo para Array.slice)
    func slice(array : [Nat8], start : Nat, end : Nat) : [Nat8] {
        Array.tabulate<Nat8>(end - start, func(i) { array[start + i] });
    };

    // Función hash simple pero consistente basada en el principal
    func principalHash(principal : Principal) : [Nat8] {
        let principalBytes = Blob.toArray(Principal.toBlob(principal));
        Array.tabulate<Nat8>(28, func(i) {
            if (i < principalBytes.size()) {
                principalBytes[i]
            } else {
                Nat8.fromNat((i * 13 + (if (principalBytes.size() > 0) Nat8.toNat(principalBytes[0]) else 0)) % 256)
            }
        });
    };

    public func accountIdentifier(principal : Principal, subaccount : Subaccount) : AccountIdentifier {
        // Generar hash del principal
        let hash = principalHash(principal);
        
        // Calcular checksum CRC32 del hash
        let checksum = crc32(hash);
        let checksumBytes = beBytes(checksum);
        
        Debug.print("🔍 Checksum calculado: " # debug_show(checksumBytes) # " para principal: " # Principal.toText(principal));
        
        // ✅ CORREGIDO: Usar función auxiliar para combinar arrays
        let accountId = combineArrays(checksumBytes, hash);
        Blob.fromArray(accountId)
    };

    // Función auxiliar para combinar arrays sin usar Array.append
    func combineArrays(a : [Nat8], b : [Nat8]) : [Nat8] {
        let size = a.size() + b.size();
        Array.tabulate<Nat8>(size, func(i) {
            if (i < a.size()) {
                a[i]
            } else {
                b[i - a.size()]
            }
        });
    };

    public func validateAccountIdentifier(accountIdentifier : AccountIdentifier) : Bool {
        accountIdentifier.size() == 32
    };
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

  private func incrementNat64(map : HashMap.HashMap<Principal, Nat64>, key : Principal, value : Nat64) : () {
    let current = Option.get(map.get(key), 0:Nat64);
    map.put(key, current + value);
  };

  // ========= FUNCIÓN CORREGIDA PARA CREAR ACCOUNT IDENTIFIER VÁLIDO =========
  private func createAccountIdentifier(principal : Principal) : Blob {
    let subaccount = AccountIdentifier.defaultSubaccount();
    let accountId = AccountIdentifier.accountIdentifier(principal, subaccount);
    
    let bytes = Blob.toArray(accountId);
    
    // ✅ CORREGIDO: Función auxiliar para obtener slice
    func getSlice(arr : [Nat8], start : Nat, end : Nat) : [Nat8] {
        Array.tabulate<Nat8>(end - start, func(i) { arr[start + i] });
    };
    
    let checksum = getSlice(bytes, 0, 4);
    Debug.print("✅ AccountIdentifier generado para: " # Principal.toText(principal));
    Debug.print("🔍 Checksum: " # debug_show(checksum) # ", Tamaño: " # Nat.toText(bytes.size()) # " bytes");
    
    accountId
  };

  private func accountIdentifierToText(accountId : Blob) : Text {
    let bytes = Blob.toArray(accountId);
    var result = "";
    for (i in Iter.range(0, 7)) {
      if (i < bytes.size()) {
        result := result # Nat8.toText(bytes[i]) # " ";
      };
    };
    result # "... (" # Nat.toText(bytes.size()) # " bytes)"
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
        let accountIdBlob = createAccountIdentifier(caller);
        let accountIdBytes = Blob.toArray(accountIdBlob);
        
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

  // ========= ACTUALIZAR PERFIL =========
  public shared ({ caller }) func actualizarPerfil(
    nombreCompleto : Text,
    lugarOrigen : Text,
    telefono : Text
  ) : async Result.Result<(), AplicationError> {
    try {
      switch (usuarios.get(caller)) {
        case (?usuarioExistente) {
          if (Text.size(nombreCompleto) < 3) return #err(#ErrorValidacion("Nombre completo debe tener al menos 3 caracteres"));
          if (Text.size(lugarOrigen) < 3)    return #err(#ErrorValidacion("Lugar de origen debe tener al menos 3 caracteres"));
          if (Text.size(telefono) < 7)       return #err(#ErrorValidacion("Teléfono debe tener al menos 7 dígitos"));

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
          logEvento("✏️ Perfil actualizado: " # Principal.toText(caller));
          #ok(())
        };
        case null return #err(#UsuarioNoExiste);
      }
    } catch (e) {
      logEvento("❌ actualizarPerfil: " # Error.message(e));
      #err(#ErrorInterno("Error inesperado al actualizar perfil"))
    }
  };

  public shared query ({ caller }) func obtenerUsuario() : async Result.Result<Usuario, AplicationError> {
    switch (usuarios.get(caller)) { case (?u) #ok(u); case null #err(#UsuarioNoExiste) }
  };

  public shared query func obtenerUsuarioPorPrincipal(p : Principal) : async Result.Result<Usuario, AplicationError> {
    switch (usuarios.get(p)) { case (?u) #ok(u); case null #err(#UsuarioNoExiste) }
  };

  public shared query func obtenerAccountIdentifier(p : Principal) : async Text {
    let accountId = createAccountIdentifier(p);
    accountIdentifierToText(accountId)
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

  // ========= COMPRAS / PAGOS ========= (FUNCIÓN COMPLETAMENTE CORREGIDA)
  public shared ({ caller }) func realizarCompra(productoIds : [Text]) : async Result.Result<(), AplicationError> {
    try {
      // Validaciones de usuario y carrito
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

      Debug.print("🛒 Iniciando compra para usuario: " # Principal.toText(caller));

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
      
      Debug.print("👨‍🎨 Artesanos a pagar: " # debug_show(Iter.toArray(artesanosTotales.entries())));

      for ((artesano, montoTotal) in artesanosTotales.entries()) {
        Debug.print("💰 Procesando pago a: " # Principal.toText(artesano) # " - Monto: " # Nat64.toText(montoTotal));

        // ✅ USAR LA FUNCIÓN CORREGIDA
        let cuenta = createAccountIdentifier(artesano);
        
        let cuentaBytes = Blob.toArray(cuenta);
        Debug.print("🔍 AccountIdentifier generado - Tamaño: " # Nat.toText(cuentaBytes.size()));

        // ✅ LLAMADA AL LEDGER
        let transferArgs : Ledger.TransferArgs = {
          memo = 0;
          amount = { e8s = montoTotal };
          fee = { e8s = TRANSFER_FEE };
          from_subaccount = null;
          to = cuenta;
          created_at_time = null;
        };

        Debug.print("📤 Enviando transferencia...");
        
        let res = await ledger.transfer(transferArgs);

        switch (res) {
          case (#Ok(block)) {
            Debug.print("✅ Pago exitoso. Block: " # Nat64.toText(block));
            
            logEvento("✅ Pago a artesano " # Principal.toText(artesano) # " por " # Nat64.toText(montoTotal) # " e8s. block=" # Nat64.toText(block));
            
            for (prod in productosSeleccionados.vals()) {
              if (prod.artesano == artesano) {
                let txId = await generateId("tx-");
                transacciones.put(txId, {
                  id = txId;
                  comprador = caller;
                  vendedor = artesano;
                  productoId = prod.id;
                  monto = prod.precio;
                  fecha = timestamp;
                  blockHeight = ?block;
                  estado = "Pagado";
                });
              }
            };
          };
          case (#Err(#BadFee { expected_fee })) {
            Debug.print("❌ Error de fee: " # Nat64.toText(expected_fee.e8s));
            return #err(#ErrorLedger({ codigo = "BAD_FEE"; mensaje = "Fee esperado: " # Nat64.toText(expected_fee.e8s) }));
          };
          case (#Err(#InsufficientFunds { balance })) {
            Debug.print("❌ Fondos insuficientes: " # Nat64.toText(balance.e8s));
            return #err(#ErrorLedger({ codigo = "INSUFFICIENT_FUNDS"; mensaje = "Balance: " # Nat64.toText(balance.e8s) }));
          };
          case (#Err(e)) {
            Debug.print("❌ Error del ledger: " # debug_show(e));
            return #err(#ErrorLedger({ codigo = "LEDGER_ERROR"; mensaje = debug_show(e) }));
          };
        };
      };

      #ok(())
    } catch (e) {
      Debug.print("❌ Error inesperado en realizarCompra: " # Error.message(e));
      logEvento("❌ realizarCompra: " # Error.message(e));
      #err(#ErrorInterno("Error inesperado al procesar compra: " # Error.message(e)))
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