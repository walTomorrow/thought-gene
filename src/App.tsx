import { ChatPanel } from "./components/chat/ChatPanel";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Thought Gene</h1>
        <p className="app-subtitle">Chat foundation (single conversation)</p>
      </header>
      <main className="app-main">
        <ChatPanel />
      </main>
    </div>
  );
}
