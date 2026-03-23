import { useCallback, useEffect, useState } from "react";
import { getDb } from "../lib/db";
import type { Note } from "../lib/types";

export function useNotes(options?: {
  folderId?: number | null;
  tagName?: string | null;
  favoritesOnly?: boolean;
  searchQuery?: string;
  sortBy?: "date" | "title" | "duration";
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const db = await getDb();

    let query: string;
    const params: unknown[] = [];

    if (options?.searchQuery) {
      // FTS5 search
      query = `
        SELECT notes.* FROM notes
        JOIN notes_fts ON notes.id = notes_fts.rowid
        WHERE notes_fts MATCH $1
        ORDER BY rank
      `;
      params.push(options.searchQuery);
    } else if (options?.tagName) {
      query = `
        SELECT notes.* FROM notes
        JOIN note_tags ON notes.id = note_tags.note_id
        JOIN tags ON note_tags.tag_id = tags.id
        WHERE tags.name = $1
        ORDER BY notes.created_at DESC
      `;
      params.push(options.tagName);
    } else {
      const conditions: string[] = [];

      if (options?.folderId !== undefined && options.folderId !== null) {
        conditions.push(`folder_id = $${params.length + 1}`);
        params.push(options.folderId);
      }

      if (options?.favoritesOnly) {
        conditions.push("is_favorite = 1");
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const orderBy =
        options?.sortBy === "title"
          ? "title ASC"
          : options?.sortBy === "duration"
          ? "duration_seconds DESC"
          : "created_at DESC";

      query = `SELECT * FROM notes ${where} ORDER BY ${orderBy}`;
    }

    const result = await db.select<Note[]>(query, params);
    setNotes(result);
    setLoading(false);
  }, [options?.folderId, options?.tagName, options?.favoritesOnly, options?.searchQuery, options?.sortBy]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(
    async (note: Partial<Note> & { title: string; source_type: Note["source_type"] }) => {
      const db = await getDb();
      const result = await db.execute(
        `INSERT INTO notes (title, source_type, status, folder_id) VALUES ($1, $2, $3, $4)`,
        [note.title, note.source_type, note.status || "pending", note.folder_id || null]
      );
      await fetchNotes();
      return result.lastInsertId;
    },
    [fetchNotes]
  );

  const updateNote = useCallback(
    async (id: number, updates: Partial<Note>) => {
      const db = await getDb();
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIdx = 1;

      for (const [key, value] of Object.entries(updates)) {
        fields.push(`${key} = $${paramIdx}`);
        values.push(value);
        paramIdx++;
      }

      fields.push(`updated_at = datetime('now')`);
      values.push(id);

      await db.execute(
        `UPDATE notes SET ${fields.join(", ")} WHERE id = $${paramIdx}`,
        values
      );
      await fetchNotes();
    },
    [fetchNotes]
  );

  const deleteNote = useCallback(
    async (id: number) => {
      const db = await getDb();
      await db.execute("DELETE FROM notes WHERE id = $1", [id]);
      await fetchNotes();
    },
    [fetchNotes]
  );

  const toggleFavorite = useCallback(
    async (id: number, currentValue: number) => {
      await updateNote(id, { is_favorite: currentValue ? 0 : 1 } as Partial<Note>);
    },
    [updateNote]
  );

  return { notes, loading, fetchNotes, createNote, updateNote, deleteNote, toggleFavorite };
}
