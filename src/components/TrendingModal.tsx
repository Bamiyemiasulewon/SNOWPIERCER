'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Twitter, Copy, ExternalLink, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'react-toastify';

interface TrendingData {
  platform: string;
  tokenAddress: string;
  volume24h: number;
  price: number;
  priceChange24h: number;
  marketCap: number;
  trending: boolean;
}

interface TrendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  trendingData?: TrendingData;
  className?: string;
}

export default function TrendingModal({ 
  isOpen, 
  onClose, 
  trendingData,
  className = '' 
}: TrendingModalProps) {
  const [screenSize, setScreenSize] = useState<'small' | 'medium' | 'large'>('small');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // UPDATED FOR MOBILE: Handle screen size and orientation changes
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
      
      if (width < 481) {
        setScreenSize('small');
      } else if (width < 769) {
        setScreenSize('medium');
      } else {
        setScreenSize('large');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // UPDATED FOR MOBILE: Handle escape key and prevent body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden'; // Prevent background scroll

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const formatNumber = useCallback((num: number, options: { compact?: boolean; currency?: boolean } = {}) => {
    if (options.compact) {
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    }
    
    if (options.currency) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    }
    
    return num.toLocaleString();
  }, []);

  const handleCopyAddress = useCallback(() => {
    if (!trendingData?.tokenAddress) return;
    
    navigator.clipboard.writeText(trendingData.tokenAddress);
    toast.success('Token address copied!');
  }, [trendingData?.tokenAddress]);

  const handleTweet = useCallback(() => {
    if (!trendingData) return;
    
    const tweetText = `🚀 $TOKEN is trending on ${trendingData.platform}!\n\n` +
      `📈 24h Volume: ${formatNumber(trendingData.volume24h, { compact: true, currency: true })}\n` +
      `💰 Price: ${formatNumber(trendingData.price, { currency: true })}\n` +
      `📊 Change: ${trendingData.priceChange24h > 0 ? '+' : ''}${trendingData.priceChange24h.toFixed(2)}%\n\n` +
      `#Solana #DeFi #Trending`;
    
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(tweetUrl, '_blank');
  }, [trendingData, formatNumber]);

  if (!isOpen) return null;

  // UPDATED FOR MOBILE: Fullscreen on small devices, modal on larger screens
  const isFullscreen = screenSize === 'small';

  return (
    <>
      {/* UPDATED FOR MOBILE: Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* UPDATED FOR MOBILE: Modal container */}
      <div className={`fixed z-50 transition-all duration-300 ${
        isFullscreen 
          ? 'inset-0' // Fullscreen on mobile
          : 'inset-4 md:inset-8 lg:inset-16 xl:inset-32' // Modal on larger screens
      }`}>
        <div className={`
          bg-white dark:bg-gray-900 shadow-2xl overflow-hidden h-full flex flex-col
          ${isFullscreen ? 'rounded-none' : 'rounded-xl md:rounded-2xl'}
          ${className}
        `}>
          
          {/* UPDATED FOR MOBILE: Header with close button */}
          <div className="flex items-center justify-between p-mobile-sm mobile-m:p-mobile-md md:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <div className="flex items-center gap-mobile-sm">
              <TrendingUp className="h-5 w-5 mobile-m:h-6 mobile-m:w-6 text-blue-600" />
              <h2 className="text-mobile-lg mobile-m:text-mobile-xl md:text-xl font-bold text-gray-900 dark:text-white">
                Trending Analysis
              </h2>
            </div>
            
            {/* UPDATED FOR MOBILE: Touch-friendly close button */}
            <button
              onClick={onClose}
              className="min-w-touch min-h-touch flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors duration-200 touch-manipulation"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 mobile-m:h-6 mobile-m:w-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          
          {/* UPDATED FOR MOBILE: Content area */}
          <div className="flex-1 overflow-y-auto p-mobile-sm mobile-m:p-mobile-md md:p-6">
            {trendingData ? (
              <div className="space-y-mobile-md">
                
                {/* Token Info Card */}
                <div className="bg-gradient-to-r from-indigo-50 to-cyan-50 dark:from-indigo-900/20 dark:to-cyan-900/20 rounded-xl p-mobile-md border border-indigo-200 dark:border-indigo-800">
                  <div className="flex flex-col mobile-m:flex-row mobile-m:items-center mobile-m:justify-between gap-mobile-sm">
                    <div>
                      <h3 className="text-mobile-lg mobile-m:text-mobile-xl font-bold text-gray-900 dark:text-white">
                        {trendingData.platform} Trending
                      </h3>
                      <p className="text-mobile-sm text-gray-600 dark:text-gray-400 mt-1">
                        Token Address: {trendingData.tokenAddress.slice(0, 8)}...
                      </p>
                    </div>
                    <div className={`px-mobile-sm py-1 rounded-full text-mobile-xs font-semibold ${
                      trendingData.trending 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {trendingData.trending ? '🔥 TRENDING' : '📈 RISING'}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-mobile-sm mobile-m:gap-mobile-md">
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-mobile-sm mobile-m:p-mobile-md border border-gray-200 dark:border-gray-700 text-center">
                    <DollarSign className="h-5 w-5 mx-auto mb-2 text-green-600" />
                    <p className="text-mobile-xs text-gray-600 dark:text-gray-400">Price</p>
                    <p className="text-mobile-base mobile-m:text-mobile-lg font-bold text-gray-900 dark:text-white">
                      {formatNumber(trendingData.price, { currency: true })}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl p-mobile-sm mobile-m:p-mobile-md border border-gray-200 dark:border-gray-700 text-center">
                    <TrendingUp className={`h-5 w-5 mx-auto mb-2 ${
                      trendingData.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <p className="text-mobile-xs text-gray-600 dark:text-gray-400">24h Change</p>
                    <p className={`text-mobile-base mobile-m:text-mobile-lg font-bold ${
                      trendingData.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trendingData.priceChange24h > 0 ? '+' : ''}{trendingData.priceChange24h.toFixed(2)}%
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl p-mobile-sm mobile-m:p-mobile-md border border-gray-200 dark:border-gray-700 text-center">
                    <div className="w-5 h-5 mx-auto mb-2 bg-blue-600 rounded-full"></div>
                    <p className="text-mobile-xs text-gray-600 dark:text-gray-400">Volume 24h</p>
                    <p className="text-mobile-base mobile-m:text-mobile-lg font-bold text-gray-900 dark:text-white">
                      {formatNumber(trendingData.volume24h, { compact: true, currency: true })}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-xl p-mobile-sm mobile-m:p-mobile-md border border-gray-200 dark:border-gray-700 text-center">
                    <div className="w-5 h-5 mx-auto mb-2 bg-purple-600 rounded-full"></div>
                    <p className="text-mobile-xs text-gray-600 dark:text-gray-400">Market Cap</p>
                    <p className="text-mobile-base mobile-m:text-mobile-lg font-bold text-gray-900 dark:text-white">
                      {formatNumber(trendingData.marketCap, { compact: true, currency: true })}
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex items-center justify-center py-mobile-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-mobile-sm text-gray-400" />
                  <p className="text-mobile-base text-gray-600 dark:text-gray-400">
                    No trending data available
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* UPDATED FOR MOBILE: Action buttons */}
          {trendingData && (
            <div className="p-mobile-sm mobile-m:p-mobile-md md:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="grid grid-cols-1 mobile-m:grid-cols-2 gap-mobile-sm">
                
                <button
                  onClick={handleCopyAddress}
                  className="min-h-touch flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-mobile-md py-3 rounded-lg font-medium transition-colors duration-200 touch-manipulation text-mobile-base"
                >
                  <Copy className="h-4 w-4" />
                  Copy Address
                </button>

                <button
                  onClick={handleTweet}
                  className="min-h-touch flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-mobile-md py-3 rounded-lg font-medium transition-colors duration-200 touch-manipulation text-mobile-base"
                >
                  <Twitter className="h-4 w-4" />
                  Tweet
                </button>
              </div>
              
              {/* Mobile optimization notice */}
              {screenSize === 'small' && orientation === 'landscape' && (
                <div className="mt-mobile-sm p-mobile-sm bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
                  <p className="text-mobile-xs text-blue-700 dark:text-blue-300">
                    📱 Rotate for better view
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}