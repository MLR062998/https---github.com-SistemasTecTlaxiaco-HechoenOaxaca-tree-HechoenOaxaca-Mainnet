import Principal "mo:base/Principal";
import Result "mo:base/Result";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Debug "mo:base/Debug";
import Blob "mo:base/Blob";
import Array "mo:base/Array";
import Nat "mo:base/Nat";

actor HechoenOaxacaBackend {
    // Definición del usuario y roles
    type Usuario = {
        nombreCompleto: Text;
        lugarOrigen: Text;
        telefono: Text;
        rol: Rol;
    };

    type Rol = {
        #Artesano;
        #Intermediario;
        #Cliente;
        #Administrador;
    };

    // Definición del tipo Producto
    type Producto = {
        id: Principal;
        nombre: Text;
        precio: Float;
        descripcion: Text;
        artesano: Principal;
        tipo: Text;
        imagenes: [Blob];
    };

    // Tipos de errores
    type AplicationError = {
        #UsuarioNoExiste: Text;
        #UsuarioYaExiste: Text;
        #RolNoValido: Text;
        #SaldoInsuficiente: Text;
        #ProductoNoExiste: Text;
        #PermisoDenegado: Text;
    };

    // Tablas hash para usuarios, roles, productos, balances e identity_links
    var usuarios_table = HashMap.HashMap<Principal, Usuario>(10, Principal.equal, Principal.hash);
    var roles_table = HashMap.HashMap<Principal, Rol>(10, Principal.equal, Principal.hash);
    var productos_table = HashMap.HashMap<Principal, Producto>(10, Principal.equal, Principal.hash);
    var balances = HashMap.HashMap<Principal, Nat>(10, Principal.equal, Principal.hash);
    var identity_links = HashMap.HashMap<Principal, Principal>(10, Principal.equal, Principal.hash);

    // Lista de usuarios registrados
    stable var usuariosRegistrados : [Principal] = [];

    // Constante para determinar si estamos en un entorno local
    let isLocalEnvironment = true; // Cambia a `false` en producción

    // ✅ REGISTRAR USUARIO (CON DEPURACIÓN)
    public shared({caller}) func registrarUsuario(
        nombreCompleto: Text,
        lugarOrigen: Text,
        telefono: Text,
        rol: Text
    ): async Result.Result<Usuario, Text> {
        Debug.print("📌 Intento de registro con Principal: " # Principal.toText(caller));

        // ❗ PERMITIR USUARIOS ANÓNIMOS SOLO EN LOCAL
        if (Principal.isAnonymous(caller) and not isLocalEnvironment) {
            Debug.print("🚨 Error: Usuario no autenticado en producción.");
            return #err("🚨 Error: Usuario no autenticado.");
        };

        // ❗ FORZAR QUE EL USUARIO SE REGISTRE SI NO EXISTE
        if (roles_table.get(caller) == null) {
            return #err("🚨 Error: Usuario no registrado. Regístrate primero.");
        };

        // Validación de campos vacíos
        if (Text.size(nombreCompleto) == 0 or Text.size(lugarOrigen) == 0 or Text.size(telefono) == 0) {
            return #err("🚨 Error: Todos los campos son obligatorios.");
        };

        // Validación de rol
        let lowerRol = Text.toLowercase(rol);
        let parsedRol = switch (lowerRol) {
            case "artesano" #Artesano;
            case "intermediario" #Intermediario;
            case "cliente" #Cliente;
            case "administrador" #Administrador;
            case _ {
                return #err("🚨 Rol inválido: " # rol);
            };
        };

        // ✅ Revisar si el usuario ya está registrado
        switch (usuarios_table.get(caller)) {
            case (?usuarioExistente) {
                return #ok(usuarioExistente);
            };
            case null {
                let usuario: Usuario = {
                    nombreCompleto = nombreCompleto;
                    lugarOrigen = lugarOrigen;
                    telefono = telefono;
                    rol = parsedRol;
                };

                usuarios_table.put(caller, usuario);
                roles_table.put(caller, parsedRol);

                // Agregar el usuario a la lista de registrados
                if (not contienePrincipal(usuariosRegistrados, caller)) {
                    usuariosRegistrados := Array.append(usuariosRegistrados, [caller]);
                };

                return #ok(usuario);
            };
        };
    };

    // ✅ VERIFICAR SI UN USUARIO ESTÁ REGISTRADO
    public query func verificarUsuario(principalId: Principal): async Result.Result<Usuario, Text> {
        switch (usuarios_table.get(principalId)) {
            case (?usuario) { return #ok(usuario); };
            case null { return #err("Usuario no registrado"); };
        };
    };

    // ✅ OBTENER ROL DEL USUARIO
    public query func getRolUsuario(usuario: Principal): async Result.Result<Text, Text> {
        if (Principal.isAnonymous(usuario) and not isLocalEnvironment) {
            return #err("🚨 Usuario no autenticado.");
        };

        switch (roles_table.get(usuario)) {
            case (?#Artesano) { return #ok("Artesano"); };
            case (?#Intermediario) { return #ok("Intermediario"); };
            case (?#Cliente) { return #ok("Cliente"); };
            case (?#Administrador) { return #ok("Administrador"); };
            case null { return #err("Usuario no registrado."); };
        };
    };

    // ✅ CREAR PRODUCTO (SOLO ARTESANOS)
    public shared({caller}) func createProducto(
        nombre: Text,
        precio: Float,
        descripcion: Text,
        tipo: Text,
        imagenes: [Blob]
    ): async Result.Result<Producto, AplicationError> {
        // ❗ PERMITIR USUARIOS ANÓNIMOS SOLO EN LOCAL
        if (Principal.isAnonymous(caller) and not isLocalEnvironment) {
            return #err(#PermisoDenegado("🚨 Usuario no autenticado."));
        };

        // ❗ FORZAR QUE EL USUARIO ESTÉ REGISTRADO
        if (roles_table.get(caller) == null) {
            return #err(#PermisoDenegado("🚨 Usuario no registrado. Regístrate primero."));
        };

        // Validar que el usuario sea un artesano
        switch (roles_table.get(caller)) {
            case (?#Artesano) {};
            case _ { return #err(#PermisoDenegado("Solo los artesanos pueden crear productos.")); };
        };

        // Validar límite de imágenes
        if (imagenes.size() > 3) {
            return #err(#PermisoDenegado("No se pueden subir más de 3 imágenes."));
        };

        let producto: Producto = {
            id = caller;
            nombre = nombre;
            precio = precio;
            descripcion = descripcion;
            artesano = caller;
            tipo = tipo;
            imagenes = imagenes;
        };

        productos_table.put(caller, producto);
        return #ok(producto);
    };

    // ✅ FUNCIONES AUXILIARES
    func contienePrincipal(lista: [Principal], principal: Principal): Bool {
        for (p in lista.vals()) {
            if (Principal.equal(p, principal)) {
                return true;
            };
        };
        return false;
    };

    // ✅ LEER TODOS LOS PRODUCTOS
    public query func readProductos(): async [Producto] {
        return Iter.toArray(productos_table.vals());
    };

    // ✅ OBTENER SALDO
    public query func obtenerSaldo(usuario: Principal): async Nat {
        switch (balances.get(usuario)) {
            case (?saldo) { return saldo; };
            case null { return 0; };
        };
    };

    // ✅ REALIZAR PAGO
    public shared({caller}) func realizarPago(artesano: Principal, monto: Nat): async Result.Result<Text, Text> {
        let globalCliente = switch (identity_links.get(caller)) {
            case (?principal) principal;
            case null caller;
        };

        let globalArtesano = switch (identity_links.get(artesano)) {
            case (?principal) principal;
            case null artesano;
        };

        if (globalCliente == globalArtesano) {
            return #err("No puedes pagarte a ti mismo.");
        };

        let saldoCliente = switch (balances.get(globalCliente)) {
            case (?saldo) saldo;
            case null 0;
        };

        if (saldoCliente < monto) {
            return #err("Saldo insuficiente.");
        };

        let saldoArtesano = switch (balances.get(globalArtesano)) {
            case (?saldo) saldo;
            case null 0;
        };

        balances.put(globalCliente, saldoCliente - monto);
        balances.put(globalArtesano, saldoArtesano + monto);

        return #ok("Pago realizado con éxito.");
    };
};