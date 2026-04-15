import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Settings() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-muted rounded-md transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-card rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">About</h2>
          <p className="text-muted-foreground mb-4">
            AI Note Keeper is an AI-powered personal knowledge base with RAG-based question answering.
          </p>
          <p className="text-sm text-muted-foreground">
            Version 1.0.0
          </p>
        </div>
      </main>
    </div>
  );
}
