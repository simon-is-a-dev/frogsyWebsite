"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../supabaseClient";
import NotificationManager from "../components/NotificationManager";

const painImages: Record<number, string> = {
  0: "/level0.png",
  1: "/level1 .png",
  2: "/level2.png",
  3: "/level3.png",
  4: "/level4.png",
  5: "/level5.png",
  6: "/level6.png",
  7: "/level7.png",
  8: "/level8.png",
  9: "/level9.png",
  10: "/level10.png",
};

function MainPageContent() {
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  const todayLocal = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      setSelectedDate(dateParam);
    } else {
      setSelectedDate(todayLocal);
    }
  }, [searchParams, todayLocal]);

  useEffect(() => {
    setClickCount(0);
  }, [painLevel]);

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

    const targetDate = selectedDate ?? todayLocal;

    const { error } = await supabase
      .from("pain_entries")
      .upsert(
        [
          {
            user_id: userId,
            pain_date: targetDate,
            pain_level: painLevel,
            notes: notes.trim() === "" ? null : notes.trim(),
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
      setNotes("");
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const goToCalendar = () => {
    router.push("/calendar");
  };

  const goToTrends = () => {
    router.push("/trends");
  };

  const displayedPainLevel = painLevel ?? 0;
  const frogImageSrc = painImages[displayedPainLevel];

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
          <div>
            <h2>Log Your Pain Level</h2>
            {selectedDate && (
              <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                For date: {new Date(selectedDate).toLocaleDateString()}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => router.push("/settings")}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '5px 10px' }}
            >
              Settings
            </button>

          </div>
        </div>


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

        <div className="pain-dial">
          <div className="frog-display">
            <div className="frog-display__header">
              <span className="frog-display__label">Pain level {displayedPainLevel}</span>
              <span className="frog-display__hint">
                {painLevel === null ? "Pick a level to preview your frog" : "Tap save to log this level"}
              </span>
            </div>
            <div className="frog-image-frame">
              <img
                src={frogImageSrc}
                alt={`Frog illustration for pain level ${displayedPainLevel}`}
                className="frog-image"
                onClick={() => {
                  if (painLevel === 2) {
                    const newCount = clickCount + 1;
                    setClickCount(newCount);

                    if (newCount === 3) {
                      router.push('/dedicated');
                    }
                  }
                }}
                style={{ cursor: painLevel === 2 ? 'pointer' : 'default' }}
              />
            </div>
          </div>

          <div className="mb-lg" style={{ width: "100%", maxWidth: 540 }}>
            <label
              htmlFor="pain-notes"
              className="form-label"
              style={{ display: "block", marginBottom: "0.5rem" }}
            >
              Notes (optional)
            </label>
            <textarea
              id="pain-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="The Frogs would love to know what you're feeling"
            />
          </div>

          <div className="pain-level-grid" role="group" aria-label="Select pain level">
            <div className="pain-row">
              {[0, 1, 2].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPainLevel(level)}
                  className={`pain-button ${painLevel === level ? 'selected' : ''}`}
                  data-level={level}
                  disabled={isLoading}
                  aria-pressed={painLevel === level}
                >
                  {level}
                </button>
              ))}
            </div>

            <div className="pain-row">
              {[3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPainLevel(level)}
                  className={`pain-button ${painLevel === level ? 'selected' : ''}`}
                  data-level={level}
                  disabled={isLoading}
                  aria-pressed={painLevel === level}
                >
                  {level}
                </button>
              ))}
            </div>

            <div className="pain-row">
              {[6, 7, 8].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPainLevel(level)}
                  className={`pain-button ${painLevel === level ? 'selected' : ''}`}
                  data-level={level}
                  disabled={isLoading}
                  aria-pressed={painLevel === level}
                >
                  {level}
                </button>
              ))}
            </div>

            <div className="pain-row">
              {[9, 10].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPainLevel(level)}
                  className={`pain-button ${painLevel === level ? 'selected' : ''}`}
                  data-level={level}
                  disabled={isLoading}
                  aria-pressed={painLevel === level}
                >
                  {level}
                </button>
              ))}
              <button
                type="button"
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
              <button onClick={goToTrends} className="btn-secondary" disabled={isLoading}>
                View Trends
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default function MainPage() {
  return (
    <Suspense fallback={<div className="container"><div className="card">Loading...</div></div>}>
      <MainPageContent />
    </Suspense>
  );
}