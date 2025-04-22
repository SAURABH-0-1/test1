import { NextResponse } from "next/server";
import { getAIResponse } from "@/lib/openai-client";
import { AIContextManager } from "@/lib/ai-context-manager";
import { WalletDataProvider } from "@/lib/wallet-data-provider";
import { TransactionMemoryManager } from '@/lib/transaction-memory';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      walletConnected, 
      walletAddress, 
      balance,
      tokenBalances,
      recentTransactions,
      sessionId = 'default'
    } = body;
    
    console.log("API received:", {
      prompt,
      walletConnected,
      walletAddressProvided: !!walletAddress,
      balance,
      tokenBalancesCount: tokenBalances?.length || 0,
      recentTransactionsCount: recentTransactions?.length || 0,
      sessionId
    });
    
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Invalid request. Prompt is required." },
        { status: 400 }
      );
    }

    // Make sure the balance is a valid number
    const validBalance = typeof balance === 'number' && !isNaN(balance) ? balance : 0;
    
    // Set up the AI context manager
    const contextManager = new AIContextManager(sessionId);
    contextManager.setWalletAddress(walletConnected ? walletAddress : null);
    
    // Add user message to context
    contextManager.addMessage({ role: "user", content: prompt });
    
    // Always try to get fresh wallet data if wallet is connected
    let enhancedTokenBalances = tokenBalances || [];
    let enhancedTransactions = recentTransactions || [];
    let currentBalance = validBalance;
    
    const dataStartTime = Date.now();
    
    if (walletConnected && walletAddress) {
      try {
        console.log("Fetching fresh wallet data for AI context...");
        
        // Get wallet data in parallel to reduce delay
        const [walletData, txHistory] = await Promise.all([
          WalletDataProvider.getWalletData(walletAddress),
          WalletDataProvider.getRecentTransactions(walletAddress, 10)
        ]);
        
        // Update with fresh data
        currentBalance = walletData.solBalance;
        enhancedTokenBalances = walletData.tokens;
        enhancedTransactions = txHistory;
        
        console.log(`Fetched ${enhancedTokenBalances.length} tokens and ${enhancedTransactions.length} transactions in ${Date.now() - dataStartTime}ms`);
      } catch (error) {
        console.error("Error fetching fresh wallet data:", error);
        // Continue with the data we have from the client
        console.log("Using client-provided wallet data as fallback");
      }
    }
    
    console.log("Preparing context for AI with wallet data:", {
      balance: currentBalance,
      tokenCount: enhancedTokenBalances.length,
      transactionCount: enhancedTransactions.length
    });
    
    // Process transaction memory queries
    if (prompt.toLowerCase().includes('transaction') || 
        prompt.toLowerCase().includes('spent') || 
        prompt.toLowerCase().includes('history') ||
        prompt.toLowerCase().includes('payment')) {
      try {
        console.log("Detected transaction memory query");
        
        // Only attempt if wallet is connected
        if (walletConnected && walletAddress) {
          const memoryResponse = await TransactionMemoryManager.queryTransactions(
            walletAddress,
            prompt
          );
          
          // Add memory data to the context
          const formattedContent = memoryResponse.summary || 
            `Transaction data: ${memoryResponse.transactions.map(t => 
              `${t.description || 'Transaction'} (${t.amount || 'amount unknown'})`
            ).join(', ')}`;

          contextManager.addMessage({ 
            role: "assistant", 
            content: formattedContent 
          });
        }
      } catch (error) {
        console.error("Error processing memory query:", error);
      }
    }

    // Fix the Promise callback by making it async and correcting syntax errors
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Request timed out after 30 seconds"));
      }, 30000);
    });

    // Main function to handle the response
    const handleResponse = async () => {
      try {
        // Generate AI context
        const aiContext = await contextManager.generateAIContext();
        
        console.log("AI context generated with SystemPrompt length:", aiContext.systemPrompt.length);
        
        // Try using OpenAI with timeout
        const aiResponsePromise = getAIResponse(prompt, {
          walletConnected: !!walletConnected,
          walletAddress: walletAddress || null,
          balance: currentBalance,
          tokenBalances: enhancedTokenBalances,
          recentTransactions: enhancedTransactions,
          conversationHistory: aiContext.recentMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          systemPrompt: aiContext.systemPrompt
        });

        // Race between API response and timeout
        const aiResponse = await Promise.race([aiResponsePromise, timeoutPromise]) as any;

        console.log("AI response received:", { 
          hasIntent: !!aiResponse.intent,
          hasSuggestions: !!aiResponse.suggestions,
          messageLength: aiResponse.message.length
        });

        // Add AI response to context
        contextManager.addMessage({ role: "assistant", content: aiResponse.message });

        // Include suggested topics if missing
        if (!aiResponse.suggestions || aiResponse.suggestions.length === 0) {
          aiResponse.suggestions = aiContext.suggestedTopics;
        }

        // Add wallet data to response for UI
        aiResponse.walletData = aiContext.walletData || {
          solBalance: currentBalance,
          address: walletAddress,
          tokenBalances: enhancedTokenBalances,
          recentTransactions: enhancedTransactions
        };

        return NextResponse.json(aiResponse);
      } catch (error) {
        console.error("Error generating response:", error);
        throw error;
      }
    };

    // Use Promise.race with await to ensure correct return type
    const result = await Promise.race([handleResponse(), timeoutPromise]);
    
    return NextResponse.json({
      result,
      status: "success"
    });
  } catch (error: unknown) {
    console.error("Error in intent parser:", error);
    
    // Handle the unknown error type safely
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
      
    return NextResponse.json(
      { error: "Failed to process intent", details: errorMessage },
      { status: 500 }
    );
  }
}
