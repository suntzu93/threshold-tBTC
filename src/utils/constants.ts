import {BigInt, BigDecimal, Address, dataSource} from '@graphprotocol/graph-ts'

export const ADDRESS_ZERO = Address.fromString(
    '0x0000000000000000000000000000000000000000',
);

export const TBTCVault = dataSource.network() == "goerli" ? Address.fromString(
    '0x65eb0562fce858f8328858c76e689abedb78621f',
) : Address.fromString(
    '0x9c070027cdc9dc8f82416b2e5314e11dfb4fe3cd',
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