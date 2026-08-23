import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Habit } from '../types';

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, delta: number) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function formatLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const label = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  return dateStr === todayStr() ? `Hoy · ${label}` : label;
}

export default function Diary() {
  const [date, setDate] = useState(todayStr());
  const [habits, setHabits] = useState<Habit[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('✅');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([api.habits(), api.entriesForDate(date)])
      .then(([habitsRes, entriesRes]) => {
        if (cancelled) return;
        setHabits(habitsRes.habits);
        setDoneIds(new Set(entriesRes.entries.filter((e: { done: boolean }) => e.done).map((e: { habitId: string }) => e.habitId)));
        setNote(entriesRes.note || '');
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date]);

  async function toggle(habitId: string) {
    const willBeDone = !doneIds.has(habitId);
    const next = new Set(doneIds);
    if (willBeDone) next.add(habitId);
    else next.delete(habitId);
    setDoneIds(next);
    try {
      await api.toggleEntry(date, habitId, willBeDone);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    try {
      const res = await api.addHabit(newHabitName.trim(), newHabitEmoji.trim() || '✅');
      setHabits(res.habits);
      setNewHabitName('');
      setNewHabitEmoji('✅');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeHabit(id: string) {
    try {
      const res = await api.removeHabit(id);
      setHabits(res.habits);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function saveNote() {
    try {
      await api.saveNote(date, note);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const isToday = date === todayStr();

  return (
    <div>
      <div className="date-nav">
        <button onClick={() => setDate((d) => addDays(d, -1))} aria-label="Día anterior">
          ‹
        </button>
        <span className="date-label">{formatLabel(date)}</span>
        <button onClick={() => setDate((d) => addDays(d, 1))} disabled={isToday} aria-label="Día siguiente">
          ›
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!loading && (
        <>
          <p className="section-title">Hábitos de hoy</p>
          {habits.length === 0 && <p className="empty-state">Todavía no hay hábitos. Añade el primero abajo.</p>}
          <div className="habit-list">
            {habits.map((h) => (
              <div className="habit-row" key={h.id}>
                <span className="emoji">{h.emoji}</span>
                <span className="habit-name">{h.name}</span>
                <button className="remove-habit" onClick={() => removeHabit(h.id)} title="Eliminar hábito">
                  ✕
                </button>
                <button
                  className={`check-btn ${doneIds.has(h.id) ? 'done' : ''}`}
                  onClick={() => toggle(h.id)}
                  aria-label={`Marcar ${h.name}`}
                >
                  ✓
                </button>
              </div>
            ))}
          </div>

          <form className="add-habit-form" onSubmit={addHabit}>
            <input
              className="emoji-input"
              value={newHabitEmoji}
              onChange={(e) => setNewHabitEmoji(e.target.value)}
              maxLength={2}
            />
            <input
              placeholder="Nuevo hábito (ej. Correr 5km)"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
            />
            <button className="primary-btn" type="submit">
              Añadir
            </button>
          </form>

          <p className="section-title">Diario del día</p>
          <div className="diary-note">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Cuenta cómo te ha ido hoy…"
            />
            <div className="save-row">
              {saved && <span className="saved-tag">Guardado ✓</span>}
              <button className="primary-btn" onClick={saveNote} type="button">
                Guardar nota
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
