"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  created_at?: string;
  archived_at?: string | null;
}

export default function MedicationManager({ userId }: { userId: string | null }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchMedications();
    }
  }, [userId]);

  const fetchMedications = async () => {
    if (!userId) return;
    setLoading(true);
    // Fetch ONLY active medications for the manager list
    const { data, error } = await supabase
      .from("medications")
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null) // Only show non-archived
      .order("name");

    if (error) {
      console.error("Error fetching medications:", error);
      // If error is about missing column, we might still want to show data?
      // But we can't filter properly. Just show error or fallback?
      // Assuming user adds the column.
      setError("Failed to load medications. (Ensure 'archived_at' column exists)");
    } else {
      setMedications(data || []);
    }
    setLoading(false);
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    setError(null);
    setIsAdding(true);

    const { data, error } = await supabase
      .from("medications")
      .insert([
        {
          user_id: userId,
          name,
          dosage,
          frequency,
          // created_at is automatic usually
        }
      ])
      .select();

    if (error) {
      console.error("Error adding medication:", error);
      setError("Failed to add medication");
    } else {
      setMedications([...medications, ...(data || [])]);
      // Reset form
      setName("");
      setDosage("");
      setFrequency("");
    }
    setIsAdding(false);
  };

  const handleDeleteMedication = async (id: string) => {
    if (!confirm("Are you sure you want to remove this medication? It will remain in past logs.")) return;

    // Try soft delete: set archived_at to now
    const { error } = await supabase
      .from("medications")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Soft delete failed (likely missing column):", error);
      // Fallback: Hard delete if column is missing
      if (confirm("History preservation requires a database update (missing 'archived_at'). Delete permanently instead?")) {
        const { error: hardError } = await supabase
          .from("medications")
          .delete()
          .eq("id", id);
          
        if (hardError) {
           setError("Failed to delete medication permanently.");
        } else {
           setMedications(medications.filter(med => med.id !== id));
        }
      }
    } else {
      // Remove from UI list
      setMedications(medications.filter(med => med.id !== id));
    }
  };

  if (loading && medications.length === 0) {
    return <div>Loading medications...</div>;
  }

  return (
    <div className="medication-manager">
      <h3>My Medications</h3>
      
      {error && <div className="error-message mb-md">{error}</div>}

      <div className="medication-list mb-lg">
        {medications.length === 0 ? (
          <p className="text-muted">No medications added yet.</p>
        ) : (
          <ul className="list-group">
            {medications.map(med => (
              <li key={med.id} className="list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                <div>
                  <strong>{med.name}</strong>
                  <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                    {med.dosage && <span>{med.dosage} • </span>}
                    {med.frequency && <span>{med.frequency}</span>}
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteMedication(med.id)}
                  className="btn-danger"
                  style={{ 
                    color: '#991b1b', 
                    background: '#fee2e2',
                    border: '1px solid #f87171', 
                    borderRadius: '4px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    marginLeft: '10px'
                  }}
                  title="Delete Medication"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleAddMedication} className="add-medication-form p-md" style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
        <h4 className="mb-sm">Add New Medication</h4>
        
        <div className="form-group mb-sm">
          <label htmlFor="med-name" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Medication Name</label>
          <input
            id="med-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Ibuprofen"
            className="form-control"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div className="form-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="med-dosage" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Dosage (Optional)</label>
            <input
              id="med-dosage"
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. 200mg"
              className="form-control"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="med-freq" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Frequency (Optional)</label>
            <input
              id="med-freq"
              type="text"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="e.g. Daily"
              className="form-control"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isAdding || !name}
          className="btn-primary"
          style={{ width: '100%' }}
        >
          {isAdding ? 'Adding...' : 'Add Medication'}
        </button>
      </form>
    </div>
  );
}
