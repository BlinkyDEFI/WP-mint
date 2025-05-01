import { PublicKey } from '@solana/web3.js';

export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT;
export const CANDY_MACHINE_ID = new PublicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID);
export const CANDY_GUARD_ID = new PublicKey(process.env.NEXT_PUBLIC_CANDY_GUARD_ID);
export const TOKEN_MINT = new PublicKey(process.env.NEXT_PUBLIC_TOKEN_MINT);
export const TOKEN_AMOUNT = BigInt(process.env.NEXT_PUBLIC_TOKEN_AMOUNT);