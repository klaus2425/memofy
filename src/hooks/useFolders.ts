import { useCallback, useEffect, useState } from "react";
import { getDb } from "../lib/db";
import type { Folder } from "../lib/types";

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);

  const fetchFolders = useCallback(async () => {
    const db = await getDb();
    const result = await db.select<Folder[]>("SELECT * FROM folders ORDER BY sort_order, name");
    setFolders(result);
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = useCallback(
    async (name: string) => {
      const db = await getDb();
      await db.execute("INSERT INTO folders (name) VALUES ($1)", [name]);
      await fetchFolders();
    },
    [fetchFolders]
  );

  const renameFolder = useCallback(
    async (id: number, name: string) => {
      const db = await getDb();
      await db.execute("UPDATE folders SET name = $1 WHERE id = $2", [name, id]);
      await fetchFolders();
    },
    [fetchFolders]
  );

  const deleteFolder = useCallback(
    async (id: number) => {
      const db = await getDb();
      await db.execute("UPDATE notes SET folder_id = NULL WHERE folder_id = $1", [id]);
      await db.execute("DELETE FROM folders WHERE id = $1", [id]);
      await fetchFolders();
    },
    [fetchFolders]
  );

  return { folders, fetchFolders, createFolder, renameFolder, deleteFolder };
}
