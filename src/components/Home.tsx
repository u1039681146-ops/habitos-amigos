import Dashboard from './Dashboard';
import Login from './Login';
import ParticlesBackground from './ParticlesBackground';

type Props = {
  onAuthenticated: (userId: string) => void;
};

export default function Home({ onAuthenticated }: Props) {
  return (
    <div className="app-shell home-shell">
      <ParticlesBackground />
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

        <a
          className="castigos-link"
          href="https://drive.google.com/drive/folders/1kgLWYq0cuXCcsfwe41UG3s2kr-6xaG0F"
          target="_blank"
          rel="noopener noreferrer"
        >
          📁 Testimonios
        </a>
      </main>
    </div>
  );
}
