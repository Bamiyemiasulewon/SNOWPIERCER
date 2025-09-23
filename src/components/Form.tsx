'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { toast } from 'react-toastify';
import { Play, StopCircle, AlertCircle } from 'lucide-react';

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

interface Token {
  address: string;
  name: string;
  symbol: string;
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
  
  // Trending-specific state
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [intensities, setIntensities] = useState<Intensity[]>([]);
  const [costEstimate, setCostEstimate] = useState<MultiPlatformCostResponse | null>(null);
  const [isCalculatingCosts, setIsCalculatingCosts] = useState(false);

  // Fetch trending platforms and intensities
  useEffect(() => {
    const fetchTrendingData = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/trending/platforms');
        if (response.ok) {
          const data = await response.json();
          
          const platformData: Platform[] = data.platforms.map((p: any) => ({
            id: p.id,
            name: p.name,
            minVolume: p.min_volume_24h,
            difficulty: p.difficulty,
            selected: false
          }));
          
          const intensityData: Intensity[] = data.intensities.map((i: any) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            multiplier: i.id === 'organic' ? 1.0 : i.id === 'aggressive' ? 1.2 : i.id === 'stealth' ? 0.8 : 1.5
          }));
          
          setPlatforms(platformData);
          setIntensities(intensityData);
        }
      } catch (error) {
        console.error('Failed to fetch trending data:', error);
      }
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
        } catch (error: any) {
          console.warn('Failed to fetch balance:', error?.message || 'Unknown error');
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
      } catch {
        newErrors.tokenAddress = 'Invalid Solana address';
      }
    }

    if (formData.numberOfTrades < 100 || formData.numberOfTrades > 10000) {
      newErrors.numberOfTrades = 'Number of trades must be between 100 and 10,000';
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

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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

  const calculateMultiPlatformCosts = async () => {
    if (formData.selectedPlatforms.length === 0 || !formData.trendingIntensity) {
      setCostEstimate(null);
      return;
    }
    
    setIsCalculatingCosts(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/trending/multi-platform-costs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platforms: formData.selectedPlatforms,
          intensity: formData.trendingIntensity,
        }),
      });
      
      if (response.ok) {
        const data: MultiPlatformCostResponse = await response.json();
        setCostEstimate(data);
      } else {
        console.error('Failed to calculate costs');
        setCostEstimate(null);
      }
    } catch (error) {
      console.error('Error calculating costs:', error);
      setCostEstimate(null);
    } finally {
      setIsCalculatingCosts(false);
    }
  };
  
  // Trigger cost calculation when platforms or intensity changes
  useEffect(() => {
    if (formData.mode === 'trending') {
      const timeout = setTimeout(calculateMultiPlatformCosts, 500);
      return () => clearTimeout(timeout);
    }
  }, [formData.selectedPlatforms, formData.trendingIntensity, formData.mode]);
  
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
    <div className="w-full max-w-4xl mx-auto">
      {/* Mobile-First Form Container */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Volume Bot Configuration
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Configure your Solana token volume boosting parameters
          </p>
        </div>

        {/* Mobile-Optimized Wallet Status */}
        <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-200">
                {connected ? 'Wallet Connected' : 'Wallet Not Connected'}
              </span>
            </div>
            {connected && (
              <div className="bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
                <span className="text-xs sm:text-sm font-mono text-gray-600 dark:text-gray-400">
                  Balance: <span className="font-bold text-blue-600 dark:text-blue-400">{solBalance.toFixed(4)} SOL</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Mobile-Optimized Token Address */}
          <div className="space-y-2">
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
              Token Address (SPL Token Mint)
            </label>
            <input
              type="text"
              value={formData.tokenAddress}
              onChange={(e) => handleInputChange('tokenAddress', e.target.value)}
              placeholder="Enter Solana token address..."
              className="w-full px-4 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              disabled={isRunning}
            />
            {errors.tokenAddress && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{errors.tokenAddress}</p>
              </div>
            )}
          </div>

          {/* Mobile-First Trading Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
                Number of Trades
              </label>
              <input
                type="number"
                min="100"
                max="10000"
                value={formData.numberOfTrades}
                onChange={(e) => handleInputChange('numberOfTrades', parseInt(e.target.value))}
                className="w-full px-4 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:text-white"
                disabled={isRunning}
              />
              {errors.numberOfTrades && (
                <div className="flex items-center gap-2 mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.numberOfTrades}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                className="w-full px-4 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:text-white"
                disabled={isRunning}
              />
              {errors.duration && (
                <div className="flex items-center gap-2 mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.duration}</p>
                </div>
              )}
            </div>
          </div>

          {/* Trade Size and Slippage Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
                Trade Size (SOL)
              </label>
              <input
                type="number"
                min="0.01"
                max="0.1"
                step="0.001"
                value={formData.tradeSize}
                onChange={(e) => handleInputChange('tradeSize', parseFloat(e.target.value))}
                className="w-full px-4 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:text-white"
                disabled={isRunning}
              />
              {errors.tradeSize && (
                <div className="flex items-center gap-2 mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.tradeSize}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
                Slippage Tolerance (%)
              </label>
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={formData.slippageTolerance}
                onChange={(e) => handleInputChange('slippageTolerance', parseFloat(e.target.value))}
                className="w-full px-4 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-700 dark:text-white"
                disabled={isRunning}
              />
              {errors.slippageTolerance && (
                <div className="flex items-center gap-2 mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-400">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.slippageTolerance}</p>
                </div>
              )}
            </div>
          </div>

          {/* Mobile-Optimized Mode Selection */}
          <div className="space-y-4">
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
              Trading Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {(['boost', 'bump', 'advanced', 'trending'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleInputChange('mode', mode)}
                  className={`relative p-4 sm:p-3 rounded-lg border-2 transition-all duration-200 ${
                    formData.mode === mode
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-blue-300 dark:hover:border-blue-400'
                  } touch-manipulation`}
                  disabled={isRunning}
                >
                  <div className="flex items-center justify-between sm:flex-col sm:text-center">
                    <div className="text-base sm:text-sm font-medium capitalize">{mode}</div>
                    {formData.mode === mode && (
                      <div className="w-6 h-6 sm:w-4 sm:h-4 bg-white rounded-full flex items-center justify-center ml-2 sm:ml-0 sm:mt-1">
                        <div className="w-3 h-3 sm:w-2 sm:h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg sm:rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-sm sm:text-base text-blue-700 dark:text-blue-300 font-medium">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => togglePlatform(platform.id)}
                      className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        formData.selectedPlatforms.includes(platform.id)
                          ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      } touch-manipulation`}
                      disabled={isRunning}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm sm:text-base">{platform.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          formData.selectedPlatforms.includes(platform.id) 
                            ? 'bg-white/20 text-white' 
                            : `bg-gray-100 dark:bg-gray-600 ${getDifficultyColor(platform.difficulty)}`
                        }`}>
                          {platform.difficulty}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm opacity-90">
                        Min: ${platform.minVolume.toLocaleString()} volume
                      </div>
                      {formData.selectedPlatforms.includes(platform.id) && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                          <span className="text-xs font-medium">Selected</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {intensities.map((intensity) => (
                    <button
                      key={intensity.id}
                      type="button"
                      onClick={() => handleInputChange('trendingIntensity', intensity.id)}
                      className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        formData.trendingIntensity === intensity.id
                          ? 'bg-green-600 text-white border-green-500 shadow-lg'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      } touch-manipulation`}
                      disabled={isRunning}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm sm:text-base capitalize">{intensity.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          formData.trendingIntensity === intensity.id 
                            ? 'bg-white/20 text-white' 
                            : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                        }`}>
                          {intensity.multiplier}x
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm opacity-90">
                        {intensity.description}
                      </div>
                      {formData.trendingIntensity === intensity.id && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          </div>
                          <span className="text-xs font-medium">Selected</span>
                        </div>
                      )}
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
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                              {costEstimate.total_cost_sol.toFixed(3)} SOL
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Cost</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {(costEstimate.overall_success_probability * 100).toFixed(0)}%
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {costEstimate.estimated_duration}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Per-Platform Breakdown */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-800 dark:text-gray-200">Platform Breakdown:</h4>
                        {costEstimate.platform_estimates.map((estimate, index) => (
                          <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                                {estimate.platform}
                              </div>
                              <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                {estimate.estimatedCostSOL.toFixed(3)} SOL
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <div>Volume: ${estimate.volumeRequired.toLocaleString()}</div>
                              <div>Success: {(estimate.successProbability * 100).toFixed(0)}%</div>
                              <div>Time: {estimate.timeToTrend}</div>
                              <div className={getDifficultyColor(estimate.difficulty)}>
                                {estimate.difficulty} difficulty
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

          {/* Mobile-Optimized Error Messages */}
          {(errors.wallet || errors.balance) && (
            <div className="p-4 sm:p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg sm:rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-700 dark:text-red-400 text-base sm:text-lg mb-2">
                    Configuration Issues
                  </h4>
                  <ul className="space-y-2 text-sm sm:text-base text-red-600 dark:text-red-400">
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

          {/* Mobile-Optimized Submit Button */}
          <div className="pt-4 sm:pt-6">
            {!isRunning ? (
              <button
                type="submit"
                disabled={isValidating || !connected}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-4 sm:py-5 px-6 rounded-lg sm:rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-3 text-base sm:text-lg touch-manipulation"
              >
                {isValidating ? (
                  <>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Validating Configuration...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span>Start Volume Bot</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onStopBot}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-4 sm:py-5 px-6 rounded-lg sm:rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-base sm:text-lg touch-manipulation"
              >
                <StopCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>Stop Volume Bot</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}