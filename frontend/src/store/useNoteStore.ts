import { create } from 'zustand';
import { Note } from '../types';

interface NoteState {
  notes: Note[];
  currentNote: Note | null;
  isLoading: boolean;
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: number, note: Partial<Note>) => void;
  deleteNote: (id: number) => void;
  setCurrentNote: (note: Note | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useNoteStore = create<NoteState>((set) => ({
  notes: [],
  currentNote: null,
  isLoading: false,

  setNotes: (notes) => set({ notes }),

  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),

  updateNote: (id, updatedNote) => set((state) => ({
    notes: state.notes.map((note) =>
      note.id === id ? { ...note, ...updatedNote } : note
    ),
    currentNote: state.currentNote?.id === id
      ? { ...state.currentNote, ...updatedNote }
      : state.currentNote,
  })),

  deleteNote: (id) => set((state) => ({
    notes: state.notes.filter((note) => note.id !== id),
    currentNote: state.currentNote?.id === id ? null : state.currentNote,
  })),

  setCurrentNote: (note) => set({ currentNote: note }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
