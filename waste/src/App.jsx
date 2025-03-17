import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import CitizenDashboard from "./pages/CitizenDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PrivateRoute from "./pages/PrivateRoute"; // Import PrivateRoute

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Private Routes for Admin */}
        <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
        </Route>

        {/* Private Routes for Driver */}
        <Route element={<PrivateRoute allowedRoles={["driver"]} />}>
          <Route path="/driver-dashboard" element={<DriverDashboard />} />
        </Route>

        {/* Private Routes for Citizen */}
        <Route element={<PrivateRoute allowedRoles={["citizen"]} />}>
          <Route path="/citizen-dashboard" element={<CitizenDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
