import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, MessageSquare, Search, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNoteStore } from '../store/useNoteStore';
import { notesAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

export default function Home() {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { notes, setNotes, setLoading, isLoading } = useNoteStore();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const response = await notesAPI.list();
      setNotes(response.data.notes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">AI Note Keeper</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar + Main */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 hidden md:block">
          <nav className="space-y-1">
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 rounded-md bg-secondary text-secondary-foreground"
            >
              <FileText size={20} />
              <span>My Notes</span>
            </Link>
            <Link
              to="/chat"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
            >
              <MessageSquare size={20} />
              <span>AI Chat</span>
            </Link>
            <Link
              to="/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
            >
              <Settings size={20} />
              <span>Settings</span>
            </Link>
          </nav>

          <div className="mt-6">
            <Link
              to="/notes/new"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus size={18} />
              <span>New Note</span>
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Search bar */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Notes grid */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="text-lg font-medium mb-2">No notes yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first note to get started with AI-powered knowledge base.
              </p>
              <Link
                to="/notes/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus size={18} />
                Create First Note
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => (
                <Link
                  key={note.id}
                  to={`/notes/${note.id}`}
                  className="block p-4 border rounded-lg hover:shadow-md transition-shadow bg-card"
                >
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {note.title || 'Untitled'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {note.content.replace(/#|```|\*\*/g, '').slice(0, 150)}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                  </div>
                  {note.tags && note.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {note.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* Mobile bottom nav */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t py-3 px-4 flex justify-around">
            <Link to="/" className="flex flex-col items-center gap-1">
              <FileText size={20} />
              <span className="text-xs">Notes</span>
            </Link>
            <Link to="/chat" className="flex flex-col items-center gap-1">
              <MessageSquare size={20} />
              <span className="text-xs">Chat</span>
            </Link>
            <Link to="/notes/new" className="flex flex-col items-center gap-1">
              <div className="p-2 bg-primary text-primary-foreground rounded-full">
                <Plus size={20} />
              </div>
            </Link>
            <Link to="/settings" className="flex flex-col items-center gap-1">
              <Settings size={20} />
              <span className="text-xs">Settings</span>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
