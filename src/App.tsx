import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { Library } from "./pages/Library";
import { NoteView } from "./pages/NoteView";
import { NewNote } from "./pages/NewNote";
import { Processing } from "./pages/Processing";
import { Settings } from "./pages/Settings";
import { Onboarding } from "./pages/Onboarding";
import { getDb } from "./lib/db";

function App() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const db = await getDb();
        const result = await db.select<{ value: string }[]>("SELECT value FROM settings WHERE key = 'onboarding_complete'");
        setOnboardingComplete(result.length > 0 && JSON.parse(result[0].value) === true);
      } catch {
        setOnboardingComplete(false);
      }
    };
    check();
  }, []);

  if (onboardingComplete === null) return null;

  return (
    <BrowserRouter>
      <Routes>
        {!onboardingComplete && (
          <>
            <Route path="/onboarding" element={<Onboarding onComplete={() => setOnboardingComplete(true)} />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </>
        )}
        {onboardingComplete && (
          <Route element={<Layout />}>
            <Route path="/" element={<Library />} />
            <Route path="/note/:id" element={<NoteView />} />
            <Route path="/new" element={<NewNote />} />
            <Route path="/processing/:id" element={<Processing />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
