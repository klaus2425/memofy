import { useCallback, useEffect, useState } from "react";
import { getDb } from "../lib/db";
import type { Tag } from "../lib/types";

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);

  const fetchTags = useCallback(async () => {
    const db = await getDb();
    const result = await db.select<Tag[]>("SELECT * FROM tags ORDER BY name");
    setTags(result);
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const createTag = useCallback(
    async (name: string) => {
      const db = await getDb();
      await db.execute("INSERT OR IGNORE INTO tags (name) VALUES ($1)", [name]);
      await fetchTags();
    },
    [fetchTags]
  );

  const addTagToNote = useCallback(
    async (noteId: number, tagName: string) => {
      const db = await getDb();
      await db.execute("INSERT OR IGNORE INTO tags (name) VALUES ($1)", [tagName]);
      const tag = await db.select<Tag[]>("SELECT id FROM tags WHERE name = $1", [tagName]);
      if (tag.length > 0) {
        await db.execute(
          "INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES ($1, $2)",
          [noteId, tag[0].id]
        );
      }
      await fetchTags();
    },
    [fetchTags]
  );

  const removeTagFromNote = useCallback(
    async (noteId: number, tagId: number) => {
      const db = await getDb();
      await db.execute("DELETE FROM note_tags WHERE note_id = $1 AND tag_id = $2", [noteId, tagId]);
    },
    []
  );

  const getNoteTags = useCallback(async (noteId: number): Promise<Tag[]> => {
    const db = await getDb();
    return db.select<Tag[]>(
      "SELECT tags.* FROM tags JOIN note_tags ON tags.id = note_tags.tag_id WHERE note_tags.note_id = $1",
      [noteId]
    );
  }, []);

  return { tags, fetchTags, createTag, addTagToNote, removeTagFromNote, getNoteTags };
}
