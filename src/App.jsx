import { BrowserRouter, Routes, Route } from "react-router-dom";
import "react-quill-new/dist/quill.snow.css";
import Home from "./exist/Home";
import Builder from "./pages/Builder";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/builder"
          element={<Builder />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;