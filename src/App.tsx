import { Route, Routes } from "react-router-dom";
import Public from "./pages/Public";
import Score from "./pages/Score";
import PrintTurniermodus from "./pages/PrintTurniermodus";
import PosterSlide from "./pages/PosterSlide";
import AnnouncerTimer from "./pages/AnnouncerTimer";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Public />} />
      <Route path="/score" element={<Score />} />
      <Route path="/print/turniermodus" element={<PrintTurniermodus />} />
      <Route path="/poster" element={<PosterSlide />} />
      <Route path="/timer" element={<AnnouncerTimer />} />
    </Routes>
  );
}
