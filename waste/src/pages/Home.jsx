import "../assets/style/Home.css";
import React from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer, Cell } from "recharts";

const complaintsData = [
  { month: "Jan", complaints: 4 },
  { month: "Feb", complaints: 5 },
  { month: "Mar", complaints: 3 },
  { month: "Apr", complaints: 7 },
  { month: "May", complaints: 2 },
];

const usersData = [
  { name: "Drivers", value: 4 },
  { name: "Admins", value: 1 },
  { name: "Citizens", value: 6 },

];

const driversData = [
  { month: "Jan", activeCitizens: 2 },
  { month: "Feb", activeCitizens: 1 },
  { month: "Mar", activeCitizens: 2 },
  { month: "Apr", activeCitizens: 0 },
  { month: "May", activeCitizens: 1 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      {/* Sidebar */}
      <div className="sidebar">
        <ul>
          <li>📊 Overview</li>
          <li>📌 Complaints</li>
          <li>🚚 Drivers</li>
          <li>👥 Users</li>
          <li>⚙️ Settings</li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="header">
          <button className="login-btn" onClick={() => navigate("/login")}>Login</button>
          <button className="register-btn" onClick={() => navigate("/register")}>Register</button>

        </header>

        <div className="stats">
          <div className="stat-box">
            <h3>📌 Total Complaints</h3>
            <p>21</p>
          </div>
          <div className="stat-box">
            <h3>👥Active users</h3>
            <p>11</p>
          </div>
          <div className="stat-box">
            <h3>👥 Registered citizens</h3>
            <p>6</p>
          </div>
        </div>

        {/* Charts */}
        <div className="charts-container">
          <div className="chart">
            <h3>Complaints Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={complaintsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="complaints" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart">
            <h3>User Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={usersData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {usersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart">
            <h3>Active citizens Per Month</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={driversData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="activeCitizens" stroke="#ff7300" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
