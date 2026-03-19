"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import Link from "next/link";

interface Venue {
  id: string;
  name: string;
  address: string | null;
  mapsUrl: string | null;
  photo: string | null;
  notes: string | null;
  _count?: { events: number };
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchVenues();
  }, []);

  async function fetchVenues() {
    setLoading(true);
    const res = await fetch("/api/venues");
    const data = await res.json();
    setVenues(data.venues || []);
    setLoading(false);
  }

  function resetForm() {
    setName("");
    setAddress("");
    setMapsUrl("");
    setNotes("");
    setEditingId(null);
    setShowNew(false);
  }

  function startEdit(venue: Venue) {
    setEditingId(venue.id);
    setName(venue.name);
    setAddress(venue.address || "");
    setMapsUrl(venue.mapsUrl || "");
    setNotes(venue.notes || "");
    setShowNew(false);
  }

  function startNew() {
    resetForm();
    setShowNew(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);

    const body = { id: editingId, name, address, mapsUrl, notes };

    if (editingId) {
      await fetch("/api/venues", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setSaving(false);
    resetForm();
    fetchVenues();
  }

  async function handleDelete(id: string) {
    await fetch("/api/venues", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleteConfirm(null);
    fetchVenues();
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-bg-card px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:border-accent focus:outline-none transition-colors";
  const labelClass = "block text-xs text-text-muted mb-1.5 uppercase tracking-wider font-mono";

  const isEditing = editingId || showNew;

  return (
    <div className="min-h-screen bg-bg-base">
      <Header />
      <main className="mx-auto max-w-2xl px-5 sm:px-0 pt-8 pb-12">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard" className="text-xs text-text-muted hover:text-accent font-mono mb-2 inline-block">
              ← Dashboard
            </Link>
            <h1 className="font-display text-2xl font-semibold text-text-primary">Venues</h1>
            <p className="text-sm text-text-muted mt-1">
              Manage reusable locations for your events
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={startNew}
              className="rounded-full bg-accent hover:bg-accent-hover text-white font-mono text-[13px] font-medium py-2 px-4 transition-colors"
            >
              + New Venue
            </button>
          )}
        </div>

        {/* New / Edit form */}
        {isEditing && (
          <div className="rounded-2xl border border-border bg-bg-card p-5 mb-6 space-y-4">
            <h2 className="text-sm font-medium text-text-secondary">
              {editingId ? "Edit Venue" : "New Venue"}
            </h2>

            <div>
              <label className={labelClass}>Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kin Haus"
                autoFocus
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Koh Phangan, Thailand"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Google Maps Link</label>
              <input
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                type="url"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes about this venue"
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="rounded-full bg-accent hover:bg-accent-hover text-white font-mono text-[13px] font-medium py-2 px-5 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Venue"}
              </button>
              <button
                onClick={resetForm}
                className="text-xs text-text-muted hover:text-text-secondary font-mono"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Venue list */}
        {loading ? (
          <div className="text-center py-12 text-text-muted text-sm font-mono">Loading...</div>
        ) : venues.length === 0 && !isEditing ? (
          <div className="text-center py-16">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-text-muted mx-auto mb-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <p className="text-text-muted text-sm mb-4">No venues yet</p>
            <button
              onClick={startNew}
              className="rounded-full bg-accent hover:bg-accent-hover text-white font-mono text-[13px] font-medium py-2 px-4 transition-colors"
            >
              Add your first venue
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {venues.map((venue) => (
              <div
                key={venue.id}
                className="rounded-2xl border border-border bg-bg-card p-4 hover:border-accent/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-text-primary text-sm">{venue.name}</h3>
                    {venue.address && (
                      <p className="text-xs text-text-muted mt-0.5">{venue.address}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {venue.mapsUrl && (
                        <a
                          href={venue.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:text-accent-hover font-mono"
                        >
                          Maps →
                        </a>
                      )}
                      {venue._count && venue._count.events > 0 && (
                        <span className="text-xs text-text-muted font-mono">
                          {venue._count.events} event{venue._count.events !== 1 ? "s" : ""}
                        </span>
                      )}
                      {venue.notes && (
                        <span className="text-xs text-text-muted truncate max-w-[200px]" title={venue.notes}>
                          {venue.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(venue)}
                      className="text-xs text-text-muted hover:text-text-secondary font-mono"
                    >
                      Edit
                    </button>
                    {deleteConfirm === venue.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(venue.id)}
                          className="text-xs text-red-600 font-mono font-medium"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs text-text-muted font-mono"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(venue.id)}
                        className="text-xs text-text-muted hover:text-red-600 font-mono"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
