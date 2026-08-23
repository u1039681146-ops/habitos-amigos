import Dashboard from './Dashboard';
import Login from './Login';

type Props = {
  onAuthenticated: (userId: string) => void;
};

export default function Home({ onAuthenticated }: Props) {
  return (
    <div className="app-shell">
      <header className="app-header home-header">
        <div>
          <div className="brand-title">Hábitos entre amigos</div>
          <div className="brand-subtitle">El diario de hábitos del grupo</div>
        </div>
      </header>

      <main className="view-body">
        <Dashboard />

        <p className="section-title home-login-title">Entrar</p>
        <Login onAuthenticated={onAuthenticated} compact />

        <a
          className="castigos-link"
          href="https://drive.google.com/drive/folders/1NaGcEVYoE4EvyTJNGPtHF7evBb1wfJSP"
          target="_blank"
          rel="noopener noreferrer"
        >
          📁 Castigos
        </a>
      </main>
    </div>
  );
}
