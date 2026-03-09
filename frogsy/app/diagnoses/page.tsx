"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";
import DiagnosisManager from "../components/DiagnosisManager";

function DiagnosesPageContent() {
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2>Diagnoses</h2>
          <button
            onClick={() => router.push("/main")}
            className="btn-secondary"
            style={{ fontSize: "var(--text-xs)", padding: "5px 15px" }}
          >
            Back
          </button>
        </div>

        <DiagnosisManager userId={userId} />
      </div>
    </div>
  );
}

export default function DiagnosesPage() {
  return (
    <Suspense fallback={<div className="container"><div className="card">Loading...</div></div>}>
      <DiagnosesPageContent />
    </Suspense>
  );
}
