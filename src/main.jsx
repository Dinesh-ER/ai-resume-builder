import ReactDOM from "react-dom/client";
import './index.css'
import App from "./App";

import {
  ResumeProvider,
} from "./context/ResumeContent";
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <AuthProvider>
    <ResumeProvider>
      <App />
    </ResumeProvider>
  </AuthProvider>
);