"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import Link from "next/link";
import { ENTITY_LABELS } from "@/lib/utils";
import type { Entity } from "@/generated/prisma/client";

interface EventLink {
  event: { id: string; title: string; date: string | null; entity: Entity };
  role: "HOST" | "SPEAKER";
}

interface Person {
  id: string;
  name: string;
  email: string | null;
  photo: string | null;
  bio: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  _count?: { events: number };
  events?: EventLink[];
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { fetchPeople(); }, []);

  async function fetchPeople() {
    setLoading(true);
    const res = await fetch("/api/people");
    const data = await res.json();
    setPeople(data.people || []);
    setLoading(false);
  }

  function resetForm() {
    setName(""); setEmail(""); setBio("");
    setWebsite(""); setInstagram(""); setLinkedin("");
    setEditingId(null); setShowNew(false);
  }

  function startEdit(p: Person) {
    setEditingId(p.id);
    setName(p.name);
    setEmail(p.email || "");
    setBio(p.bio || "");
    setWebsite(p.website || "");
    setInstagram(p.instagram || "");
    setLinkedin(p.linkedin || "");
    setShowNew(false);
  }

  function startNew() { resetForm(); setShowNew(true); }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const body = { id: editingId, name, email, bio, website, instagram, linkedin };

    await fetch("/api/people", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    resetForm();
    fetchPeople();
  }

  async function handleDelete(id: string) {
    await fetch("/api/people", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleteConfirm(null);
    fetchPeople();
  }

  const inputClass = "w-full rounded-xl border border-border bg-bg-card px-4 py-3 text-text-primary placeholder:text-text-muted/50 focus:border-accent focus:outline-none transition-colors";
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
            <h1 className="font-display text-2xl font-semibold text-text-primary">People</h1>
            <p className="text-sm text-text-muted mt-1">
              Manage hosts, speakers, and collaborators
            </p>
          </div>
          {!isEditing && (
            <button onClick={startNew} className="rounded-full bg-accent hover:bg-accent-hover text-white font-mono text-[13px] font-medium py-2 px-4 transition-colors">
              + New Person
            </button>
          )}
        </div>

        {/* New / Edit form */}
        {isEditing && (
          <div className="rounded-2xl border border-border bg-bg-card p-5 mb-6 space-y-4">
            <h2 className="text-sm font-medium text-text-secondary">
              {editingId ? "Edit Person" : "New Person"}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoFocus className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" type="email" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short bio or description" rows={2} className={`${inputClass} resize-none`} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Website</label>
                <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." type="url" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Instagram</label>
                <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@handle" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>LinkedIn</label>
                <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="Profile URL" className={inputClass} />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleSave} disabled={!name.trim() || saving} className="rounded-full bg-accent hover:bg-accent-hover text-white font-mono text-[13px] font-medium py-2 px-5 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : editingId ? "Save Changes" : "Add Person"}
              </button>
              <button onClick={resetForm} className="text-xs text-text-muted hover:text-text-secondary font-mono">Cancel</button>
            </div>
          </div>
        )}

        {/* People list */}
        {loading ? (
          <div className="text-center py-12 text-text-muted text-sm font-mono">Loading...</div>
        ) : people.length === 0 && !isEditing ? (
          <div className="text-center py-16">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-text-muted mx-auto mb-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <p className="text-text-muted text-sm mb-4">No people yet</p>
            <button onClick={startNew} className="rounded-full bg-accent hover:bg-accent-hover text-white font-mono text-[13px] font-medium py-2 px-4 transition-colors">
              Add your first person
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {people.map((person) => (
              <div key={person.id} className="rounded-2xl border border-border bg-bg-card hover:border-accent/20 transition-colors overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-text-primary text-sm">{person.name}</h3>
                        {person._count && person._count.events > 0 && (
                          <span className="text-xs text-text-muted font-mono">
                            {person._count.events} event{person._count.events !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {person.bio && (
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{person.bio}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {person.email && (
                          <a href={`mailto:${person.email}`} className="text-xs text-text-muted hover:text-accent font-mono">{person.email}</a>
                        )}
                        {person.website && (
                          <a href={person.website} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:text-accent-hover font-mono">Website →</a>
                        )}
                        {person.instagram && (
                          <a href={person.instagram.startsWith("http") ? person.instagram : `https://instagram.com/${person.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-text-muted hover:text-accent font-mono">{person.instagram.startsWith("@") ? person.instagram : `@${person.instagram}`}</a>
                        )}
                        {person.linkedin && (
                          <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-text-muted hover:text-accent font-mono">LinkedIn</a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {person.events && person.events.length > 0 && (
                        <button
                          onClick={() => setExpandedId(expandedId === person.id ? null : person.id)}
                          className="text-xs text-text-muted hover:text-text-secondary font-mono"
                        >
                          {expandedId === person.id ? "Hide" : "History"}
                        </button>
                      )}
                      <button onClick={() => startEdit(person)} className="text-xs text-text-muted hover:text-text-secondary font-mono">Edit</button>
                      {deleteConfirm === person.id ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleDelete(person.id)} className="text-xs text-red-600 font-mono font-medium">Confirm</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs text-text-muted font-mono">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(person.id)} className="text-xs text-text-muted hover:text-red-600 font-mono">Delete</button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Event history */}
                {expandedId === person.id && person.events && person.events.length > 0 && (
                  <div className="border-t border-border-subtle px-4 py-3 bg-bg-base/50">
                    <p className="text-xs text-text-muted uppercase tracking-wider font-mono mb-2">Event History</p>
                    <div className="space-y-1.5">
                      {person.events.map((ep, i) => (
                        <Link
                          key={i}
                          href={`/events/${ep.event.id}`}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-bg-card transition-colors"
                        >
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ep.role === "HOST" ? "bg-accent/10 text-accent" : "bg-[var(--entity-ai-meetup)]/10 text-[var(--entity-ai-meetup)]"}`}>
                            {ep.role === "HOST" ? "Host" : "Speaker"}
                          </span>
                          <span className="text-sm text-text-primary flex-1 truncate">{ep.event.title}</span>
                          <span className="text-xs text-text-muted font-mono">{ENTITY_LABELS[ep.event.entity]}</span>
                          {ep.event.date && (
                            <span className="text-xs text-text-muted font-mono">
                              {new Date(ep.event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
