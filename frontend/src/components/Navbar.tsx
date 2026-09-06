import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';

export function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('interviewace-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('interviewace-theme', theme);
    window.dispatchEvent(new Event('interviewace-theme-change'));
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigationItems = [
    { label: 'Dashboard', to: '/dashboard', end: true },
    { label: 'Practice', to: '/start-interview' },
    { label: 'History', to: '/history' },
    { label: 'Analytics', to: '/analytics' },
    { label: 'Resumes', to: '/resumes' },
    { label: 'Profile', to: '/profile' },
  ];

  const isNavigationActive = (to: string) =>
    location.pathname === to ||
    (to === '/start-interview' && location.pathname.startsWith('/interview/')) ||
    (to === '/history' && location.pathname.startsWith('/results/')) ||
    (to === '/resumes' && location.pathname === '/resume-upload');

  return (
    <nav className="bg-dark-base border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-bold text-text-primary hover:text-accent-primary transition-colors duration-200"
        >
          <div className="h-8 w-8 rounded-md bg-accent-primary flex items-center justify-center text-dark-base font-bold">
            IA
          </div>
          <span>InterviewAce</span>
        </Link>
        {isAuthenticated && (
          <div className="order-3 basis-full overflow-x-auto sm:order-none sm:basis-auto sm:flex-1 sm:mx-6">
            <div className="flex min-w-max items-center gap-1">
              {navigationItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-accent-primary ${
                    isActive || isNavigationActive(item.to)
                      ? 'bg-dark-elevated text-accent-primary'
                      : 'text-text-secondary hover:bg-dark-elevated hover:text-text-primary'
                  }`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
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
          <div className="flex items-center">
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

