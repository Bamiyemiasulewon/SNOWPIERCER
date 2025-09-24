'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast, ToastContainer } from 'react-toastify';
import dynamic from 'next/dynamic';

import Form from '@/components/Form';
import ProgressDashboard from '@/components/ProgressDashboard';
import NoSSR from '@/components/NoSSR';
import { getSwapQuote, testConnection, type SwapQuoteRequest } from '@/lib/api';
// UPDATED FOR MOBILE: Dynamic imports for better performance
const MobileHeader = dynamic(() => import('@/components/MobileHeader'), { ssr: false });

import 'react-toastify/dist/ReactToastify.css';

interface FormData {
  tokenAddress: string;
  numberOfTrades: number;
  duration: number;
  tradeSize: number;
  slippageTolerance: number;
  mode: 'boost' | 'bump' | 'advanced' | 'trending';
  customDelayMin?: number;
  customDelayMax?: number;
  // Trending-specific fields
  selectedPlatforms?: string[];
  trendingIntensity?: string;
}

interface ProgressStats {
  tradesCompleted: number;
  totalTrades: number;
  volumeGenerated: number;
  successfulTrades: number;
  failedTrades: number;
  estimatedCompletion: number;
  currentStatus: 'running' | 'paused' | 'error' | 'completed';
}

interface TradeLog {
  id: string;
  timestamp: Date;
  type: 'buy' | 'sell';
  amount: number;
  status: 'success' | 'failed' | 'pending';
  txHash?: string;
  error?: string;
}

const SOL_MINT = 'So11111111111111111111111111111111111111112';

