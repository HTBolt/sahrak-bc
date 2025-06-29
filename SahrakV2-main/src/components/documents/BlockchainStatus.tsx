import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ExternalLink,
  Wallet,
  RefreshCw
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getAccountBalance, getBlockchainExplorerUrl } from '../../lib/blockchain';
import toast from 'react-hot-toast';

interface BlockchainStatusProps {
  className?: string;
}

export const BlockchainStatus: React.FC<BlockchainStatusProps> = ({ className = '' }) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadBalance = async () => {
    try {
      setLoading(true);
      const accountBalance = await getAccountBalance();
      setBalance(accountBalance);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading balance:', error);
      toast.error('Failed to load blockchain status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);

  const getStatusInfo = () => {
    if (balance === null) {
      return {
        status: 'unknown',
        icon: AlertTriangle,
        color: 'text-slate-400',
        bgColor: 'bg-slate-900/20',
        borderColor: 'border-slate-800',
        message: 'Unable to connect to blockchain'
      };
    }

    if (balance === 0) {
      return {
        status: 'unfunded',
        icon: AlertTriangle,
        color: 'text-orange-400',
        bgColor: 'bg-orange-900/20',
        borderColor: 'border-orange-800',
        message: 'Account needs funding for blockchain features'
      };
    }

    if (balance < 0.001) {
      return {
        status: 'low',
        icon: AlertTriangle,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-900/20',
        borderColor: 'border-yellow-800',
        message: 'Low balance - may not support many transactions'
      };
    }

    return {
      status: 'ready',
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-800',
      message: 'Blockchain features ready'
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const openFaucet = () => {
    window.open('https://bank.testnet.algorand.network/', '_blank');
  };

  const openExplorer = () => {
    window.open('https://testnet.algoexplorer.io/address/ISKQJKIEYQRDJHPN4H2V4X7Q3U4WLQPB4XQPJG3MXJZB6YQRP65M', '_blank');
  };

  return (
    <Card className={`p-4 ${statusInfo.bgColor} border-2 ${statusInfo.borderColor} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <StatusIcon className={`w-5 h-5 ${statusInfo.color} mt-0.5`} />
          <div className="flex-1">
            <h3 className={`font-semibold ${statusInfo.color} mb-1`}>
              Blockchain Status
            </h3>
            <p className={`text-sm ${statusInfo.color.replace('400', '300')} mb-2`}>
              {statusInfo.message}
            </p>
            
            {balance !== null && (
              <div className="space-y-1 text-xs">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-3 h-3" />
                  <span className={statusInfo.color.replace('400', '300')}>
                    Balance: {balance.toFixed(6)} ALGO
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-3 h-3" />
                  <span className={statusInfo.color.replace('400', '300')}>
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadBalance}
            disabled={loading}
            className={`${statusInfo.color} hover:${statusInfo.color.replace('400', '300')} p-1`}
            title="Refresh status"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={openExplorer}
            className={`${statusInfo.color} hover:${statusInfo.color.replace('400', '300')} p-1`}
            title="View on explorer"
          >
            <ExternalLink size={14} />
          </Button>
        </div>
      </div>
      
      {/* Action buttons for low/no balance */}
      {(statusInfo.status === 'unfunded' || statusInfo.status === 'low') && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <Button
            variant="outline"
            size="sm"
            onClick={openFaucet}
            className={`${statusInfo.color} border-current hover:bg-current hover:bg-opacity-10 text-xs`}
          >
            Get Testnet ALGO
          </Button>
        </div>
      )}
    </Card>
  );
};