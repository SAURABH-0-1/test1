import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format wallet address to show first and last few characters
export function formatWalletAddress(address: string, startChars: number = 4, endChars: number = 4): string {
  if (!address) return ""
  if (address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

// Format currency with proper decimal places and currency symbol
export function formatCurrency(amount: number, currency: string = "USD", decimals: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

// Types for AI messages
export interface AIMessage {
  role: "assistant" | "user"
  content: string
}

// Type for swap intents
export interface SwapIntent {
  fromToken: {
    symbol: string
    address: string
  }
  toToken: {
    symbol: string
    address: string
  }
  amount: number
  slippageTolerance?: number
}
