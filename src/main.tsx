import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app/App";
import { buildFirebaseLiveDeps } from "./features/discovery/infra/firebaseDeps";

const rootElement = document.getElementById("root");
if (rootElement == null) {
  throw new Error('Failed to find root element "#root".');
}

const root = createRoot(rootElement);
root.render(<App deps={buildFirebaseLiveDeps()} />);
