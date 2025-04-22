import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch market data from an API or database
    const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1');
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}

// You can add other HTTP methods as needed
export async function POST(request: Request) {
  // Handle POST requests if needed
  return NextResponse.json({ message: 'Method not implemented' }, { status: 501 });
}
