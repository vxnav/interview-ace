import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';

export function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

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
    </nav>
  );
}

