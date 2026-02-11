"use client";

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import Link from 'next/link';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/main');
      } else {
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push('/main');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleResetPassword = async () => {
    const email = emailRef.current?.value;
    if (!email) {
      setError('Please enter your email address to reset password');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess('Check your email for the password reset link.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    const email = emailRef.current?.value;
    const password = passwordRef.current?.value;

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          // Handle "User already registered" specifically
          if (error.message.includes('already registered') || error.status === 400) {
            throw new Error('This email is already registered. Please log in instead.');
          }
          throw error;
        }
        setSuccess('Sign up successful! Please check your email for verification.');
        setIsLoading(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Redirect handled by onAuthStateChange
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Authentication failed');
    }
  };

  if (isLoading && !success && !error) {
    return (
      <div className="page-wrapper">
        <div className="text-center" style={{ color: '#F5FAF5', textShadow: '2px 2px 0 rgba(0,0,0,0.2)' }}>
          Loading frogs...
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="login-container">
        <div className="card">
          <h2 className="text-center mb-lg">
            {isForgotPassword
              ? 'Recover Password'
              : (isSignUp ? 'Join the Pond' : 'Welcome Back')}
          </h2>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '3rem' }}>
            {isForgotPassword ? '🔑' : (isSignUp ? '🌱' : '🐸')}
          </div>

          {error && (
            <div className="error-message mb-md" style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '1rem',
              borderRadius: '4px',
              border: '2px solid #f87171',
              fontFamily: 'sans-serif',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div className="success-message mb-md" style={{
              backgroundColor: '#dcfce7',
              color: '#166534',
              padding: '1rem',
              borderRadius: '4px',
              border: '2px solid #4ade80',
              fontFamily: 'sans-serif',
              fontSize: '0.9rem'
            }}>
              {success}
            </div>
          )}

          {!success && (
            <form className="login-form" onSubmit={(e) => {
              e.preventDefault();
              if (isForgotPassword) handleResetPassword();
              else handleAuth();
            }}>

              <div className="form-group">
                <label className="form-label" htmlFor="email" style={{ marginBottom: '0.5rem', display: 'block' }}>Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  ref={emailRef}
                  disabled={isLoading}
                />
              </div>

              {!isForgotPassword && (
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="form-label" htmlFor="password">Password</label>
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    ref={passwordRef}
                    disabled={isLoading}
                  />
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: '100%', marginTop: '1.5rem', padding: '1rem' }}>
                {isLoading ? 'Processing...' : (
                  isForgotPassword ? 'Send Reset Link' : (isSignUp ? 'Create Account' : 'Login')
                )}
              </button>
            </form>
          )}

          <div className="text-center" style={{
            marginTop: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            alignItems: 'center',
            width: '100%'
          }}>

            {!isForgotPassword && !success && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError(null);
                  setSuccess(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4CAF50',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.8rem',
                  padding: '10px',
                  lineHeight: '1.5',
                  width: '100%'
                }}
              >
                Forgot your password?
              </button>
            )}

            <button
              className="btn-link"
              onClick={() => {
                if (isForgotPassword) {
                  setIsForgotPassword(false);
                } else {
                  setIsSignUp(!isSignUp);
                }
                setError(null);
                setSuccess(null);
              }}
              disabled={isLoading}
              style={{
                background: 'none',
                border: 'none',
                color: '#2D5A4D',
                cursor: 'pointer',
                fontSize: '0.75rem',
                opacity: 0.9,
                width: '100%',
                lineHeight: '1.6',
                whiteSpace: 'normal',
                padding: '5px'
              }}
            >
              {isForgotPassword
                ? 'Back to Login'
                : (isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}