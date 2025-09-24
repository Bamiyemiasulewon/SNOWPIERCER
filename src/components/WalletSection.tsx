'use client';

import dynamic from 'next/dynamic';

// Dynamic import for wallet button to prevent SSR issues
const WalletButton = dynamic(() => import('./WalletButton'), { 
  ssr: false,
  loading: () => <div className="w-32 h-10 bg-gray-700/50 animate-pulse rounded-lg" />
});

export default function WalletSection() {
  return (
    <div className="bg-slate-800/30 border-b border-gray-700/20">
      <div className="container mx-auto px-3 py-2">
        <div className="flex items-center justify-center">
          <WalletButton />
        </div>
      </div>
    </div>
  );
}