// components/LoginPage.tsx
import React, { useState } from 'react';
import type { User } from '../types';
import * as api from '../services/api';

interface LoginPageProps {
  onLogin: (user: User, token: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { user, token } = await api.login(username, password);
      onLogin(user, token);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark">
      <div className="max-w-md w-full bg-white dark:bg-surface-dark p-8 rounded-lg shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-custom-blue-darker">DESSS</h1>
          <p className="text-gray-600 dark:text-gray-300">Digital Exam Scheduling & Supervising System</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <p className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded mb-4">{error}</p>}
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md py-2 px-3 bg-input-light dark:bg-input-dark text-text-light dark:text-text-dark ring-1 ring-inset ring-border-light dark:ring-border-dark placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-custom-blue"
              placeholder="e.g., AOU123"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md py-2 px-3 bg-input-light dark:bg-input-dark text-text-light dark:text-text-dark ring-1 ring-inset ring-border-light dark:ring-border-dark placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-custom-blue"
              placeholder="******************"
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="w-full bg-custom-blue hover:bg-custom-blue-darker text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-custom-blue focus:ring-offset-2 transition duration-300"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;