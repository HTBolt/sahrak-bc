import React, { useState } from 'react';
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  User, 
  Clock, 
  Shield,
  Heart,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface Counselor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization?: string;
  relationship_type: string;
  caregiver_type: 'doctor' | 'nurse' | 'family';
}

interface CounselorContactProps {
  counselors: Counselor[];
  onContactCounselor: (counselor: Counselor, method: 'phone' | 'email' | 'message') => void;
  loading?: boolean;
}

export const CounselorContact: React.FC<CounselorContactProps> = ({
  counselors,
  onContactCounselor,
  loading = false
}) => {
  const [showEmergencyInfo, setShowEmergencyInfo] = useState(false);
  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);

  const getCounselorIcon = (type: string) => {
    switch (type) {
      case 'doctor': return <User className="w-5 h-5 text-blue-400" />;
      case 'nurse': return <Heart className="w-5 h-5 text-green-400" />;
      default: return <User className="w-5 h-5 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="bg-slate-700 rounded-lg h-32"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Emergency Notice */}
        <Card className="p-4 bg-red-900/20 border-red-800">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-300 mb-2">
                Crisis Support Available 24/7
              </h3>
              <p className="text-red-200 text-sm mb-3">
                If you're experiencing a mental health crisis or having thoughts of self-harm, 
                please reach out for immediate help.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmergencyInfo(true)}
                  className="border-red-600 text-red-300 hover:bg-red-900/30"
                >
                  Crisis Resources
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('tel:988', '_self')}
                  className="border-red-600 text-red-300 hover:bg-red-900/30"
                >
                  Call 988 (Crisis Lifeline)
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Available Counselors */}
        {counselors.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span>Your Healthcare Team</span>
            </h3>
            
            {counselors.map((counselor) => (
              <Card key={counselor.id} className="p-4 bg-slate-800 border-slate-700">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    {getCounselorIcon(counselor.caregiver_type)}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">
                      {counselor.name}
                    </h4>
                    <p className="text-sm text-slate-400 mb-1">
                      {counselor.relationship_type}
                      {counselor.specialization && ` • ${counselor.specialization}`}
                    </p>
                    <p className="text-xs text-slate-500 mb-3">
                      Available through your caregiver network
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onContactCounselor(counselor, 'phone')}
                        className="text-green-400 border-green-600 hover:bg-green-900/20"
                      >
                        <Phone size={14} className="mr-1" />
                        Call
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onContactCounselor(counselor, 'email')}
                        className="text-blue-400 border-blue-600 hover:bg-blue-900/20"
                      >
                        <Mail size={14} className="mr-1" />
                        Email
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onContactCounselor(counselor, 'message')}
                        className="text-purple-400 border-purple-600 hover:bg-purple-900/20"
                      >
                        <MessageCircle size={14} className="mr-1" />
                        Message
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 bg-slate-800 border-slate-700">
            <div className="text-center">
              <User className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">
                No Counselors Available
              </h3>
              <p className="text-slate-500 mb-4">
                You haven't added any healthcare providers to your caregiver network yet.
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/caregivers'}
              >
                Add Healthcare Providers
              </Button>
            </div>
          </Card>
        )}

        {/* Professional Support Info */}
        <Card className="p-4 bg-blue-900/20 border-blue-800">
          <div className="flex items-start space-x-3">
            <Shield className="w-6 h-6 text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-300 mb-2">
                Professional Mental Health Support
              </h3>
              <p className="text-blue-200 text-sm mb-3">
                While I'm here to provide support and guidance, I'm not a replacement for 
                professional mental health care. If you're dealing with persistent mental 
                health challenges, please consider reaching out to a licensed professional.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://www.psychologytoday.com/us/therapists', '_blank')}
                  className="border-blue-600 text-blue-300 hover:bg-blue-900/30"
                >
                  Find a Therapist
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://www.samhsa.gov/find-help/national-helpline', '_blank')}
                  className="border-blue-600 text-blue-300 hover:bg-blue-900/30"
                >
                  SAMHSA Helpline
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Emergency Resources Modal */}
      <Modal
        isOpen={showEmergencyInfo}
        onClose={() => setShowEmergencyInfo(false)}
        title="Crisis Support Resources"
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-red-700 dark:text-red-300 mb-2">
              Immediate Crisis Support
            </h3>
            <p className="text-red-600 dark:text-red-400 text-sm mb-3">
              If you're in immediate danger or having thoughts of self-harm, please contact emergency services or a crisis hotline immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 border-red-200 dark:border-red-800">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                988 Suicide & Crisis Lifeline
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                24/7 free and confidential support for people in distress
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('tel:988', '_self')}
                className="w-full"
              >
                <Phone size={14} className="mr-2" />
                Call 988
              </Button>
            </Card>

            <Card className="p-4 border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Crisis Text Line
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Text HOME to 741741 for crisis support via text message
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('sms:741741?body=HOME', '_self')}
                className="w-full"
              >
                <MessageCircle size={14} className="mr-2" />
                Text 741741
              </Button>
            </Card>

            <Card className="p-4 border-green-200 dark:border-green-800">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                SAMHSA National Helpline
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Treatment referral and information service
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('tel:1-800-662-4357', '_self')}
                className="w-full"
              >
                <Phone size={14} className="mr-2" />
                1-800-662-HELP
              </Button>
            </Card>

            <Card className="p-4 border-purple-200 dark:border-purple-800">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Emergency Services
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                For immediate medical emergencies
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('tel:911', '_self')}
                className="w-full"
              >
                <AlertTriangle size={14} className="mr-2" />
                Call 911
              </Button>
            </Card>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
              Additional Resources
            </h4>
            <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
              <li>• National Alliance on Mental Illness (NAMI): 1-800-950-6264</li>
              <li>• Veterans Crisis Line: 1-800-273-8255, Press 1</li>
              <li>• LGBTQ National Hotline: 1-888-843-4564</li>
              <li>• National Domestic Violence Hotline: 1-800-799-7233</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setShowEmergencyInfo(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};