'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast, ToastContainer } from 'react-toastify';
import dynamic from 'next/dynamic';

import Form from '@/components/Form';
import ProgressDashboard from '@/components/ProgressDashboard';
import NoSSR from '@/components/NoSSR';
import WalletSection from '@/components/WalletSection';
import { 
  testConnection, 
  runVolumeBot, 
  getBotProgress, 
  stopBotJob,
  type BotParams,
  type BotProgressResponse 
} from '@/lib/api';
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
  // UPDATED FOR SMITHII LOGIC: Additional bot stats
  currentJobId?: string;
  activeBotJob?: BotProgressResponse;
  completedMakers?: number;
  totalMakers?: number;
  currentBuyRatio?: number;
  activeWallets?: number;
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

export default function Home() {
  const { publicKey } = useWallet();
  
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
  
  // UPDATED FOR MOBILE: Mobile-specific state management
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [connectionQuality, setConnectionQuality] = useState<'2g' | '3g' | '4g' | 'wifi'>('wifi');
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // UPDATED FOR SMITHII LOGIC: Client-side trading functions removed - now handled by backend

  const startBot = async (config: FormData) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    try {
      // UPDATED FOR SMITHII LOGIC: Call backend API to start volume bot
      const botParams: BotParams = {
        user_wallet: publicKey.toString(),
        token_mint: config.tokenAddress,
        mode: config.mode,
        num_makers: config.numberOfTrades, // Using numberOfTrades as makers for now
        duration_hours: config.duration / 60, // Convert minutes to hours
        trade_size_sol: config.tradeSize,
        slippage_pct: config.slippageTolerance,
        target_price_usd: config.mode === 'bump' ? 0.1 : undefined, // Mock target price
        use_jito: config.mode === 'advanced',
        custom_delay_min: config.customDelayMin,
        custom_delay_max: config.customDelayMax,
        selected_platforms: config.selectedPlatforms,
        trending_intensity: config.trendingIntensity
      };
      
      const response = await runVolumeBot(botParams);
      
      if (response.success && response.data) {
        const jobData = response.data;
        
        setIsRunning(true);
        setStats({
          tradesCompleted: 0,
          totalTrades: config.numberOfTrades,
          volumeGenerated: 0,
          successfulTrades: 0,
          failedTrades: 0,
          estimatedCompletion: config.duration,
          currentStatus: 'running',
          currentJobId: jobData.job_id,
          totalMakers: botParams.num_makers,
          completedMakers: 0
        });
        setTradeLogs([]);
        
        toast.success(`Volume bot started! Job ID: ${jobData.job_id}`);
        
        // Start polling for bot progress
        startProgressPolling(jobData.job_id);
      } else {
        throw new Error(response.error || 'Failed to start bot');
      }
    } catch (error) {
      console.error('Failed to start bot:', error);
      toast.error(`Failed to start bot: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsRunning(false);
    }
  };

  const stopBot = async () => {
    try {
      if (stats.currentJobId) {
        // UPDATED FOR SMITHII LOGIC: Stop bot job via backend API
        const response = await stopBotJob(stats.currentJobId);
        
        if (response.success) {
          toast.success('Volume bot stopped successfully');
        } else {
          toast.warn('Bot stop request sent, but may have already completed');
        }
      }
    } catch (error) {
      console.error('Failed to stop bot:', error);
      toast.error('Failed to stop bot gracefully');
    } finally {
      // Clean up local state
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      setIsRunning(false);
      setStats(prev => ({ ...prev, currentStatus: 'completed' }));
    }
  };
  
  // UPDATED FOR SMITHII LOGIC: Progress polling function
  const startProgressPolling = (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await getBotProgress(jobId);
        
        if (response.success && response.data) {
          const progressData = response.data;
          
          // Update stats with real backend data
          setStats(prev => ({
            ...prev,
            activeBotJob: progressData,
            completedMakers: progressData.completed_makers,
            totalMakers: progressData.total_makers,
            currentBuyRatio: progressData.current_buy_ratio,
            volumeGenerated: progressData.generated_volume,
            activeWallets: progressData.active_wallets,
            successfulTrades: progressData.transactions.successful,
            failedTrades: progressData.transactions.failed,
            tradesCompleted: Math.floor(progressData.progress_percentage / 100 * prev.totalTrades)
          }));
          
          // Check if job is completed
          if (progressData.status === 'completed' || progressData.status === 'failed') {
            clearInterval(pollInterval);
            setIsRunning(false);
            setStats(prev => ({ ...prev, currentStatus: progressData.status === 'completed' ? 'completed' : 'error' }));
            
            if (progressData.status === 'completed') {
              toast.success('Volume bot completed successfully!');
            } else {
              toast.error(`Bot failed: ${progressData.error_message || 'Unknown error'}`);
            }
          }
        }
      } catch (error) {
        console.error('Failed to get bot progress:', error);
        // Don't stop polling on single error, backend might be temporarily unavailable
      }
    }, 5000); // Poll every 5 seconds
    
    intervalRef.current = pollInterval;
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
      {/* MOBILE-OPTIMIZED: Expanded header for large SNOWPIERCER text */}
      <NoSSR fallback={
        <div className="h-12 mobile-m:h-16 sm:h-20 md:h-24 lg:h-28 xl:h-32 bg-slate-900 animate-pulse" />
      }>
        <MobileHeader />
      </NoSSR>
      
      {/* Wallet section under header */}
      <NoSSR fallback={
        <div className="h-14 bg-slate-800/30 animate-pulse border-b border-gray-700/20" />
      }>
        <WalletSection />
      </NoSSR>

      {/* MOBILE-OPTIMIZED: Maximum content space with ultra-compact header */}
      <main className="container mx-auto py-2 sm:py-3 md:py-4 lg:py-6 px-3 md:px-4 lg:px-6 max-w-7xl min-h-[calc(100vh-4rem)] pb-16 md:pb-8">
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
