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
      {/* UPDATED FOR MOBILE: Mobile-first header design */}
      <header className={`bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 shadow-xl border-b border-gray-700/30 sticky top-0 z-50 backdrop-blur-md ${className}`}>
        <div className="container mx-auto px-mobile-sm mobile-m:px-mobile-md">
          {/* UPDATED FOR MOBILE: Reduced header height for portrait mode */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            
            {/* Top row - Logo and menu button */}
            <div className="flex justify-between items-center h-10 mobile-m:h-12 md:h-20">
              <div className="flex items-center gap-1 mobile-m:gap-2">
                <div className="w-6 h-6 mobile-m:w-7 mobile-m:h-7 md:w-10 md:h-10 bg-gradient-to-br from-blue-400 to-cyan-300 rounded-lg flex items-center justify-center shadow-lg">
                  <svg className="w-3 h-3 mobile-m:w-3.5 mobile-m:h-3.5 md:w-6 md:h-6 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <h1 className="text-mobile-sm mobile-m:text-mobile-base md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent tracking-wide font-mono uppercase">
                  SNOWPIERCER
                </h1>
              </div>
              
              {/* Mobile hamburger menu */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden min-w-touch min-h-touch flex items-center justify-center bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-600 transition-colors duration-200 touch-manipulation"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5 text-white" />
                ) : (
                  <Menu className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
            
            {/* Bottom row - Network status and wallet (mobile only) */}
            <div className="md:hidden flex justify-between items-center pb-2 pt-1">
              <div className="flex items-center gap-1">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold tracking-wide uppercase backdrop-blur-sm border ${getNetworkColor()} shadow-md`}>
                  <div className="animate-pulse">{getNetworkIcon()}</div>
                  <span className="capitalize">{networkStatus}</span>
                </div>
              </div>
              
              {/* Wallet button moved here for mobile */}
              <div className="flex-shrink-0">
                <WalletButton />
              </div>
            </div>
            
            {/* Desktop layout - preserved original structure */}
            <div className="hidden md:flex items-center gap-mobile-sm mobile-m:gap-mobile-md">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-300 rounded-lg flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <h1 className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent tracking-wide font-mono uppercase">
                  SNOWPIERCER
                </h1>
              </div>
              
              {/* Desktop Network status */}
              <div className={`flex px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase backdrop-blur-sm border ${getNetworkColor()} shadow-md`}>
                <div className="flex items-center gap-1.5">
                  <div className="animate-pulse">{getNetworkIcon()}</div>
                  <span>Network:</span>
                  <span className="capitalize">{networkStatus}</span>
                </div>
              </div>
            </div>
            
            {/* Desktop Right section - wallet only */}
            <div className="hidden md:flex items-center">
              <div className="flex-shrink-0">
                <WalletButton />
              </div>
            </div>
          </div>
        </div>
        
        {/* UPDATED FOR MOBILE: Mobile menu overlay */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-b border-gray-700/30 shadow-2xl">
            <div className="container mx-auto px-mobile-sm py-mobile-md space-y-mobile-sm">
              
              {/* Network status in mobile menu */}
              <div className="flex items-center justify-between p-mobile-sm bg-gray-800/30 rounded-lg border border-gray-700/30">
                <span className="text-mobile-sm text-gray-300 font-medium">Network Status</span>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-mobile-xs font-semibold ${getNetworkColor()}`}>
                  {getNetworkIcon()}
                  <span className="capitalize">{networkStatus}</span>
                </div>
              </div>
              
              {/* Orientation indicator */}
              {orientation === 'landscape' && (
                <div className="p-mobile-sm bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30 text-center">
                  <p className="text-mobile-sm font-medium">
                    📱 Rotate for better view
                  </p>
                </div>
              )}
              
              {/* Quick actions */}
              <div className="pt-mobile-sm border-t border-gray-700/30">
                <p className="text-mobile-xs text-gray-400 text-center">
                  Use mobile wallet app if browser connection fails
                </p>
              </div>
            </div>
          </div>
        )}
      </header>
      
      {/* UPDATED FOR MOBILE: Menu overlay backdrop */}
      {isMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
}