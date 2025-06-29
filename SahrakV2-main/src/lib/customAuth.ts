import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email_verified: boolean;
  is_active: boolean;
  last_sign_in_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  last_used_at: string;
}

export interface SignUpData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface OTPVerificationData {
  email: string;
  code: string;
  purpose: 'signup' | 'signin' | 'password_reset';
}

// Custom auth client
class CustomAuthClient {
  private currentUser: AuthUser | null = null;
  private currentSession: AuthSession | null = null;
  private listeners: ((user: AuthUser | null) => void)[] = [];

  constructor() {
    this.initializeSession();
  }

  public async initializeSession() {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const session = await this.validateSession(token);
        if (session) {
          this.currentSession = session;
          this.currentUser = await this.getUserById(session.user_id);
          this.notifyListeners();
        } else {
          this.clearLocalSession();
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        this.clearLocalSession();
      }
    }
  }

  private async validateSession(token: string): Promise<AuthSession | null> {
    try {
      const { data, error } = await supabase
        .from('auth_sessions')
        .select('*')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        console.log('Session validation failed:', error);
        return null;
      }

      // Update last_used_at
      await supabase
        .from('auth_sessions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

      return data;
    } catch (error) {
      console.error('Error validating session:', error);
      return null;
    }
  }

  private async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      // Set the user context for RLS
      await supabase.rpc('set_config', {
        setting_name: 'app.current_user_id',
        setting_value: userId,
        is_local: true
      });

      const { data, error } = await supabase
        .from('auth_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error getting user by ID:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  private clearLocalSession() {
    localStorage.removeItem('auth_token');
    this.currentUser = null;
    this.currentSession = null;
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentUser));
  }

  // Add a small delay to ensure React has time to process the auth state change
  private async notifyListenersWithDelay() {
    // Small delay to ensure React state updates properly
    await new Promise(resolve => setTimeout(resolve, 100));
    this.notifyListeners();
  }

  // Generate a 6-digit OTP code
  private generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate a secure session token
  private generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Send OTP via SendGrid
  private async sendOTPEmail(email: string, code: string, purpose: string): Promise<void> {
    try {
      // For development, log the OTP
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 OTP Code for ${email}: ${code}`);
      }

      // Call Supabase Edge Function to send email
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp-email`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code,
          purpose
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Email service error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('OTP email sent successfully:', result.message);
    } catch (error) {
      console.error('Error sending OTP email:', error);
      // Don't throw error here as we still want to save the OTP to database
      // The user can still use the OTP even if email fails
    }
  }

  // Public methods
  async signUp(data: SignUpData): Promise<{ error?: any }> {
    try {
      console.log('Starting sign up process for:', data.email);

      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('auth_users')
        .select('id, email_verified')
        .ilike('email', data.email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError);
        return { error: checkError };
      }

      if (existingUser) {
        if (existingUser.email_verified) {
          return { error: { message: 'User already exists. Please sign in instead.' } };
        }
        // User exists but not verified, continue with OTP process
        console.log('User exists but not verified, sending new OTP');
      } else {
        // Create new user
        console.log('Creating new user...');
        const { error: createError } = await supabase
          .from('auth_users')
          .insert([{
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
            email_verified: false
          }]);

        if (createError) {
          // Check if it's a unique constraint violation (user already exists)
          if (createError.code === '23505' || createError.message?.includes('duplicate') || createError.message?.includes('unique')) {
            console.log('User already exists (race condition), continuing with OTP...');
          } else {
            console.error('Error creating user:', createError);
            return { error: createError };
          }
        }
        console.log('User created successfully');
      }

      // Generate and send OTP
      const code = this.generateOTPCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      console.log('Generating OTP code...');

      // Clean up old OTP codes for this email
      await supabase
        .from('auth_otp_codes')
        .delete()
        .eq('email', data.email)
        .eq('purpose', 'signup');

      // Insert new OTP code
      const { error: otpError } = await supabase
        .from('auth_otp_codes')
        .insert([{
          email: data.email,
          code,
          purpose: 'signup',
          expires_at: expiresAt.toISOString()
        }]);

      if (otpError) {
        console.error('Error saving OTP code:', otpError);
        return { error: otpError };
      }

      console.log('OTP code saved, sending email...');

      // Send OTP email
      await this.sendOTPEmail(data.email, code, 'signup');

      console.log('Sign up process completed successfully');
      return {};
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  }

  async signIn(email: string): Promise<{ error?: any }> {
    try {
      console.log('Starting sign in process for:', email);

      // Check if user exists and is verified
      const { data: user, error: userError } = await supabase
        .from('auth_users')
        .select('id, email_verified, is_active')
        .ilike('email', email)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error checking user:', userError);
        return { error: userError };
      }

      if (!user) {
        return { error: { message: 'No account found with this email. Please sign up first.' } };
      }

      if (!user.email_verified) {
        return { error: { message: 'Please verify your email first. Check your inbox for the verification code.' } };
      }

      if (!user.is_active) {
        return { error: { message: 'Your account has been deactivated. Please contact support.' } };
      }

      // Generate and send OTP
      const code = this.generateOTPCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Clean up old OTP codes for this email
      await supabase
        .from('auth_otp_codes')
        .delete()
        .eq('email', email)
        .eq('purpose', 'signin');

      // Insert new OTP code
      const { error: otpError } = await supabase
        .from('auth_otp_codes')
        .insert([{
          email,
          code,
          purpose: 'signin',
          expires_at: expiresAt.toISOString()
        }]);

      if (otpError) {
        console.error('Error saving OTP code:', otpError);
        return { error: otpError };
      }

      // Send OTP email
      await this.sendOTPEmail(email, code, 'signin');

      console.log('Sign in OTP sent successfully');
      return {};
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  }

  async verifyOTP(data: OTPVerificationData): Promise<{ user?: AuthUser; session?: AuthSession; error?: any }> {
    try {
      console.log('Verifying OTP for:', data.email, 'purpose:', data.purpose);

      // Get and validate OTP code
      const { data: otpResults, error: otpError } = await supabase
        .from('auth_otp_codes')
        .select('*')
        .ilike('email', data.email)
        .eq('code', data.code)
        .eq('purpose', data.purpose)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (otpError && otpError.code !== 'PGRST116') {
        console.error('OTP query error:', otpError);
        return { error: otpError };
      }

      const otpData = otpResults && otpResults.length > 0 ? otpResults[0] : null;

      if (!otpData) {
        // Check if code exists but is expired or used
        const { data: expiredCode } = await supabase
          .from('auth_otp_codes')
          .select('*')
          .ilike('email', data.email)
          .eq('code', data.code)
          .eq('purpose', data.purpose)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (expiredCode) {
          if (expiredCode.used_at) {
            return { error: { message: 'This verification code has already been used.' } };
          }
          if (new Date(expiredCode.expires_at) < new Date()) {
            return { error: { message: 'This verification code has expired. Please request a new one.' } };
          }
        }

        return { error: { message: 'Invalid verification code. Please check and try again.' } };
      }

      // Check attempts
      if (otpData.attempts >= otpData.max_attempts) {
        return { error: { message: 'Too many failed attempts. Please request a new verification code.' } };
      }

      // Mark OTP as used
      await supabase
        .from('auth_otp_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', otpData.id);

      // Get or update user
      let user: AuthUser;
      if (data.purpose === 'signup') {
        // Mark email as verified
        // First, get the user to ensure they exist
        const { data: existingUser, error: getUserError } = await supabase
          .from('auth_users')
          .select('*')
          .ilike('email', data.email)
          .single();
        
        if (getUserError) {
          console.error('Error finding user:', getUserError);
          return { error: { message: 'User not found. Please try signing up again.' } };
        }
        
        if (existingUser.email_verified) {
          console.log('User already verified, proceeding...');
          user = existingUser;
        } else {
          // Update using the user ID instead of email to avoid encoding issues
          const { data: userData, error: updateError } = await supabase
            .from('auth_users')
            .update({ email_verified: true })
            .eq('id', existingUser.id)
            .select()
            .single();

          if (updateError || !userData) {
            console.error('Error verifying email:', updateError);
            return { error: { message: 'Failed to verify email. Please try again.' } };
          }
          
          user = userData;
        }

        // Create user profile
        try {
          // Check if profile already exists to avoid duplicate creation
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();
          
          if (!existingProfile) {
            await supabase
              .from('user_profiles')
              .insert([{
                user_id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone
              }]);
          }
        } catch (profileError) {
          console.error('Error creating user profile:', profileError);
          // Don't fail the auth process if profile creation fails
        }
      } else {
        // Get user for signin
        const { data: userData, error: userError } = await supabase
          .from('auth_users')
          .select('*')
          .ilike('email', data.email)
          .single();

        if (userError || !userData) {
          console.error('Error getting user for signin:', userError);
          return { error: { message: 'User not found.' } };
        }

        user = userData;

        // Update last sign in
        await supabase
          .from('auth_users')
          .update({ last_sign_in_at: new Date().toISOString() })
          .eq('id', user.id);
      }

      // Create session
      const token = this.generateSessionToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const { data: sessionData, error: sessionError } = await supabase
        .from('auth_sessions')
        .insert([{
          user_id: user.id,
          token,
          expires_at: expiresAt.toISOString()
        }])
        .select()
        .single();

      if (sessionError || !sessionData) {
        console.error('Error creating session:', sessionError);
        return { error: { message: 'Failed to create session. Please try again.' } };
      }

      // Store session locally
      localStorage.setItem('auth_token', token);
      this.currentUser = user;
      this.currentSession = sessionData;
      this.notifyListenersWithDelay();

      console.log('OTP verification successful');
      return { user, session: sessionData };
    } catch (error) {
      console.error('OTP verification error:', error);
      return { error };
    }
  }

  async signOut(): Promise<{ error?: any }> {
    try {
      if (this.currentSession) {
        // Delete session from database
        await supabase
          .from('auth_sessions')
          .delete()
          .eq('id', this.currentSession.id);
      }

      this.clearLocalSession();
      await new Promise(resolve => setTimeout(resolve, 100));
      return {};
    } catch (error) {
      this.clearLocalSession(); // Clear local session even if DB operation fails
      return { error };
    }
  }

  async resendOTP(email: string, purpose: 'signup' | 'signin'): Promise<{ error?: any }> {
    try {
      // Check rate limiting (prevent spam)
      const { data: recentOTP } = await supabase
        .from('auth_otp_codes')
        .select('created_at')
        .ilike('email', email)
        .eq('purpose', purpose)
        .gte('created_at', new Date(Date.now() - 60 * 1000).toISOString()) // Last minute
        .maybeSingle();

      if (recentOTP) {
        return { error: { message: 'Please wait 60 seconds before requesting a new code.' } };
      }

      // Generate new OTP
      const code = this.generateOTPCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Clean up old OTP codes
      await supabase
        .from('auth_otp_codes')
        .delete()
        .ilike('email', email)
        .eq('purpose', purpose);

      // Insert new OTP
      const { error: otpError } = await supabase
        .from('auth_otp_codes')
        .insert([{
          email,
          code,
          purpose,
          expires_at: expiresAt.toISOString()
        }]);

      if (otpError) {
        return { error: otpError };
      }

      // Send OTP email
      await this.sendOTPEmail(email, code, purpose);

      return {};
    } catch (error) {
      return { error };
    }
  }

  // Getters
  getUser(): AuthUser | null {
    return this.currentUser;
  }

  getSession(): AuthSession | null {
    return this.currentSession;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentSession !== null;
  }

  // Event listeners
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}

// Export singleton instance
export const customAuth = new CustomAuthClient();

// Helper functions for backward compatibility
export const getCurrentUser = () => customAuth.getUser();
export const getCurrentSession = () => customAuth.getSession();
export const isAuthenticated = () => customAuth.isAuthenticated();