import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Blob "mo:base/Blob";
import Principal "mo:base/Principal";

module {
  // -------------------
  // Tipos básicos
  // -------------------
  public type AccountIdentifier = Blob;
  public type Subaccount = Blob;

  public type Tokens = {
    e8s : Nat;
  };

  public type BlockIndex = Nat;
  public type Memo = Nat64;
  public type Timestamp = Nat64;

  // -------------------
  // Transferencias
  // -------------------
  public type TransferArgs = {
    memo : Memo;
    amount : Tokens;
    fee : Tokens;
    from_subaccount : ?Subaccount;
    to : AccountIdentifier;
    created_at_time : ?Timestamp;
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
  // Métodos de archivo de bloques
  // -------------------
  public type Archive = {
    canister_id : Principal;
  };

  public type Archives = {
    archives : [Archive];
  };

  public type GetBlocksArgs = {
    start : BlockIndex;
    length : Nat;
  };

  public type Block = Blob; // simplificado (bloque binario)
  public type BlockRange = {
    blocks : [Block];
  };

  public type QueryBlocksResponse = {
    chain_length : Nat64;
    certificate : ?Blob;
    blocks : [Block];
    first_block_index : BlockIndex;
    archived_blocks : [{
      start : BlockIndex;
      length : Nat;
      callback : shared query GetBlocksArgs -> async BlockRange;
    }];
  };

  // -------------------
  // Estado del ledger
  // -------------------
  public type Symbol = Text;
  public type Name = Text;

  public type InitArgs = {
    minting_account : AccountIdentifier;
    initial_values : [(AccountIdentifier, Tokens)];
    max_message_size_bytes : ?Nat64;
    transaction_window : ?Nat64;
    archive_options : {
      trigger_threshold : Nat64;
      num_blocks_to_archive : Nat64;
      controller_id : Principal;
      cycles_for_archive_creation : ?Nat64;
      max_message_size_bytes : ?Nat64;
    };
  };

  // -------------------
  // Firma del canister Ledger
  // -------------------
  public type Self = actor {
    // Transferencias
    transfer : (TransferArgs) -> async TransferResult;

    // Balance de cuenta
    account_balance_dfx : (AccountBalanceArgs) -> async Tokens;

    // Información general
    name : () -> async Name;
    symbol : () -> async Symbol;
    decimals : () -> async Nat32;

    // Archivo de bloques
    archives : () -> async Archives;
    query_blocks : (GetBlocksArgs) -> async QueryBlocksResponse;
  };
};
