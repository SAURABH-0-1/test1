import { useState, useEffect } from 'react';
import { coinMarketCapApi, getMarketOverviewUrl, getCoinMarketCapUrl } from '@/lib/api-integration/coinmarketcap-api';

interface CoinData {
  id: number;
  symbol: string;
  name: string;
  cmc_rank?: number;
  quote: {
    USD: {
      price: number;
      percent_change_24h: number;
      market_cap: number;
      volume_24h: number;
    };
  };
}

export interface MarketTrendData {
  symbol: string;
  name: string;
  price: number;
  percentChange24h: number;
  marketCap: number;
  volume24h: number;
  imageUrl?: string;
  marketCapRank?: number;
  id?: number;
}

export function useMarketTrends(limit = 4, refreshInterval = 60000) {
  const [marketTrends, setMarketTrends] = useState<MarketTrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchMarketTrends = async () => {
    try {
      setIsLoading(true);
      const response = await coinMarketCapApi.getLatestListings(limit);
      
      if (response.data && Array.isArray(response.data)) {
        const formattedData: MarketTrendData[] = response.data.map((coin: CoinData) => ({
          symbol: coin.symbol,
          name: coin.name,
          price: coin.quote.USD.price,
          percentChange24h: coin.quote.USD.percent_change_24h,
          marketCap: coin.quote.USD.market_cap,
          volume24h: coin.quote.USD.volume_24h,
          id: coin.id,
          marketCapRank: coin.cmc_rank || undefined,
          imageUrl: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`
        }));
        
        setMarketTrends(formattedData);
        setError(null);
      } else {
        // Fallback data for development if API call fails
        setMarketTrends([
          { symbol: 'SOL', name: 'Solana', price: 172.40, percentChange24h: 2.5, marketCap: 0, volume24h: 0 },
          { symbol: 'USDC', name: 'USD Coin', price: 1.00, percentChange24h: 0.01, marketCap: 0, volume24h: 0 },
          { symbol: 'BONK', name: 'Bonk', price: 0.00002148, percentChange24h: -1.2, marketCap: 0, volume24h: 0 },
          { symbol: 'JUP', name: 'Jupiter', price: 1.21, percentChange24h: 5.4, marketCap: 0, volume24h: 0 }
        ]);
      }
    } catch (err) {
      console.error('Error fetching market trends:', err);
      setError('Failed to fetch market data');
      
      // Use fallback data on error
      setMarketTrends([
        { symbol: 'SOL', name: 'Solana', price: 172.40, percentChange24h: 2.5, marketCap: 0, volume24h: 0 },
        { symbol: 'USDC', name: 'USD Coin', price: 1.00, percentChange24h: 0.01, marketCap: 0, volume24h: 0 },
        { symbol: 'BONK', name: 'Bonk', price: 0.00002148, percentChange24h: -1.2, marketCap: 0, volume24h: 0 },
        { symbol: 'JUP', name: 'Jupiter', price: 1.21, percentChange24h: 5.4, marketCap: 0, volume24h: 0 }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchMarketTrends();
    
    // Set up interval for refreshing data
    const intervalId = setInterval(fetchMarketTrends, refreshInterval);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [refreshInterval, limit]);
  
  // Get market overview URL
  const getMarketUrl = () => getMarketOverviewUrl();
  
  // Get URL for specific coin
  const getCoinUrl = (symbol: string) => getCoinMarketCapUrl(symbol);
  
  return { 
    marketTrends, 
    isLoading, 
    error, 
    refreshData: fetchMarketTrends,
    getMarketUrl,
    getCoinUrl
  };
}
