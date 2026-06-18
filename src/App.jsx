import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import "react-quill-new/dist/quill.snow.css";
import Home from "./exist/Home";
import Builder from "./pages/Builder";
import LoginPage from "./pages/Login";
import { useAuth } from "./context/AuthContext";

function ProtectedRoute() {
  const { user, loading } = useAuth();
  console.log("loading", loading);
  if (loading) {
    return (
      <div className="loadercontainer">
        <div className="loader"></div>
        <p>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/builder" element={<Builder />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;