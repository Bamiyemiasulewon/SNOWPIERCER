'use client';

import { useState, useEffect } from 'react';
import { Menu, X, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';

// UPDATED FOR MOBILE: Dynamic import for wallet button to prevent SSR issues
const WalletButton = dynamic(() => import('./WalletButton'), { 
  ssr: false,
  loading: () => <div className="min-w-touch min-h-touch bg-gray-700/50 animate-pulse rounded-lg" />
});

interface MobileHeaderProps {
  networkStatus: 'good' | 'congested' | 'error';
  className?: string;
}

export default function MobileHeader({ networkStatus, className = '' }: MobileHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // UPDATED FOR MOBILE: Handle orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    handleOrientationChange();
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  const getNetworkIcon = () => {
    switch (networkStatus) {
      case 'good':
        return <Wifi className="h-4 w-4 text-emerald-400" />;
      case 'congested':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-400" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-400" />;
    }
  };

  const getNetworkColor = () => {
    switch (networkStatus) {
      case 'good':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'congested':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <>
      {/* MOBILE-OPTIMIZED: Ultra-compact header - max 60px height */}
      <header className={`bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 shadow-lg border-b border-gray-700/30 sticky top-0 z-50 backdrop-blur-md ${className}`}>
        <div className="container mx-auto">
          {/* Single row layout for maximum compactness - 60px max height */}
          <div className="flex items-center justify-between h-12 sm:h-14 md:h-20 px-3 md:px-6">
            
            {/* Left: Compact logo */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-10 md:h-10 bg-gradient-to-br from-blue-400 to-cyan-300 rounded flex items-center justify-center">
                <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-6 md:h-6 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h1 className="text-xs sm:text-sm md:text-2xl lg:text-3xl font-medium md:font-black bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent tracking-tight font-mono uppercase">
                SNOWPIERCER
              </h1>
            </div>
            
            {/* Right: Network dot + Wallet */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Network Status - Dot indicator only on mobile */}
              <div className="flex items-center gap-1">
                {/* Mobile: Just a colored dot */}
                <div className="md:hidden">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    networkStatus === 'good' ? 'bg-emerald-400' :
                    networkStatus === 'congested' ? 'bg-amber-400' : 'bg-red-400'
                  }`} title={`Network: ${networkStatus}`} />
                </div>
                
                {/* Desktop: Full status */}
                <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase backdrop-blur-sm border ${getNetworkColor()}`}>
                  <div className="animate-pulse">{getNetworkIcon()}</div>
                  <span>Network:</span>
                  <span className="capitalize">{networkStatus}</span>
                </div>
              </div>
              
              {/* Mobile menu button - shown only on small screens */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="sm:hidden p-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded border border-gray-600 transition-colors touch-manipulation"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <X className="h-4 w-4 text-white" />
                ) : (
                  <Menu className="h-4 w-4 text-white" />
                )}
              </button>
              
              {/* Wallet button */}
              <div className="flex-shrink-0">
                <WalletButton />
              </div>
            </div>
          </div>
        </div>
        
        {/* Compact mobile menu overlay */}
        {isMenuOpen && (
          <div className="sm:hidden absolute top-full left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-b border-gray-700/30 shadow-xl">
            <div className="container mx-auto px-3 py-3 space-y-2">
              
              {/* Network status in mobile menu */}
              <div className="flex items-center justify-between p-2 bg-gray-800/30 rounded border border-gray-700/30">
                <span className="text-xs text-gray-300 font-medium">Network Status</span>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getNetworkColor()}`}>
                  {getNetworkIcon()}
                  <span className="capitalize">{networkStatus}</span>
                </div>
              </div>
              
              {/* Orientation indicator */}
              {orientation === 'landscape' && (
                <div className="p-2 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 text-center">
                  <p className="text-xs font-medium">
                    📱 Rotate for better view
                  </p>
                </div>
              )}
              
              {/* Quick tip */}
              <div className="pt-2 border-t border-gray-700/30">
                <p className="text-xs text-gray-400 text-center">
                  Use mobile wallet app if connection fails
                </p>
              </div>
            </div>
          </div>
        )}
      </header>
      
      {/* Mobile menu backdrop */}
      {isMenuOpen && (
        <div 
          className="sm:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
}