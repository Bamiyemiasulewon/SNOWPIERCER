'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { toast } from 'react-toastify';
import { Play, StopCircle, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS, checkTokenPool } from '@/lib/api';

interface Platform {
  id: string;
  name: string;
  minVolume: number;
  difficulty: string;
  selected?: boolean;
}

interface Intensity {
  id: string;
  name: string;
  description: string;
  multiplier: number;
}

interface PlatformEstimate {
  platform: string;
  volumeRequired: number;
  transactionsRequired: number;
  estimatedCostSOL: number;
  successProbability: number;
  timeToTrend: string;
  difficulty: string;
}

interface MultiPlatformCostResponse {
  platform_estimates: PlatformEstimate[];
  total_cost_sol: number;
  total_volume_required: number;
  total_transactions: number;
  estimated_duration: string;
  overall_success_probability: number;
  recommendations: string;
}

interface FormData {
  tokenAddress: string;
  numberOfTrades: number;
  duration: number; // in minutes
  tradeSize: number; // in SOL
  slippageTolerance: number;
  mode: 'boost' | 'bump' | 'advanced' | 'trending';
  customDelayMin?: number;
  customDelayMax?: number;
  // Trending-specific fields
  selectedPlatforms: string[];
  trendingIntensity: string;
}


interface FormProps {
  onStartBot: (formData: FormData) => void;
  onStopBot: () => void;
  isRunning: boolean;
}

