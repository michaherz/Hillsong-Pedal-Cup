import { Route, Routes } from "react-router-dom";
import Public from "./pages/Public";
import Score from "./pages/Score";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Public />} />
      <Route path="/score" element={<Score />} />
    </Routes>
  );
}
