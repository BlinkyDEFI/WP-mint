/* pages/index.js */
import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  getAccount,
} from '@solana/spl-token';

// Umi + Candy Machine
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import {
  mplCandyMachine,
  fetchCandyMachine,
  fetchCandyGuard,
  mintV2,
} from '@metaplex-foundation/mpl-candy-machine';
import {
  transactionBuilder,
  some,
  generateSigner,
} from '@metaplex-foundation/umi';
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';

/*
   CONFIG:
   - Candy Machine & Guard
   - BLINKY tokenPayment => 1060000 tokens
   - mintLimit => id=1
*/

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT;
const CANDY_MACHINE_ID = new PublicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID);
const CANDY_GUARD_ID = new PublicKey(process.env.NEXT_PUBLIC_CANDY_GUARD_ID);
const TOKEN_MINT = new PublicKey(process.env.NEXT_PUBLIC_TOKEN_MINT);
const TOKEN_AMOUNT = BigInt(process.env.NEXT_PUBLIC_TOKEN_AMOUNT); // Single declaration

// Next.js approach to the wallet connect button
const WalletMultiButtonDynamic = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function Index() {
  const wallet = useWallet();

  // Basic UI states
  const [status, setStatus] = useState('');
  const [itemsRedeemed, setItemsRedeemed] = useState('0');
  const [mintAmount, setMintAmount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // BLINKY user balance
  const [blinkyBalance, setBlinkyBalance] = useState(null);

  // Create Umi instance once
  const umi = useMemo(() => {
    return createUmi(RPC_ENDPOINT)
      .use(walletAdapterIdentity(wallet))
      .use(mplCandyMachine());
  }, [wallet]);

  // Avoid SSR/hydration problems
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // On wallet connect, load CandyMachine + user BLINKY ATA
  useEffect(() => {
    if (wallet.connected) {
      fetchCandyMachineData();
      fetchUserBlinkyBalance();
    }
  }, [wallet.connected]);

  // 1) Load Candy Machine
  async function fetchCandyMachineData() {
    try {
      const cm = await fetchCandyMachine(umi, CANDY_MACHINE_ID);
      setItemsRedeemed(cm.itemsRedeemed.toString());
    } catch (err) {
      console.error('Candy Machine fetch error:', err);
      setStatus(`❌ CM fetch error: ${err.message || err}`);
    }
  }

  // 2) Load user’s BLINKY ATA balance
  async function fetchUserBlinkyBalance() {
    if (!wallet.publicKey) return;
    try {
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
      const ata = getAssociatedTokenAddressSync(TOKEN_MINT, wallet.publicKey);
      const accountInfo = await getAccount(connection, ata);
      const rawBalance = accountInfo.amount; // BigInt
      // If BLINKY has 6 decimals, convert raw => float
      const floatBalance = Number(rawBalance) / 1_000_000;
      setBlinkyBalance(floatBalance);
      console.log('User BLINKY balance is', floatBalance);
    } catch (err) {
      console.warn('No BLINKY ATA or error:', err);
      setBlinkyBalance(0);
    }
  }

  // 3) Mint function
  async function handleMint() {
    if (!wallet.connected || isLoading) return;
    setIsLoading(true);
    setStatus('Building transaction...');

    try {
      // fetch CM
      const cm = await fetchCandyMachine(umi, CANDY_MACHINE_ID);
      const left = Number(cm.itemsAvailable) - Number(cm.itemsRedeemed);
      if (mintAmount > left) {
        setStatus(`❌ Only ${left} items left!`);
        setIsLoading(false);
        return;
      }

      // fetch CG
      const guard = await fetchCandyGuard(umi, CANDY_GUARD_ID);
      if (!guard) {
        throw new Error('Candy Guard not found!');
      }

      // Build
      let builder = transactionBuilder();

      // Just display cost for user
      const totalTokenAmount = Number(TOKEN_AMOUNT) * mintAmount;
      const costBlinky = totalTokenAmount / 1_000_000;
      setStatus(`Cost: ${costBlinky} BLINKY. Awaiting wallet approval...`);

      // optional compute budget
      builder = builder.add(
        setComputeUnitLimit(umi, { units: 800_000 })
      );

      // ephemeral mint => NFT => payer’s wallet
      for (let i = 0; i < mintAmount; i++) {
        const nftMint = generateSigner(umi);

        builder = builder.add(
          mintV2(umi, {
            candyMachine: CANDY_MACHINE_ID,
            candyGuard: CANDY_GUARD_ID,
            nftMint,
            collectionMint: cm.collectionMint,
            collectionUpdateAuthority: cm.authority,
            mintArgs: {
              // For your guard’s mint-limit
              mintLimit: some({
                id: 1,
              }),
              // For your guard’s tokenPayment = 1060000 BLINKY
              tokenPayment: some({
                mint: TOKEN_MINT,
                amount: TOKEN_AMOUNT,
                destinationAta: new PublicKey('6WkYQL8sr5zTxeHRv4VDpRZWmJDb9TaCuMJYJNEXgRJc'),
              }),
            },
          })
        );
      }

      // Send + confirm
      const { signature } = await builder.sendAndConfirm(umi);
      const txSigHex = Buffer.from(signature).toString('hex');
      console.log('Mint success, sig =', txSigHex);
      setStatus('✅ Minted successfully!');

      // Update UI
      setItemsRedeemed((prev) => (parseInt(prev, 10) + mintAmount).toString());
      fetchUserBlinkyBalance(); // re-check user’s BLINKY
      fetchCandyMachineData();
    } catch (err) {
      console.error('Mint error:', err);
      setStatus(`❌ Mint failed: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  }

  // UI with dark theme
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center text-purple-300">Blinky OG VIP Mint</h1>

        <div className="flex justify-center mb-6">
          {isMounted && <WalletMultiButtonDynamic />}
        </div>

        {wallet.connected ? (
          <div className="space-y-4">
            {blinkyBalance !== null && (
              <p className="text-sm text-green-400">
                Your BLINKY Balance: {blinkyBalance.toFixed(2)}
              </p>
            )}

            <div className="flex items-center justify-between">
              <label htmlFor="mintAmount" className="font-medium text-gray-200">Mint Amount:</label>
              <input
                id="mintAmount"
                type="number"
                min={1}
                max={10}
                value={mintAmount}
                onChange={(e) => setMintAmount(Number(e.target.value))}
                className="border border-gray-600 rounded px-3 py-2 w-20 text-center bg-gray-700 text-white"
              />
            </div>

            <div className="text-sm mb-4 text-gray-300">
              <p>Cost per mint: {(Number(TOKEN_AMOUNT) / 1_000_000).toFixed(2)} BLINKY</p>
            </div>

            <button
              onClick={handleMint}
              disabled={isLoading}
              className={`w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-md font-medium ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Processing...' : `Mint ${mintAmount} NFT${mintAmount > 1 ? 's' : ''}`}
            </button>
            <div className="mt-4 p-3 bg-gray-700 rounded-md">
              <p className="text-sm font-medium text-gray-200">
                Status: <span className="font-normal">{status || 'Ready to mint'}</span>
              </p>
              <p className="text-sm font-medium text-gray-200">
                Items Redeemed: <span className="font-normal">{itemsRedeemed}</span>
              </p>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-400">Connect your wallet to mint.</p>
        )}
      </div>
    </div>
  );
}
