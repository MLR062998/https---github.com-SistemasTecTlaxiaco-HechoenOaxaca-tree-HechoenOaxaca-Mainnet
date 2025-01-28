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
    var usuarios_table: HashMap.HashMap<Principal, Usuario> =
        HashMap.HashMap<Principal, Usuario>(10, Principal.equal, Principal.hash);

    var roles_table: HashMap.HashMap<Principal, Rol> =
        HashMap.HashMap<Principal, Rol>(10, Principal.equal, Principal.hash);

    var balances: HashMap.HashMap<Principal, Nat> =
        HashMap.HashMap<Principal, Nat>(10, Principal.equal, Principal.hash);

    var productos_table: HashMap.HashMap<Principal, Producto> =
        HashMap.HashMap<Principal, Producto>(10, Principal.equal, Principal.hash);

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

    // Registrar Usuario
    public shared({caller}) func registrarUsuario(
        nombreCompleto: Text,
        lugarOrigen: Text,
        telefono: Text,
        rol: Text
    ): async Result.Result<Usuario, Text> {
        Debug.print("Inicio del registro de usuario");
        let lowerRol = toLower(rol);

        // Validar el rol recibido
        let parsedRol = switch (lowerRol) {
            case "artesano" #Artesano;
            case "intermediario" #Intermediario;
            case "cliente" #Cliente;
            case "administrador" #Administrador;
            case _ { return #err("El rol proporcionado no es válido: " # rol); };
        };

        // Verificar si el usuario ya existe
        if (usuarios_table.get(caller) != null) {
            return #err("El usuario ya está registrado con el ID: " # Principal.toText(caller));
        };

        // Crear y registrar el usuario
        let usuario: Usuario = {
            nombreCompleto = nombreCompleto;
            lugarOrigen = lugarOrigen;
            telefono = telefono;
            rol = parsedRol;
        };

        usuarios_table.put(caller, usuario);
        roles_table.put(caller, parsedRol);
        balances.put(caller, 0); // Inicializa el saldo en 0

        return #ok(usuario);
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

    // Obtener saldo del usuario
    public query func getBalance(principal: Principal): async Nat {
        return switch (balances.get(principal)) {
            case (?b) b;
            case null 0;
        };
    };

    // Leer todos los productos
    public query func readProductos(): async [Producto] {
        return Iter.toArray(productos_table.vals());
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
