import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, setUser } from '../api/client';

export default function AuthPage() {
  const [tab, setTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (tab === 'signup') {
        await api.signup(username, password);
        setTab('login');
        setUsername('');
        setPassword('');
        return;
      }
      const data = await api.login(username, password);
      setToken(data.token);
      setUser(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-full max-w-md">
        <h1 className="text-3xl font-bold text-indigo-400 mb-6 text-center">
          Task Manager
        </h1>

        <div className="flex mb-6 bg-slate-950 rounded-lg p-1">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${tab === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Login
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${tab === 'signup' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase text-slate-400 font-bold mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-100"
              required
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-slate-400 font-bold mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-100"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold py-2 px-4 rounded transition text-white"
          >
            {tab === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
