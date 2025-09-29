import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Blob "mo:base/Blob";
import Principal "mo:base/Principal";

module {
  // -------------------
  // Tipos básicos (SIMPLIFICADOS según especificación oficial)
  // -------------------
  public type AccountIdentifier = Blob;
  public type Subaccount = Blob;

  public type Tokens = {
    e8s : Nat64;
  };

  public type BlockIndex = Nat64;
  public type Memo = Nat64;
  
  public type TimeStamp = {
    timestamp_nanos : Nat64;
  };

  // -------------------
  // TransferArgs según especificación oficial
  // -------------------
  public type TransferArgs = {
    memo : Memo;
    amount : Tokens;
    fee : Tokens;
    from_subaccount : ?Subaccount;
    to : AccountIdentifier;
    created_at_time : ?TimeStamp;
  };

  public type TransferError = {
    #BadFee : { expected_fee : Tokens };
    #InsufficientFunds : { balance : Tokens };
    #TxTooOld : { allowed_window_nanos : Nat64 };
    #TxCreatedInFuture;
    #TxDuplicate : { duplicate_of : BlockIndex };
  };

  public type TransferResult = {
    #Ok : BlockIndex;
    #Err : TransferError;
  };

  // -------------------
  // Consultas de balance
  // -------------------
  public type AccountBalanceArgs = {
    account : AccountIdentifier;
  };

  // -------------------
  // Firma del canister Ledger (SIMPLIFICADA)
  // -------------------
  public type Self = actor {
    transfer : (TransferArgs) -> async TransferResult;
    account_balance : (AccountBalanceArgs) -> async Tokens;
    name : () -> async Text;
    symbol : () -> async Text;
    decimals : () -> async Nat8;  // ✅ CORREGIDO: Nat8 en lugar de Nat32
  };
};