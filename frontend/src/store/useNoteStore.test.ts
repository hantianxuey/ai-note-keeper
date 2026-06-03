import { beforeEach, describe, expect, it } from 'vitest';
import { Note } from '../types';
import { useNoteStore } from './useNoteStore';

const note = (id: number, title = `Note ${id}`): Note => ({
  id,
  title,
  user_id: 1,
  content: 'content',
  tags: null,
  category: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
});

describe('useNoteStore', () => {
  beforeEach(() => {
    useNoteStore.setState({ notes: [], currentNote: null, isLoading: false });
  });

  it('sets and prepends notes', () => {
    useNoteStore.getState().setNotes([note(1)]);
    useNoteStore.getState().addNote(note(2));

    expect(useNoteStore.getState().notes.map((item) => item.id)).toEqual([2, 1]);
  });

  it('updates notes and the current note together', () => {
    useNoteStore.setState({ notes: [note(1)], currentNote: note(1) });

    useNoteStore.getState().updateNote(1, { title: 'Updated' });

    expect(useNoteStore.getState().notes[0].title).toBe('Updated');
    expect(useNoteStore.getState().currentNote?.title).toBe('Updated');
  });

  it('deletes notes and clears the current note when needed', () => {
    useNoteStore.setState({ notes: [note(1), note(2)], currentNote: note(2) });

    useNoteStore.getState().deleteNote(2);

    expect(useNoteStore.getState().notes.map((item) => item.id)).toEqual([1]);
    expect(useNoteStore.getState().currentNote).toBeNull();
  });

  it('tracks loading state', () => {
    useNoteStore.getState().setLoading(true);

    expect(useNoteStore.getState().isLoading).toBe(true);
  });
});
