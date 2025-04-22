import { Connection, Transaction, PublicKey, SendOptions, Commitment, TransactionSignature } from '@solana/web3.js';

// Silent error handling with logging
interface ErrorLogOptions {
  logToConsole?: boolean;
  logToAnalytics?: boolean;
}

// Result of transaction processing
interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: any;
  errorCode?: string;
  blockTime?: number;
}

/**
 * Handles transactions with silent error handling to prevent UI disruptions
 */
export class TransactionHandler {
  private connection: Connection;
  private logOptions: ErrorLogOptions;

  constructor(connection: Connection, logOptions: ErrorLogOptions = { logToConsole: true }) {
    this.connection = connection;
    this.logOptions = logOptions;
  }

  /**
   * Log errors silently without showing to the user
   */
  private logErrorSilently(error: any, context: string): void {
    if (this.logOptions.logToConsole) {
      console.error(`Silent error in ${context}:`, error);
    }
    
    if (this.logOptions.logToAnalytics) {
      // Integration with your analytics service would go here
      // analyticsService.logError(error, context);
    }
  }

  /**
   * Determines if an error should be shown to the user
   * Returns false for common errors we want to suppress
   */
  private shouldShowError(error: any): boolean {
    if (!error) return false;
    
    const errorString = error.toString().toLowerCase();
    
    // Define error categories
    const suppressedErrors = {
      network: [
        'block height exceeded',
        'expired signature',
        'blockhash not found',
        'timed out',
        'connection refused',
        'network error'
      ],
      simulation: [
        'transaction simulation failed',
        'insufficient funds',
        'invalid account data'
      ],
      validation: [
        'invalid signature',
        'invalid transaction',
        'invalid account'
      ]
    };
    
    // Check if error matches any suppressed category
    const isSuppressed = Object.values(suppressedErrors)
      .flat()
      .some(suppressed => errorString.includes(suppressed.toLowerCase()));
      
    // Log error category for debugging
    if (isSuppressed) {
      const category = Object.entries(suppressedErrors).find(([_, errors]) =>
        errors.some(e => errorString.includes(e.toLowerCase()))
      )?.[0] || 'unknown';
      
      console.warn(`Suppressed ${category} error:`, error);
    }
    
    return !isSuppressed;
  }

  /**
   * Send and confirm a transaction with silent error handling
   */
  async sendAndConfirmTransaction(
    transaction: Transaction,
    signers?: any[],
    options?: SendOptions & { commitment?: Commitment }
  ): Promise<TransactionResult> {
    try {
      // Send transaction
      const signature = await this.connection.sendTransaction(
        transaction,
        signers || [],
        options
      );
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(
        signature,
        options?.commitment || 'confirmed'
      );
      
      // Check if there were any errors
      if (confirmation.value.err) {
        this.logErrorSilently(confirmation.value.err, 'Transaction confirmation');
        return {
          success: false,
          signature,
          error: confirmation.value.err,
          errorCode: typeof confirmation.value.err === 'string' ? confirmation.value.err : 'Unknown error'
        };
      }
      
      // Get block time
      try {
        const blockTime = await this.getTransactionBlockTime(signature);
        return { success: true, signature, blockTime };
      } catch (timeError: unknown) {
        // Even if getting block time fails, transaction is still successful
        this.logErrorSilently(timeError, 'Getting block time');
        return { success: true, signature };
      }
    } catch (error: unknown) {
      this.logErrorSilently(error, 'Sending transaction');
      return {
        success: false,
        error,
        errorCode: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get transaction block time
   */
  private async getTransactionBlockTime(signature: TransactionSignature): Promise<number | undefined> {
    try {
      const transaction = await this.connection.getTransaction(signature);
      return transaction?.blockTime || undefined;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logErrorSilently(errorMessage, 'Getting transaction');
      return undefined;
    }
  }

  /**
   * Check transaction status without throwing visible errors
   */
  async checkTransactionStatus(signature: TransactionSignature): Promise<TransactionResult> {
    try {
      const transaction = await this.connection.getTransaction(signature);
      
      if (!transaction) {
        return { success: false, signature, errorCode: 'not_found' };
      }
      
      if (transaction.meta?.err) {
        this.logErrorSilently(transaction.meta.err, 'Transaction status check');
        return {
          success: false,
          signature,
          error: transaction.meta.err,
          blockTime: transaction.blockTime || undefined
        };
      }
      
      return {
        success: true,
        signature,
        blockTime: transaction.blockTime || undefined
      };
    } catch (error) {
      this.logErrorSilently(error, 'Checking transaction status');
      return {
        success: false,
        signature,
        error,
        errorCode: error.code || 'Unknown error'
      };
    }
  }
}

/**
 * Create a new transaction handler instance
 */
export function createTransactionHandler(connection: Connection): TransactionHandler {
  return new TransactionHandler(connection);
}
