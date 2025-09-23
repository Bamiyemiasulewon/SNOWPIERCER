'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { TrendingUp, DollarSign, Activity, Clock, AlertTriangle, CheckCircle, BarChart3, PieChart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, Tooltip } from 'recharts';
import dynamic from 'next/dynamic';

// UPDATED FOR MOBILE: Dynamic chart imports to prevent SSR issues
const DynamicLineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const DynamicPieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });

interface ProgressStats {
  tradesCompleted: number;
  totalTrades: number;
  volumeGenerated: number;
  successfulTrades: number;
  failedTrades: number;
  estimatedCompletion: number; // minutes remaining
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

interface ProgressDashboardProps {
  isRunning: boolean;
  stats: ProgressStats;
  tradeLogs: TradeLog[];
  onStop: () => void;
}

export default function ProgressDashboard({ 
  isRunning, 
  stats, 
  tradeLogs, 
  onStop 
}: ProgressDashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'overview' | 'charts' | 'logs'>('overview');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // UPDATED FOR MOBILE: Handle orientation changes and time updates
  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    handleOrientationChange();
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      clearInterval(timeInterval);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // UPDATED FOR MOBILE: Optimized chart data with reduced points for mobile
  const chartData = useMemo(() => {
    const maxPoints = orientation === 'portrait' ? 10 : 20; // Fewer points on mobile
    const recent = tradeLogs.slice(-maxPoints).map((log, index) => ({
      time: index + 1,
      volume: log.amount * 100, // Mock volume calculation
      success: log.status === 'success' ? 1 : 0,
    }));
    return recent;
  }, [tradeLogs, orientation]);

  // UPDATED FOR MOBILE: Success rate pie chart data
  const pieData = useMemo(() => [
    { name: 'Success', value: stats.successfulTrades, color: '#10b981' },
    { name: 'Failed', value: stats.failedTrades, color: '#ef4444' },
    { name: 'Pending', value: stats.totalTrades - stats.tradesCompleted, color: '#6b7280' },
  ], [stats]);

  const progressPercentage = (stats.tradesCompleted / stats.totalTrades) * 100;
  const successRate = stats.tradesCompleted > 0 
    ? (stats.successfulTrades / stats.tradesCompleted) * 100 
    : 0;

  const formatVolume = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(2)}K`;
    } else {
      return `$${amount.toFixed(2)}`;
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-green-600 bg-green-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="h-4 w-4" />;
      case 'paused':
        return <Clock className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-mobile-xs mobile-m:px-mobile-sm md:px-mobile-md space-y-mobile-md md:space-y-6">
      {/* UPDATED FOR MOBILE: Mobile-First Status Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg md:shadow-xl p-mobile-sm mobile-m:p-mobile-md md:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-mobile-sm md:gap-6 mb-mobile-md md:mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-mobile-sm md:gap-4">
            <h2 className="text-mobile-xl mobile-m:text-mobile-2xl md:text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white">
              Volume Bot Progress
            </h2>
            <div className={`self-start md:self-auto px-mobile-sm py-2 md:py-1 rounded-full text-mobile-sm md:text-xs font-bold flex items-center gap-2 md:gap-1 ${getStatusColor(stats.currentStatus)} shadow-sm`}>
              {getStatusIcon(stats.currentStatus)}
              <span className="uppercase tracking-wide">{stats.currentStatus}</span>
            </div>
          </div>
          {isRunning && (
            <button
              onClick={onStop}
              className="w-full md:w-auto min-h-touch bg-red-600 hover:bg-red-700 text-white px-6 py-3 md:px-4 md:py-2 rounded-lg font-medium transition-colors duration-200 shadow-lg hover:shadow-xl touch-manipulation text-mobile-base"
            >
              Stop Bot
            </button>
          )}
        </div>

        {/* UPDATED FOR MOBILE: Mobile view mode selector */}
        <div className="md:hidden mb-mobile-md">
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            {(['overview', 'charts', 'logs'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 px-mobile-sm py-2 text-mobile-sm font-medium capitalize transition-colors duration-200 ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                } touch-manipulation`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile-Optimized Progress Bar */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0 text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-2">
            <span className="font-semibold">
              Progress: <span className="text-blue-600 dark:text-blue-400">{stats.tradesCompleted}</span> / 
              <span className="text-gray-800 dark:text-gray-200">{stats.totalTrades}</span> trades
            </span>
            <span className="text-lg sm:text-base font-bold text-green-600 dark:text-green-400">
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 sm:h-3 shadow-inner">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 sm:h-3 rounded-full transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            {progressPercentage > 0 && (
              <div 
                className="absolute top-0 h-4 sm:h-3 w-1 bg-white dark:bg-gray-900 rounded-full shadow-md transition-all duration-700"
                style={{ left: `${Math.max(0, progressPercentage - 1)}%` }}
              />
            )}
          </div>
        </div>

        {/* Time Information */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {stats.estimatedCompletion > 0 ? (
            <p>Estimated completion: {formatTime(stats.estimatedCompletion)} remaining</p>
          ) : (
            <p>Bot completed at {currentTime.toLocaleTimeString()}</p>
          )}
        </div>
      </div>

      {/* Mobile-First Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Volume Generated */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900 rounded-lg flex-shrink-0">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-xs sm:text-sm lg:text-base text-gray-800 dark:text-white leading-tight">
              Volume Generated
            </h3>
          </div>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {formatVolume(stats.volumeGenerated)}
          </p>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Trading volume
          </p>
        </div>

        {/* Success Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-xs sm:text-sm lg:text-base text-gray-800 dark:text-white leading-tight">
              Success Rate
            </h3>
          </div>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {successRate.toFixed(1)}%
          </p>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {stats.successfulTrades} successful
          </p>
        </div>

        {/* Failed Trades */}
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-900 rounded-lg flex-shrink-0">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-semibold text-xs sm:text-sm lg:text-base text-gray-800 dark:text-white leading-tight">
              Failed Trades
            </h3>
          </div>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {stats.failedTrades}
          </p>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Error trades
          </p>
        </div>

        {/* Average Trade Time - Full Width on Mobile */}
        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900 rounded-lg flex-shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-xs sm:text-sm lg:text-base text-gray-800 dark:text-white leading-tight">
              Average Trade Time
            </h3>
          </div>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {stats.tradesCompleted > 0 ? (
              `${((stats.totalTrades - stats.estimatedCompletion) / stats.tradesCompleted).toFixed(1)}s`
            ) : (
              '0s'
            )}
          </p>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Per trade completion
          </p>
        </div>

        {/* Network Status Card - Mobile Only */}
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-3 sm:p-4 lg:p-6 border border-cyan-200 dark:border-cyan-800">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-1.5 sm:p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg flex-shrink-0">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="font-semibold text-xs sm:text-sm lg:text-base text-gray-800 dark:text-white leading-tight">
              Time Remaining
            </h3>
          </div>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-cyan-700 dark:text-cyan-300 mb-1">
            {stats.estimatedCompletion > 0 ? formatTime(stats.estimatedCompletion) : 'Complete!'}
          </p>
          <p className="text-xs sm:text-sm text-cyan-600 dark:text-cyan-400">
            {stats.estimatedCompletion > 0 ? 'Estimated completion' : 'Bot finished'}
          </p>
        </div>
      </div>

      {/* Trade Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Recent Trade Activity
          </h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Last {Math.min(tradeLogs.length, 10)} trades
          </span>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {tradeLogs.slice(-10).reverse().map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  log.status === 'success' ? 'bg-green-500' :
                  log.status === 'failed' ? 'bg-red-500' :
                  'bg-yellow-500'
                }`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-white">
                      {log.type.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {log.amount.toFixed(4)} SOL
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {log.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="text-right">
                {log.status === 'success' && log.txHash && (
                  <a
                    href={`https://solscan.io/tx/${log.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    View TX
                  </a>
                )}
                {log.status === 'failed' && (
                  <span className="text-xs text-red-600">
                    Failed
                  </span>
                )}
                {log.status === 'pending' && (
                  <span className="text-xs text-yellow-600">
                    Pending...
                  </span>
                )}
              </div>
            </div>
          ))}

          {tradeLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No trades executed yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}