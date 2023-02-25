# tBTC subgraph v2

Provide insight into the workings of the Keep and tBTC systems - deposits, redemptions, who bonds for what, governance actions, etc

## Installation

Use the package manager [pip](https://pip.pypa.io/en/stable/) to install foobar.

```bash
git clone https://github.com/suntzu93/threshold-tBTC.git
graph auth --product hosted-service <auth_key>>

#For build and deploy on goerli network

yarn build-goerli
yarn deploy-goerli

#For build and deploy on mainnet network

yarn build-mainnet
yarn deploy-mainnet
```

## Contract

`Goerli`

|    Contract    |                  #Address                  |
| :------------: | :----------------------------------------: |
|     Bridge     | 0x0Cad3257C4B7ec6de1f6926Fbf5714255a6632c3 |
|  RandomBeacon  | 0xF177CfA720ceC42841c04A458f6c68e1243C1b49 |
|      TBTC      | 0x679874fbe6d4e7cc54a59e315ff1eb266686a937 |
|   TBCTVault    | 0x65eB0562FCe858f8328858c76E689aBedB78621F |
| VendingMachine | 0x36B7383077a2CEeFd53e796512760a1888cEeb97 |
| WalletRegistry | 0x0f0E2afF99A55B11026Fb270A05f04d37724dE86 |

`Mainnet`

|    Contract    |                  #Address                  |
| :------------: | :----------------------------------------: |
|     Bridge     | 0x5e4861a80B55f035D899f66772117F00FA0E8e7B |
|  RandomBeacon  | 0x5499f54b4A1CB4816eefCf78962040461be3D80b |
|      TBTC      | 0x18084fbA666a33d37592fA2633fD49a74DD93a88 |
|   TBCTVault    | 0x9C070027cdC9dc8F82416B2e5314E11DFb4FE3CD |
| VendingMachine | 0x6590DFF6abEd7C077839E8227A4f12Ec90E6D85F |
| WalletRegistry | 0x01B67b1194C75264d06F808A921228a95C765dd7 |
