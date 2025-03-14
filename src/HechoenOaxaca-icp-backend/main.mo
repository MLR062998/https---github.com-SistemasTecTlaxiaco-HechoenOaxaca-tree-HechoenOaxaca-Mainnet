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

    type Producto = {
        id: Principal;
        nombre: Text;
        precio: Float;
        descripcion: Text;
        artesano: Principal;
        tipo: Text;
        imagenes: [Blob];
    };

    type AplicationError = {
        #UsuarioNoExiste: Text;
        #UsuarioYaExiste: Text;
        #RolNoValido: Text;
        #SaldoInsuficiente: Text;
        #ProductoNoExiste: Text;
        #PermisoDenegado: Text;
    };

    var usuarios_table = HashMap.HashMap<Principal, Usuario>(10, Principal.equal, Principal.hash);
    var roles_table = HashMap.HashMap<Principal, Rol>(10, Principal.equal, Principal.hash);
    var productos_table = HashMap.HashMap<Principal, Producto>(10, Principal.equal, Principal.hash);
    var balances = HashMap.HashMap<Principal, Nat>(10, Principal.equal, Principal.hash);

    stable var usuariosRegistrados: [Principal] = [];

    let isLocalEnvironment = true; // ✅ Permitir anónimos solo en local

    // ✅ REGISTRAR USUARIO (PERMITE ANÓNIMOS EN LOCAL)
    public shared({caller}) func registrarUsuario(
        nombreCompleto: Text,
        lugarOrigen: Text,
        telefono: Text,
        rol: Text
    ): async Result.Result<Usuario, Text> {
        Debug.print("📌 Intento de registro con Principal: " # Principal.toText(caller));

        // Si es anónimo y no estamos en local, rechazar el registro
        if (Principal.isAnonymous(caller) and not isLocalEnvironment) {
            return #err("🚨 Error: Usuario no autenticado.");
        };

        let userPrincipal = if (Principal.isAnonymous(caller) and isLocalEnvironment) {
            Principal.fromText("aaaaa-aa") // Principal ficticio para usuarios anónimos en local
        } else caller;

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
            case _ { return #err("🚨 Rol inválido: " # rol); };
        };

        // Revisar si el usuario ya existe
        if (usuarios_table.get(userPrincipal) != null) {
            return #err("🚨 Error: Usuario ya registrado.");
        };

        let usuario: Usuario = {
            nombreCompleto = nombreCompleto;
            lugarOrigen = lugarOrigen;
            telefono = telefono;
            rol = parsedRol;
        };

        usuarios_table.put(userPrincipal, usuario);
        roles_table.put(userPrincipal, parsedRol);

        if (not contienePrincipal(usuariosRegistrados, userPrincipal)) {
            usuariosRegistrados := Array.append(usuariosRegistrados, [userPrincipal]);
        };

        return #ok(usuario);
    };

    // ✅ VERIFICAR SI UN USUARIO ESTÁ REGISTRADO (PERMITE ANÓNIMOS EN LOCAL)
    public query func verificarUsuario(principalId: Principal): async Result.Result<Usuario, Text> {
        let userPrincipal = if (Principal.isAnonymous(principalId) and isLocalEnvironment) {
            Principal.fromText("aaaaa-aa") // Principal ficticio
        } else principalId;

        switch (usuarios_table.get(userPrincipal)) {
            case (?usuario) { return #ok(usuario); };
            case null { return #err("Usuario no registrado"); };
        };
    };

    // ✅ OBTENER ROL DEL USUARIO
    public query func getRolUsuario(usuario: Principal): async Result.Result<Text, Text> {
        let userPrincipal = if (Principal.isAnonymous(usuario) and isLocalEnvironment) {
            Principal.fromText("aaaaa-aa")
        } else usuario;

        switch (roles_table.get(userPrincipal)) {
            case (?#Artesano) { return #ok("Artesano"); };
            case (?#Intermediario) { return #ok("Intermediario"); };
            case (?#Cliente) { return #ok("Cliente"); };
            case (?#Administrador) { return #ok("Administrador"); };
            case null { return #err("Usuario no registrado."); };
        };
    };

    // ✅ CREAR PRODUCTO (SOLO ARTESANOS, PERMITE ANÓNIMOS EN LOCAL)
    public shared({caller}) func createProducto(
        nombre: Text,
        precio: Float,
        descripcion: Text,
        tipo: Text,
        imagenes: [Blob]
    ): async Result.Result<Producto, AplicationError> {
        let userPrincipal = if (Principal.isAnonymous(caller) and isLocalEnvironment) {
            Principal.fromText("aaaaa-aa")
        } else caller;

        // Verificar si el usuario está registrado y es artesano
        switch (roles_table.get(userPrincipal)) {
            case (?#Artesano) {};
            case _ { return #err(#PermisoDenegado("Solo los artesanos pueden crear productos.")); };
        };

        if (imagenes.size() > 3) {
            return #err(#PermisoDenegado("No se pueden subir más de 3 imágenes."));
        };

        let producto: Producto = {
            id = userPrincipal;
            nombre = nombre;
            precio = precio;
            descripcion = descripcion;
            artesano = userPrincipal;
            tipo = tipo;
            imagenes = imagenes;
        };

        productos_table.put(userPrincipal, producto);
        return #ok(producto);
    };

    // ✅ LEER TODOS LOS PRODUCTOS
    public query func readProductos(): async [Producto] {
        return Iter.toArray(productos_table.vals());
    };

    // ✅ OBTENER SALDO
    public query func obtenerSaldo(usuario: Principal): async Nat {
        let userPrincipal = if (Principal.isAnonymous(usuario) and isLocalEnvironment) {
            Principal.fromText("aaaaa-aa")
        } else usuario;

        switch (balances.get(userPrincipal)) {
            case (?saldo) { return saldo; };
            case null { return 0; };
        };
    };

    func contienePrincipal(lista: [Principal], principal: Principal): Bool {
        for (p in lista.vals()) {
            if (Principal.equal(p, principal)) {
                return true;
            };
        };
        return false;
    };
};
