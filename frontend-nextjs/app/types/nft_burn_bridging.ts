/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/nft_burn_bridging.json`.
 */
export type NftBurnBridging = {
  "address": "Scaffo1dingNftBurnBridging11111111111111111",
  "metadata": {
    "name": "nftBurnBridging",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "03 - NFT Burn Bridging"
  },
  "instructions": [
    {
      "name": "burnAndSend",
      "discriminator": [
        174,
        93,
        63,
        18,
        141,
        144,
        228,
        214
      ],
      "accounts": [
        {
          "name": "instance",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "nftOwner",
          "writable": true,
          "signer": true
        },
        {
          "name": "nftToken",
          "writable": true
        },
        {
          "name": "nftMint",
          "writable": true
        },
        {
          "name": "nftMeta",
          "writable": true
        },
        {
          "name": "nftMasterEdition",
          "writable": true
        },
        {
          "name": "collectionMeta",
          "writable": true,
          "relations": [
            "instance"
          ]
        },
        {
          "name": "tokenRecord",
          "docs": [
            "This account must be set to the actual token record account for pNFTs.",
            "For normal NFTs it must be set to the same account as the nft_token account.",
            "Metaplex uses the metaplex program id for positional optional accounts, however we can't do",
            "that because the token record account must be mut and the metaplex program can't be."
          ],
          "writable": true
        },
        {
          "name": "wormholeMessage",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  115,
                  115,
                  97,
                  103,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "wormholeBridge",
          "writable": true
        },
        {
          "name": "wormholeFeeCollector",
          "writable": true
        },
        {
          "name": "wormholeSequence",
          "writable": true
        },
        {
          "name": "wormholeProgram",
          "address": "worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth"
        },
        {
          "name": "metadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "sysvarInstructions"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "evmRecipient",
          "type": {
            "array": [
              "u8",
              20
            ]
          }
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "instance",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  115,
                  116,
                  97,
                  110,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "collectionMint"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "updateAuthority",
          "writable": true,
          "signer": true,
          "relations": [
            "collectionMeta"
          ]
        },
        {
          "name": "collectionMint"
        },
        {
          "name": "collectionMeta",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "const",
                "value": [
                  11,
                  112,
                  101,
                  177,
                  227,
                  209,
                  124,
                  69,
                  56,
                  157,
                  82,
                  127,
                  107,
                  4,
                  195,
                  205,
                  88,
                  184,
                  108,
                  115,
                  26,
                  160,
                  253,
                  181,
                  73,
                  182,
                  209,
                  188,
                  3,
                  248,
                  41,
                  70
                ]
              },
              {
                "kind": "account",
                "path": "collectionMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                11,
                112,
                101,
                177,
                227,
                209,
                124,
                69,
                56,
                157,
                82,
                127,
                107,
                4,
                195,
                205,
                88,
                184,
                108,
                115,
                26,
                160,
                253,
                181,
                73,
                182,
                209,
                188,
                3,
                248,
                41,
                70
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "whitelistSize",
          "type": "u16"
        }
      ]
    },
    {
      "name": "setDelegate",
      "discriminator": [
        242,
        30,
        46,
        76,
        108,
        235,
        128,
        181
      ],
      "accounts": [
        {
          "name": "instance",
          "writable": true
        },
        {
          "name": "updateAuthority",
          "signer": true,
          "relations": [
            "instance"
          ]
        }
      ],
      "args": [
        {
          "name": "delegate",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "setPaused",
      "discriminator": [
        91,
        60,
        125,
        192,
        176,
        225,
        166,
        218
      ],
      "accounts": [
        {
          "name": "instance",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "isPaused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "whitelist",
      "discriminator": [
        0,
        143,
        193,
        93,
        69,
        29,
        183,
        140
      ],
      "accounts": [
        {
          "name": "instance",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "tokenIds",
          "type": {
            "vec": "u16"
          }
        }
      ]
    },
    {
      "name": "whitelistBulk",
      "discriminator": [
        226,
        25,
        151,
        176,
        17,
        30,
        79,
        165
      ],
      "accounts": [
        {
          "name": "instance",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "offset",
          "type": "u16"
        },
        {
          "name": "slice",
          "type": "bytes"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "instance",
      "discriminator": [
        202,
        22,
        81,
        185,
        174,
        92,
        85,
        47
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notYetWhitelisted",
      "msg": "notYetWhitelisted"
    },
    {
      "code": 6001,
      "name": "tokenIdOutOfBounds",
      "msg": "tokenIdOutOfBounds"
    }
  ],
  "types": [
    {
      "name": "instance",
      "docs": [
        "Instance account doubles as (custom) emitter"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "updateAuthority",
            "type": "pubkey"
          },
          {
            "name": "collectionMint",
            "type": "pubkey"
          },
          {
            "name": "collectionMeta",
            "type": "pubkey"
          },
          {
            "name": "delegate",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "isPaused",
            "type": "bool"
          },
          {
            "name": "whitelistSize",
            "type": "u16"
          },
          {
            "name": "whitelist",
            "type": "bytes"
          }
        ]
      }
    }
  ]
};
