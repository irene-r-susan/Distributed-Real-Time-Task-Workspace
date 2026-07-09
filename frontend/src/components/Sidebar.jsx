import { getUser } from '../api/client';

export default function Sidebar({ lists, activeListId, onSelect, onDeleteList, onCreateList }) {
  const user = getUser();
  const owned = lists.filter((l) => l.owner_id === user.id);
  const shared = lists.filter((l) => l.owner_id !== user.id);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-indigo-300">My Lists</h2>
        <button
          onClick={onCreateList}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded transition"
        >
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {owned.length > 0 && (
          <div>
            <p className="text-xs uppercase text-slate-500 font-bold mb-2 tracking-wider">My Lists</p>
            {owned.map((list) => (
              <ListRow
                key={list.id}
                list={list}
                isActive={list.id === activeListId}
                isOwner
                onSelect={onSelect}
                onDelete={onDeleteList}
              />
            ))}
          </div>
        )}

        {shared.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase text-slate-500 font-bold mb-2 tracking-wider">Shared with Me</p>
            {shared.map((list) => (
              <ListRow
                key={list.id}
                list={list}
                isActive={list.id === activeListId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}

        {lists.length === 0 && (
          <p className="text-slate-500 text-sm text-center mt-8">
            No lists yet. Create one!
          </p>
        )}
      </div>
    </div>
  );
}

function ListRow({ list, isActive, isOwner, onSelect, onDelete }) {
  return (
    <div
      onClick={() => onSelect(list.id)}
      className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition ${isActive ? 'bg-indigo-950 border border-indigo-800' : 'hover:bg-slate-750 border border-transparent'}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm">{list.type === 'shared' ? '👥' : '🔒'}</span>
        <span className="text-sm font-medium text-slate-200 truncate">{list.name}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isOwner && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(list.id); }}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs transition p-1"
            title="Delete list"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
