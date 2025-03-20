import Principal "mo:base/Principal";
import Result "mo:base/Result";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Char "mo:base/Char";
import Debug "mo:base/Debug";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Random "mo:base/Random";
import Blob "mo:base/Blob";
import Array "mo:base/Array";
import Nat "mo:base/Nat";

actor HechoenOaxacaBackend {
    // Definición del usuario
    type Usuario = {
        nombreCompleto: Text;
        lugarOrigen: Text;
        telefono: Text;
        rol: Rol;
    };

    // Definición de roles disponibles
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
        artesano: Principal; // Asociado al artesano que lo creó
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

    // Tablas hash para usuarios, roles, balances y productos
    var usuarios_table = HashMap.HashMap<Principal, Usuario>(10, Principal.equal, Principal.hash);
    var roles_table = HashMap.HashMap<Principal, Rol>(10, Principal.equal, Principal.hash);
    var balances = HashMap.HashMap<Principal, Nat>(10, Principal.equal, Principal.hash);
    var productos_table = HashMap.HashMap<Principal, Producto>(10, Principal.equal, Principal.hash);

    // Estructura para vincular múltiples Principal a un mismo usuario
    var identity_links = HashMap.HashMap<Principal, Principal>(10, Principal.equal, Principal.hash);

    // Almacenamiento estable de usuarios
    stable var usuarios : [(Principal, Text)] = []; // (Principal, Rol)

    // Lista de usuarios registrados
    stable var usuariosRegistrados : [Principal] = [];

    // Constante para determinar si estamos en un entorno local
    let isLocalEnvironment = true; // Cambia a false cuando despliegues en IC

    // Función auxiliar para convertir Float a Nat
    func floatToNat(f: Float): Nat {
        if (f < 0.0) {
            return 0; // Los valores negativos no se pueden convertir a Nat
        };

        let flooredValue = Float.floor(f); // Redondea hacia abajo el Float
        let intValue = Float.toInt(flooredValue); // Convierte el Float redondeado a Int

        // Verifica explícitamente que el valor es no negativo
        return switch (intValue >= 0) {
            case true Int.abs(intValue); // Convierte el Int positivo a Nat
            case false 0; // Seguridad adicional, aunque no debería ocurrir
        };
    };

    // Generar un ID único
    func generateId(): async Principal {
        let randomBlob = await Random.blob(); // Genera un Blob aleatorio
        let randomBytes = Array.subArray(Blob.toArray(randomBlob), 0, 29);
        return Principal.fromBlob(Blob.fromArray(randomBytes));
    };

    // Función auxiliar para buscar un usuario en la lista de usuarios
    func buscarUsuario(principalId: Principal): ?Text {
        for ((id, rol) in usuarios.vals()) {
            if (id == principalId) {
                return ?rol;
            };
        };
        return null;
    };

    // Función auxiliar para verificar si un Principal está en la lista de usuarios registrados
    func contienePrincipal(lista: [Principal], principal: Principal): Bool {
        for (p in lista.vals()) {
            if (Principal.equal(p, principal)) {
                return true;
            };
        };
        return false;
    };

    
           // ✅ REGISTRAR USUARIO (CON DEPURACIÓN)
public shared({caller}) func registrarUsuario(
    nombreCompleto: Text,
    lugarOrigen: Text,
    telefono: Text,
    rol: Text
): async Result.Result<Usuario, Text> {
    Debug.print("📌 Intento de registro con Principal: " # Principal.toText(caller));

    // ❗ RECHAZAR USUARIO NO AUTENTICADO
    if (Principal.isAnonymous(caller) or caller == Principal.fromText("aaaaa-aa")) {
        Debug.print("🚨 Error: Intento de registro con usuario NO autenticado.");
        return #err("🚨 Error: Usuario no autenticado. Inicia sesión antes de registrarte.");
    };

    // 🔹 Validar que los campos no estén vacíos
    if (Text.size(nombreCompleto) == 0 or Text.size(lugarOrigen) == 0 or Text.size(telefono) == 0) {
        Debug.print("🚨 Error: Campos vacíos en el registro.");
        return #err("🚨 Error: Todos los campos son obligatorios.");
    };

    // 🔹 Validar formato de teléfono (10 dígitos numéricos)
    if (Text.size(telefono) != 10) {
        Debug.print("🚨 Error: El teléfono debe tener exactamente 10 dígitos.");
        return #err("🚨 Error: El teléfono debe tener exactamente 10 dígitos.");
    };

    // Verificar que todos los caracteres sean dígitos
    let isNumeric = func (c: Char): Bool {
        return c >= '0' and c <= '9';
    };

    for (char in Text.toIter(telefono)) {
        if (not isNumeric(char)) {
            Debug.print("🚨 Error: El teléfono solo puede contener dígitos numéricos.");
            return #err("🚨 Error: El teléfono solo puede contener dígitos numéricos.");
        };
    };

    // 🔹 Convertir el rol a minúsculas y validar
    let lowerRol = Text.toLowercase(rol);
    let parsedRol = switch (lowerRol) {
        case "artesano" #Artesano;
        case "intermediario" #Intermediario;
        case "cliente" #Cliente;
        case "administrador" #Administrador;
        case _ {
            Debug.print("🚨 Error: Rol inválido proporcionado: " # rol);
            return #err("🚨 Rol inválido: " # rol);
        };
    };

    // ✅ Revisar si el usuario ya está registrado
    switch (usuarios_table.get(caller)) {
        case (?usuarioExistente) {
            Debug.print("✅ Usuario ya existe con Principal: " # Principal.toText(caller));
            return #ok(usuarioExistente);
        };
        case null {
            Debug.print("🆕 Registrando nuevo usuario con Principal: " # Principal.toText(caller));

            let usuario: Usuario = {
                nombreCompleto = nombreCompleto;
                lugarOrigen = lugarOrigen;
                telefono = telefono;
                rol = parsedRol;
            };

            usuarios_table.put(caller, usuario);
            roles_table.put(caller, parsedRol);
            balances.put(caller, 0);

            // Vincular NFID Principal con el Principal Global
            if (not isLocalEnvironment) {
                identity_links.put(caller, caller);
            };

            // Agregar usuario a la lista estable de usuarios
            usuarios := Array.append(usuarios, [(caller, rol)]);

            // Agregar el usuario a la lista de usuarios registrados
            if (not contienePrincipal(usuariosRegistrados, caller)) {
                usuariosRegistrados := Array.append(usuariosRegistrados, [caller]);
            };

            return #ok(usuario);
        };
    };
};

    // ✅ Verificar si un usuario está registrado
    public shared query func verificarUsuario(principalId: Principal): async Result.Result<Usuario, Text> {
        switch (usuarios_table.get(principalId)) {
            case (?usuario) { return #ok(usuario); };
            case null { return #err("Usuario no registrado"); };
        };
    };

    // ✅ OBTENER ROL DEL USUARIO (CON DEPURACIÓN)
    public query func getRolUsuario(usuario: Principal): async Result.Result<Text, Text> {
        Debug.print("📌 Consulta de rol para Principal: " # Principal.toText(usuario));

        // ❗ RECHAZAR USUARIO NO AUTENTICADO
        if (Principal.isAnonymous(usuario) or usuario == Principal.fromText("aaaaa-aa")) {
            Debug.print("🚨 Error: Consulta con usuario anónimo.");
            return #err("🚨 Usuario no autenticado.");
        };

        // 🔹 Obtener el rol del usuario
        switch (roles_table.get(usuario)) {
            case (?#Artesano) { return #ok("Artesano"); };
            case (?#Intermediario) { return #ok("Intermediario"); };
            case (?#Cliente) { return #ok("Cliente"); };
            case (?#Administrador) { return #ok("Administrador"); };
            case null { 
                Debug.print("❌ Error: Usuario no registrado con Principal: " # Principal.toText(usuario));
                return #err("Usuario no registrado."); 
            };
        };
    };

    // ✅ Verificar si un usuario tiene permisos (está registrado)
    public shared query func verificarPermisos(usuario: Principal): async Bool {
        return contienePrincipal(usuariosRegistrados, usuario);
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

    // Crear un producto (solo artesanos)
    public shared({caller}) func createProducto(
        nombre: Text,
        precio: Float,
        descripcion: Text,
        tipo: Text,
        imagenes: [Blob]
    ): async Result.Result<Producto, AplicationError> {
        // Validar que el usuario sea un artesano
        switch (roles_table.get(caller)) {
            case (?#Artesano) {};
            case _ { return #err(#PermisoDenegado("Solo los artesanos pueden crear productos.")); };
        };

        // Validar límite de imágenes
        if (imagenes.size() > 3) {
            return #err(#PermisoDenegado("No se pueden subir más de 3 imágenes."));
        };

        // Generar un ID único para el producto
        let id = await generateId();
        let producto: Producto = {
            id = id;
            nombre = nombre;
            precio = precio;
            descripcion = descripcion;
            artesano = caller; // Asociar producto al artesano creador
            tipo = tipo;
            imagenes = imagenes;
        };

        productos_table.put(id, producto);
        return #ok(producto);
    };

    // Leer todos los productos
    public query func readProductos(): async [Producto] {
        return Iter.toArray(productos_table.vals());
    };

    // Actualizar un producto (solo el artesano que lo creó)
    public shared({caller}) func updateProducto(
        id: Principal,
        nombre: Text,
        precio: Float,
        descripcion: Text,
        tipo: Text,
        imagenes: [Blob]
    ): async Result.Result<Producto, AplicationError> {
        switch (productos_table.get(id)) {
            case (?producto) {
                // Validar que el llamante es el artesano que creó el producto
                if (producto.artesano != caller) {
                    return #err(#PermisoDenegado("Solo el artesano creador puede actualizar el producto."));
                };

                // Validar límite de imágenes
                if (imagenes.size() > 3) {
                    return #err(#PermisoDenegado("No se pueden subir más de 3 imágenes."));
                };

                let updatedProducto: Producto = {
                    id = id;
                    nombre = nombre;
                    precio = precio;
                    descripcion = descripcion;
                    artesano = producto.artesano;
                    tipo = tipo;
                    imagenes = imagenes;
                };

                productos_table.put(id, updatedProducto);
                return #ok(updatedProducto);
            };
            case null {
                return #err(#ProductoNoExiste("El producto no existe."));
            };
        };
    };

    // Eliminar un producto (solo el artesano que lo creó)
    public shared({caller}) func deleteProducto(id: Principal): async Result.Result<(), AplicationError> {
        switch (productos_table.get(id)) {
            case (?producto) {
                // Validar que el llamante es el artesano que creó el producto
                if (producto.artesano != caller) {
                    return #err(#PermisoDenegado("Solo el artesano creador puede eliminar el producto."));
                };

                productos_table.delete(id);
                return #ok();
            };
            case null {
                return #err(#ProductoNoExiste("El producto no existe."));
            };
        };
    };

    // Función auxiliar para convertir un texto a minúsculas
    private func toLower(text: Text): Text {
        let chars = Text.toIter(text);
        let lowerChars = Iter.map<Char, Char>(chars, func(c: Char): Char {
            if (c >= 'A' and c <= 'Z') {
                return Char.fromNat32(Char.toNat32(c) + 32);
            } else {
                return c;
            }
        });
        return Text.fromIter(lowerChars);
    };
};
