# TransactionSimple
        
        
## create

### Inputs

    * ins: [{address, vout}, ...] (can be from *getUnspends*)
    * outs: [{address, value}, ... ]
    * opts: [{lock_time=0, maxFees=0.01, remainderAddressString=null}]


-> validates:
        - out address
        - ins amount > out amount
        - fees < maxFees
        
-> generate a remainder address automatically if not given.

### Outputs
      {tx: tx (bitcoreObject), remainderAddress: addr (bitcoreAddress)}

## sign

### Inputs
    * Tx (bitcore Object)
    * KeyArray
      Array of: WalleyKeys or Keys or Strings (private keys WIF)
      
priv -> public -> address

      
        
-> Signs and Verify the TX
-> Updates the TX Object
    
### Output
    -> (none) updates the TX Object.




##  getUnspends

### Inputs:
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

### Outputs:
        [{hash, vout},...] or exeption
