import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { HEALTH_STATUS } from '../../config/healthRanges';
import { Modal } from './Modal';

interface HealthIndicatorProps {
  status: keyof typeof HEALTH_STATUS;
  value: number;
  unit: string;
  metricName: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  recommendations?: string[];
}

const iconMap = {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info
};

export const HealthIndicator: React.FC<HealthIndicatorProps> = ({
  status,
  value,
  unit,
  metricName,
  size = 'md',
  showLabel = false,
  className = '',
  recommendations = []
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const statusConfig = HEALTH_STATUS[status];
  const IconComponent = iconMap[statusConfig.icon as keyof typeof iconMap] || CheckCircle;
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Only show indicator for concerning statuses
  if (status === 'optimal' || status === 'normal') return null;

  return (
    <>
      <div className={`flex items-center space-x-2 ${className}`}>
        <button
          onClick={() => setShowDetails(true)}
          className={`${sizeClasses[size]} ${statusConfig.color} hover:opacity-80 transition-opacity cursor-pointer`}
          title={`${metricName}: ${statusConfig.label} - Click for details`}
        >
          <IconComponent className="w-full h-full" />
        </button>
        {showLabel && (
          <span className={`${textSizeClasses[size]} ${statusConfig.color} font-medium`}>
            {statusConfig.label}
          </span>
        )}
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={`${metricName} - Health Alert`}
        size="md"
      >
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border-2 ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
            <div className="flex items-start space-x-3">
              <IconComponent className={`w-6 h-6 ${statusConfig.color} mt-0.5`} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-semibold ${statusConfig.color}`}>
                    {statusConfig.label} Level
                  </h3>
                  <span className={`text-sm ${statusConfig.color} font-mono`}>
                    {value} {unit}
                  </span>
                </div>
                <p className={`text-sm ${statusConfig.color.replace('400', '300')}`}>
                  Your {metricName.toLowerCase()} reading is in the {statusConfig.label.toLowerCase()} range and may require attention.
                </p>
              </div>
            </div>
          </div>

          {recommendations.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
                Recommendations:
              </h4>
              <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                {recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Important:</strong> This information is for educational purposes only. 
              Please consult with your healthcare provider for proper medical advice and treatment.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setShowDetails(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

interface HealthBadgeProps {
  status: keyof typeof HEALTH_STATUS;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({
  status,
  label,
  size = 'md'
}) => {
  const statusConfig = HEALTH_STATUS[status];
  const IconComponent = iconMap[statusConfig.icon as keyof typeof iconMap] || CheckCircle;
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span className={`
      inline-flex items-center space-x-1 rounded-full font-medium border
      ${sizeClasses[size]} ${statusConfig.color} ${statusConfig.bgColor} ${statusConfig.borderColor}
    `}>
      <IconComponent className={iconSizeClasses[size]} />
      <span>{label}</span>
    </span>
  );
};

// Compact Health Summary Component
interface HealthSummaryProps {
  alerts: Array<{
    status: keyof typeof HEALTH_STATUS;
    metricName: string;
    value: number;
    unit: string;
    recommendations: string[];
  }>;
}

export const HealthSummary: React.FC<HealthSummaryProps> = ({ alerts }) => {
  const [showSummary, setShowSummary] = useState(false);
  
  const concerningAlerts = alerts.filter(alert => 
    alert.status !== 'optimal' && alert.status !== 'normal'
  );

  if (concerningAlerts.length === 0) return null;

  const criticalCount = concerningAlerts.filter(a => a.status === 'critical').length;
  const highCount = concerningAlerts.filter(a => a.status === 'high').length;
  const borderlineCount = concerningAlerts.filter(a => a.status === 'borderline').length;

  return (
    <>
      <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
        <div className="flex items-center space-x-2">
          {criticalCount > 0 && (
            <div className="flex items-center space-x-1">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400 font-medium">{criticalCount}</span>
            </div>
          )}
          {highCount > 0 && (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-orange-400 font-medium">{highCount}</span>
            </div>
          )}
          {borderlineCount > 0 && (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-400 font-medium">{borderlineCount}</span>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <p className="text-sm text-[var(--text-primary)] dark:text-slate-300">
            {concerningAlerts.length} health metric{concerningAlerts.length !== 1 ? 's' : ''} need{concerningAlerts.length === 1 ? 's' : ''} attention
          </p>
        </div>
        
        <button
          onClick={() => setShowSummary(true)}
          className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
        >
          View Details
        </button>
      </div>

      {/* Summary Modal */}
      <Modal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        title="Health Metrics Summary"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            The following health metrics are outside normal ranges and may require attention:
          </p>
          
          <div className="space-y-3">
            {concerningAlerts.map((alert, index) => {
              const statusConfig = HEALTH_STATUS[alert.status];
              const IconComponent = iconMap[statusConfig.icon as keyof typeof iconMap] || CheckCircle;
              
              return (
                <div key={index} className={`p-4 rounded-lg border-2 ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
                  <div className="flex items-start space-x-3">
                    <IconComponent className={`w-5 h-5 ${statusConfig.color} mt-0.5`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`font-semibold ${statusConfig.color}`}>
                          {alert.metricName}
                        </h3>
                        <span className={`text-sm ${statusConfig.color} font-mono`}>
                          {alert.value} {alert.unit}
                        </span>
                      </div>
                      <p className={`text-sm ${statusConfig.color.replace('400', '300')} mb-2`}>
                        Status: {statusConfig.label}
                      </p>
                      {alert.recommendations.length > 0 && (
                        <div className="mt-2">
                          <p className={`text-xs font-medium ${statusConfig.color} mb-1`}>
                            Recommendations:
                          </p>
                          <ul className={`text-xs ${statusConfig.color.replace('400', '300')} space-y-1`}>
                            {alert.recommendations.slice(0, 2).map((rec, recIndex) => (
                              <li key={recIndex} className="flex items-start space-x-1">
                                <span>•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Important:</strong> This information is for educational purposes only. 
              Please consult with your healthcare provider for proper medical advice and treatment.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setShowSummary(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};