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
import Time "mo:base/Time";
import Option "mo:base/Option";
import Debug "mo:base/Debug";

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
        id : Principal;
        nombre : Text;
        precio : Float;
        descripcion : Text;
        artesano : Principal;
        tipo : Text;
        imagenes : [Blob];
        fechaCreacion : Int;
        activo : Bool;
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
    private var productos = HashMap.HashMap<Principal, Producto>(0, Principal.equal, Principal.hash);
    private var balances = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);

    stable var stableUsuarios : [(Principal, Usuario)] = [];
    stable var stableProductos : [(Principal, Producto)] = [];
    stable var stableBalances : [(Principal, Nat)] = [];

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

    private func generateId() : async Principal {
        let random = await Random.blob();
        Principal.fromBlob(random)
    };

    system func preupgrade() {
        stableUsuarios := Iter.toArray(usuarios.entries());
        stableProductos := Iter.toArray(productos.entries());
        stableBalances := Iter.toArray(balances.entries());
    };

    system func postupgrade() {
        usuarios := HashMap.fromIter<Principal, Usuario>(stableUsuarios.vals(), 0, Principal.equal, Principal.hash);
        productos := HashMap.fromIter<Principal, Producto>(stableProductos.vals(), 0, Principal.equal, Principal.hash);
        balances := HashMap.fromIter<Principal, Nat>(stableBalances.vals(), 0, Principal.equal, Principal.hash);
    };

    public shared ({ caller }) func registrarUsuario(
        nombreCompleto : Text,
        lugarOrigen : Text,
        telefono : Text,
        rol : Text
    ) : async Result.Result<Usuario, AplicationError> {
        if (Principal.isAnonymous(caller)) return #err(#PermisoDenegado);
        if (Option.isSome(usuarios.get(caller))) return #err(#UsuarioYaExiste);
        if (nombreCompleto.size() == 0 or lugarOrigen.size() == 0)
            return #err(#ErrorValidacion("Campos requeridos faltantes"));
        if (not validatePhone(telefono))
            return #err(#ErrorValidacion("Teléfono debe tener 10 dígitos"));

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

    public shared query ({ caller }) func obtenerSaldo() : async Nat {
        Option.get(balances.get(caller), 0)
    };

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
            return #err(#ErrorValidacion("Máximo 5 imágenes"));
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

    public query func listarProductos() : async [Producto] {
        Iter.toArray(productos.vals())
    };

    
    public shared ({ caller }) func editarPerfil(
        nombreCompleto : Text,
        lugarOrigen : Text,
        telefono : Text
    ) : async Result.Result<Usuario, AplicationError> {
        switch (usuarios.get(caller)) {
            case (?usuario) {
                if (nombreCompleto.size() == 0 or lugarOrigen.size() == 0) {
                    return #err(#ErrorValidacion("Campos requeridos faltantes"));
                };
                if (not validatePhone(telefono)) {
                    return #err(#ErrorValidacion("Teléfono debe tener 10 dígitos"));
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

public shared ({ caller }) func depositarFondos(monto : Nat) : async Result.Result<(), AplicationError> {
        if (Principal.isAnonymous(caller)) {
            return #err(#PermisoDenegado);
        };
        let saldoActual = Option.get(balances.get(caller), 0);
        balances.put(caller, saldoActual + monto);
        #ok(())
    };
};
