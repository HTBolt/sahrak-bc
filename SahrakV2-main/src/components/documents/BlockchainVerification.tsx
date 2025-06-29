import React, { useState } from 'react';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Clock, 
  Hash,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { verifyDocumentIntegrity, getBlockchainExplorerUrl, DocumentProof } from '../../lib/blockchain';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface BlockchainVerificationProps {
  documentId: string;
  documentName: string;
  transactionId?: string;
  fileHash?: string;
  onVerificationComplete?: (verified: boolean) => void;
}

export const BlockchainVerification: React.FC<BlockchainVerificationProps> = ({
  documentId,
  documentName,
  transactionId,
  fileHash,
  onVerificationComplete
}) => {
  const [showVerification, setShowVerification] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<DocumentProof | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!transactionId || !fileHash) {
      toast.error('Missing blockchain data for verification');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const proof = await verifyDocumentIntegrity(transactionId, fileHash);
      setVerificationResult(proof);
      onVerificationComplete?.(proof.verified);
      
      if (proof.verified) {
        toast.success('Document integrity verified on blockchain!');
      } else {
        toast.error('Document integrity verification failed!');
      }
    } catch (err: any) {
      setError(err.message);
      toast.error('Verification failed: ' + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const openExplorer = () => {
    if (transactionId) {
      window.open(getBlockchainExplorerUrl(transactionId), '_blank');
    }
  };

  if (!transactionId) {
    return (
      <div className="flex items-center space-x-2 text-slate-500">
        <AlertTriangle size={16} />
        <span className="text-sm">Not stored on blockchain</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowVerification(true)}
          className="text-green-400 hover:text-green-300 flex items-center space-x-1"
          title="Verify on blockchain"
        >
          <Shield size={16} />
          <span className="hidden sm:inline">Blockchain</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={openExplorer}
          className="text-blue-400 hover:text-blue-300"
          title="View on Algorand Explorer"
        >
          <ExternalLink size={16} />
        </Button>
      </div>

      <Modal
        isOpen={showVerification}
        onClose={() => setShowVerification(false)}
        title="Blockchain Verification"
        size="lg"
      >
        <div className="space-y-6">
          {/* Document Info */}
          <Card className="p-4 bg-slate-700/50 border-slate-600">
            <h3 className="font-semibold text-white mb-2">Document Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="text-white">{documentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="text-white font-mono text-xs break-all">{transactionId}</span>
              </div>
              {fileHash && (
                <div className="flex justify-between">
                  <span className="text-slate-400">File Hash:</span>
                  <span className="text-white font-mono text-xs break-all">{fileHash.substring(0, 16)}...</span>
                </div>
              )}
            </div>
          </Card>

          {/* Verification Button */}
          <div className="text-center">
            <Button
              onClick={handleVerify}
              disabled={verifying}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
            >
              {verifying ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield size={16} className="mr-2" />
                  Verify Document Integrity
                </>
              )}
            </Button>
          </div>

          {/* Verification Result */}
          {verificationResult && (
            <Card className={`p-4 border-2 ${
              verificationResult.verified 
                ? 'bg-green-900/20 border-green-800' 
                : 'bg-red-900/20 border-red-800'
            }`}>
              <div className="flex items-start space-x-3">
                {verificationResult.verified ? (
                  <CheckCircle className="w-6 h-6 text-green-400 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400 mt-0.5" />
                )}
                
                <div className="flex-1">
                  <h3 className={`font-semibold mb-2 ${
                    verificationResult.verified ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {verificationResult.verified ? 'Verification Successful' : 'Verification Failed'}
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Block Number:</span>
                      <span className="text-white">{verificationResult.blockNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Timestamp:</span>
                      <span className="text-white">
                        {format(new Date(verificationResult.timestamp), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Document Hash:</span>
                      <span className="text-white font-mono text-xs">
                        {verificationResult.documentHash.substring(0, 16)}...
                      </span>
                    </div>
                  </div>
                  
                  <p className={`mt-3 text-sm ${
                    verificationResult.verified ? 'text-green-200' : 'text-red-200'
                  }`}>
                    {verificationResult.verified 
                      ? 'This document has not been tampered with since it was stored on the blockchain.'
                      : 'The document hash does not match the blockchain record. The file may have been modified.'
                    }
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="p-4 bg-red-900/20 border-red-800">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-300 mb-1">Verification Error</h3>
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Blockchain Explorer Link */}
          <div className="text-center">
            <Button
              variant="outline"
              onClick={openExplorer}
              className="text-blue-400 border-blue-600 hover:bg-blue-900/20"
            >
              <ExternalLink size={16} className="mr-2" />
              View on Algorand Explorer
            </Button>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <Shield className="w-4 h-4 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-700 dark:text-blue-300 font-medium mb-1">
                  Blockchain Verification
                </p>
                <p className="text-blue-600 dark:text-blue-400">
                  This verification checks if the document stored on the Algorand blockchain 
                  matches the current file, ensuring it hasn't been tampered with.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};