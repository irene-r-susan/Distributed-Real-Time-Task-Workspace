import { useState } from 'react';

export default function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.task);

  const handleSave = () => {
    if (editText.trim() && editText !== task.task) {
      onEdit(task.id, editText);
    }
    setEditing(false);
  };

  return (
    <div className={`group flex items-start gap-3 p-3 rounded-lg border transition ${task.completed ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-950 border-slate-800'}`}>
      <button
        onClick={() => onToggle(task.id, !task.completed)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-indigo-400'}`}
      >
        {task.completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            className="w-full bg-slate-800 px-2 py-1 rounded text-sm text-slate-100 border border-indigo-500 focus:outline-none"
            autoFocus
          />
        ) : (
          <p
            onClick={() => { if (!task.completed) setEditing(true); }}
            className={`text-sm ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'} cursor-pointer`}
          >
            {task.task}
          </p>
        )}
        <div className="flex gap-3 mt-1">
          {task.created_by_name && !task.completed && (
            <span className="text-xs text-slate-500">by {task.created_by_name}</span>
          )}
          {task.completed_by_name && task.completed && (
            <span className="text-xs text-emerald-600/70">done by {task.completed_by_name}</span>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs transition p-1 shrink-0"
        title="Delete task"
      >
        ✕
      </button>
    </div>
  );
}
