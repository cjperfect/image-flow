import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import DropZone from "./components/DropZone";

const isDropZone = window.location.search.includes("window=dropzone");

if (isDropZone) {
  document.documentElement.classList.add("dropzone");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isDropZone ? <DropZone /> : <App />}
  </StrictMode>,
);
