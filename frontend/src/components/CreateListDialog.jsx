import { useState } from 'react';

export default function CreateListDialog({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('private');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), type);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-sm">
        <h3 className="text-lg font-semibold text-indigo-300 mb-4">Create New List</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase text-slate-400 font-bold mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 px-3 py-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-100"
              placeholder="e.g. Groceries"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-slate-400 font-bold mb-2">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('private')}
                className={`flex-1 py-2 rounded-lg text-sm border transition ${type === 'private' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`}
              >
                🔒 Private
              </button>
              <button
                type="button"
                onClick={() => setType('shared')}
                className={`flex-1 py-2 rounded-lg text-sm border transition ${type === 'shared' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`}
              >
                👥 Shared
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 rounded transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded transition"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
