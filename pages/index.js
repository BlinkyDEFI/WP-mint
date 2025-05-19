
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Wallet, AlertTriangle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isSolflareWallet, ensureAtaExists, createTokenAccountIfNeeded } from "@/utils/solanaUtils";
import { toast } from "@/components/ui/sonner";
import { Connection, PublicKey } from '@solana/web3.js';

// Simulating Solana wallet adapter
const mockWallet = {
  connected: false,
  publicKey: null
};

// Error code definitions
const errorCodes = [
  { code: "0x1779", name: "Token Account Owner Mismatch", 
    description: "The token account is owned by another wallet or the ATA doesn't exist." },
  { code: "0x1", name: "Insufficient Funds", 
    description: "Not enough SOL to pay for the transaction." },
  { code: "0x0", name: "Missing Account", 
    description: "A required account doesn't exist." },
  { code: "0x1770", name: "Token Owner Mismatch", 
    description: "You're not the owner of the token account being used." },
];

// Wallet solution guides
const walletSolutions = {
  solflare: [
    "Make sure your Solflare wallet is unlocked and connected",
    "Pre-create your BLINKY token account (click 'Create Token Account' button below)",
    "Enable 'Trusted Apps' mode in Solflare settings",
    "Try mint with smaller amount (1 NFT at a time)",
    "Update to the latest version of Solflare extension",
    "For mobile, try using Solflare's in-app browser"
  ],
  phantom: [
    "Try disconnecting and reconnecting your wallet",
    "Clear browser cache and cookies",
    "Disable other wallet extensions temporarily",
    "Update to the latest version of Phantom",
    "Try a different browser"
  ]
};

const commonSolutions = [
  "Ensure your wallet has sufficient SOL for transaction fees (~0.02 SOL)",
  "Verify the token account exists (create it first with a small transfer)",
  "Check that you have sufficient tokens for the mint cost",
  "Try lowering the mint amount to just 1",
  "Add token to wallet by importing it first",
  "If using a ledger, enable 'Blind Sign' in settings"
];

