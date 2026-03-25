import { createRoot } from "react-dom/client";
import "./index.css";
import LiveApp from "./live/LiveApp";
import { buildFirebaseLiveDeps } from "./live/firebaseDeps";

const rootElement = document.getElementById("root");
if (rootElement == null) {
  throw new Error('Failed to find root element "#root".');
}

const root = createRoot(rootElement);
root.render(<LiveApp deps={buildFirebaseLiveDeps()} />);
