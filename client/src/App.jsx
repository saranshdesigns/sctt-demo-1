import { Routes, Route, Link } from "react-router-dom";
import ChatPage from "./pages/ChatPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<div className="p-8 text-center"><h1 className="text-xl">Not found</h1><Link to="/" className="text-green-700 underline">Go home</Link></div>} />
    </Routes>
  );
}
