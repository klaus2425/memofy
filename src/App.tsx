import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Library } from "./pages/Library";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Library />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
