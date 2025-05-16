import './App.css';
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import Home from './pages/Home';
import CreatePoll from "./pages/CreatePoll";

function App() {
  return (
    <Router>
      <nav className="navbar">
        <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Home
        </NavLink>
        <NavLink to="/create" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          Create Poll
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreatePoll />} />
      </Routes>
    </Router>
  );
}

export default App;
