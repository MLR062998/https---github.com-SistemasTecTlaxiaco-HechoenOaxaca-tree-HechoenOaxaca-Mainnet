// src/declarations/HechoenOaxaca-icp-backend/main.mo
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Char "mo:base/Char";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Random "mo:base/Random";
import Blob "mo:base/Blob";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Nat8 "mo:base/Nat8";
import Time "mo:base/Time";
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Buffer "mo:base/Buffer";

actor class HechoenOaxacaBackend() = this {
    public type Usuario = {
        nombreCompleto : Text;
        lugarOrigen : Text;
        telefono : Text;
        rol : Rol;
        fechaRegistro : Int;
        verificado : Bool;
    };

    public type Rol = {
        #Artesano;
        #Intermediario;
        #Cliente;
    };

    public type Producto = {
        id : Text;
        nombre : Text;
        precio : Float;
        descripcion : Text;
        artesano : Principal;
        tipo : Text;
        imagenes : [Blob];
        fechaCreacion : Int;
        activo : Bool;
    };

    public type Transaccion = {
        id : Text;
        comprador : Principal;
        vendedor : Principal;
        productoId : Text;
        monto : Nat;
        fecha : Int;
    };

    public type AplicationError = {
        #UsuarioNoExiste;
        #UsuarioYaExiste;
        #RolNoValido;
        #SaldoInsuficiente;
        #ProductoNoExiste;
        #PermisoDenegado;
        #ErrorValidacion : Text;
    };

    private var usuarios = HashMap.HashMap<Principal, Usuario>(0, Principal.equal, Principal.hash);
    private var productos = HashMap.HashMap<Text, Producto>(0, Text.equal, Text.hash);
    private var balances = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
    private var transacciones = HashMap.HashMap<Text, Transaccion>(0, Text.equal, Text.hash);

    stable var stableUsuarios : [(Principal, Usuario)] = [];
    stable var stableProductos : [(Text, Producto)] = [];
    stable var stableBalances : [(Principal, Nat)] = [];
    stable var stableTransacciones : [(Text, Transaccion)] = [];

    // Funciones de utilidad
    private func toLower(text : Text) : Text {
        Text.fromIter(Iter.map(text.chars(), func(c : Char) : Char {
            if (c >= 'A' and c <= 'Z') Char.fromNat32(Char.toNat32(c) + 32) else c
        }))
    };

    private func validatePhone(phone : Text) : Bool {
        if (phone.size() != 10) return false;
        for (c in phone.chars()) {
            if (c < '0' or c > '9') return false;
        };
        true
    };

    private func blobToHex(blob : Blob) : Text {
    let bytes = Blob.toArray(blob);
    Text.fromIter(Iter.fromArray(Array.tabulate<Char>(bytes.size() * 2, func(i) {
        let byte = bytes[i / 2];
        let nibble = if (i % 2 == 0) (byte >> 4) else (byte & 0x0F);
        // Primero convertimos a Nat y luego a Nat32
        let nibbleNat = Nat8.toNat(nibble);
        if (nibbleNat < 10) {
            Char.fromNat32(Nat32.fromNat(nibbleNat) + 48) // '0' a '9'
        } else {
            Char.fromNat32(Nat32.fromNat(nibbleNat) + 87) // 'a' a 'f'
        }
    })))
};

    private func generateId() : async Text {
        let random = await Random.blob();
        blobToHex(random)
    };

    // Funciones de persistencia
    system func preupgrade() {
        stableUsuarios := Iter.toArray(usuarios.entries());
        stableProductos := Iter.toArray(productos.entries());
        stableBalances := Iter.toArray(balances.entries());
        stableTransacciones := Iter.toArray(transacciones.entries());
    };

    system func postupgrade() {
        usuarios := HashMap.fromIter<Principal, Usuario>(stableUsuarios.vals(), 0, Principal.equal, Principal.hash);
        productos := HashMap.fromIter<Text, Producto>(stableProductos.vals(), 0, Text.equal, Text.hash);
        balances := HashMap.fromIter<Principal, Nat>(stableBalances.vals(), 0, Principal.equal, Principal.hash);
        transacciones := HashMap.fromIter<Text, Transaccion>(stableTransacciones.vals(), 0, Text.equal, Text.hash);
    };

    // Funciones de usuario
    public shared ({ caller }) func registrarUsuario(
        nombreCompleto : Text,
        lugarOrigen : Text,
        telefono : Text,
        rol : Text
    ) : async Result.Result<Usuario, AplicationError> {
        if (Principal.isAnonymous(caller)) return #err(#PermisoDenegado);
        if (Option.isSome(usuarios.get(caller))) return #err(#UsuarioYaExiste);
        if (nombreCompleto.size() == 0 or lugarOrigen.size() == 0)
            return #err(#ErrorValidacion("Nombre completo y lugar de origen son requeridos"));
        if (not validatePhone(telefono))
            return #err(#ErrorValidacion("Teléfono debe tener exactamente 10 dígitos numéricos"));

        let usuario : Usuario = {
            nombreCompleto = nombreCompleto;
            lugarOrigen = lugarOrigen;
            telefono = telefono;
            rol = switch (toLower(rol)) {
                case "artesano" #Artesano;
                case "intermediario" #Intermediario;
                case "cliente" #Cliente;
                case _ return #err(#RolNoValido);
            };
            fechaRegistro = Time.now();
            verificado = false;
        };

        usuarios.put(caller, usuario);
        balances.put(caller, 0);
        #ok(usuario)
    };

    public shared query ({ caller }) func obtenerUsuario() : async Result.Result<Usuario, AplicationError> {
        switch (usuarios.get(caller)) {
            case (?usuario) #ok(usuario);
            case null #err(#UsuarioNoExiste);
        }
    };

    public shared query func obtenerUsuarioPorId(id : Principal) : async Result.Result<Usuario, AplicationError> {
        switch (usuarios.get(id)) {
            case (?usuario) #ok(usuario);
            case null #err(#UsuarioNoExiste);
        }
    };

    public shared ({ caller }) func editarPerfil(
        nombreCompleto : Text,
        lugarOrigen : Text,
        telefono : Text
    ) : async Result.Result<Usuario, AplicationError> {
        switch (usuarios.get(caller)) {
            case (?usuario) {
                if (nombreCompleto.size() == 0 or lugarOrigen.size() == 0) {
                    return #err(#ErrorValidacion("Nombre completo y lugar de origen son requeridos"));
                };
                if (not validatePhone(telefono)) {
                    return #err(#ErrorValidacion("Teléfono debe tener exactamente 10 dígitos numéricos"));
                };

                let actualizado : Usuario = {
                    nombreCompleto = nombreCompleto;
                    lugarOrigen = lugarOrigen;
                    telefono = telefono;
                    rol = usuario.rol;
                    fechaRegistro = usuario.fechaRegistro;
                    verificado = usuario.verificado;
                };
                usuarios.put(caller, actualizado);
                #ok(actualizado)
            };
            case null return #err(#UsuarioNoExiste);
        }
    };

    // Funciones de saldo
    public shared query ({ caller }) func obtenerSaldo() : async Nat {
        Option.get(balances.get(caller), 0)
    };

    public shared ({ caller }) func depositarFondos(monto : Nat) : async Result.Result<(), AplicationError> {
        if (Principal.isAnonymous(caller)) {
            return #err(#PermisoDenegado);
        };
        if (monto == 0) {
            return #err(#ErrorValidacion("El monto debe ser mayor a 0"));
        };
        let saldoActual = Option.get(balances.get(caller), 0);
        balances.put(caller, saldoActual + monto);
        #ok(())
    };

    public shared ({ caller }) func transferirSaldo(destino : Principal, monto : Nat) : async Result.Result<(), AplicationError> {
        if (Principal.isAnonymous(caller)) return #err(#PermisoDenegado);
        if (monto == 0) return #err(#ErrorValidacion("El monto debe ser mayor a 0"));
        if (caller == destino) return #err(#ErrorValidacion("No puedes transferir a ti mismo"));
        if (not Principal.isController(destino)) return #err(#PermisoDenegado);

        let saldoOrigen = Option.get(balances.get(caller), 0);
        if (saldoOrigen < monto) return #err(#SaldoInsuficiente);

        let saldoDestino = Option.get(balances.get(destino), 0);

        balances.put(caller, saldoOrigen - monto);
        balances.put(destino, saldoDestino + monto);
        
        // Registrar transacción
        let transaccionId = await generateId();
        transacciones.put(transaccionId, {
            id = transaccionId;
            comprador = destino;
            vendedor = caller;
            productoId = "";
            monto = monto;
            fecha = Time.now();
        });
        
        #ok(())
    };

    // Funciones de productos
    public shared ({ caller }) func crearProducto(
        nombre : Text,
        precio : Float,
        descripcion : Text,
        tipo : Text,
        imagenes : [Blob]
    ) : async Result.Result<Producto, AplicationError> {
        switch (usuarios.get(caller)) {
            case (?usuario) {
                if (usuario.rol != #Artesano) return #err(#PermisoDenegado);
            };
            case null return #err(#PermisoDenegado);
        };

        if (imagenes.size() > 5) {
            return #err(#ErrorValidacion("Máximo 5 imágenes permitidas"));
        };

        if (nombre.size() == 0 or descripcion.size() < 10) {
            return #err(#ErrorValidacion("Nombre y descripción (mínimo 10 caracteres) son obligatorios"));
        };
        if (precio <= 0) {
            return #err(#ErrorValidacion("El precio debe ser mayor a 0"));
        };

        let id = await generateId();
        let producto : Producto = {
            id = id;
            nombre = nombre;
            precio = precio;
            descripcion = descripcion;
            artesano = caller;
            tipo = tipo;
            imagenes = imagenes;
            fechaCreacion = Time.now();
            activo = true;
        };

        productos.put(id, producto);
        #ok(producto)
    };

    public shared query func listarProductos() : async [Producto] {
        Iter.toArray(productos.vals())
    };

    public shared query func listarProductosActivos() : async [Producto] {
        let buffer = Buffer.Buffer<Producto>(0);
        for (producto in productos.vals()) {
            if (producto.activo) {
                buffer.add(producto);
            };
        };
        Buffer.toArray(buffer)
    };

    public shared query func obtenerProducto(id : Text) : async Result.Result<Producto, AplicationError> {
        switch (productos.get(id)) {
            case (?producto) #ok(producto);
            case null #err(#ProductoNoExiste);
        }
    };

    public shared query func buscarProductosPorTipo(tipo : Text) : async [Producto] {
        let buffer = Buffer.Buffer<Producto>(0);
        for (producto in productos.vals()) {
            if (producto.activo and toLower(producto.tipo) == toLower(tipo)) {
                buffer.add(producto);
            };
        };
        Buffer.toArray(buffer)
    };

    public shared query func buscarProductosPorArtesano(artesano : Principal) : async [Producto] {
        let buffer = Buffer.Buffer<Producto>(0);
        for (producto in productos.vals()) {
            if (producto.artesano == artesano and producto.activo) {
                buffer.add(producto);
            };
        };
        Buffer.toArray(buffer)
    };

    public shared ({ caller }) func actualizarProducto(
        id : Text,
        nombre : Text,
        precio : Float,
        descripcion : Text,
        tipo : Text,
        imagenes : [Blob]
    ) : async Result.Result<(), AplicationError> {
        switch (productos.get(id)) {
            case (?prod) {
                if (prod.artesano != caller) return #err(#PermisoDenegado);
                if (imagenes.size() > 5) {
                    return #err(#ErrorValidacion("Máximo 5 imágenes permitidas"));
                };
                if (nombre.size() == 0 or descripcion.size() < 10) {
                    return #err(#ErrorValidacion("Nombre y descripción (mínimo 10 caracteres) son obligatorios"));
                };
                if (precio <= 0) {
                    return #err(#ErrorValidacion("El precio debe ser mayor a 0"));
                };

                productos.put(id, {
                    id = id;
                    nombre = nombre;
                    precio = precio;
                    descripcion = descripcion;
                    tipo = tipo;
                    imagenes = imagenes;
                    artesano = caller;
                    fechaCreacion = prod.fechaCreacion;
                    activo = prod.activo; // Mantener el estado actual
                });
                #ok(())
            };
            case null return #err(#ProductoNoExiste);
        }
    };

    public shared ({ caller }) func eliminarProducto(id : Text) : async Result.Result<(), AplicationError> {
        switch (productos.get(id)) {
            case (?prod) {
                if (prod.artesano != caller) return #err(#PermisoDenegado);
                productos.delete(id);
                #ok(())
            };
            case null return #err(#ProductoNoExiste);
        }
    };

    // Funciones de compra
    public shared ({ caller }) func realizarCompra(ids : [Text]) : async Result.Result<(), AplicationError> {
        if (Principal.isAnonymous(caller)) {
            return #err(#PermisoDenegado);
        };

        // Validar productos y calcular total
        var total : Nat = 0;
        let productosBuffer = Buffer.Buffer<Producto>(ids.size());
        
        for (id in ids.vals()) {
            switch (productos.get(id)) {
                case (?prod) {
                    if (not prod.activo) return #err(#ErrorValidacion("Producto inactivo o ya vendido"));
                    if (prod.artesano == caller) return #err(#ErrorValidacion("No puedes comprar tus propios productos"));
                    if (prod.precio <= 0) return #err(#ErrorValidacion("El precio debe ser positivo"));
                    
                    // Convertir precio Float a Nat (redondeando hacia arriba)
                    let precioInt = Float.toInt(Float.ceil(prod.precio));
                    let precioNat = Int.abs(precioInt);
                    total += precioNat;
                    productosBuffer.add(prod);
                };
                case null return #err(#ProductoNoExiste);
            };
        };

        // Verificar saldo
        let saldoActual = Option.get(balances.get(caller), 0);
        if (saldoActual < total) return #err(#SaldoInsuficiente);

        // Procesar compra
        try {
            // 1. Descontar saldo al comprador
            balances.put(caller, saldoActual - total);

            // 2. Transferir a artesanos y marcar productos como vendidos
            for (prod in productosBuffer.vals()) {
                // Transferir al artesano
                let saldoArtesano = Option.get(balances.get(prod.artesano), 0);
                let precioInt = Float.toInt(Float.ceil(prod.precio));
                let montoArtesano = Int.abs(precioInt);
                balances.put(prod.artesano, saldoArtesano + montoArtesano);

                // Marcar producto como vendido
                let productoVendido : Producto = {
                    id = prod.id;
                    nombre = prod.nombre;
                    precio = prod.precio;
                    descripcion = prod.descripcion;
                    tipo = prod.tipo;
                    imagenes = prod.imagenes;
                    artesano = prod.artesano;
                    fechaCreacion = prod.fechaCreacion;
                    activo = false; // Producto vendido
                };
                productos.put(prod.id, productoVendido);

                // Registrar transacción
                let transaccionId = await generateId();
                transacciones.put(transaccionId, {
                    id = transaccionId;
                    comprador = caller;
                    vendedor = prod.artesano;
                    productoId = prod.id;
                    monto = montoArtesano;
                    fecha = Time.now();
                });
            };
            #ok(())
        } catch (err) {
            // Revertir cambios en caso de error
            balances.put(caller, saldoActual);
            #err(#ErrorValidacion("Error al procesar la compra"))
        }
    };

    public shared query func obtenerHistorialCompras() : async [Transaccion] {
        Iter.toArray(transacciones.vals())
    };

    public shared query ({ caller }) func obtenerMisCompras() : async [Transaccion] {
        let buffer = Buffer.Buffer<Transaccion>(0);
        for (trans in transacciones.vals()) {
            if (trans.comprador == caller) {
                buffer.add(trans);
            };
        };
        Buffer.toArray(buffer)
    };

    public shared query ({ caller }) func obtenerMisVentas() : async [Transaccion] {
        let buffer = Buffer.Buffer<Transaccion>(0);
        for (trans in transacciones.vals()) {
            if (trans.vendedor == caller) {
                buffer.add(trans);
            };
        };
        Buffer.toArray(buffer)
    };

    // Funciones de administración
    public shared ({ caller }) func verificarUsuario(usuarioId : Principal) : async Result.Result<(), AplicationError> {
        // Solo el propio canister puede verificar usuarios (o podrías implementar lógica de admin)
        if (caller != Principal.fromActor(this)) return #err(#PermisoDenegado);
        
        switch (usuarios.get(usuarioId)) {
            case (?usuario) {
                let usuarioVerificado : Usuario = {
                    nombreCompleto = usuario.nombreCompleto;
                    lugarOrigen = usuario.lugarOrigen;
                    telefono = usuario.telefono;
                    rol = usuario.rol;
                    fechaRegistro = usuario.fechaRegistro;
                    verificado = true;
                };
                usuarios.put(usuarioId, usuarioVerificado);
                #ok(())
            };
            case null return #err(#UsuarioNoExiste);
        }
    };

    // Funciones de prueba
    public func runTests() : async () {
        let dummy1 = Principal.fromText("aaaaa-aa");
        let dummy2 = Principal.fromText("bbbbb-bb");

        // Registrar usuarios de prueba
        let _ = await registrarUsuario("Test Origen", "Oaxaca", "1234567890", "artesano");
        let _ = await registrarUsuario("Test Destino", "Oaxaca", "0987654321", "cliente");

        // Configurar saldos iniciales
        balances.put(dummy1, 100);
        balances.put(dummy2, 20);

        // Test 1: Transferencia exitosa
        let t1 = await transferirSaldo(dummy2, 30);
        assert(Result.isOk(t1));
        assert(Option.get(balances.get(dummy1), 0) == 70);
        assert(Option.get(balances.get(dummy2), 0) == 50);

        // Test 2: Transferencia a sí mismo
        let t2 = await transferirSaldo(dummy1, 10);
        assert(Result.isErr(t2));

        // Test 3: Saldo insuficiente
        let t3 = await transferirSaldo(dummy2, 100);
        assert(Result.isErr(t3));

        // Test de productos
        let productId = await generateId();
        productos.put(productId, {
            id = productId;
            nombre = "Olla";
            precio = 12.5;
            descripcion = "Olla de barro tradicional de Oaxaca";
            tipo = "artesania";
            imagenes = [Blob.fromArray([1,2,3])];
            artesano = dummy1;
            fechaCreacion = Time.now();
            activo = true;
        });

        let u1 = await actualizarProducto(productId, "Olla grande", 15.0, "Olla de barro grande", "artesania", []);
        assert(Result.isOk(u1));

        let d1 = await eliminarProducto(productId);
        assert(Result.isOk(d1));

        // Test de compra
        let comprador = Principal.fromText("ccccc-cc");
        let _ = await registrarUsuario("Comprador Test", "Oaxaca", "5555555555", "cliente");
        balances.put(comprador, 1000);

        // Crear producto de prueba
        let productoId = await generateId();
        let _ = await crearProducto(
            "Producto Test", 
            50.0, 
            "Descripción detallada del producto test", 
            "artesania", 
            []
        );

        // Test compra exitosa
        let c1 = await realizarCompra([productoId]);
        assert(Result.isOk(c1));

        // Test producto ya vendido
        let c2 = await realizarCompra([productoId]);
        assert(Result.isErr(c2));

        Debug.print("✅ Todos los tests pasaron correctamente");
    };
};