'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TrustWalletAdapter,
  CoinbaseWalletAdapter,
  LedgerWalletAdapter,
  MathWalletAdapter,
  TorusWalletAdapter,
  Coin98WalletAdapter,
  BitgetWalletAdapter,
  TokenPocketWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

export function WalletProviders({ children }: { children: React.ReactNode }) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Mainnet;

  // Use more reliable RPC endpoints
  const endpoint = useMemo(() => {
    // You can replace this with your preferred RPC provider
    // For better reliability, consider using:
    // - Alchemy: https://www.alchemy.com/solana
    // - QuickNode: https://www.quicknode.com/chains/sol
    // - Helius: https://www.helius.dev/
    
    const customEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (customEndpoint) {
      return customEndpoint;
    }
    
    // Use Solana's official mainnet RPC as primary
    return 'https://api.mainnet-beta.solana.com';
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TrustWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new LedgerWalletAdapter(),
      new MathWalletAdapter(),
      new TorusWalletAdapter(),
      new Coin98WalletAdapter(),
      new BitgetWalletAdapter(),
      new TokenPocketWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}