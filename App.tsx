import React, { useState, useEffect } from 'react';
import type { User } from './types';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import * as api from './services/api';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.setAuthToken(token);
      api.getSelf()
        .then(user => setCurrentUser(user))
        .catch(() => {
          localStorage.removeItem('token');
          api.setAuthToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (userInput: User, token: string) => {
    api.setAuthToken(token);
    try {
      const fullUser = await api.getSelf();
      setCurrentUser(fullUser);
    } catch (err) {
      setCurrentUser(userInput);
    }
  };

  const handleLogout = () => {
    api.setAuthToken(null);
    setCurrentUser(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div>
      {currentUser ? (
        <Dashboard user={currentUser} onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;