import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Library } from "./pages/Library";
import { NoteView } from "./pages/NoteView";
import { NewNote } from "./pages/NewNote";
import { Processing } from "./pages/Processing";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Library />} />
          <Route path="/note/:id" element={<NoteView />} />
          <Route path="/new" element={<NewNote />} />
          <Route path="/processing/:id" element={<Processing />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
