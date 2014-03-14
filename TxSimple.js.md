

# TransactionSimple


##  getUnspends

### Input 
    * unSpendArrays
    
        unSpentArray:
        [{
        address: "mqSjTad2TKbPcKQ3Jq4kgCkKatyN44UMgZ",
        hash: "2ac165fa7a3a2b535d106a0041c7568d03b531e58aeccdd3199d7289ab12cfc1",
        scriptPubKey: "76a9146ce4e1163eb18939b1440c42844d5f0261c0338288ac",
        vout: 1,
        amount: 0.01,
        }, [...]
        ]
        
    * neededAmount: BTC value

### output:
        [{hash, vout},...] or exeption
        
        
## create

### Inputs
    ins: [{hash, vout}, ...] (can be from *getUnspends*)
    outs: [{address, value}, ... ]
    opts: [{lock_time=0, maxFees=0.01, remainderAddressString=null}]


    -> validates:
        - out address
        - ins amount > out amount
        - fees < maxFees
    -> generate a remainder address automatically if not given.

### Output
      {tx: tx (bitcoreObject), remainderAddress: addr (bitcoreAddress)}

## sign

### Inputs
    Tx (bitcore Object)
    KeyArray
      Array of:
       WalleyKeys
       Or Keys
        Or Strings (private keys WIF)
        
    -> Signs and Verify the TX
    -> Updates the TX Object
    
### Output
    -> true / false
    -> updates the TX Object.
