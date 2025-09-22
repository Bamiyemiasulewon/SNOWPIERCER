'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';

import WalletButton from '@/components/WalletButton';
import Form from '@/components/Form';
import ProgressDashboard from '@/components/ProgressDashboard';

import 'react-toastify/dist/ReactToastify.css';

interface FormData {
  tokenAddress: string;
  numberOfTrades: number;
  duration: number;
  tradeSize: number;
  slippageTolerance: number;
  mode: 'boost' | 'bump' | 'advanced';
  customDelayMin?: number;
  customDelayMax?: number;
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
const BACKEND_URL = 'http://localhost:8000';

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
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tradeCountRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  // Check Solana network congestion
  useEffect(() => {
    const checkNetworkStatus = async () => {
      try {
        const start = Date.now();
        await connection.getRecentBlockhash();
        const latency = Date.now() - start;
        
        if (latency < 500) {
          setNetworkStatus('good');
        } else if (latency < 2000) {
          setNetworkStatus('congested');
        } else {
          setNetworkStatus('error');
        }
      } catch {
        setNetworkStatus('error');
      }
    };

    checkNetworkStatus();
    const interval = setInterval(checkNetworkStatus, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [connection]);

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

      // Call backend to get swap transaction
      const response = await axios.post(`${BACKEND_URL}/get-swap-quote`, {
        inputMint,
        outputMint,
        amount: Math.floor(amount * LAMPORTS_PER_SOL),
        slippageBps
      });

      if (!response.data.swapTransaction) {
        throw new Error('Failed to get swap transaction');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 shadow-2xl border-b border-gray-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-6">
              {/* SNOWPIERCER Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-300 rounded-lg flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent tracking-widest font-orbitron">
                  SNOWPIERCER
                </h1>
              </div>
              
              {/* Network Status Badge */}
              <div className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase backdrop-blur-sm border ${
                networkStatus === 'good' 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-emerald-500/20' :
                networkStatus === 'congested' 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-amber-500/20' :
                  'bg-red-500/20 text-red-300 border-red-500/30 shadow-red-500/20'
              } shadow-lg`}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${
                    networkStatus === 'good' ? 'bg-emerald-400 animate-pulse' :
                    networkStatus === 'congested' ? 'bg-amber-400 animate-pulse' :
                    'bg-red-400 animate-pulse'
                  }`} />
                  Network: {networkStatus}
                </div>
              </div>
            </div>
            
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {!isRunning ? (
          <Form
            onStartBot={startBot}
            onStopBot={stopBot}
            isRunning={isRunning}
          />
        ) : (
          <ProgressDashboard
            isRunning={isRunning}
            stats={stats}
            tradeLogs={tradeLogs}
            onStop={stopBot}
          />
        )}
      </main>

      {/* Toast Notifications */}
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}
