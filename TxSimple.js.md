


Transaction

    #getUnspends
        unSpentArray:
[{
  address: "mqSjTad2TKbPcKQ3Jq4kgCkKatyN44UMgZ",
  hash: "2ac165fa7a3a2b535d106a0041c7568d03b531e58aeccdd3199d7289ab12cfc1",
  scriptPubKey: "76a9146ce4e1163eb18939b1440c42844d5f0261c0338288ac",
  vout: 1,
  amount: 0.01,
}]
        neededAmount

    #simpleCreate

        ins: [{hash:, vout:},...]
        outs: [address, value]
        opts: [lock_time=0, maxFees=0.01]

        -> validates:
            - out address
        can generate a remainder address automatically if not given.

