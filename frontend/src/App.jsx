import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export default function App() {
  // Auth state variables
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('irene');
  const [password, setPassword] = useState('mypassword123');

  // Core application state
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [logMessages, setLogMessages] = useState([]);

  // WebSocket lifecycle hook
  useEffect(() => {
    // Connect directly to our Nginx entrance port (80)
    const socket = io('http://localhost', {
      transports: ['websocket']
    });

    socket.on('connect', () => {
      addSystemLog(`Connected to Real-Time Cluster via Socket ID: ${socket.id}`);
    });

    // Catch live event broadcasts pushed out from the backend Redis highway!
    socket.on('task_created', (data) => {
      addSystemLog(`🚨 Live Event Received: "${data.message}"`);
      // Append the newly created task to our UI list instantly
      setTodos((prevTodos) => [data.task, ...prevTodos]);
    });

    return () => socket.disconnect();
  }, []);

  const addSystemLog = (msg) => {
    setLogMessages((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  // REST API Handler: User Login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        addSystemLog('Successfully authenticated with JWT token!');
      } else {
        alert('Authentication failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // REST API Handler: Create Todo item
  const handleCreateTodo = async (e) => {
    e.preventDefault();
    if (!newTodo) return;
    try {
      await fetch('http://localhost/todo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ task: newTodo })
      });
      setNewTodo(''); // Clear input box field
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <header className="max-w-5xl mx-auto mb-8 pb-4 border-b border-slate-700">
        <h1 className="text-3xl font-bold tracking-tight text-indigo-400">
          Distributed Real-Time Workspace
        </h1>
        <p className="text-slate-400 text-sm mt-1">Nginx Load Balanced Cluster Client</p>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Authentication Controls */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit">
          <h2 className="text-xl font-semibold mb-4 text-indigo-300">1. Cluster Access</h2>
          {!token ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-slate-400 font-bold mb-1">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-950 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs uppercase text-slate-400 font-bold mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold py-2 px-4 rounded transition">Request Session Token</button>
            </form>
          ) : (
            <div className="bg-emerald-950/50 text-emerald-400 p-3 rounded border border-emerald-800 text-sm font-medium">
              ✓ Authenticated Stateless Session Active
            </div>
          )}
        </div>

        {/* Center Column: Task Dashboard Area */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 md:col-span-2 flex flex-col h-[500px]">
          <h2 className="text-xl font-semibold mb-4 text-indigo-300">2. Real-Time Task Thread</h2>
          
          <form onSubmit={handleCreateTodo} className="flex gap-2 mb-6">
            <input 
              type="text" 
              placeholder={token ? "Enter a workspace task item..." : "Please lock in your token access first..."}
              disabled={!token}
              value={newTodo}
              onChange={e => setNewTodo(e.target.value)}
              className="flex-1 bg-slate-950 px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
            <button type="submit" disabled={!token} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2 rounded disabled:opacity-50 transition">Push</button>
          </form>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {todos.length === 0 ? (
              <p className="text-slate-500 text-center text-sm mt-12">No active tasks tracked in current session pool.</p>
            ) : (
              todos.map((todo, idx) => (
                <div key={todo.id || idx} className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex justify-between items-center animate-fadeIn">
                  <span className="font-medium text-slate-200">{todo.task}</span>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">ID: {todo.id}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Footer Block: Live Activity Intercom Logs */}
      <footer className="max-w-5xl mx-auto mt-8 bg-slate-950 p-4 rounded-lg border border-slate-800">
        <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-2">Cluster Intercom Live Streams</h3>
        <div className="font-mono text-xs text-indigo-300 space-y-1 h-24 overflow-y-auto">
          {logMessages.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </footer>
    </div>
  );
}