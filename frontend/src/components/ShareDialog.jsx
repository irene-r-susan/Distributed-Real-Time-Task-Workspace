import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

export default function ShareDialog({ list, onClose, onShared }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState('');
  const debounceRef = useRef(null);

  const memberIds = new Set(list.members?.map((m) => m.id) || []);

  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const users = await api.searchUsers(query);
        setResults(users.filter((u) => !memberIds.has(u.id)));
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleShare = async (username) => {
    setSharing(true);
    setMessage('');
    try {
      const data = await api.shareList(list.id, username);
      setMessage(`✓ Shared with ${username}`);
      onShared(data.member);
    } catch (err) {
      setMessage(`✗ ${err.message}`);
    }
    setSharing(false);
  };

  const handleRemove = async (userId) => {
    try {
      await api.removeMember(list.id, userId);
      onShared(null, userId);
    } catch (err) {
      setMessage(`✗ ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md">
        <h3 className="text-lg font-semibold text-indigo-300 mb-1">
          Share "{list.name}"
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          All members can add, edit, and complete tasks.
        </p>

        <div>
          <label className="block text-xs uppercase text-slate-400 font-bold mb-1">Invite by username</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-950 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-100"
            placeholder="Type a username..."
            autoFocus
          />
        </div>

        {results.length > 0 && (
          <div className="mt-2 bg-slate-950 rounded-lg border border-slate-700 max-h-32 overflow-y-auto">
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => handleShare(u.username)}
                disabled={sharing}
                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition disabled:opacity-50"
              >
                {u.username}
              </button>
            ))}
          </div>
        )}

        {list.members?.length > 1 && (
          <div className="mt-4">
            <p className="text-xs uppercase text-slate-500 font-bold mb-2">Current Members</p>
            <div className="space-y-1">
              {list.members
                .filter((m) => m.id !== list.owner_id)
                .map((m) => (
                  <div key={m.id} className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg">
                    <span className="text-sm text-slate-300">{m.username}</span>
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {message && (
          <p className={`mt-3 text-sm ${message.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 rounded transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
