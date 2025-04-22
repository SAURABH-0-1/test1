export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  useCases: string;
  price_range: string;
  trend_indicators: string[];
  category: string;
}

export const ENHANCED_TOKEN_INFO: Record<string, TokenInfo> = {
  SOL: {
    name: "Solana",
    symbol: "SOL",
    decimals: 9,
    description: "Native token of the Solana blockchain",
    useCases: "Transaction fees, staking, governance",
    price_range: "$20-$100",
    trend_indicators: ["Network activity", "DeFi growth"],
    category: "Layer 1"
  },
  USDC: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    description: "Stablecoin pegged to USD",
    useCases: "Stable value transfer, trading",
    price_range: "~$1.00",
    trend_indicators: ["Market adoption", "Regulatory compliance"],
    category: "Stablecoin"
  },
  // Add more tokens as needed
}; 