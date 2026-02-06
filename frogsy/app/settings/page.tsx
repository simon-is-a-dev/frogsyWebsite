"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";
import NotificationManager from "../components/NotificationManager";


function SettingsPageContent() {
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
}, []);
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setCheckingAuth(false);
      } else {
        router.push("/login");
      }
    };
    getUser();
  }, [router]);

  const goBack = () => {
    router.push("/main");
  };

  if (checkingAuth) {
    return (
      <div className="container">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Settings</h2>
          <button
            onClick={goBack}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '5px 15px' }}
          >
            ← Back
          </button>
        </div>

        <NotificationManager userId={userId} />
        
        <div className="mt-lg pt-md" style={{ borderTop: '1px solid rgba(0,0,0,0.1)', marginTop: '2rem' }}>
          <h3>Account</h3>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
            You are signed in as a Frogsy user.
          </p>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }} 
            className="btn-secondary"
            style={{ color: 'var(--color-error)' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="container"><div className="card">Loading...</div></div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
