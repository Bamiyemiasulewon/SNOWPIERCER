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

// API Utility Functions
export const apiCall = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    console.log(`🔄 API Call: ${options.method || 'GET'} ${endpoint}`);
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const response = await fetch(endpoint, {
      headers: { ...defaultHeaders, ...options.headers },
      timeout: 30000, // 30 seconds for Render free tier
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ API Success: ${endpoint}`, data);
    
    return { success: true, data };
  } catch (error) {
    console.error(`❌ API Error: ${endpoint}`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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