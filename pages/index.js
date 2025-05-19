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
   - BLINKY tokenPayment => 400 tokens
   - mintLimit => id=1
*/

const RPC_ENDPOINT = 'https://mainnet.helius-rpc.com/?api-key=028d2557-f0fa-4296-a0a1-dd97007e2d36';
const CANDY_MACHINE_ID = new PublicKey('G9Fiig42gnjSJjMCnW4ujrCc8YwCR1Un1yvWp5zfTPFC');
const CANDY_GUARD_ID = new PublicKey('9R248VtZA5YRbPTFPVYbfh1o2UmCd8zbwAkeLV3w23Gc');
const TOKEN_MINT = new PublicKey('B4fuA7wKBagyR1V5BBAhGJu7z2cD16rubZ5HPUNcpump');

// 400 BLINKY with 6 decimals => 400_000_000
const TOKEN_AMOUNT = 400000000n;

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
    console.log('Using RPC:', RPC_ENDPOINT);
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
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
      const accountInfo = await connection.getAccountInfo(CANDY_MACHINE_ID);
      console.log('Raw account info:', {
        exists: !!accountInfo,
        lamports: accountInfo?.lamports,
        owner: accountInfo?.owner?.toBase58(),
        dataLength: accountInfo?.data?.length,
      });

      const cm = await fetchCandyMachine(umi, CANDY_MACHINE_ID);
      const cmData = {
        itemsAvailable: cm.itemsAvailable?.toString() || cm.items?.length.toString(), // Fallback to items.length
        itemsRedeemed: cm.itemsRedeemed?.toString(),
        collectionMint: cm.collectionMint?.toString(),
        authority: cm.authority?.toString(),
        items: cm.items ? cm.items.length : undefined,
        version: cm.version,
      };
      console.log('Candy Machine fetched:', cmData);

      // Check if we have valid data
      if (!cmData.itemsAvailable || !cmData.itemsRedeemed) {
        console.warn('Candy Machine missing expected properties:', cmData);
        setStatus('❌ Candy Machine error: Missing itemsAvailable or itemsRedeemed');
        return;
      }

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
    if (!wallet.connected || isLoading) {
      setStatus('❌ Wallet not connected or already processing');
      return;
    }
    setIsLoading(true);
    setStatus('Building transactions...');

    try {
      // Fetch CM
      const cm = await fetchCandyMachine(umi, CANDY_MACHINE_ID);
      const cmData = {
        itemsAvailable: cm.itemsAvailable?.toString() || cm.items?.length.toString(), // Fallback to items.length
        itemsRedeemed: cm.itemsRedeemed?.toString(),
        collectionMint: cm.collectionMint?.toString(),
        authority: cm.authority?.toString(),
        items: cm.items ? cm.items.length : undefined,
        version: cm.version,
      };
      console.log('Candy Machine fetched in handleMint:', cmData);

      // Calculate items left (use fallback if itemsAvailable is undefined)
      const itemsAvailable = cm.itemsAvailable ? Number(cm.itemsAvailable) : cm.items?.length || 0;
      const itemsRedeemed = cm.itemsRedeemed ? Number(cm.itemsRedeemed) : 0;
      const left = itemsAvailable - itemsRedeemed;

      if (mintAmount > left) {
        setStatus(`❌ Only ${left} items left!`);
        setIsLoading(false);
        return;
      }

      // Fetch CG
      const guard = await fetchCandyGuard(umi, CANDY_GUARD_ID);
      if (!guard) {
        throw new Error('Candy Guard not found!');
      }
      console.log('Candy Guard fetched:', guard.publicKey.toString());

      // Display total cost
      const totalTokenAmount = Number(TOKEN_AMOUNT) * mintAmount;
      const costBlinky = totalTokenAmount / 1_000_000;
      setStatus(`Total cost: ${costBlinky} BLINKY for ${mintAmount} NFT${mintAmount > 1 ? 's' : ''}. Preparing mints...`);

      // Process each mint in a separate transaction
      const signatures = [];
      for (let i = 0; i < mintAmount; i++) {
        console.log(`Preparing mint ${i + 1} of ${mintAmount}`);
        setStatus(`Mint ${i + 1} of ${mintAmount}: Awaiting wallet approval for 400 BLINKY...`);

        let builder = transactionBuilder();

        // Optional compute budget
        builder = builder.add(
          setComputeUnitLimit(umi, { units: 800_000 })
        );

        // Add single mint instruction
        const nftMint = generateSigner(umi);
        builder = builder.add(
          mintV2(umi, {
            candyMachine: CANDY_MACHINE_ID,
            candyGuard: CANDY_GUARD_ID,
            nftMint,
            collectionMint: cm.collectionMint,
            collectionUpdateAuthority: cm.authority,
            mintArgs: {
              mintLimit: some({ id: 1 }),
              tokenPayment: some({
                mint: TOKEN_MINT,
                amount: TOKEN_AMOUNT,
                destinationAta: new PublicKey('6WkYQL8sr5zTxeHRv4VDpRZWmJDb9TaCuMJYJNEXgRJc'),
              }),
            },
          })
        );

        // Check if transaction fits
        const isSmallEnough = builder.fitsInOneTransaction(umi);
        console.log(`Transaction for mint ${i + 1} fits in one transaction:`, isSmallEnough);
        if (!isSmallEnough) {
          throw new Error(`Transaction too large for mint ${i + 1}`);
        }

        // Get fresh blockhash
        const { blockhash, lastValidBlockHeight } = await umi.rpc.getLatestBlockhash();
        console.log(`Mint ${i + 1} blockhash:`, blockhash);
        const tx = await builder.buildWithLatestBlockhash(umi, { blockhash, lastValidBlockHeight });

        // Send and confirm
        try {
          console.log(`Sending mint ${i + 1} of ${mintAmount}`);
          const { signature } = await builder.sendAndConfirm(umi, {
            confirm: { commitment: 'confirmed' },
            skipPreflight: true,
          });
          const txSigHex = Buffer.from(signature).toString('hex');
          console.log(`Mint ${i + 1} success, sig =`, txSigHex);
          signatures.push(txSigHex);
          setStatus(`✅ Mint ${i + 1} of ${mintAmount} succeeded! Tx: ${txSigHex}`);
        } catch (txError) {
          console.error(`Mint ${i + 1} failed:`, {
            error: txError,
            logs: txError.logs || 'No logs available',
          });
          throw new Error(`Mint ${i + 1} failed: ${txError.message || txError}`);
        }
      }

      console.log('All mints completed, signatures:', signatures);
      setStatus(`✅ Minted ${mintAmount} NFT${mintAmount > 1 ? 's' : ''} successfully! First Tx: ${signatures[0]}`);

      // Update UI (sequence calls to avoid race conditions)
      await fetchUserBlinkyBalance();
      await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for RPC sync
      await fetchCandyMachineData();
    } catch (err) {
      console.error('Mint error:', err);
      setStatus(`❌ Mint failed: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  }

  // UI
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center">Blinky OG VIP Mint</h1>

        <div className="flex justify-center mb-6">
          {isMounted && <WalletMultiButtonDynamic />}
        </div>

        {wallet.connected ? (
          <div className="space-y-4">
            {blinkyBalance !== null && (
              <p className="text-sm">
                Your BLINKY Balance: {blinkyBalance.toFixed(2)}
              </p>
            )}

            <div className="flex items-center justify-between">
              <label htmlFor="mintAmount" className="font-medium">Mint Amount:</label>
              <input
                id="mintAmount"
                type="number"
                min={1}
                max={10}
                value={mintAmount}
                onChange={(e) => setMintAmount(Number(e.target.value))}
                className="border border-gray-300 rounded px-3 py-2 w-20 text-center"
              />
            </div>

            <div className="text-sm mb-4">
              <p>Cost per mint: {(Number(TOKEN_AMOUNT) / 1_000_000).toFixed(2)} BLINKY</p>
            </div>

            <button
              onClick={handleMint}
              disabled={isLoading}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Processing...' : `Mint ${mintAmount} NFT${mintAmount > 1 ? 's' : ''}`}
            </button>
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium">
                Status: <span className="font-normal">{status || 'Ready to mint'}</span>
              </p>
              <p className="text-sm font-medium">
                Items Redeemed: <span className="font-normal">{itemsRedeemed}</span>
              </p>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-600">Connect your wallet to mint.</p>
        )}
      </div>
    </div>
  );
}
