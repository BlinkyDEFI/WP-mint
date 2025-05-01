import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Connection } from '@solana/web3.js';
import { Metaplex } from '@metaplex-foundation/js';
import { useState, useEffect } from 'react';

export default function Home() {
  const { publicKey, sendTransaction, wallet } = useWallet();
  const connection = new Connection(process.env.NEXT_PUBLIC_RPC_ENDPOINT);
  const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet));
  const [balance, setBalance] = useState(null);

  // Fetch balance only
  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey) return;

      try {
        const tokenMint = new PublicKey(process.env.NEXT_PUBLIC_TOKEN_MINT);
        const tokenAccount = await connection.getTokenAccountsByOwner(publicKey, { mint: tokenMint });
        const balance = tokenAccount.value[0]
          ? (await connection.getTokenAccountBalance(tokenAccount.value[0].pubkey)).value.uiAmount
          : 0;
        setBalance(balance);
        console.log(`User BLINKY balance is ${balance * 1_000_000_000}`);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }
    };

    fetchBalance();
  }, [publicKey]);

  const mintNFT = async () => {
    if (!publicKey) {
      console.error('Wallet not connected');
      return;
    }

    try {
      const candyMachine = await metaplex.candyMachines().findByAddress({
        address: new PublicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID),
      });

      const { transaction } = await metaplex.candyMachines().mint({
        candyMachine,
        owner: publicKey,
      });

      const signature = await sendTransaction(transaction, connection);
      console.log('Minted successfully!', signature);
      alert('✅ Minted successfully!');
    } catch (error) {
      console.error('Minting failed:', error);
      alert('Minting failed. Check console for details.');
    }
  };

  const price = process.env.NEXT_PUBLIC_TOKEN_AMOUNT / 1_000_000_000;

  return (
    <div style={{ backgroundColor: '#1a1a2e', padding: '20px', borderRadius: '10px', color: '#e0e0e0', maxWidth: '400px', margin: '0 auto' }}>
      <p style={{ color: '#ffeb3b', marginBottom: '10px', backgroundColor: '#2a2a4e', padding: '10px', borderRadius: '5px' }}>
        Note: You may see wallet warnings because this is a new domain. This dApp is safe; we’ve submitted it for review.
      </p>
      {publicKey ? (
        <>
          <p style={{ color: '#00ff88' }}>User Balance: {balance !== null ? balance : 'Loading...'} BLINKY</p>
          <p style={{ color: '#00ff88' }}>Cost per mint: {price} BLINKY</p>
          <button
            onClick={mintNFT}
            style={{
              backgroundColor: '#ff2e63',
              color: '#ffffff',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Mint NFT
          </button>
        </>
      ) : (
        <p style={{ color: '#ffeb3b' }}>Please connect your wallet</p>
      )}
    </div>
  );
}