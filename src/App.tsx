import { Route, Routes } from "react-router-dom";
import Public from "./pages/Public";
import Score from "./pages/Score";
import PrintTurniermodus from "./pages/PrintTurniermodus";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Public />} />
      <Route path="/score" element={<Score />} />
      <Route path="/print/turniermodus" element={<PrintTurniermodus />} />
    </Routes>
  );
}
