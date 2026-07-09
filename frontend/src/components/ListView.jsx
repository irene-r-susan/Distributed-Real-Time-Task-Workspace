import { useState } from 'react';
import { api } from '../api/client';
import TaskItem from './TaskItem';

export default function ListView({ list, onTasksChanged, onShare }) {
  const [newTask, setNewTask] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setAdding(true);
    try {
      await api.addTask(list.id, newTask);
      setNewTask('');
      onTasksChanged();
    } catch (err) {
      console.error(err);
    }
    setAdding(false);
  };

  const handleToggle = async (taskId, completed) => {
    try {
      await api.updateTask(taskId, { completed });
      onTasksChanged();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await api.deleteTask(taskId);
      onTasksChanged();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = async (taskId, task) => {
    try {
      await api.updateTask(taskId, { task });
      onTasksChanged();
    } catch (err) {
      console.error(err);
    }
  };

  const tasks = list.tasks || [];
  const incomplete = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-indigo-300">{list.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {list.type === 'shared' ? '👥 Shared' : '🔒 Private'} · {list.owner_name && `by ${list.owner_name}`}
            {list.members?.length > 1 && ` · ${list.members.length} members`}
          </p>
        </div>
        {list.type === 'shared' && (
          <button
            onClick={onShare}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded transition"
          >
            Share
          </button>
        )}
      </div>

      <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Add a task..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          className="flex-1 bg-slate-950 px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-100"
        />
        <button
          type="submit"
          disabled={adding || !newTask.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded disabled:opacity-50 transition"
        >
          Add
        </button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {incomplete.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        ))}

        {completed.length > 0 && (
          <div className="pt-3 mt-3 border-t border-slate-700">
            <p className="text-xs uppercase text-slate-500 font-bold mb-2 tracking-wider">
              Completed ({completed.length})
            </p>
            {completed.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}

        {tasks.length === 0 && (
          <p className="text-slate-500 text-sm text-center mt-12">
            No tasks yet. Add one above!
          </p>
        )}
      </div>
    </div>
  );
}
