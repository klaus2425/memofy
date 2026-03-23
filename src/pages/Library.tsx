import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useNotes } from "../hooks/useNotes";
import { useTags } from "../hooks/useTags";
import { NoteCard } from "../components/NoteCard";
import { SearchBar } from "../components/SearchBar";
import { EmptyState } from "../components/EmptyState";

export function Library() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title" | "duration">("date");

  const folderId = searchParams.get("folder") ? parseInt(searchParams.get("folder")!) : undefined;
  const tagName = searchParams.get("tag") || undefined;
  const favoritesOnly = searchParams.get("filter") === "favorites";

  const { notes, loading, toggleFavorite } = useNotes({ folderId, tagName, favoritesOnly, searchQuery: searchQuery || undefined, sortBy });
  const { getNoteTags } = useTags();
  const [noteTags, setNoteTags] = useState<Record<number, { id: number; name: string }[]>>({});

  useEffect(() => {
    const loadTags = async () => {
      const tagsMap: Record<number, { id: number; name: string }[]> = {};
      for (const note of notes) { tagsMap[note.id] = await getNoteTags(note.id); }
      setNoteTags(tagsMap);
    };
    if (notes.length > 0) loadTags();
  }, [notes, getNoteTags]);

  const title = favoritesOnly ? "Favorites" : tagName ? `Tag: ${tagName}` : searchQuery ? "Search Results" : "All Notes";
  const handleSearch = useCallback((query: string) => { setSearchQuery(query); }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-4 px-7 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <SearchBar onSearch={handleSearch} />
      </div>
      <div className="flex-1 overflow-y-auto px-7 py-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold">{title}</h1>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "date" | "title" | "duration")} className="text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer" style={{ background: "var(--card-bg)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
            <option value="date">Newest first</option>
            <option value="title">By title</option>
            <option value="duration">By duration</option>
          </select>
        </div>
        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
        ) : notes.length === 0 ? (
          <EmptyState icon={"\u{1F4DD}"} title="No notes yet" message="Create your first note by uploading audio, recording, or pasting a transcript." actionLabel="New Note" onAction={() => navigate("/new")} />
        ) : (
          notes.map((note) => (<NoteCard key={note.id} note={note} tags={noteTags[note.id] || []} onToggleFavorite={toggleFavorite} onClick={() => navigate(`/note/${note.id}`)} />))
        )}
      </div>
    </div>
  );
}
