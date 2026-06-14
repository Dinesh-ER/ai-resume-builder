import ReactDOM from "react-dom/client";
import './index.css'
import App from "./App";

import {
  ResumeProvider,
} from "./context/ResumeContent";

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <ResumeProvider>
    <App />
  </ResumeProvider>
);