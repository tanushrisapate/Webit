import React, { useState } from 'react';
import { X, Lock, User, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, username: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      onLoginSuccess(data.access_token, username);
      onClose();
      // Reset form
      setUsername('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                <User size={16} />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-zinc-950 border border-zinc-850 focus:border-zinc-650 rounded-xl py-2.5 pl-10 pr-4 text-zinc-100 placeholder-zinc-700 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-850 focus:border-zinc-650 rounded-xl py-2.5 pl-10 pr-10 text-zinc-100 placeholder-zinc-700 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold py-3 rounded-xl transition duration-150 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-zinc-300 hover:text-white underline font-semibold transition"
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
};
