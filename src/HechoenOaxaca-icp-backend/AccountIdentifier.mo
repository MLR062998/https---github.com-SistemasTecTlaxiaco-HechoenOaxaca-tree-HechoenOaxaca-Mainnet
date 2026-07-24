import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import CRC32 "mo:hash/CRC32";
import SHA224 "mo:sha/SHA224";

module {
    public type AccountIdentifier = Blob;
    public type Subaccount = Blob;

    func beBytes(n : Nat32) : [Nat8] {
        func byte(n : Nat32) : Nat8 {
            Nat8.fromNat(Nat32.toNat(n & 0xff));
        };
        [byte(n >> 24), byte(n >> 16), byte(n >> 8), byte(n)];
    };

    public func defaultSubaccount() : Subaccount {
        Blob.fromArray(Array.init<Nat8>(32, 0));
    };

    public func accountIdentifier(principal : Principal, subaccount : Subaccount) : AccountIdentifier {
        // Algoritmo oficial según documentación del ICP
        let hash = SHA224.Digest(null);
        
        // Prefijo para account identifier
        hash.write([0x0A]);
        
        // Escribir principal
        let principalBlob = Principal.toBlob(principal);
        hash.write(Blob.toArray(principalBlob));
        
        // Escribir subaccount
        hash.write(Blob.toArray(subaccount));
        
        // Obtener el hash
        let hashSum = hash.sum();
        
        // Calcular checksum CRC32
        let crc32Bytes = beBytes(CRC32.checksum(Blob.toArray(hashSum)));
        
        // Combinar: checksum (4 bytes) + hash (28 bytes)
        let accountId = Array.append(crc32Bytes, Blob.toArray(hashSum));
        Blob.fromArray(accountId)
    };

    public func validateAccountIdentifier(accountIdentifier : AccountIdentifier) : Bool {
        if (accountIdentifier.size() != 32) {
            return false;
        };
        let a = Blob.toArray(accountIdentifier);
        let accIdPart = Array.tabulate(28, func(i : Nat) : Nat8 { a[i + 4] });
        let checksumPart = Array.tabulate(4, func(i : Nat) : Nat8 { a[i] });
        let crc32 = CRC32.checksum(accIdPart);
        Array.equal(beBytes(crc32), checksumPart, Nat8.equal);
    };
};