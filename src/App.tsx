import { useEffect, useState } from 'react';
import Avisos from './components/Avisos';
import Chat from './components/Chat';
import Dashboard from './components/Dashboard';
import Diary from './components/Diary';
import Home from './components/Home';
import { api, clearSession, getStoredUserId, getToken } from './lib/api';
import { colorForIndex, uniqueInitials } from './lib/colors';
import type { Profile } from './types';

export default function App() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [view, setView] = useState<'diary' | 'dashboard' | 'chat' | 'avisos'>('dashboard');

  useEffect(() => {
    api.profiles().then((data) => setProfiles(data.users)).catch(() => {});
  }, []);

  useEffect(() => {
    const storedId = getStoredUserId();
    const token = getToken();
    if (!storedId || !token) {
      setCheckingSession(false);
      return;
    }
    api
      .habits()
      .then(() => setUserId(storedId))
      .catch(() => clearSession())
      .finally(() => setCheckingSession(false));
  }, []);

  function handleLogout() {
    clearSession();
    setUserId(null);
    setView('dashboard');
  }

  if (checkingSession) {
    return (
      <div className="app-shell">
        <div className="login-screen" />
      </div>
    );
  }

  if (!userId) {
    return <Home onAuthenticated={setUserId} />;
  }

  const me = profiles.find((p) => p.id === userId);
  const meIndex = profiles.findIndex((p) => p.id === userId);
  const color = colorForIndex(meIndex < 0 ? 0 : meIndex);
  const myInitials = uniqueInitials(profiles)[userId] || '?';

  return (
    <div className="app-shell">
      <div className={`top-bar ${view === 'chat' ? 'top-bar-sticky' : ''}`}>
        <header className="app-header">
          <div className="who">
            <span className="avatar-dot" style={{ background: color }}>
              {myInitials}
            </span>
            <div>
              <div className="greeting">Hola,</div>
              <div className="name">{me?.name ?? userId}</div>
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={handleLogout}>
              Salir
            </button>
          </div>
        </header>

        <nav className="tab-bar">
          <button className={`tab-btn ${view === 'diary' ? 'active' : ''}`} onClick={() => setView('diary')}>
            Diario
          </button>
          <button className={`tab-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            Dashboard
          </button>
          <button className={`tab-btn ${view === 'chat' ? 'active' : ''}`} onClick={() => setView('chat')}>
            Chat
          </button>
          <button className={`tab-btn ${view === 'avisos' ? 'active' : ''}`} onClick={() => setView('avisos')}>
            Avisos
          </button>
        </nav>
      </div>

      <main className={view === 'chat' ? 'view-body view-body-chat' : 'view-body'}>
        {view === 'diary' && <Diary />}
        {view === 'dashboard' && <Dashboard myUserId={userId} />}
        {view === 'chat' && <Chat profiles={profiles} myUserId={userId} />}
        {view === 'avisos' && <Avisos />}
      </main>
    </div>
  );
}
