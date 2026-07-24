import Nat64 "mo:base/Nat64";
import Blob "mo:base/Blob";
import Principal "mo:base/Principal";

module {
  // -------------------
  // Tipos básicos (según especificación oficial)
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
  // TransferArgs
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
  // Tipos para query_blocks (necesarios para confirmar pagos)
  // -------------------
  public type GetBlocksArgs = {
    start : BlockIndex;
    length : Nat64;
  };

  public type Block = {
    parent_hash : ?Blob;
    timestamp : TimeStamp;
    transaction : Transaction;
  };

  public type Transaction = {
    operation : Operation;
    memo : Memo;
    created_at_time : ?TimeStamp;
  };

  public type Operation = {
    #Transfer : Transfer;
    #Mint : Mint;
    #Burn : Burn;
    #Approve : Approve;
    #TransferFrom : TransferFrom;
  };

  public type Transfer = {
    to : AccountIdentifier;
    fee : Tokens;
    amount : Tokens;
    from : AccountIdentifier;
  };

  public type Mint = {
    to : AccountIdentifier;
    amount : Tokens;
  };

  public type Burn = {
    from : AccountIdentifier;
    amount : Tokens;
  };

  public type Approve = {
    from : AccountIdentifier;
    spender : AccountIdentifier;
    allowance : Tokens;
    expires_at : ?TimeStamp;
    fee : Tokens;
  };

  public type TransferFrom = {
    from : AccountIdentifier;
    to : AccountIdentifier;
    amount : Tokens;
    fee : Tokens;
    spender : AccountIdentifier;
  };

  public type QueryBlockArchiveFn = shared query GetBlocksArgs -> async QueryBlocksResponse;

  public type QueryBlocksResponse = {
    chain_length : Nat64;
    certificate : ?Blob;
    blocks : [Block];
    first_block_index : BlockIndex;
    archived_blocks : [{
      callback : QueryBlockArchiveFn;
      start : BlockIndex;
      length : Nat64;
    }];
  };

  // -------------------
  // Firma del canister Ledger (completa)
  // -------------------
  public type Self = actor {
    transfer : shared TransferArgs -> async TransferResult;
    account_balance : shared query AccountBalanceArgs -> async Tokens;
    name : shared query () -> async Text;
    symbol : shared query () -> async Text;
    decimals : shared query () -> async Nat8;
    query_blocks : shared query GetBlocksArgs -> async QueryBlocksResponse;
  };
};