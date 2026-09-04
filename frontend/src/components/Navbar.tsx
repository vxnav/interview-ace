import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';

export function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('interviewace-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('interviewace-theme', theme);
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-dark-base border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-bold text-text-primary hover:text-accent-primary transition-colors duration-200"
        >
          <div className="h-8 w-8 rounded-lg bg-accent-primary flex items-center justify-center text-dark-base font-bold">
            IA
          </div>
          <span>InterviewAce</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(currentTheme => currentTheme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border-subtle text-text-secondary hover:bg-dark-elevated hover:text-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {theme === 'dark' ? <>&#9788;</> : <>&#9790;</>}
            </span>
          </button>
          {isAuthenticated && (
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="md"
              onClick={handleLogout}
            >
              Log out
            </Button>
          </div>
          )}
        </div>
      </div>
    </nav>
  );
}