export default function Home() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<ProgressStats>({
    tradesCompleted: 0,
    totalTrades: 0,
    volumeGenerated: 0,
    successfulTrades: 0,
    failedTrades: 0,
    estimatedCompletion: 0,
    currentStatus: 'running'
  });
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [networkStatus, setNetworkStatus] = useState<'good' | 'congested' | 'error'>('good');
  
  // UPDATED FOR MOBILE: Mobile-specific state management
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [connectionQuality, setConnectionQuality] = useState<'2g' | '3g' | '4g' | 'wifi'>('wifi');
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tradeCountRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  // UPDATED FOR MOBILE: Detect mobile device and orientation
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(width < 769); // Mobile/tablet breakpoint
      setOrientation(height > width ? 'portrait' : 'landscape');
      
      // Detect connection quality (rough estimation)
      if ('connection' in navigator) {
        const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
        if (conn?.effectiveType) {
          const effectiveType = conn.effectiveType as '2g' | '3g' | '4g' | 'wifi';
          setConnectionQuality(effectiveType);
        }
      }
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);
    
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  // UPDATED FOR MOBILE: Optimized network status check with mobile considerations
  const checkNetworkStatus = useCallback(async (controller?: AbortController) => {
    if (!connection) {
      setNetworkStatus('error');
      return;
    }

    try {
      const start = Date.now();
      // Reduced timeout for mobile devices to preserve battery
      const timeout = isMobile ? 5000 : 10000;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      );
      
      const promises: Promise<unknown>[] = [connection.getLatestBlockhash('confirmed')];
      if (controller?.signal) {
        promises.push(new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new Error('Aborted')));
        }));
      }
      promises.push(timeoutPromise);
      
      await Promise.race(promises);
      
      const latency = Date.now() - start;
      
      // Adjusted thresholds for mobile devices
      const goodThreshold = isMobile ? 1500 : 1000;
      const congestedThreshold = isMobile ? 4000 : 3000;
      
      if (latency < goodThreshold) {
        setNetworkStatus('good');
      } else if (latency < congestedThreshold) {
        setNetworkStatus('congested');
      } else {
        setNetworkStatus('error');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Aborted') return;
      console.warn('Network status check failed:', error instanceof Error ? error.message : 'Unknown error');
      setNetworkStatus('congested');
    }
  }, [connection, isMobile]);

  useEffect(() => {
    const controller = new AbortController();
    
    // Initial check with delay
    const initialTimeout = setTimeout(() => checkNetworkStatus(controller), 2000);
    
    // UPDATED FOR MOBILE: Adaptive polling based on device and connection
    const getPollingInterval = () => {
      if (isMobile) {
        // Slower polling on mobile to preserve battery
        switch (connectionQuality) {
          case '2g': return 120000; // 2 minutes
          case '3g': return 90000;  // 1.5 minutes  
          case '4g': return 60000;  // 1 minute
          default: return 45000;   // 45 seconds for wifi
        }
      }
      return 30000; // 30 seconds for desktop
    };
    
    const interval = setInterval(() => checkNetworkStatus(controller), getPollingInterval());

    return () => {
      controller.abort();
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkNetworkStatus, isMobile, connectionQuality]);

  // Test backend connection on mount
  useEffect(() => {
    const testBackendConnection = async () => {
      console.log('🔄 Testing backend connection...');
      try {
        const isConnected = await testConnection();
        if (isConnected) {
          toast.success('✅ Backend connected successfully!');
        } else {
          toast.warn('⚠️ Backend connection issues detected. Features may be limited.');
        }
      } catch (error) {
        console.error('Backend connection test failed:', error);
        toast.error('❌ Unable to connect to backend. Please try refreshing.');
      }
    };

    // Test connection after a short delay to avoid overwhelming on load
    const timeout = setTimeout(testBackendConnection, 3000);
    return () => clearTimeout(timeout);
  }, []);

  const calculateDelay = (config: FormData): number => {
    let baseDelay: number;
    
    switch (config.mode) {
      case 'boost':
        // Quick spikes: shorter delays
        baseDelay = (config.duration * 60 * 1000) / (config.numberOfTrades * 2);
        break;
      case 'bump':
        // Sustained: even distribution
        baseDelay = (config.duration * 60 * 1000) / config.numberOfTrades;
        break;
      case 'advanced':
        // Custom delays
        const minMs = (config.customDelayMin || 5) * 1000;
        const maxMs = (config.customDelayMax || 30) * 1000;
        return Math.random() * (maxMs - minMs) + minMs;
      default:
        baseDelay = (config.duration * 60 * 1000) / config.numberOfTrades;
    }
    
    // Add ±20% randomization for organic feel
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    return baseDelay * randomFactor;
  };

  const executeSwap = async (
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    try {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      // Call backend to get swap transaction using API utility
      const quoteRequest: SwapQuoteRequest = {
        inputMint,
        outputMint,
        amount: Math.floor(amount * LAMPORTS_PER_SOL),
        slippageBps
      };
      
      const response = await getSwapQuote(quoteRequest);

      if (!response.success || !response.data?.swapTransaction) {
        throw new Error(response.error || 'Failed to get swap transaction');
      }

      // Deserialize and sign transaction
      const txBuffer = Buffer.from(response.data.swapTransaction, 'base64');
      const transaction = Transaction.from(txBuffer);
      
      const signedTx = await signTransaction(transaction);
      
      // Broadcast transaction
      const txHash = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      // Wait for confirmation with timeout
      await Promise.race([
        connection.confirmTransaction(txHash, 'confirmed'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000)
        )
      ]);
      
      return { success: true, txHash };
    } catch (error: unknown) {
      console.error('Swap execution error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const executeTradePair = async (config: FormData): Promise<void> => {
    const tradeId = Date.now().toString();
    
    // Add pending buy log
    const buyLog: TradeLog = {
      id: `${tradeId}_buy`,
      timestamp: new Date(),
      type: 'buy',
      amount: config.tradeSize,
      status: 'pending'
    };
    
    setTradeLogs(prev => [...prev, buyLog]);
    
    // Execute buy (SOL -> Token)
    const buyResult = await executeSwap(
      SOL_MINT,
      config.tokenAddress,
      config.tradeSize,
      config.slippageTolerance * 100
    );
    
    // Update buy log
    setTradeLogs(prev => prev.map(log => 
      log.id === buyLog.id 
        ? { 
            ...log, 
            status: buyResult.success ? 'success' : 'failed',
            txHash: buyResult.txHash,
            error: buyResult.error
          }
        : log
    ));
    
    if (!buyResult.success) {
      setStats(prev => ({
        ...prev,
        failedTrades: prev.failedTrades + 1
      }));
      
      toast.error(`Buy failed: ${buyResult.error}`);
      return;
    }
    
    // Wait a short moment before selling
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add pending sell log
    const sellLog: TradeLog = {
      id: `${tradeId}_sell`,
      timestamp: new Date(),
      type: 'sell',
      amount: config.tradeSize,
      status: 'pending'
    };
    
    setTradeLogs(prev => [...prev, sellLog]);
    
    // Execute sell (Token -> SOL)
    const sellResult = await executeSwap(
      config.tokenAddress,
      SOL_MINT,
      config.tradeSize,
      config.slippageTolerance * 100
    );
    
    // Update sell log
    setTradeLogs(prev => prev.map(log => 
      log.id === sellLog.id 
        ? { 
            ...log, 
            status: sellResult.success ? 'success' : 'failed',
            txHash: sellResult.txHash,
            error: sellResult.error
          }
        : log
    ));
    
    // Update stats
    const bothSuccessful = buyResult.success && sellResult.success;
    
    setStats(prev => ({
      ...prev,
      tradesCompleted: prev.tradesCompleted + 1,
      successfulTrades: bothSuccessful ? prev.successfulTrades + 1 : prev.successfulTrades,
      failedTrades: bothSuccessful ? prev.failedTrades : prev.failedTrades + 1,
      volumeGenerated: prev.volumeGenerated + (config.tradeSize * 2 * 100), // Rough USD estimate
      estimatedCompletion: Math.max(0, prev.estimatedCompletion - (config.duration / config.numberOfTrades))
    }));
    
    if (bothSuccessful) {
      toast.success('Trade pair completed successfully!');
    } else {
      toast.error(`Trade pair failed: ${sellResult.error || 'Sell failed'}`);
    }
  };

  const startBot = async (config: FormData) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    setIsRunning(true);
    setStats({
      tradesCompleted: 0,
      totalTrades: config.numberOfTrades,
      volumeGenerated: 0,
      successfulTrades: 0,
      failedTrades: 0,
      estimatedCompletion: config.duration,
      currentStatus: 'running'
    });
    setTradeLogs([]);
    
    tradeCountRef.current = 0;
    startTimeRef.current = Date.now();
    
    toast.success('Volume bot started!');
    
    const executeTrade = async () => {
      if (tradeCountRef.current >= config.numberOfTrades) {
        stopBot();
        return;
      }
      
      try {
        await executeTradePair(config);
        tradeCountRef.current++;
        
        if (tradeCountRef.current >= config.numberOfTrades) {
          stopBot();
        } else {
          // Schedule next trade
          const delay = calculateDelay(config);
          intervalRef.current = setTimeout(executeTrade, delay);
        }
      } catch (error) {
        console.error('Trade execution error:', error);
        toast.error('Trade execution failed. Retrying...');
        
        // Retry after a longer delay
        intervalRef.current = setTimeout(executeTrade, 10000);
      }
    };
    
    // Start the first trade
    const initialDelay = calculateDelay(config);
    intervalRef.current = setTimeout(executeTrade, initialDelay);
  };

  const stopBot = () => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsRunning(false);
    setStats(prev => ({ ...prev, currentStatus: 'completed' }));
    toast.info('Volume bot stopped');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* MOBILE-OPTIMIZED: Ultra-compact header - max 60px */}
      <NoSSR fallback={
        <div className="h-12 sm:h-14 md:h-20 bg-slate-900 animate-pulse" />
      }>
        <MobileHeader networkStatus={networkStatus} />
      </NoSSR>

      {/* MOBILE-OPTIMIZED: Maximum content space with compact header */}
      <main className="container mx-auto py-2 sm:py-3 md:py-4 lg:py-6 px-3 md:px-4 lg:px-6 max-w-7xl min-h-[calc(100vh-3rem)] sm:min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-5rem)] pb-16 md:pb-8">
        <NoSSR fallback={
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-mobile-md">
            <div className="animate-spin rounded-full h-8 w-8 mobile-m:h-10 mobile-m:w-10 md:h-12 md:w-12 border-2 md:border-4 border-blue-500 border-t-transparent" />
            <span className="text-mobile-sm mobile-m:text-mobile-base text-gray-600 dark:text-gray-400 font-medium">
              Loading VolumeBot...
            </span>
            {isMobile && (
              <p className="text-mobile-xs text-gray-500 dark:text-gray-500 text-center max-w-xs">
                Optimized for {orientation} mode
              </p>
            )}
          </div>
        }>
          {!isRunning ? (
            <div className="w-full">
              <Form
                onStartBot={startBot}
                onStopBot={stopBot}
                isRunning={isRunning}
              />
            </div>
          ) : (
            <div className="w-full">
              <ProgressDashboard
                isRunning={isRunning}
                stats={stats}
                tradeLogs={tradeLogs}
                onStop={stopBot}
              />
            </div>
          )}
        </NoSSR>
        
        {/* UPDATED FOR MOBILE: Connection quality indicator for mobile */}
        {isMobile && connectionQuality && connectionQuality !== 'wifi' && (
          <div className="fixed bottom-20 right-4 bg-yellow-500/90 text-white px-mobile-sm py-1 rounded-lg text-mobile-xs font-medium backdrop-blur-sm z-40">
            {connectionQuality.toUpperCase()} Connection
          </div>
        )}
      </main>

      {/* UPDATED FOR MOBILE: Optimized Toast Notifications */}
      <ToastContainer
        position={isMobile ? "bottom-center" : "bottom-right"}
        autoClose={isMobile ? 3000 : 4000}
        hideProgressBar={isMobile}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={!isMobile}
        draggable={!isMobile}
        pauseOnHover={!isMobile}
        theme="colored"
        toastClassName={`!text-mobile-sm mobile-m:!text-sm !rounded-xl !shadow-xl !p-mobile-sm mobile-m:!p-3`}
        className={isMobile 
          ? "!bottom-4 !left-4 !right-4 !top-auto !w-auto" 
          : "!bottom-8 !right-8 !left-auto !top-auto !w-96"
        }
      />
    </div>
  );
}
