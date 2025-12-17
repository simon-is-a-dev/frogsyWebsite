"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

export default function MainPage() {
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Get authenticated user
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleSubmit = async () => {
    if (painLevel === null) {
      setError('Please select a pain level');
      return;
    }

    if (!userId) {
      setError('User not authenticated');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from("pain_entries")
      .upsert(
        [
          {
            user_id: userId,
            pain_date: today,
            pain_level: painLevel,
          },
        ],
        { onConflict: "user_id,pain_date" }
      );

    setIsLoading(false);

    if (error) {
      setError('Failed to log pain level. Please try again.');
      console.error(error);
    } else {
      setSuccess(`Pain level ${painLevel} logged successfully!`);
      setPainLevel(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const goToCalendar = () => {
    router.push("/calendar");
  };

  if (checkingAuth) {
    return (
      <div className="container">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Log Your Pain Level</h2>
          <button 
            onClick={handleLogout} 
            className="btn-secondary" 
            style={{ fontSize: '0.8rem', padding: '5px 10px' }}
          >
            Sign Out
          </button>
        </div>
        
        <p className="text-muted">Select a number from 0 (no pain) to 10 (severe pain)</p>

        {error && (
          <div className="error-message mb-md">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message mb-md">
            {success}
          </div>
        )}

        <div className="pain-level-grid">
          {/* Row 1: 0-2 */}
          <div className="pain-row">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => setPainLevel(i)}
                className={`pain-button ${painLevel === i ? 'selected' : ''}`}
                disabled={isLoading}
              >
                {i}
              </button>
            ))}
          </div>

          {/* Row 2: 3-5 */}
          <div className="pain-row">
            {[3, 4, 5].map((i) => (
              <button
                key={i}
                onClick={() => setPainLevel(i)}
                className={`pain-button ${painLevel === i ? 'selected' : ''}`}
                disabled={isLoading}
              >
                {i}
              </button>
            ))}
          </div>

          {/* Row 3: 6-8 */}
          <div className="pain-row">
            {[6, 7, 8].map((i) => (
              <button
                key={i}
                onClick={() => setPainLevel(i)}
                className={`pain-button ${painLevel === i ? 'selected' : ''}`}
                disabled={isLoading}
              >
                {i}
              </button>
            ))}
          </div>

          {/* Row 4: 9, 10, Submit */}
          <div className="pain-row">
            <button
              onClick={() => setPainLevel(9)}
              className={`pain-button ${painLevel === 9 ? 'selected' : ''}`}
              disabled={isLoading}
            >
              9
            </button>
            <button
              onClick={() => setPainLevel(10)}
              className={`pain-button ${painLevel === 10 ? 'selected' : ''}`}
              disabled={isLoading}
            >
              10
            </button>
            <button
              onClick={handleSubmit}
              disabled={painLevel === null || isLoading}
              className="pain-button btn-submit"
              title="Submit"
            >
              {isLoading ? '...' : '✓'}
            </button>
          </div>

          <div className="pain-row pain-actions">
            <button onClick={goToCalendar} className="btn-secondary" disabled={isLoading}>
              View Calendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}