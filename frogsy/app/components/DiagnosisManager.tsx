"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

interface Diagnosis {
  id: string;
  name: string;
  description: string | null;
  diagnosed_at: string | null;
  created_at?: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
}

interface MedicationDiagnosis {
  medication_id: string;
  diagnosis_id: string;
}

export default function DiagnosisManager({ userId }: { userId: string | null }) {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [linkedMeds, setLinkedMeds] = useState<MedicationDiagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addDiagnosedAt, setAddDiagnosedAt] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDiagnosedAt, setEditDiagnosedAt] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Expanded med-link panels
  const [expandedMedPanel, setExpandedMedPanel] = useState<string | null>(null);
  const [linkingMedId, setLinkingMedId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    const [diagRes, medRes, linkRes] = await Promise.all([
      supabase
        .from("diagnoses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("medications")
        .select("id, name, dosage")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("name"),
      supabase
        .from("medication_diagnoses")
        .select("medication_id, diagnosis_id")
        .eq("user_id", userId),
    ]);

    if (diagRes.error) {
      setError("Failed to load diagnoses. Check that the 'diagnoses' table exists.");
    } else {
      setDiagnoses(diagRes.data || []);
    }
    if (!medRes.error) setMedications(medRes.data || []);
    if (!linkRes.error) setLinkedMeds(linkRes.data || []);

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) fetchAll();
  }, [userId, fetchAll]);

  // ---- ADD ----
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !addName.trim()) return;
    setIsAdding(true);
    setError(null);

    const { data, error } = await supabase
      .from("diagnoses")
      .insert([{
        user_id: userId,
        name: addName.trim(),
        description: addDescription.trim() || null,
        diagnosed_at: addDiagnosedAt || null,
      }])
      .select();

    if (error) {
      setError("Failed to add diagnosis.");
    } else {
      setDiagnoses([...(data || []), ...diagnoses]);
      setAddName("");
      setAddDescription("");
      setAddDiagnosedAt("");
      setShowAddForm(false);
    }
    setIsAdding(false);
  };

  // ---- EDIT ----
  const startEditing = (d: Diagnosis) => {
    setEditingId(d.id);
    setEditName(d.name);
    setEditDescription(d.description || "");
    setEditDiagnosedAt(d.diagnosed_at || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
    setEditDiagnosedAt("");
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setIsSavingEdit(true);
    setError(null);

    const { error } = await supabase
      .from("diagnoses")
      .update({
        name: editName.trim(),
        description: editDescription.trim() || null,
        diagnosed_at: editDiagnosedAt || null,
      })
      .eq("id", id);

    if (error) {
      setError("Failed to update diagnosis.");
    } else {
      setDiagnoses(diagnoses.map(d =>
        d.id === id
          ? { ...d, name: editName.trim(), description: editDescription.trim() || null, diagnosed_at: editDiagnosedAt || null }
          : d
      ));
      cancelEditing();
    }
    setIsSavingEdit(false);
  };

  // ---- DELETE ----
  const handleDelete = async (id: string) => {
    if (!confirm("Remove this diagnosis? This cannot be undone.")) return;
    const { error } = await supabase.from("diagnoses").delete().eq("id", id);
    if (error) {
      setError("Failed to delete diagnosis.");
    } else {
      setDiagnoses(diagnoses.filter(d => d.id !== id));
      setLinkedMeds(linkedMeds.filter(lm => lm.diagnosis_id !== id));
    }
  };

  // ---- MED LINKING ----
  const isLinked = (medId: string, diagId: string) =>
    linkedMeds.some(lm => lm.medication_id === medId && lm.diagnosis_id === diagId);

  const toggleMedLink = async (medId: string, diagId: string) => {
    if (!userId) return;
    setLinkingMedId(medId);

    if (isLinked(medId, diagId)) {
      const { error } = await supabase
        .from("medication_diagnoses")
        .delete()
        .eq("medication_id", medId)
        .eq("diagnosis_id", diagId);
      if (!error) {
        setLinkedMeds(linkedMeds.filter(
          lm => !(lm.medication_id === medId && lm.diagnosis_id === diagId)
        ));
      }
    } else {
      const { error } = await supabase
        .from("medication_diagnoses")
        .insert([{ user_id: userId, medication_id: medId, diagnosis_id: diagId }]);
      if (!error) {
        setLinkedMeds([...linkedMeds, { medication_id: medId, diagnosis_id: diagId }]);
      }
    }
    setLinkingMedId(null);
  };

  const getLinkedMedsForDiagnosis = (diagId: string) =>
    medications.filter(m => isLinked(m.id, diagId));

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    // dateStr is YYYY-MM-DD; parse as local date to avoid timezone offset
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric"
    });
  };

  // ---- RENDER ----
  if (loading) {
    return <div className="text-muted" style={{ fontSize: "var(--text-xs)" }}>Loading diagnoses...</div>;
  }

  return (
    <div className="diagnosis-manager">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3>My Diagnoses</h3>
        <button
          className="btn-primary"
          onClick={() => setShowAddForm(v => !v)}
          style={{ fontSize: "var(--text-xs)", padding: "6px 14px" }}
        >
          {showAddForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {error && <div className="error-message mb-md">{error}</div>}

      {/* ---- ADD FORM ---- */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="diagnosis-form mb-lg">
          <h4 className="mb-sm">New Diagnosis</h4>

          <div className="form-group mb-sm">
            <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-xs)" }}>
              Diagnosis Name <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              type="text"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              required
              placeholder="e.g. Fibromyalgia"
            />
          </div>

          <div className="form-group mb-sm">
            <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-xs)" }}>
              Description (optional)
            </label>
            <textarea
              value={addDescription}
              onChange={e => setAddDescription(e.target.value)}
              rows={3}
              placeholder="Notes about this diagnosis..."
            />
          </div>

          <div className="form-group mb-sm">
            <label style={{ display: "block", marginBottom: "4px", fontSize: "var(--text-xs)" }}>
              Date Diagnosed (optional)
            </label>
            <input
              type="date"
              value={addDiagnosedAt}
              onChange={e => setAddDiagnosedAt(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isAdding || !addName.trim()}
            className="btn-primary"
            style={{ width: "100%" }}
          >
            {isAdding ? "Adding..." : "Add Diagnosis"}
          </button>
        </form>
      )}

      {/* ---- DIAGNOSIS LIST ---- */}
      {diagnoses.length === 0 ? (
        <p className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
          No diagnoses recorded yet. Hit &quot;+ Add&quot; to get started.
        </p>
      ) : (
        <div className="diagnosis-list">
          {diagnoses.map(d => {
            const linkedMedsForThis = getLinkedMedsForDiagnosis(d.id);
            const isPanelOpen = expandedMedPanel === d.id;

            return (
              <div key={d.id} className="diagnosis-card">
                {editingId === d.id ? (
                  /* ---- EDIT FORM ---- */
                  <div>
                    <div className="form-group mb-sm">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        required
                        placeholder="Diagnosis Name"
                        style={{ marginBottom: "8px" }}
                      />
                    </div>
                    <div className="form-group mb-sm">
                      <textarea
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        rows={3}
                        placeholder="Description (optional)"
                        style={{ marginBottom: "8px" }}
                      />
                    </div>
                    <div className="form-group mb-sm">
                      <input
                        type="date"
                        value={editDiagnosedAt}
                        onChange={e => setEditDiagnosedAt(e.target.value)}
                        style={{ marginBottom: "8px" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => saveEdit(d.id)}
                        disabled={isSavingEdit || !editName.trim()}
                        className="btn-primary"
                        style={{ fontSize: "var(--text-xs)", padding: "5px 12px" }}
                      >
                        {isSavingEdit ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={isSavingEdit}
                        className="btn-secondary"
                        style={{ fontSize: "var(--text-xs)", padding: "5px 12px" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ---- VIEW MODE ---- */
                  <>
                    <div className="diagnosis-card__header">
                      <div className="diagnosis-card__info">
                        <strong className="diagnosis-card__name">{d.name}</strong>
                        {d.diagnosed_at && (
                          <span className="diagnosis-card__date">
                            Diagnosed: {formatDate(d.diagnosed_at)}
                          </span>
                        )}
                        {d.description && (
                          <p className="diagnosis-card__desc">{d.description}</p>
                        )}
                      </div>
                      <div className="diagnosis-card__actions">
                        <button
                          onClick={() => startEditing(d)}
                          className="btn-secondary"
                          style={{ fontSize: "var(--text-xs)", padding: "5px 10px" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          style={{
                            fontSize: "var(--text-xs)",
                            padding: "5px 10px",
                            color: "#991b1b",
                            background: "#fee2e2",
                            border: "1px solid #f87171",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Linked medication tags */}
                    {linkedMedsForThis.length > 0 && (
                      <div className="med-tags">
                        {linkedMedsForThis.map(m => (
                          <span key={m.id} className="med-tag">
                            💊 {m.name}{m.dosage ? ` (${m.dosage})` : ""}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Toggle med link panel */}
                    <button
                      className="btn-secondary"
                      onClick={() => setExpandedMedPanel(isPanelOpen ? null : d.id)}
                      style={{
                        marginTop: "10px",
                        fontSize: "var(--text-xs)",
                        padding: "5px 10px",
                        width: "100%",
                      }}
                    >
                      {isPanelOpen ? "▲ Hide Medications" : "▼ Link Medications"}
                    </button>

                    {isPanelOpen && (
                      <div className="med-link-panel">
                        {medications.length === 0 ? (
                          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                            No active medications. Add some in Settings.
                          </p>
                        ) : (
                          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {medications.map(m => (
                              <li key={m.id} className="med-link-item">
                                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "var(--text-xs)" }}>
                                  <input
                                    type="checkbox"
                                    checked={isLinked(m.id, d.id)}
                                    disabled={linkingMedId === m.id}
                                    onChange={() => toggleMedLink(m.id, d.id)}
                                    style={{ width: "18px", height: "18px", accentColor: "var(--color-primary)", flexShrink: 0 }}
                                  />
                                  <span>
                                    <strong>{m.name}</strong>
                                    {m.dosage && <span style={{ color: "var(--color-text-muted)" }}> — {m.dosage}</span>}
                                  </span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
