// API Configuration and Utilities for Snowpiercer VolumeBot
// Backend: https://snowpiercer-backend-1.onrender.com

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Health & Status
  health: `${BACKEND_URL}/health`,
  status: `${API_BASE_URL}/status`,
  
  // Trading & Volume
  quote: `${API_BASE_URL}/quote`,
  swap: `${API_BASE_URL}/swap`,
  volume: `${API_BASE_URL}/volume`,
  simulate: `${API_BASE_URL}/simulate`,
  
  // Token Data
  tokens: `${API_BASE_URL}/tokens`,
  tokenInfo: (mint: string) => `${API_BASE_URL}/tokens/${mint}`,
  
  // Bot Operations
  startBot: `${API_BASE_URL}/bot/start`,
  stopBot: `${API_BASE_URL}/bot/stop`,
  botStatus: `${API_BASE_URL}/bot/status`,
  quickStatus: `${API_BASE_URL}/quick-status`,
  
  // UPDATED FOR SMITHII LOGIC: Advanced Volume Bot Operations
  runVolumeBot: `${API_BASE_URL}/run-volume-bot`,
  botProgress: (jobId: string) => `${API_BASE_URL}/bot-progress/${jobId}`,
  stopBotJob: (jobId: string) => `${API_BASE_URL}/stop-bot/${jobId}`,
  getTrendingMetrics: (tokenMint: string) => `${API_BASE_URL}/get-trending-metrics/${tokenMint}`,
  checkPool: (tokenMint: string) => `${API_BASE_URL}/check-pool/${tokenMint}`,
  listJobs: (userWallet: string) => `${API_BASE_URL}/list-jobs/${userWallet}`,
  
  // Trending Operations
  trendingPlatforms: `${API_BASE_URL}/trending/platforms`,
  trendingMultiPlatformCosts: `${API_BASE_URL}/trending/multi-platform-costs`,
} as const;

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SwapQuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps: number;
}

export interface SwapQuoteResponse {
  swapTransaction: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  fees: number;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// UPDATED FOR SMITHII LOGIC: Advanced bot types
export type BotMode = 'boost' | 'bump' | 'advanced' | 'trending';

export interface BotParams {
  user_wallet: string;
  token_mint: string;
  mode: BotMode;
  num_makers: number;
  duration_hours: number;
  trade_size_sol: number;
  slippage_pct: number;
  target_price_usd?: number;
  use_jito?: boolean;
  custom_delay_min?: number;
  custom_delay_max?: number;
  selected_platforms?: string[];
  trending_intensity?: string;
}

export interface BotJobResponse {
  status: string;
  job_id: string;
  message: string;
  estimated_duration_hours: number;
  estimated_volume_usd: number;
}

export interface BotProgressResponse {
  job_id: string;
  status: string;
  completed_makers: number;
  total_makers: number;
  generated_volume: number;
  current_buy_ratio: number;
  progress_percentage: number;
  estimated_completion?: number;
  transactions: {
    total: number;
    successful: number;
    failed: number;
  };
  active_wallets: number;
  error_message?: string;
}

export interface TrendingMetrics {
  token_mint: string;
  volume_24h: number;
  makers_24h: number;
  price_change_24h: number;
  boost_potential?: Record<string, unknown>;
  bump_analysis?: Record<string, unknown>;
  advanced_metrics?: Record<string, unknown>;
  platform_analysis?: Record<string, unknown>;
}

export interface PoolInfo {
  exists: boolean;
  token_mint: string;
  pool_info: {
    liquidity_usd: number;
    volume_24h: number;
    fee_tier: number;
  };
}

// API Utility Functions
export const apiCall = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<ApiResponse<T>> => {
  try {
    console.log(`🔄 API Call: ${options.method || 'GET'} ${endpoint}`);
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        headers: { ...defaultHeaders, ...options.headers },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Success: ${endpoint}`, data);
      
      return { success: true, data };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error(`❌ API Error: ${endpoint}`, error);
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = `Request timeout after ${timeoutMs / 1000} seconds`;
      } else {
        errorMessage = error.message;
      }
    }
    
    return { success: false, error: errorMessage };
  }
};

// Specific API Functions
export const getSwapQuote = async (request: SwapQuoteRequest): Promise<ApiResponse<SwapQuoteResponse>> => {
  return apiCall<SwapQuoteResponse>(API_ENDPOINTS.quote, {
    method: 'POST',
    body: JSON.stringify(request),
  });
};

export const getTokens = async (): Promise<ApiResponse<TokenInfo[]>> => {
  return apiCall<TokenInfo[]>(API_ENDPOINTS.tokens);
};

export const checkBackendHealth = async (): Promise<ApiResponse<{ status: string; timestamp: string }>> => {
  return apiCall(API_ENDPOINTS.health);
};

export const getBotStatus = async (): Promise<ApiResponse<{ isRunning: boolean; stats?: unknown }>> => {
  return apiCall(API_ENDPOINTS.botStatus);
};

// UPDATED FOR SMITHII LOGIC: Advanced bot API functions
export const runVolumeBot = async (params: BotParams): Promise<ApiResponse<BotJobResponse>> => {
  return apiCall<BotJobResponse>(API_ENDPOINTS.runVolumeBot, {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

export const getBotProgress = async (jobId: string): Promise<ApiResponse<BotProgressResponse>> => {
  return apiCall<BotProgressResponse>(API_ENDPOINTS.botProgress(jobId));
};

export const stopBotJob = async (jobId: string): Promise<ApiResponse<{ status: string; job_id: string }>> => {
  return apiCall(API_ENDPOINTS.stopBotJob(jobId), {
    method: 'POST',
  });
};

export const getTrendingMetrics = async (tokenMint: string): Promise<ApiResponse<TrendingMetrics>> => {
  return apiCall<TrendingMetrics>(API_ENDPOINTS.getTrendingMetrics(tokenMint));
};

export const checkTokenPool = async (tokenMint: string): Promise<ApiResponse<PoolInfo>> => {
  return apiCall<PoolInfo>(API_ENDPOINTS.checkPool(tokenMint));
};

export const getUserJobs = async (userWallet: string): Promise<ApiResponse<{ jobs: Record<string, unknown>[] }>> => {
  return apiCall(API_ENDPOINTS.listJobs(userWallet));
};

// Connection Test Utility
export const testConnection = async (): Promise<boolean> => {
  console.log('🔄 Testing backend connection...');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`API URL: ${API_BASE_URL}`);
  
  const testEndpoints = [
    { name: 'Health', url: API_ENDPOINTS.health },
    { name: 'Root', url: BACKEND_URL },
    { name: 'Tokens', url: API_ENDPOINTS.tokens },
  ];
  
  let successCount = 0;
  
  for (const { name, url } of testEndpoints) {
    const result = await apiCall(url);
    if (result.success) {
      console.log(`✅ ${name}: Connected`);
      successCount++;
    } else {
      console.log(`❌ ${name}: ${result.error}`);
    }
  }
  
  const isConnected = successCount > 0;
  console.log(`🔗 Connection test: ${successCount}/${testEndpoints.length} endpoints working`);
  
  if (!isConnected) {
    console.log('⚠️ Backend may be sleeping (Render free tier). Try again in 30-60 seconds.');
  }
  
  return isConnected;
};

export { BACKEND_URL, API_BASE_URL };