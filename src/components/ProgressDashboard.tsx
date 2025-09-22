'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Activity, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Status Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Volume Bot Progress
            </h2>
            <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(stats.currentStatus)}`}>
              {getStatusIcon(stats.currentStatus)}
              {stats.currentStatus.toUpperCase()}
            </div>
          </div>
          {isRunning && (
            <button
              onClick={onStop}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Stop Bot
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Progress: {stats.tradesCompleted} / {stats.totalTrades} trades</span>
            <span>{progressPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
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

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Volume Generated */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Volume Generated</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatVolume(stats.volumeGenerated)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Estimated trading volume
          </p>
        </div>

        {/* Success Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Success Rate</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {successRate.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {stats.successfulTrades} successful trades
          </p>
        </div>

        {/* Failed Trades */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Failed Trades</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.failedTrades}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Retry or error trades
          </p>
        </div>

        {/* Average Trade Time */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Avg Trade Time</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.tradesCompleted > 0 ? (
              `${((stats.totalTrades - stats.estimatedCompletion) / stats.tradesCompleted).toFixed(1)}s`
            ) : (
              '0s'
            )}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Per trade completion
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