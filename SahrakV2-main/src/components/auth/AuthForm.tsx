import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Mail, Phone, User, ArrowLeft, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { customAuth, getCurrentUser } from '../../lib/customAuth';
import toast from 'react-hot-toast';

interface SignUpForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface SignInForm {
  email: string;
}

type AuthStep = 'form' | 'otp' | 'success';
type AuthMode = 'signin' | 'signup';

const AuthForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [authStep, setAuthStep] = useState<AuthStep>('form');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const signUpForm = useForm<SignUpForm>({
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    }
  });

  const signInForm = useForm<SignInForm>({
    mode: 'onChange',
    defaultValues: {
      email: ''
    }
  });

  // Rate limit countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (rateLimitRemaining > 0) {
      interval = setInterval(() => {
        setRateLimitRemaining(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [rateLimitRemaining]);

  // Check if user is already authenticated and redirect if needed
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      // If there's a stored location, navigate there, otherwise go to dashboard
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [navigate, location]);

  const handleSignUp = async (data: SignUpForm) => {
    if (rateLimitRemaining > 0) {
      toast.error(`Please wait ${rateLimitRemaining} seconds before trying again.`);
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await customAuth.signUp({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone
      });

      if (error) {
        if (error.message?.includes('already exists')) {
          toast.error('An account with this email already exists. Please sign in instead.');
          setAuthMode('signin');
          signInForm.setValue('email', data.email);
          return;
        }
        throw error;
      }

      setEmail(data.email);
      setAuthStep('otp');
      setOtpError(null);
      toast.success('Verification code sent to your email!');
      
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (data: SignInForm) => {
    if (rateLimitRemaining > 0) {
      toast.error(`Please wait ${rateLimitRemaining} seconds before trying again.`);
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await customAuth.signIn(data.email);

      if (error) {
        if (error.message?.includes('No account found')) {
          toast.error('No account found with this email. Please sign up first.');
          setAuthMode('signup');
          signUpForm.setValue('email', data.email);
          return;
        }
        
        if (error.message?.includes('verify your email')) {
          toast.error('Please verify your email first. Check your inbox for the verification code.');
          setEmail(data.email);
          setAuthStep('otp');
          return;
        }
        
        throw error;
      }

      setEmail(data.email);
      setAuthStep('otp');
      setOtpError(null);
      toast.success('Verification code sent to your email!');
      
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    if (isVerifying) return; // Prevent changes during verification
    
    // Clear any previous error when user starts typing
    if (otpError) {
      setOtpError(null);
    }
    
    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = value;
    setOtpDigits(newOtpDigits);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are filled
    if (newOtpDigits.every(digit => digit !== '') && newOtpDigits.join('').length === 6) {
      handleVerifyOtp(newOtpDigits.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (otpCode: string) => {
    if (isVerifying) return; // Prevent multiple simultaneous verifications
    
    setIsVerifying(true);
    setOtpError(null);
    
    try {
      const { user, error } = await customAuth.verifyOTP({
        email,
        code: otpCode,
        purpose: authMode === 'signup' ? 'signup' : 'signin'
      });

      if (error) {
        let errorMessage = error.message || 'Verification failed';
        setOtpError(errorMessage);
        toast.error(errorMessage);
        
        // Clear OTP inputs on error
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 100);
        return;
      }

      if (user) {
        toast.success(`Successfully ${authMode === 'signup' ? 'signed up' : 'signed in'}! Welcome to Sahrak!`);
        setRedirecting(true);
        
        // Force navigation after a short delay to ensure auth state is updated
        setTimeout(() => {
          // If there's a stored location, navigate there, otherwise go to dashboard
          const from = location.state?.from?.pathname || '/';
          navigate(from, { replace: true });
        }, 500);
      }
      
    } catch (error: any) {
      console.error('OTP verification error:', error);
      const errorMessage = error.message || 'Verification failed. Please try again.';
      setOtpError(errorMessage);
      toast.error(errorMessage);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email || rateLimitRemaining > 0) return;
    
    setLoading(true);
    setOtpError(null);
    
    try {
      const { error } = await customAuth.resendOTP(email, authMode === 'signup' ? 'signup' : 'signin');
      
      if (error) {
        if (error.message?.includes('wait')) {
          setRateLimitRemaining(60);
          toast.error('Please wait before requesting a new code.');
          return;
        }
        throw error;
      }
      
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
      toast.success('New verification code sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToAuth = () => {
    setAuthStep('form');
    setEmail('');
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError(null);
    setRateLimitRemaining(0);
    setIsVerifying(false);
    signUpForm.reset();
    signInForm.reset();
  };

  // OTP Step
  if (authStep === 'otp') {
    if (redirecting) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <Card className="w-full max-w-md p-8">
            <div className="text-center">
              <img 
                src="/OG_Sahrak_Gemini2-2.png" 
                alt="Sahrak" 
                className="h-16 w-16 mx-auto mb-6"
              />
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Verification Successful!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Redirecting to your dashboard...
                </p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mt-4"></div>
              </div>
            </div>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <img 
              src="/OG_Sahrak_Gemini2-2.png" 
              alt="Sahrak" 
              className="h-16 w-16 mx-auto mb-6"
            />
            <div className="mb-6">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Enter Verification Code
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                We've sent a 6-digit code to
              </p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {email}
              </p>
            </div>

            {/* Error Message */}
            {otpError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    {otpError}
                  </p>
                </div>
              </div>
            )}

            {/* Rate Limit Warning */}
            {rateLimitRemaining > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    Please wait {rateLimitRemaining} seconds before requesting a new code
                  </p>
                </div>
              </div>
            )}

            {/* Development OTP Display */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Development Mode: Check console for OTP code
                  </p>
                </div>
              </div>
            )}

            {/* OTP Input Fields */}
            <div className="mb-6">
              <div className="flex justify-center space-x-3 mb-4">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className={`w-12 h-12 text-center text-xl font-bold border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                      otpError 
                        ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500/20' 
                        : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500/20'
                    }`}
                    disabled={loading || rateLimitRemaining > 0 || isVerifying}
                  />
                ))}
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter the 6-digit code from your email
              </p>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={handleResendOtp}
                variant="outline"
                className="w-full"
                loading={loading}
                disabled={loading || rateLimitRemaining > 0 || isVerifying}
              >
                {rateLimitRemaining > 0 
                  ? `Wait ${rateLimitRemaining}s` 
                  : 'Resend Code'
                }
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleBackToAuth}
                className="w-full flex items-center justify-center space-x-2"
                disabled={loading || isVerifying}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Main Auth Form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <img 
            src="/OG_Sahrak_Gemini2-2.png" 
            alt="Sahrak" 
            className="h-16 w-16 mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to Sahrak
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your personal health companion
          </p>
        </div>

        {/* Rate Limit Warning */}
        {rateLimitRemaining > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                Too many requests. Please wait {rateLimitRemaining} seconds before trying again.
              </p>
            </div>
          </div>
        )}

        {authMode === 'signup' ? (
          <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                icon={<User size={16} className="text-gray-400" />}
                {...signUpForm.register('firstName', { 
                  required: 'First name is required',
                  minLength: {
                    value: 2,
                    message: 'First name must be at least 2 characters'
                  }
                })}
                error={signUpForm.formState.errors.firstName?.message}
                disabled={rateLimitRemaining > 0}
              />
              <Input
                label="Last Name"
                icon={<User size={16} className="text-gray-400" />}
                {...signUpForm.register('lastName', { 
                  required: 'Last name is required',
                  minLength: {
                    value: 2,
                    message: 'Last name must be at least 2 characters'
                  }
                })}
                error={signUpForm.formState.errors.lastName?.message}
                disabled={rateLimitRemaining > 0}
              />
            </div>
            
            <Input
              label="Email"
              type="email"
              icon={<Mail size={16} className="text-gray-400" />}
              {...signUpForm.register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              error={signUpForm.formState.errors.email?.message}
              disabled={rateLimitRemaining > 0}
            />
            
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+1 (555) 123-4567"
              icon={<Phone size={16} className="text-gray-400" />}
              {...signUpForm.register('phone', { 
                required: 'Phone number is required',
                minLength: {
                  value: 10,
                  message: 'Please enter a valid phone number'
                }
              })}
              error={signUpForm.formState.errors.phone?.message}
              disabled={rateLimitRemaining > 0}
            />

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Secure Verification:</strong> We'll send you a 6-digit code via email to verify your account.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={!signUpForm.formState.isValid || rateLimitRemaining > 0}
            >
              {rateLimitRemaining > 0 ? `Wait ${rateLimitRemaining}s` : 'Create Account'}
            </Button>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  signUpForm.reset();
                }}
                className="text-primary-600 hover:text-primary-500 font-medium"
                disabled={rateLimitRemaining > 0}
              >
                Sign In
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email address"
              icon={<Mail size={16} className="text-gray-400" />}
              {...signInForm.register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              error={signInForm.formState.errors.email?.message}
              disabled={rateLimitRemaining > 0}
            />

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>Quick Access:</strong> We'll send a 6-digit verification code to your email.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={!signInForm.formState.isValid || rateLimitRemaining > 0}
            >
              {rateLimitRemaining > 0 ? `Wait ${rateLimitRemaining}s` : 'Send Verification Code'}
            </Button>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  signInForm.reset();
                }}
                className="text-primary-600 hover:text-primary-500 font-medium"
                disabled={rateLimitRemaining > 0}
              >
                Sign Up
              </button>
            </p>
          </form>
        )}

        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </div>
      </Card>
    </div>
  );
};

export default AuthForm;