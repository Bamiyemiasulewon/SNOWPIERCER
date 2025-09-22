'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Copy, Check, Wallet, LogOut, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';

export default function WalletButton() {
  const { publicKey, connected, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCopyAddress = async () => {
    if (publicKey) {
      try {
        await navigator.clipboard.writeText(publicKey.toBase58());
        setCopied(true);
        toast.success('Wallet address copied!');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy address');
      }
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
    toast.info('Wallet disconnected');
  };

  if (!connected || !publicKey) {
    return (
      <div className="relative">
        <WalletMultiButton className="!bg-gradient-to-r !from-blue-500 !to-cyan-500 hover:!from-blue-600 hover:!to-cyan-600 !border-0 !rounded-xl !px-6 !py-3 !text-white !font-semibold !tracking-wide !shadow-lg hover:!shadow-xl !transition-all !duration-200 !transform hover:!scale-105 !text-sm" />
      </div>
    );
  }

  const shortAddress = `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`;

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        {/* Connected Wallet Display */}
        <div 
          className="flex items-center gap-3 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 px-4 py-2.5 rounded-xl cursor-pointer hover:bg-slate-700/80 transition-all duration-200 shadow-lg group"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-emerald-400/50 shadow-lg" />
            <Wallet className="w-4 h-4 text-cyan-300" />
          </div>
          
          {/* Wallet Address */}
          <span className="text-sm font-mono font-medium text-gray-200 tracking-wider">
            {shortAddress}
          </span>
          
          {/* Copy Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyAddress();
            }}
            className="p-1.5 hover:bg-slate-600/50 rounded-lg transition-colors duration-150"
            title="Copy wallet address"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400 hover:text-cyan-300" />
            )}
          </button>
          
          {/* Dropdown Arrow */}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl z-20 overflow-hidden">
            {/* Wallet Info */}
            <div className="px-4 py-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wide">Connected</span>
              </div>
              <div className="text-xs text-gray-400 font-mono break-all leading-relaxed">
                {publicKey.toBase58()}
              </div>
            </div>
            
            {/* Actions */}
            <div className="py-2">
              <button
                onClick={handleCopyAddress}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/50 transition-colors duration-150 text-left"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm text-gray-200">
                  {copied ? 'Address Copied!' : 'Copy Full Address'}
                </span>
              </button>
              
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 transition-colors duration-150 text-left group"
              >
                <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
                <span className="text-sm text-gray-200 group-hover:text-red-300">
                  Disconnect Wallet
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
