"use client"

import { useRef, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Main from './main/page';

export default function Login() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setLoggedIn(!!session);
      setIsLoading(false);
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    const email = emailRef.current?.value;
    const password = passwordRef.current?.value;

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setError(null);
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setError('Login failed. Please check your credentials.');
    } else {
      setLoggedIn(true);
    }
  };

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (loggedIn) return <Main />;

  return (
    <div className="page-wrapper">
      <div className="login-container">
        <div className="card">
          <h2 className="text-center mb-lg">Welcome Back</h2>
          {error && (
            <div className="error-message mb-md">
              {error}
            </div>
          )}
          <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input 
                id="email"
                type="email" 
                placeholder="Enter your email" 
                ref={emailRef}
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input 
                id="password"
                type="password" 
                placeholder="Enter your password" 
                ref={passwordRef}
                disabled={isLoading}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
