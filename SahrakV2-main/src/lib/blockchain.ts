import algosdk from 'algosdk';

// Algorand testnet configuration
const ALGORAND_CONFIG = {
  token: '',
  server: 'https://testnet-api.4160.nodely.dev',
  port: '',
  network: 'testnet'
};

// Your Algorand account details (from previous setup)
const ACCOUNT_CONFIG = {
  address: 'ISKQJKIEYQRDJHPN4H2V4X7Q3U4WLQPB4XQPJG3MXJZB6YQRP65M',
  mnemonic: 'crash pond train sign around hawk very orient mix cinnamon space catch patch tongue engage milk rebel digital input soup pledge crime allow abstract smoke'
};

export interface BlockchainDocument {
  id: string;
  documentId: string;
  documentName: string;
  fileHash: string;
  transactionId: string;
  blockNumber: number;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
  algorandAddress: string;
}

export interface DocumentProof {
  documentHash: string;
  transactionId: string;
  blockNumber: number;
  timestamp: string;
  verified: boolean;
}

class AlgorandBlockchainService {
  private algodClient: algosdk.Algodv2;
  private account: algosdk.Account;

  constructor() {
    this.algodClient = new algosdk.Algodv2(
      ALGORAND_CONFIG.token,
      ALGORAND_CONFIG.server,
      ALGORAND_CONFIG.port
    );
    
    // Recover account from mnemonic
    this.account = algosdk.mnemonicToSecretKey(ACCOUNT_CONFIG.mnemonic);
  }

  /**
   * Generate SHA-256 hash of file content
   */
  async generateFileHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Store document hash on Algorand blockchain
   */
  async storeDocumentHash(
    documentId: string,
    documentName: string,
    fileHash: string
  ): Promise<{ transactionId: string; success: boolean; error?: string }> {
    try {
      console.log('🔗 Storing document hash on Algorand blockchain...');
      
      // Get suggested transaction parameters
      const suggestedParams = await this.algodClient.getTransactionParams().do();
      
      // Create note with document metadata
      const note = new TextEncoder().encode(JSON.stringify({
        type: 'SAHRAK_DOCUMENT',
        documentId,
        documentName,
        fileHash,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }));

      // Create transaction (sending 0 ALGO to self with document hash in note)
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: this.account.addr,
        to: this.account.addr,
        amount: 0, // 0 ALGO transaction
        note: note,
        suggestedParams: suggestedParams
      });

      // Sign transaction
      const signedTxn = txn.signTxn(this.account.sk);

      // Submit transaction
      const { txId } = await this.algodClient.sendRawTransaction(signedTxn).do();
      
      console.log('✅ Transaction submitted:', txId);
      
      // Wait for confirmation
      await this.waitForConfirmation(txId);
      
      return {
        transactionId: txId,
        success: true
      };

    } catch (error: any) {
      console.error('❌ Error storing document hash:', error);
      return {
        transactionId: '',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify document integrity by checking blockchain
   */
  async verifyDocumentIntegrity(
    transactionId: string,
    expectedHash: string
  ): Promise<DocumentProof> {
    try {
      console.log('🔍 Verifying document integrity...');
      
      // Get transaction details
      const txnInfo = await this.algodClient.pendingTransactionInformation(transactionId).do();
      
      if (!txnInfo['confirmed-round']) {
        throw new Error('Transaction not confirmed yet');
      }

      // Decode note from transaction
      const noteBytes = txnInfo.txn.txn.note;
      const noteString = new TextDecoder().decode(noteBytes);
      const metadata = JSON.parse(noteString);

      const verified = metadata.fileHash === expectedHash;

      return {
        documentHash: metadata.fileHash,
        transactionId: transactionId,
        blockNumber: txnInfo['confirmed-round'],
        timestamp: metadata.timestamp,
        verified: verified
      };

    } catch (error: any) {
      console.error('❌ Error verifying document:', error);
      throw new Error(`Verification failed: ${error.message}`);
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(): Promise<number> {
    try {
      const accountInfo = await this.algodClient.accountInformation(this.account.addr).do();
      // Fix: Convert BigInt to Number before division
      return Number(accountInfo.amount) / 1000000; // Convert microAlgos to Algos
    } catch (error) {
      console.error('Error getting account balance:', error);
      return 0;
    }
  }

  /**
   * Check if account has sufficient balance for transactions
   */
  async hasInsufficientBalance(): Promise<boolean> {
    const balance = await this.getAccountBalance();
    return balance < 0.001; // Need at least 0.001 ALGO for transaction fees
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForConfirmation(txId: string): Promise<void> {
    let lastRound = (await this.algodClient.status().do())['last-round'];
    
    while (true) {
      const pendingInfo = await this.algodClient.pendingTransactionInformation(txId).do();
      
      if (pendingInfo['confirmed-round'] !== null && pendingInfo['confirmed-round'] > 0) {
        console.log('✅ Transaction confirmed in round:', pendingInfo['confirmed-round']);
        break;
      }
      
      if (pendingInfo['pool-error'] != null && pendingInfo['pool-error'].length > 0) {
        throw new Error(`Transaction failed: ${pendingInfo['pool-error']}`);
      }
      
      lastRound++;
      await this.algodClient.statusAfterBlock(lastRound).do();
    }
  }

  /**
   * Get blockchain explorer URL for transaction
   */
  getExplorerUrl(transactionId: string): string {
    return `https://testnet.algoexplorer.io/tx/${transactionId}`;
  }

  /**
   * Get all blockchain documents for a user (this would typically be stored in your database)
   */
  async getUserBlockchainDocuments(userId: string): Promise<BlockchainDocument[]> {
    // This would typically fetch from your database
    // For now, returning empty array as this requires database integration
    return [];
  }
}

// Export singleton instance
export const blockchainService = new AlgorandBlockchainService();

// Helper functions
export const generateDocumentHash = async (file: File): Promise<string> => {
  return blockchainService.generateFileHash(file);
};

export const storeDocumentOnBlockchain = async (
  documentId: string,
  documentName: string,
  fileHash: string
) => {
  return blockchainService.storeDocumentHash(documentId, documentName, fileHash);
};

export const verifyDocumentIntegrity = async (
  transactionId: string,
  expectedHash: string
): Promise<DocumentProof> => {
  return blockchainService.verifyDocumentIntegrity(transactionId, expectedHash);
};

export const getAccountBalance = async (): Promise<number> => {
  return blockchainService.getAccountBalance();
};

export const getBlockchainExplorerUrl = (transactionId: string): string => {
  return blockchainService.getExplorerUrl(transactionId);
};