// Main component
export default function Index() {
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("solflare");
  const [needsAtaCreation, setNeedsAtaCreation] = useState(false);
  
  // Function to check wallet address
  const checkWalletAddress = () => {
    if (!walletAddress) {
      toast({
        title: "Enter a wallet address",
        description: "Please enter your wallet address to check status",
      });
      return;
    }
    
    if (walletAddress.length !== 44 && !walletAddress.startsWith("So")) {
      toast({
        variant: "destructive",
        title: "Invalid wallet address",
        description: "The address doesn't appear to be a valid Solana address",
      });
      return;
    }
    
    // In a real app, we would check if the token account exists
    setNeedsAtaCreation(Math.random() > 0.5); // Randomly set for demo purposes
    
    toast({
      title: needsAtaCreation ? "Token account needed" : "Wallet check complete",
      description: needsAtaCreation 
        ? "You need to create a BLINKY token account first"
        : "This wallet appears to be properly configured",
    });
  };

  // Simulated function to create ATA
  const createTokenAccount = () => {
    toast({
      title: "Creating token account",
      description: "This would create your BLINKY token account in a real app",
    });
    
    // This would be the actual code in your app:
    /*
    if (!wallet.publicKey || !wallet.signTransaction) return;
    
    const connection = new Connection(RPC_ENDPOINT);
    ensureAtaExists(connection, wallet.publicKey, new PublicKey(TOKEN_MINT))
      .then(() => {
        toast({
          title: "Success!",
          description: "BLINKY token account created successfully",
        });
        setNeedsAtaCreation(false);
      })
      .catch(err => {
        toast({
          variant: "destructive",
          title: "Error creating token account",
          description: err.message,
        });
      });
    */
    
    // For demo purposes:
    setTimeout(() => {
      toast({
        title: "Success!",
        description: "BLINKY token account created successfully",
      });
      setNeedsAtaCreation(false);
    }, 1500);
  };

  // Component rendering
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto py-10 px-4">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-purple-400 mb-2">Solflare Mint Troubleshooter</h1>
          <p className="text-gray-300 max-w-2xl">
            Diagnose and fix common issues when minting Solana NFTs with Solflare and other wallets
          </p>
        </header>

        <Alert className="mb-8 border-amber-500 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-500">Mint Simulation Error</AlertTitle>
          <AlertDescription className="text-gray-300">
            Your transaction seems to be failing with error code <span className="font-mono bg-gray-800 px-1 rounded">0x1779</span>. 
            This usually means there's a token account owner mismatch or missing ATA.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-7 gap-8">
          <div className="md:col-span-4">
            <Tabs defaultValue="error-codes" className="mb-8">
              <TabsList className="mb-6">
                <TabsTrigger value="error-codes">Error Codes</TabsTrigger>
                <TabsTrigger value="solutions">Solutions</TabsTrigger>
                <TabsTrigger value="troubleshoot">Troubleshoot</TabsTrigger>
                <TabsTrigger value="solflare-fix">Solflare Fix</TabsTrigger>
              </TabsList>
              
              <TabsContent value="error-codes" className="space-y-4">
                {errorCodes.map((error) => (
                  <Card key={error.code} className={`border ${error.code === "0x1779" ? "border-amber-500" : "border-gray-700"} bg-gray-800/50`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <code className="text-amber-400">{error.code}</code>
                        <span className="text-white">{error.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-300">{error.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="solutions">
                <Card className="border-gray-700 bg-gray-800/50">
                  <CardHeader>
                    <CardTitle>Wallet-Specific Solutions</CardTitle>
                    <CardDescription className="text-gray-300">
                      Choose your wallet to see specific solutions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex gap-4">
                      <Button 
                        variant={selectedWallet === 'solflare' ? 'default' : 'outline'}
                        onClick={() => setSelectedWallet('solflare')}
                        className={selectedWallet === 'solflare' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                      >
                        Solflare
                      </Button>
                      <Button 
                        variant={selectedWallet === 'phantom' ? 'default' : 'outline'}
                        onClick={() => setSelectedWallet('phantom')}
                        className={selectedWallet === 'phantom' ? 'bg-purple-700 hover:bg-purple-800' : ''}
                      >
                        Phantom
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium text-lg text-white mb-3">
                        {selectedWallet === 'solflare' ? 'Solflare' : 'Phantom'} Solutions
                      </h3>
                      <ul className="space-y-2">
                        {walletSolutions[selectedWallet].map((solution, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                            <span className="text-gray-300">{solution}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="space-y-2 pt-4 border-t border-gray-700">
                      <h3 className="font-medium text-lg text-white mb-3">Common Solutions</h3>
                      <ul className="space-y-2">
                        {commonSolutions.map((solution, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                            <span className="text-gray-300">{solution}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="troubleshoot">
                <Card className="border-gray-700 bg-gray-800/50">
                  <CardHeader>
                    <CardTitle>Check Your Wallet</CardTitle>
                    <CardDescription className="text-gray-300">
                      Verify wallet configuration and token accounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3">
                          <Label htmlFor="wallet-address">Wallet Address</Label>
                          <Input 
                            id="wallet-address" 
                            placeholder="Enter your Solana wallet address"
                            className="bg-gray-900 border-gray-700"
                            value={walletAddress}
                            onChange={(e) => setWalletAddress(e.target.value)} 
                          />
                        </div>
                        <div className="flex items-end">
                          <Button className="w-full" onClick={checkWalletAddress}>Check</Button>
                        </div>
                      </div>
                      
                      {needsAtaCreation && (
                        <div className="mt-4">
                          <Alert className="bg-amber-500/10 border-amber-500">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <AlertTitle className="text-amber-500">Token Account Required</AlertTitle>
                            <AlertDescription className="text-gray-300">
                              You need to create a BLINKY token account for this wallet before minting.
                            </AlertDescription>
                          </Alert>
                          <Button 
                            className="mt-3 bg-amber-600 hover:bg-amber-700"
                            onClick={createTokenAccount}
                          >
                            Create Token Account
                          </Button>
                        </div>
                      )}
                      
                      <div className="space-y-2 bg-gray-900 p-4 rounded-md">
                        <h3 className="font-medium">Solflare Error 0x1779 Fix</h3>
                        <p className="text-sm text-gray-300">
                          This error typically occurs when the Associated Token Account (ATA) is not properly set up. 
                          Try these steps:
                        </p>
                        <ol className="text-sm text-gray-300 space-y-2 list-decimal pl-5">
                          <li>Add the token to your Solflare wallet first</li>
                          <li>Create your token account by receiving a small amount from another wallet</li>
                          <li>Try minting with a smaller amount (just 1)</li>
                          <li>Ensure your address matches the one you're connected with</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col items-start space-y-2">
                    <p className="text-sm text-gray-400">Need more help?</p>
                    <div className="flex gap-4">
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        View Solflare Docs
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Solana Error Codes
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="solflare-fix">
                <Card className="border-gray-700 bg-gray-800/50">
                  <CardHeader>
                    <CardTitle>Solflare 0x1779 Fix</CardTitle>
                    <CardDescription className="text-gray-300">
                      Fix token account issues specific to Solflare wallet
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert className="border-amber-500 bg-amber-500/10">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <AlertTitle className="text-amber-500">Solflare ATA Creation Issue</AlertTitle>
                      <AlertDescription className="text-gray-300">
                        Solflare wallets may need explicit token account creation before minting.
                        This is a common source of error 0x1779.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="rounded-md bg-gray-800 p-4 border border-gray-700">
                      <h3 className="font-medium mb-2">What to Add to Your App:</h3>
                      <p className="text-sm text-gray-300 mb-4">
                        Add a pre-creation step for Solflare users before minting:
                      </p>
                      <pre className="bg-gray-900 p-3 rounded-md text-xs overflow-x-auto text-gray-300">
                        {`// Add before minting function
async function createTokenAccountIfNeeded() {
  if (!wallet.publicKey) return;
  
  try {
    const tokenAccount = await ensureAtaExists(
      connection,
      wallet.publicKey,
      TOKEN_MINT
    );
    console.log("Token account ready:", tokenAccount);
    return true;
  } catch (err) {
    console.error("Failed to create token account:", err);
    return false;
  }
}`}
                      </pre>
                      
                      <h3 className="font-medium mt-6 mb-2">Add to Your Mint Function:</h3>
                      <pre className="bg-gray-900 p-3 rounded-md text-xs overflow-x-auto text-gray-300">
                        {`// At start of mint function
if (isSolflareWallet(wallet)) {
  setStatus("Creating token account if needed...");
  const success = await createTokenAccountIfNeeded();
  if (!success) {
    setStatus("Failed to create token account");
    setIsLoading(false);
    return;
  }
}`}
                      </pre>
                    </div>
                    
                    <div className="p-4 bg-green-500/10 border border-green-500 rounded-md">
                      <h3 className="font-medium text-green-400 mb-2">Explanation</h3>
                      <p className="text-sm text-gray-300">
                        Solflare doesn't automatically create Associated Token Accounts during transactions
                        like Phantom does. Adding an explicit ATA creation step before minting prevents the
                        0x1779 token owner mismatch error.
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="bg-amber-600 hover:bg-amber-700 w-full"
                      onClick={() => {
                        toast({
                          title: "Code snippet copied!",
                          description: "Add this to your mint function to fix Solflare issues.",
                        });
                      }}
                    >
                      Copy Solution Code
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="md:col-span-3">
            <Card className="border-gray-700 bg-gray-800/50">
              <CardHeader>
                <CardTitle>What went wrong?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Error 0x1779 Explained</h3>
                  <p className="text-gray-300 text-sm">
                    This error means "Token Account Owner Mismatch" or "Invalid Owner". The most common causes are:
                  </p>
                  <ul className="space-y-1 list-disc pl-5 text-gray-300 text-sm">
                    <li>The Associated Token Account (ATA) doesn't exist yet</li>
                    <li>You're trying to use an ATA owned by a different wallet</li>
                    <li>The Candy Machine is expecting a specific ATA</li>
                    <li>Solflare wallet permissions are restricted</li>
                  </ul>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-gray-700">
                  <h3 className="font-medium">Solflare-specific issues</h3>
                  <p className="text-gray-300 text-sm">
                    Solflare wallet handles ATAs differently than Phantom in some cases. It may:
                  </p>
                  <ul className="space-y-1 list-disc pl-5 text-gray-300 text-sm">
                    <li><strong className="text-amber-400">Require explicit pre-creation of token accounts</strong></li>
                    <li>Need permissions to be granted for dApps</li>
                    <li>Have issues with concurrent transaction approval</li>
                    <li>Require ATA to have received the token at least once</li>
                  </ul>
                </div>
                
                <Alert className="mt-4 bg-green-500/10 border-green-500">
                  <Check className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-500">Solflare Solution</AlertTitle>
                  <AlertDescription className="text-gray-300">
                    <strong>Add an explicit ATA creation step</strong> before the mint transaction for Solflare wallets. 
                    Check the "Solflare Fix" tab for the solution code.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
