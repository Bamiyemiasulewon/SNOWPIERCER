'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { toast } from 'react-toastify';
import { Play, StopCircle, AlertCircle } from 'lucide-react';

interface FormData {
  tokenAddress: string;
  numberOfTrades: number;
  duration: number; // in minutes
  tradeSize: number; // in SOL
  slippageTolerance: number;
  mode: 'boost' | 'bump' | 'advanced';
  customDelayMin?: number;
  customDelayMax?: number;
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
  });

  // const [tokens, setTokens] = useState<Token[]>([]);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [isValidating, setIsValidating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // // Fetch popular tokens from backend
  // useEffect(() => {
  //   const fetchTokens = async () => {
  //     try {
  //       // Mock data for now - replace with actual API call
  //       const mockTokens: Token[] = [
  //         { address: 'So11111111111111111111111111111111111111112', name: 'Wrapped SOL', symbol: 'WSOL' },
  //         { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USD Coin', symbol: 'USDC' },
  //         { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', name: 'Tether', symbol: 'USDT' },
  //       ];
  //       setTokens(mockTokens);
  //     } catch (error) {
  //       console.error('Failed to fetch tokens:', error);
  //     }
  //   };

  //   fetchTokens();
  // }, []);

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
      default:
        return '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Volume Bot Configuration
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your Solana token volume boosting parameters
        </p>
      </div>

      {/* Wallet Status */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {connected ? 'Wallet Connected' : 'Wallet Not Connected'}
            </span>
          </div>
          {connected && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Balance: {solBalance.toFixed(4)} SOL
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Token Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Token Address (SPL Token Mint)
          </label>
          <input
            type="text"
            value={formData.tokenAddress}
            onChange={(e) => handleInputChange('tokenAddress', e.target.value)}
            placeholder="Enter Solana token address"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            disabled={isRunning}
          />
          {errors.tokenAddress && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.tokenAddress}
            </p>
          )}
        </div>

        {/* Number of Trades */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number of Trades
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              value={formData.numberOfTrades}
              onChange={(e) => handleInputChange('numberOfTrades', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={isRunning}
            />
            {errors.numberOfTrades && (
              <p className="mt-1 text-sm text-red-600">{errors.numberOfTrades}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="1440"
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={isRunning}
            />
            {errors.duration && (
              <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
            )}
          </div>
        </div>

        {/* Trade Size and Slippage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trade Size (SOL)
            </label>
            <input
              type="number"
              min="0.01"
              max="0.1"
              step="0.001"
              value={formData.tradeSize}
              onChange={(e) => handleInputChange('tradeSize', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={isRunning}
            />
            {errors.tradeSize && (
              <p className="mt-1 text-sm text-red-600">{errors.tradeSize}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Slippage Tolerance (%)
            </label>
            <input
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={formData.slippageTolerance}
              onChange={(e) => handleInputChange('slippageTolerance', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={isRunning}
            />
            {errors.slippageTolerance && (
              <p className="mt-1 text-sm text-red-600">{errors.slippageTolerance}</p>
            )}
          </div>
        </div>

        {/* Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['boost', 'bump', 'advanced'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleInputChange('mode', mode)}
                className={`p-3 rounded-lg border transition-colors ${
                  formData.mode === mode
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                disabled={isRunning}
              >
                <div className="text-sm font-medium capitalize">{mode}</div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {getModeDescription()}
          </p>
        </div>

        {/* Advanced Mode Settings */}
        {formData.mode === 'advanced' && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Custom Delay Settings
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Min Delay (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.customDelayMin || ''}
                  onChange={(e) => handleInputChange('customDelayMin', parseInt(e.target.value))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  disabled={isRunning}
                />
                {errors.customDelayMin && (
                  <p className="mt-1 text-xs text-red-600">{errors.customDelayMin}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Max Delay (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.customDelayMax || ''}
                  onChange={(e) => handleInputChange('customDelayMax', parseInt(e.target.value))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  disabled={isRunning}
                />
                {errors.customDelayMax && (
                  <p className="mt-1 text-xs text-red-600">{errors.customDelayMax}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {(errors.wallet || errors.balance) && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Configuration Issues</span>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-red-600 dark:text-red-400">
              {errors.wallet && <li>• {errors.wallet}</li>}
              {errors.balance && <li>• {errors.balance}</li>}
            </ul>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          {!isRunning ? (
            <button
              type="submit"
              disabled={isValidating || !connected}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Bot
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopBot}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <StopCircle className="h-4 w-4" />
              Stop Bot
            </button>
          )}
        </div>
      </form>
    </div>
  );
}