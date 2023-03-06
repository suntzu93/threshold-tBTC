import {BigInt, BigDecimal, Address, dataSource} from '@graphprotocol/graph-ts'

export const ADDRESS_ZERO = Address.fromString(
    '0x0000000000000000000000000000000000000000',
);

export const Treasury = dataSource.network() == "goerli" ? Address.fromString(
    '0x68ad60cc5e8f3b7cc53beab321cf0e6036962dbc',
) : Address.fromString(
    '0x87F005317692D05BAA4193AB0c961c69e175f45f',
);

export const BRIDGE_CONTRACT = dataSource.network() == "goerli" ? Address.fromString(
    '0x0Cad3257C4B7ec6de1f6926Fbf5714255a6632c3',
) : Address.fromString(
    '0x5e4861a80B55f035D899f66772117F00FA0E8e7B',
);

export const TBTCVault = dataSource.network() == "goerli" ? Address.fromString(
    '0x65eb0562fce858f8328858c76e689abedb78621f',
) : Address.fromString(
    '0x9c070027cdc9dc8f82416b2e5314e11dfb4fe3cd',
);

export const TBTCToken = dataSource.network() == "goerli" ? Address.fromString(
    '0x679874fbe6d4e7cc54a59e315ff1eb266686a937',
) : Address.fromString(
    '0x18084fbA666a33d37592fA2633fD49a74DD93a88',
);

export const ADDRESS_TBTC = dataSource.network() == "goerli" ? Address.fromString(
    '0x679874fbe6d4e7cc54a59e315ff1eb266686a937',
) : Address.fromString(
    '0x18084fbA666a33d37592fA2633fD49a74DD93a88',
);

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE_BD = BigDecimal.fromString('1')
export let BI_18 = BigInt.fromI32(18)
export let SATOSHI_MULTIPLIER = BigInt.fromI64(10000000000);