export default function Form({ onStartBot, onStopBot, isRunning }: FormProps) {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  
  const [formData, setFormData] = useState<FormData>({
    tokenAddress: '',
    numberOfTrades: 100,
    duration: 60, // 1 hour in minutes
    tradeSize: 0.01,
    slippageTolerance: 1,
    mode: 'bump',
    selectedPlatforms: [],
    trendingIntensity: 'aggressive',
  });

  // const [tokens, setTokens] = useState<Token[]>([]);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [isValidating, setIsValidating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [poolStatus, setPoolStatus] = useState<{ exists?: boolean; loading?: boolean }>({});
  
  // Trending-specific state
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [intensities, setIntensities] = useState<Intensity[]>([]);
  const [costEstimate, setCostEstimate] = useState<MultiPlatformCostResponse | null>(null);
  const [isCalculatingCosts, setIsCalculatingCosts] = useState(false);

  // Fetch trending platforms and intensities
  useEffect(() => {
    const fetchTrendingData = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(API_ENDPOINTS.trendingPlatforms, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          
          interface ApiPlatform {
            id: string;
            name: string;
            min_volume_24h: number;
            difficulty: string;
          }
          
          interface ApiIntensity {
            id: string;
            name: string;
            description: string;
          }
          
          const platformData: Platform[] = data.platforms.map((p: ApiPlatform) => ({
            id: p.id,
            name: p.name,
            minVolume: p.min_volume_24h,
            difficulty: p.difficulty,
            selected: false
          }));
          
          const intensityData: Intensity[] = data.intensities.map((i: ApiIntensity) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            multiplier: i.id === 'organic' ? 1.0 : i.id === 'aggressive' ? 1.2 : i.id === 'stealth' ? 0.8 : 1.5
          }));
          
          setPlatforms(platformData);
          setIntensities(intensityData);
        } else {
          console.error('API response not ok:', response.status, response.statusText);
          // Use fallback data
          setFallbackTrendingData();
        }
      } catch (error) {
        console.error('Failed to fetch trending data:', error);
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.error('Request timed out');
          } else {
            console.error('Network error:', error.message);
          }
        }
        // Use fallback data when backend is not available
        setFallbackTrendingData();
      }
    };

    const setFallbackTrendingData = () => {
      // Fallback data when backend is not available
      const fallbackPlatforms: Platform[] = [
        { id: 'dexscreener', name: 'DEXScreener', minVolume: 50000, difficulty: 'high' },
        { id: 'dextools', name: 'DEXTools', minVolume: 25000, difficulty: 'medium' },
        { id: 'jupiter', name: 'Jupiter Terminal', minVolume: 15000, difficulty: 'low' },
        { id: 'birdeye', name: 'Birdeye', minVolume: 35000, difficulty: 'medium' },
        { id: 'solscan', name: 'Solscan', minVolume: 10000, difficulty: 'low' },
      ];
      
      const fallbackIntensities: Intensity[] = [
        { id: 'organic', name: 'Organic', description: 'Natural, long-term trending approach', multiplier: 1.0 },
        { id: 'aggressive', name: 'Aggressive', description: 'Fast, high-impact trending', multiplier: 1.2 },
        { id: 'stealth', name: 'Stealth', description: 'Undetectable, gradual approach', multiplier: 0.8 },
        { id: 'viral', name: 'Viral', description: 'Maximum visibility and impact', multiplier: 1.5 },
      ];
      
      setPlatforms(fallbackPlatforms);
      setIntensities(fallbackIntensities);
    };

    fetchTrendingData();
  }, []);

  // Fetch SOL balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (connected && publicKey && connection) {
        try {
          // Add timeout to prevent hanging requests
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Balance fetch timeout')), 10000)
          );
          
          const balancePromise = connection.getBalance(publicKey);
          const balance = await Promise.race([balancePromise, timeoutPromise]) as number;
          
          setSolBalance(balance / LAMPORTS_PER_SOL);
        } catch (error) {
          console.warn('Failed to fetch balance:', error instanceof Error ? error.message : 'Unknown error');
          // Set a default balance to prevent form blocking
          setSolBalance(0);
        }
      } else {
        setSolBalance(0);
      }
    };

    // Add delay to let connection establish
    const timeout = setTimeout(fetchBalance, 1000);
    return () => clearTimeout(timeout);
  }, [connected, publicKey, connection]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!connected) {
      newErrors.wallet = 'Please connect your wallet first';
    }

    // Only check balance if we successfully fetched it and user is connected
    if (connected && solBalance === 0) {
      newErrors.balance = 'Unable to fetch SOL balance. Please ensure you have sufficient SOL (minimum 0.1 SOL recommended)';
    } else if (connected && solBalance > 0 && solBalance < 0.01) {
      newErrors.balance = 'Low SOL balance. Minimum 0.01 SOL required for trading';
    }

    if (!formData.tokenAddress) {
      newErrors.tokenAddress = 'Token address is required';
    } else {
      try {
        new PublicKey(formData.tokenAddress);
        
        // UPDATED FOR SMITHII LOGIC: Check pool existence
        if (poolStatus.exists === false) {
          newErrors.tokenAddress = 'No Raydium pool found for this token. Volume bot requires an existing pool.';
        }
      } catch {
        newErrors.tokenAddress = 'Invalid Solana address';
      }
    }

    if (formData.numberOfTrades < 10 || formData.numberOfTrades > 100) {
      newErrors.numberOfTrades = 'Number of trades must be between 10 and 100';
    }

    if (formData.duration < 1 || formData.duration > 1440) { // 24 hours in minutes
      newErrors.duration = 'Duration must be between 1 and 1,440 minutes (24 hours)';
    }

    if (formData.tradeSize < 0.01 || formData.tradeSize > 0.1) {
      newErrors.tradeSize = 'Trade size must be between 0.01 and 0.1 SOL';
    }

    if (formData.slippageTolerance < 0.1 || formData.slippageTolerance > 10) {
      newErrors.slippageTolerance = 'Slippage tolerance must be between 0.1% and 10%';
    }

    if (formData.mode === 'advanced') {
      if (!formData.customDelayMin || formData.customDelayMin < 1) {
        newErrors.customDelayMin = 'Minimum delay is required and must be at least 1 second';
      }
      if (!formData.customDelayMax || formData.customDelayMax < (formData.customDelayMin || 1)) {
        newErrors.customDelayMax = 'Maximum delay must be greater than minimum delay';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setIsValidating(true);
    
    try {
      // Additional validation: Check if token address exists
      if (formData.tokenAddress !== 'So11111111111111111111111111111111111111112') {
        try {
          const tokenMint = new PublicKey(formData.tokenAddress);
          const accountInfo = await connection.getAccountInfo(tokenMint);
          if (!accountInfo) {
            throw new Error('Token not found');
          }
        } catch {
          toast.error('Invalid token address or token does not exist');
          setIsValidating(false);
          return;
        }
      }

      onStartBot(formData);
      toast.success('Volume bot started successfully!');
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to start bot. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // UPDATED FOR SMITHII LOGIC: Auto-fetch pool and trending data when token address changes
    if (field === 'tokenAddress' && typeof value === 'string' && value.length >= 32) {
      fetchTokenData(value);
    }
  };
  
  const fetchTokenData = async (tokenMint: string) => {
    try {
      setPoolStatus({ loading: true });
      
      // Check pool existence
      const poolResponse = await checkTokenPool(tokenMint);
      if (poolResponse.success && poolResponse.data) {
        setPoolStatus({ exists: poolResponse.data.exists, loading: false });
        
        if (!poolResponse.data.exists) {
          toast.warn('⚠️ No Raydium pool found for this token');
        } else {
          toast.success('✅ Pool verified - ready for volume bot');
        }
      }
      
      // TODO: Fetch trending metrics if pool exists and mode is trending
      // Will implement trending data display in future update
      
    } catch (error) {
      console.error('Failed to fetch token data:', error);
      setPoolStatus({ exists: false, loading: false });
    }
  };

  const getModeDescription = () => {
    switch (formData.mode) {
      case 'boost':
        return 'Quick spikes in volume for maximum visibility';
      case 'bump':
        return 'Sustained volume generation for organic growth';
      case 'advanced':
        return 'Custom delay settings for precise control';
      case 'trending':
        return 'Select platforms and estimate SOL needed to trend';
      default:
        return '';
    }
  };

  const setMockCostEstimate = useCallback(() => {
    // Mock estimate for development when backend is not available
    const mockEstimate: MultiPlatformCostResponse = {
      platform_estimates: formData.selectedPlatforms.map(platform => ({
        platform: platform,
        volumeRequired: platforms.find(p => p.id === platform)?.minVolume || 25000,
        transactionsRequired: 100,
        estimatedCostSOL: 0.5 + Math.random() * 2,
        successProbability: 0.75 + Math.random() * 0.2,
        timeToTrend: '4-6 hours',
        difficulty: platforms.find(p => p.id === platform)?.difficulty || 'medium'
      })),
      total_cost_sol: formData.selectedPlatforms.length * (0.5 + Math.random() * 2),
      total_volume_required: Math.max(...formData.selectedPlatforms.map(platform => 
        platforms.find(p => p.id === platform)?.minVolume || 25000)),
      total_transactions: 100,
      estimated_duration: '4-8 hours',
      overall_success_probability: 0.8,
      recommendations: '💰 Mock data - Backend not connected • Select platforms that match your budget • Consider starting with easier platforms first'
    };
    setCostEstimate(mockEstimate);
  }, [formData.selectedPlatforms, platforms]);

  const calculateMultiPlatformCosts = useCallback(async () => {
    if (formData.selectedPlatforms.length === 0 || !formData.trendingIntensity) {
      setCostEstimate(null);
      return;
    }
    
    setIsCalculatingCosts(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(API_ENDPOINTS.trendingMultiPlatformCosts, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platforms: formData.selectedPlatforms,
          intensity: formData.trendingIntensity,
        }),
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data: MultiPlatformCostResponse = await response.json();
        setCostEstimate(data);
      } else {
        console.error('Failed to calculate costs:', response.status, response.statusText);
        // Set a mock estimate when API is not available
        setMockCostEstimate();
      }
    } catch (error) {
      console.error('Error calculating costs:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Cost calculation request timed out');
      }
      // Set a mock estimate when API is not available
      setMockCostEstimate();
    } finally {
      setIsCalculatingCosts(false);
    }
  }, [formData.selectedPlatforms, formData.trendingIntensity, setMockCostEstimate]);
  
  // Trigger cost calculation when platforms or intensity changes
  useEffect(() => {
    if (formData.mode === 'trending') {
      const timeout = setTimeout(calculateMultiPlatformCosts, 500);
      return () => clearTimeout(timeout);
    }
  }, [formData.selectedPlatforms, formData.trendingIntensity, formData.mode, calculateMultiPlatformCosts]);
  
  const togglePlatform = (platformId: string) => {
    setFormData(prev => {
      const selected = prev.selectedPlatforms.includes(platformId);
      const newSelected = selected
        ? prev.selectedPlatforms.filter(p => p !== platformId)
        : [...prev.selectedPlatforms, platformId];
      
      return {
        ...prev,
        selectedPlatforms: newSelected
      };
    });
  };
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'low':
        return 'text-green-600 dark:text-green-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'high':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-mobile-xs mobile-m:px-mobile-sm md:px-mobile-md">
      {/* Mobile-Optimized Form Container */}
      <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg md:shadow-xl border border-gray-200 dark:border-gray-700 p-4 mobile-m:p-6 md:p-6 lg:p-8 mb-4 md:mb-6">
        {/* Improved Header with Better Mobile Spacing */}
        <div className="mb-6 md:mb-8 text-center md:text-left">
          <h2 className="text-xl mobile-m:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white mb-3 md:mb-4">
            Volume Bot Configuration
          </h2>
          <p className="text-sm mobile-m:text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            Configure your Solana token volume boosting parameters
          </p>
        </div>

        {/* Enhanced Wallet Status Section */}
        <div className="mb-6 md:mb-8 p-4 mobile-m:p-5 md:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg md:rounded-xl border border-gray-200 dark:border-gray-600">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 mobile-m:w-5 mobile-m:h-5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-sm mobile-m:text-base font-semibold text-gray-700 dark:text-gray-200">
                {connected ? 'Wallet Connected' : 'Wallet Not Connected'}
              </span>
            </div>
            {connected && (
              <div className="bg-white dark:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                <span className="text-sm mobile-m:text-base font-mono text-gray-600 dark:text-gray-400">
                  Balance: <span className="font-bold text-blue-600 dark:text-blue-400">{solBalance.toFixed(4)} SOL</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          {/* Enhanced Token Address Input */}
          <div className="space-y-3">
            <label className="block text-sm mobile-m:text-base font-semibold text-gray-700 dark:text-gray-300">
              Token Address (SPL Token Mint)
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.tokenAddress}
                onChange={(e) => handleInputChange('tokenAddress', e.target.value)}
                placeholder="Enter Solana token address..."
                className="w-full h-12 mobile-m:h-14 px-4 mobile-m:px-5 py-3 mobile-m:py-4 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 touch-manipulation pr-12"
                disabled={isRunning}
              />
              {/* UPDATED FOR SMITHII LOGIC: Pool status indicator */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {poolStatus.loading ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : poolStatus.exists === true ? (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                ) : poolStatus.exists === false ? (
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✗</span>
                  </div>
                ) : null}
              </div>
            </div>
            {errors.tokenAddress && (
              <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{errors.tokenAddress}</p>
              </div>
            )}
          </div>

          {/* Enhanced Trading Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mobile-m:gap-6 lg:gap-8">
            <div className="space-y-3">
              <label className="block text-sm mobile-m:text-base font-semibold text-gray-700 dark:text-gray-300">
                Number of Trades
              </label>
              <input
                type="number"
                min="10"
                max="100"
                value={formData.numberOfTrades}
                onChange={(e) => handleInputChange('numberOfTrades', parseInt(e.target.value))}
                className="w-full h-12 mobile-m:h-14 px-4 mobile-m:px-5 py-3 mobile-m:py-4 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:text-white touch-manipulation"
                disabled={isRunning}
              />
              {errors.numberOfTrades && (
                <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.numberOfTrades}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-sm mobile-m:text-base font-semibold text-gray-700 dark:text-gray-300">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                className="w-full h-12 mobile-m:h-14 px-4 mobile-m:px-5 py-3 mobile-m:py-4 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:text-white touch-manipulation"
                disabled={isRunning}
              />
              {errors.duration && (
                <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.duration}</p>
                </div>
              )}
            </div>
          </div>

          {/* Trade Size and Slippage Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mobile-m:gap-6 lg:gap-8">
            <div className="space-y-3">
              <label className="block text-sm mobile-m:text-base font-semibold text-gray-700 dark:text-gray-300">
                Trade Size (SOL)
              </label>
              <input
                type="number"
                min="0.01"
                max="0.1"
                step="0.001"
                value={formData.tradeSize}
                onChange={(e) => handleInputChange('tradeSize', parseFloat(e.target.value))}
                className="w-full h-12 mobile-m:h-14 px-4 mobile-m:px-5 py-3 mobile-m:py-4 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:text-white touch-manipulation"
                disabled={isRunning}
              />
              {errors.tradeSize && (
                <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.tradeSize}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-sm mobile-m:text-base font-semibold text-gray-700 dark:text-gray-300">
                Slippage Tolerance (%)
              </label>
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={formData.slippageTolerance}
                onChange={(e) => handleInputChange('slippageTolerance', parseFloat(e.target.value))}
                className="w-full h-12 mobile-m:h-14 px-4 mobile-m:px-5 py-3 mobile-m:py-4 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:text-white touch-manipulation"
                disabled={isRunning}
              />
              {errors.slippageTolerance && (
                <div className="flex items-center gap-2 mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.slippageTolerance}</p>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Trading Mode Selection */}
          <div className="space-y-5">
            <label className="block text-sm mobile-m:text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Trading Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mobile-m:gap-4">
              {(['boost', 'bump', 'advanced', 'trending'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleInputChange('mode', mode)}
                  className={`relative p-4 mobile-m:p-5 rounded-lg md:rounded-xl border-2 transition-all duration-200 min-h-[80px] mobile-m:min-h-[90px] ${
                    formData.mode === mode
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg scale-[1.02]'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-blue-300 dark:hover:border-blue-400 hover:scale-[1.01]'
                  } touch-manipulation active:scale-[0.98]`}
                  disabled={isRunning}
                >
                  <div className="flex items-center justify-between sm:flex-col sm:text-center h-full">
                    <div className="text-base mobile-m:text-lg font-semibold capitalize">{mode}</div>
                    {formData.mode === mode && (
                      <div className="w-6 h-6 mobile-m:w-7 mobile-m:h-7 bg-white rounded-full flex items-center justify-center ml-2 sm:ml-0 sm:mt-2 flex-shrink-0">
                        <div className="w-3 h-3 mobile-m:w-3.5 mobile-m:h-3.5 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 mobile-m:p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg md:rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-sm mobile-m:text-base text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                {getModeDescription()}
              </p>
            </div>
          </div>

          {/* Mobile-Optimized Advanced Mode Settings */}
          {formData.mode === 'advanced' && (
            <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-700 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Custom Delay Settings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Min Delay (seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.customDelayMin || ''}
                    onChange={(e) => handleInputChange('customDelayMin', parseInt(e.target.value))}
                    className="w-full px-4 py-3 text-sm sm:text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:text-white"
                    disabled={isRunning}
                    placeholder="e.g., 5"
                  />
                  {errors.customDelayMin && (
                    <div className="flex items-center gap-2 mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.customDelayMin}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Max Delay (seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.customDelayMax || ''}
                    onChange={(e) => handleInputChange('customDelayMax', parseInt(e.target.value))}
                    className="w-full px-4 py-3 text-sm sm:text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:text-white"
                    disabled={isRunning}
                    placeholder="e.g., 30"
                  />
                  {errors.customDelayMax && (
                    <div className="flex items-center gap-2 mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.customDelayMax}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Trending Mode Settings */}
          {formData.mode === 'trending' && (
            <div className="space-y-6">
              {/* Platform Selection */}
              <div className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg sm:rounded-xl border border-purple-200 dark:border-purple-800">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  Select Trending Platforms
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:gap-3 mb-4">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => togglePlatform(platform.id)}
                      className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-left min-h-[80px] sm:min-h-[90px] ${
                        formData.selectedPlatforms.includes(platform.id)
                          ? 'bg-blue-600 text-white border-blue-500 shadow-lg transform scale-[1.02]'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 hover:scale-[1.01]'
                      } touch-manipulation active:scale-[0.98]`}
                      disabled={isRunning}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-start gap-2">
                          {formData.selectedPlatforms.includes(platform.id) && (
                            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold text-base sm:text-lg">{platform.name}</h4>
                            <p className="text-xs sm:text-sm opacity-75 mt-1">
                              Min: ${platform.minVolume.toLocaleString()} volume
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full font-semibold flex-shrink-0 ${
                          formData.selectedPlatforms.includes(platform.id) 
                            ? 'bg-white/20 text-white' 
                            : `bg-gray-100 dark:bg-gray-600 ${getDifficultyColor(platform.difficulty)}`
                        }`}>
                          {platform.difficulty.toUpperCase()}
                        </span>
                      </div>
                      {formData.selectedPlatforms.includes(platform.id) && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          <span className="text-xs font-medium flex items-center gap-1">
                            ✓ Selected for trending
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                
                {formData.selectedPlatforms.length === 0 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      ⚠️ Please select at least one platform to calculate trending costs
                    </p>
                  </div>
                )}
              </div>
              
              {/* Intensity Selection */}
              <div className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg sm:rounded-xl border border-green-200 dark:border-green-800">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  Trending Intensity
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {intensities.map((intensity) => (
                    <button
                      key={intensity.id}
                      type="button"
                      onClick={() => handleInputChange('trendingIntensity', intensity.id)}
                      className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-center min-h-[100px] sm:min-h-[110px] ${
                        formData.trendingIntensity === intensity.id
                          ? 'bg-green-600 text-white border-green-500 shadow-lg transform scale-[1.02]'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 hover:scale-[1.01]'
                      } touch-manipulation active:scale-[0.98]`}
                      disabled={isRunning}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {formData.trendingIntensity === intensity.id && (
                          <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                        )}
                        <div className="text-center">
                          <h4 className="font-semibold text-sm sm:text-base capitalize mb-1">{intensity.name}</h4>
                          <span className={`text-xs sm:text-sm px-2 py-1 rounded-full font-semibold ${
                            formData.trendingIntensity === intensity.id 
                              ? 'bg-white/20 text-white' 
                              : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                          }`}>
                            {intensity.multiplier}x
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm opacity-75 leading-tight">
                          {intensity.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Cost Estimate */}
              {(isCalculatingCosts || costEstimate) && (
                <div className="p-4 sm:p-6 bg-gradient-to-br from-indigo-50 to-cyan-50 dark:from-indigo-900/20 dark:to-cyan-900/20 rounded-lg sm:rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                    💰 Cost Estimation
                  </h3>
                  
                  {isCalculatingCosts ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span className="ml-3 text-gray-600 dark:text-gray-400">Calculating costs...</span>
                    </div>
                  ) : costEstimate ? (
                    <div className="space-y-4">
                      {/* Total Cost Summary */}
                      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                          <div className="text-center p-3 sm:p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                            <div className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                              {costEstimate.total_cost_sol.toFixed(3)} SOL
                            </div>
                            <div className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400">Total Cost</div>
                          </div>
                          <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                            <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                              {(costEstimate.overall_success_probability * 100).toFixed(0)}%
                            </div>
                            <div className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400">Success Rate</div>
                          </div>
                          <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                              {costEstimate.estimated_duration}
                            </div>
                            <div className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400">Duration</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Per-Platform Breakdown */}
                      <div className="space-y-3 sm:space-y-4">
                        <h4 className="font-semibold text-base sm:text-lg text-gray-800 dark:text-gray-200">💎 Platform Breakdown</h4>
                        {costEstimate.platform_estimates.map((estimate, index) => (
                          <div key={index} className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                                <h5 className="font-bold text-lg sm:text-xl text-gray-800 dark:text-gray-200 capitalize">
                                  {estimate.platform}
                                </h5>
                              </div>
                              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 px-3 py-2 rounded-lg">
                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                  {estimate.estimatedCostSOL.toFixed(3)} SOL
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
                              <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg text-center">
                                <div className="font-semibold text-gray-800 dark:text-gray-200">
                                  ${estimate.volumeRequired.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Volume</div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg text-center">
                                <div className="font-semibold text-green-600 dark:text-green-400">
                                  {(estimate.successProbability * 100).toFixed(0)}%
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Success</div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg text-center">
                                <div className="font-semibold text-blue-600 dark:text-blue-400">
                                  {estimate.timeToTrend}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Time</div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg text-center">
                                <div className={`font-semibold ${getDifficultyColor(estimate.difficulty)}`}>
                                  {estimate.difficulty.toUpperCase()}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Difficulty</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Recommendations */}
                      {costEstimate.recommendations && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Recommendations:</h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300">{costEstimate.recommendations}</p>
                        </div>
                      )}
                      
                      {/* SOL Balance Warning */}
                      {costEstimate.total_cost_sol > solBalance && connected && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            <div>
                              <h4 className="font-medium text-red-800 dark:text-red-200">Insufficient SOL Balance</h4>
                              <p className="text-sm text-red-700 dark:text-red-300">
                                You need {costEstimate.total_cost_sol.toFixed(3)} SOL but only have {solBalance.toFixed(4)} SOL. 
                                Please add {(costEstimate.total_cost_sol - solBalance).toFixed(3)} more SOL to your wallet.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Enhanced Error Messages */}
          {(errors.wallet || errors.balance) && (
            <div className="p-4 mobile-m:p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg md:rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 mobile-m:h-7 mobile-m:w-7 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-red-700 dark:text-red-400 text-base mobile-m:text-lg mb-3">
                    Configuration Issues
                  </h4>
                  <ul className="space-y-2 text-sm mobile-m:text-base text-red-600 dark:text-red-400 leading-relaxed">
                    {errors.wallet && (
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span>{errors.wallet}</span>
                      </li>
                    )}
                    {errors.balance && (
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span>{errors.balance}</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Submit Button Section */}
          <div className="pt-8">
            <div className="sticky bottom-4 sm:bottom-0 sm:relative bg-white dark:bg-gray-800 sm:bg-transparent sm:dark:bg-transparent p-4 sm:p-0 -mx-4 sm:mx-0 rounded-t-xl sm:rounded-none border-t sm:border-t-0 border-gray-200 dark:border-gray-700">
              {!isRunning ? (
                <button
                  type="submit"
                  disabled={isValidating || !connected}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 mobile-m:py-5 px-6 rounded-xl md:rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-3 text-base mobile-m:text-lg touch-manipulation transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none min-h-[56px] mobile-m:min-h-[64px]"
                >
                  {isValidating ? (
                    <>
                      <div className="w-5 h-5 mobile-m:w-6 mobile-m:h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="font-bold">Validating Configuration...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mobile-m:h-6 mobile-m:w-6" />
                      <span className="font-bold">Start Volume Bot</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStopBot}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 mobile-m:py-5 px-6 rounded-xl md:rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-base mobile-m:text-lg touch-manipulation transform hover:scale-[1.02] active:scale-[0.98] min-h-[56px] mobile-m:min-h-[64px]"
                >
                  <StopCircle className="h-5 w-5 mobile-m:h-6 mobile-m:w-6" />
                  <span className="font-bold">Stop Volume Bot</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}