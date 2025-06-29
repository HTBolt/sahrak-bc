import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { customAuth } from '../lib/customAuth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true); 
  const location = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      try {
        // First, ensure the auth client has fully initialized its session
        await customAuth.initializeSession();
        
        // Check for custom auth session
        const customUser = customAuth.getUser();
        if (customUser) {
          // Convert custom user to Supabase User format for compatibility
          const supabaseUser: User = {
            id: customUser.id,
            app_metadata: {},
            user_metadata: {
              first_name: customUser.first_name,
              last_name: customUser.last_name,
              phone: customUser.phone
            },
            aud: 'authenticated',
            created_at: customUser.created_at,
            email: customUser.email,
            role: 'authenticated',
            email_confirmed_at: customUser.email_verified ? customUser.created_at : null,
          };
          
          setUser(supabaseUser);
        } else {
          // Fallback to Supabase auth (for backward compatibility)
          const { data: { session } } = await supabase.auth.getSession();
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();

    // Listen for custom auth changes
    const unsubscribe = customAuth.onAuthStateChange((customUser) => {
      if (customUser) {
        // Convert custom user to Supabase User format
        const supabaseUser: User = {
          id: customUser.id,
          app_metadata: {},
          user_metadata: {
            first_name: customUser.first_name,
            last_name: customUser.last_name,
            phone: customUser.phone
          },
          aud: 'authenticated',
          created_at: customUser.created_at,
          email: customUser.email,
          role: 'authenticated',
          email_confirmed_at: customUser.email_verified ? customUser.created_at : null,
        };
        
        setUser(supabaseUser);
      } else {
        setUser(null); 
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await customAuth.signOut();
  };

  const value = {
    user,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};