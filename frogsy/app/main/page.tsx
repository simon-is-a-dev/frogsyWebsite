"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../supabaseClient";
import NotificationManager from "../components/NotificationManager";

type SpriteConfig = {
  src: string;
  frameWidth: number;
  frameHeight: number;
  columns: number; // how many frames per row in the sheet's grid
  sheetRows: number; // total rows in the sheet's grid
  frameCount: number;
  fps: number;
  loop: boolean;
};


const FROG_DISPLAY_SIZE = "clamp(110px, 40vw, 240px)";

const painSprites: Record<number, SpriteConfig> = {
  0: { src: "/level0.png", frameWidth: 48, frameHeight: 48, columns: 3, sheetRows: 3, frameCount: 7, fps: 8, loop: true },
  1: { src: "/level1.png", frameWidth: 48, frameHeight: 48, columns: 3, sheetRows: 3, frameCount: 7, fps: 8, loop: true },
  2: { src: "/level2.png", frameWidth: 48, frameHeight: 48, columns: 3, sheetRows: 3, frameCount: 7, fps: 8, loop: true },
  3: { src: "/level3.png", frameWidth: 48, frameHeight: 48, columns: 3, sheetRows: 3, frameCount: 7, fps: 8, loop: true },
  4: { src: "/level4.png", frameWidth: 48, frameHeight: 48, columns: 3, sheetRows: 3, frameCount: 8, fps: 8, loop: true },
  5: { src: "/level5.png", frameWidth: 48, frameHeight: 48, columns: 3, sheetRows: 3, frameCount: 8, fps: 8, loop: true },
  6: { src: "/level6.png", frameWidth: 48, frameHeight: 48, columns: 3, sheetRows: 3, frameCount: 8, fps: 8, loop: true },
  7: { src: "/level7.png", frameWidth: 48, frameHeight: 48, columns: 3, sheetRows: 3, frameCount: 8, fps: 8, loop: true },
  8: { src: "/level8.png", frameWidth: 48, frameHeight: 48, columns: 3, sheetRows: 3, frameCount: 8, fps: 8, loop: true },
  9: { src: "/level9.png", frameWidth: 48, frameHeight: 48, columns: 3, sheetRows: 3, frameCount: 8, fps: 8, loop: true },
  10: { src: "/level10.png", frameWidth: 48, frameHeight: 48, columns: 3, sheetRows: 3, frameCount: 9, fps: 8, loop: true },
};

function AnimatedFrog({
  level,
  sprite,
  onClick,
}: {
  level: number;
  sprite: SpriteConfig;
  onClick?: () => void;
}) {
  const n = sprite.frameCount;
  const duration = n / sprite.fps;
  const animName = `frog-play-${level}`;
  const className = `frog-sprite-${level}`;


  const bgSizeX = sprite.columns * 100;
  const bgSizeY = sprite.sheetRows * 100;

  const keyframeStops = Array.from({ length: n }, (_, i) => {
    const col = i % sprite.columns;
    const row = Math.floor(i / sprite.columns);
    const x = sprite.columns > 1 ? (col / (sprite.columns - 1)) * 100 : 0;
    const y = sprite.sheetRows > 1 ? (row / (sprite.sheetRows - 1)) * 100 : 0;
    const pct = n > 1 ? (i / (n - 1)) * 100 : 0;
    return `${pct.toFixed(4)}% { background-position: ${x}% ${y}%; animation-timing-function: steps(1); }`;
  }).join("\n");

  return (
    <>
     
      <style>{`
        .${className} {
          width: ${FROG_DISPLAY_SIZE};
          aspect-ratio: ${sprite.frameWidth} / ${sprite.frameHeight};
          background-repeat: no-repeat;
          image-rendering: pixelated;
          animation-name: ${animName};
        }
        @keyframes ${animName} {
          ${keyframeStops}
        }
      `}</style>
      <div
        key={level} 
        role="img"
        aria-label={`Frog illustration for pain level ${level}`}
        onClick={onClick}
        className={className}
        style={{
          backgroundImage: `url(${sprite.src})`,
          backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
          animationDuration: `${duration}s`,
          animationIterationCount: sprite.loop ? "infinite" : 1,
          animationFillMode: sprite.loop ? "none" : "forwards",
          cursor: onClick ? "pointer" : "default",
          position: "relative",
          zIndex: 42, 
        }}
      />
    </>
  );
}

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

        // Check if user has initialized their diagnosis
        if (!user.user_metadata?.diagnosis_initialized) {
          const mainDiagnosis = user.user_metadata?.main_diagnosis || "Fibromyalgia";

          // Insert the diagnosis
          await supabase.from("diagnoses").insert([{
            user_id: user.id,
            name: mainDiagnosis,
          }]);

          // Update metadata so this doesn't run again
          await supabase.auth.updateUser({
            data: { diagnosis_initialized: true }
          });
        }

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

  const goToWeightTracker = () => {
    router.push("/weight");
  };

  const goToDiagnoses = () => {
    router.push("/diagnoses");
  };

  const displayedPainLevel = painLevel ?? 0;
  const displayedSprite = painSprites[displayedPainLevel];

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
              <AnimatedFrog
                level={displayedPainLevel}
                sprite={displayedSprite}
                onClick={() => {
                  if (painLevel === 2) {
                    const newCount = clickCount + 1;
                    setClickCount(newCount);

                    if (newCount === 3) {
                      router.push('/dedicated');
                    }
                  }
                }}
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
              <button onClick={goToWeightTracker} className="btn-secondary" disabled={isLoading}>
                Weight Tracker
              </button>
              <button onClick={goToDiagnoses} className="btn-secondary" disabled={isLoading}>
                Diagnoses
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