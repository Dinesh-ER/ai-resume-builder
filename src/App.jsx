import { BrowserRouter, Routes, Route } from "react-router-dom";
import "react-quill-new/dist/quill.snow.css";
// Change the import path below to './exist/Home' for the existing flow or './new/Home' for the new flow
import Homenew from "./new/Home";
import Homeold from "./exist/Home";
import Builder from "./pages/Builder";
import DocEditor from "./pages/DocEditor";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index path="/old" element={<Homeold />} />
        <Route path="/new" element={<Homenew />} />
        <Route path="/" element={<Homeold />} />

        <Route
          path="/builder"
          element={<Builder />}
        />

        <Route
          path="/doc-editor"
          element={<DocEditor />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;