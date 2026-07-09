import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getToken, clearToken, clearUser, getUser } from '../api/client';
import { useSocket } from '../context/SocketContext';
import Sidebar from '../components/Sidebar';
import ListView from '../components/ListView';
import CreateListDialog from '../components/CreateListDialog';
import ShareDialog from '../components/ShareDialog';

export default function Dashboard() {
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [activeList, setActiveList] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const socketRef = useSocket();
  const user = getUser();

  useEffect(() => {
    if (!getToken()) {
      navigate('/');
      return;
    }
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      const data = await api.getLists();
      setLists(data);
      if (data.length > 0 && !activeListId) {
        setActiveListId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchActiveList = useCallback(async () => {
    if (!activeListId) return;
    try {
      const data = await api.getList(activeListId);
      setActiveList(data);
    } catch (err) {
      console.error(err);
    }
  }, [activeListId]);

  useEffect(() => {
    fetchActiveList();
  }, [fetchActiveList]);

  useEffect(() => {
    if (!socketRef?.current || !activeListId) return;
    const socket = socketRef.current;

    socket.emit('join_list', activeListId);

    const refresh = () => fetchActiveList();

    socket.on('task:created', refresh);
    socket.on('task:updated', refresh);
    socket.on('task:deleted', refresh);
    socket.on('list:shared', (data) => {
      if (data.listId === activeListId) fetchActiveList();
    });
    socket.on('list:member_removed', (data) => {
      if (data.listId === activeListId) fetchActiveList();
    });

    return () => {
      socket.emit('leave_list', activeListId);
      socket.off('task:created', refresh);
      socket.off('task:updated', refresh);
      socket.off('task:deleted', refresh);
      socket.off('list:shared');
      socket.off('list:member_removed');
    };
  }, [activeListId, socketRef, fetchActiveList]);

  useEffect(() => {
    if (!socketRef?.current) return;
    const socket = socketRef.current;
    const handleListDeleted = (data) => {
      if (data.listId === activeListId) setActiveListId(null);
      fetchLists();
    };
    socket.on('list:deleted', handleListDeleted);
    return () => socket.off('list:deleted', handleListDeleted);
  }, [activeListId, socketRef]);

  const handleCreateList = async (name, type) => {
    try {
      const list = await api.createList(name, type);
      setShowCreate(false);
      await fetchLists();
      setActiveListId(list.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteList = async (id) => {
    if (!window.confirm('Delete this list and all its tasks?')) return;
    try {
      await api.deleteList(id);
      if (activeListId === id) setActiveListId(null);
      await fetchLists();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    clearToken();
    clearUser();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-400">Task Manager</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-500 hover:text-red-400 transition font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 h-[calc(100vh-57px)]">
        <div className="flex gap-6 h-full">
          <div className="w-64 shrink-0">
            <Sidebar
              lists={lists}
              activeListId={activeListId}
              onSelect={setActiveListId}
              onDeleteList={handleDeleteList}
              onCreateList={() => setShowCreate(true)}
            />
          </div>

          <div className="flex-1">
            {activeList ? (
              <ListView
                key={activeList.id}
                list={activeList}
                onTasksChanged={fetchActiveList}
                onShare={() => setShowShare(true)}
              />
            ) : (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-slate-500 text-lg mb-2">No list selected</p>
                  <p className="text-slate-600 text-sm">Create or select a list from the sidebar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateListDialog
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateList}
        />
      )}

      {showShare && activeList && (
        <ShareDialog
          list={activeList}
          onClose={() => setShowShare(false)}
          onShared={() => fetchActiveList()}
        />
      )}
    </div>
  );
}
