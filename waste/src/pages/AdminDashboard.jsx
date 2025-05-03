import "../assets/style/adminDashboard.css";
import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, Select, MenuItem } from "@mui/material";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import truckIcon from "../assets/icons/truck.png"; // Import truck icon
import pendingIcon from "../assets/icons/complaint.png";
import progressIcon from "../assets/icons/progress.png";
import { useNavigate } from "react-router-dom";
import resolvedIcon from "../assets/icons/resolved.png";

const AdminDashboard = () => {
    const complaintIconInstance = (status) => {
        let iconUrl = pendingIcon;
    
        if (status === "In progress") {
            iconUrl = progressIcon;
        } else if (status === "resolved") {
            iconUrl = resolvedIcon;
        }
    
        return new L.Icon({
            iconUrl: iconUrl,
            iconSize: [20, 20],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
        });
    };

    const truckIconInstance = new L.divIcon({
        className: "bouncing-truck", // Apply CSS animation
        html: `<img src="${truckIcon}" width="26" height="26"/>`, 
        iconSize: [26, 26],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
    const [notifications, setNotifications] = useState([]);
    const fetchNotifications = async () => {
        try {
            const response = await fetch("http://localhost:8000/notifications");
            if (!response.ok) throw new Error("Failed to fetch notifications");
            const data = await response.json();
            setNotifications(data);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };
    useEffect(() => {
        fetchNotifications();
    }, []);



    const [complaints, setComplaints] = useState([]);
    const [trucks, setTrucks] = useState([]);

    useEffect(() => {
        fetchTrucks(); // Fetch trucks initially
    }, []);


    useEffect(() => {
        const eventSource = new EventSource("http://localhost:8000/complaints/");
    
        eventSource.addEventListener("initial", (event) => {
          const data = JSON.parse(event.data);
          setComplaints(data);
          console.log("Initial complaints:", data);
        });
    
        eventSource.addEventListener("update", (event) => {
          const data = JSON.parse(event.data);
          setComplaints(data);
          console.log("Updated complaints:", data);
        });
    
        eventSource.addEventListener("ping", () => {
          console.log("Keep-alive ping received");
        });
    
        eventSource.onerror = (err) => {
          console.error("SSE error:", err);
          eventSource.close();
        };
    
        return () => {
          eventSource.close();
        };
      }, []);


    const fetchTrucks = async () => {
        const response = await fetch("http://localhost:8000/trucks");
        const data = await response.json();
        setTrucks(data);
    };

    const handleAssignTruck = async (complaintId, truckId) => {
        const complaint = complaints.find(c => c.id === complaintId);
   
        if (!complaint) {
            console.error("Complaint not found");
            return;
        }
   
        if (complaint.status !== "pending") {
            alert("Only pending complaints can be assigned a truck!");
            return;
        }
   
        // Update local state
        const updatedComplaints = complaints.map(c =>
            c.id === complaintId ? { ...c, status: "in progress", assignedTruck: truckId } : c
        );
        setComplaints(updatedComplaints);
   
        try {
            const response = await fetch(`http://localhost:8000/assign_complaint/${complaintId}/${truckId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
            });
   
            if (!response.ok) {
                throw new Error("Failed to assign truck");
            }
            alert(`Complaint ${complaintId} has been assigned to Truck ${truckId}`); 
            console.log(`Assigned truck ${truckId} to complaint ${complaintId}`);
        } catch (error) {
            console.error("Error assigning truck:", error);
            alert("Failed to assign truck. Please try again.");
        }
    };
    const navigate = useNavigate();

    const handleLogout = () => {
      localStorage.removeItem("Token"); // Example, adjust if you use session or cookies
      navigate("/login");};


    const complaintStatusData = {
        labels: ["Pending", "In Progress", "Resolved"],
        datasets: [
            {
                label: "Complaint Status",
                data: [
                    complaints.filter(c => c.status === "pending").length,
                    complaints.filter(c => c.status === "In progress").length,
                    complaints.filter(c => c.status === "resolved").length,
                ],
                backgroundColor: ["darkred", "darkblue", "darkgreen"],
            },
        ],
    };

    return (
        <Box className="dashboard-container">
            {/* Map Section */}
            <Paper elevation={3} className="map-container">
                <MapContainer center={[36.8065, 10.1815]} zoom={11} className="map-content">
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                    
                    {/* Complaint Markers */}
                    {complaints.map((c) => (
                        <Marker
                            key={c.id}
                            position={[c.latitude, c.longitude]}
                            icon={complaintIconInstance(c.status)} // Use complaint icon
                        >
                            <Popup>
                                <Typography>{c.description}</Typography>
                                {/* Only show the "Assign Truck" dropdown if the complaint is "pending" */}
                                {c.status === "pending" && (
                                    <Select
                                        defaultValue=""
                                        onChange={(e) => handleAssignTruck(c.id, e.target.value)}
                                    >
                                        <MenuItem value="">Assign Truck</MenuItem>
                                        {trucks.map((t) => (
                                            <MenuItem key={t.id} value={t.id}>{`Truck ${t.id}`}</MenuItem>
                                        ))}
                                    </Select>
                                )}
                                {/* Display an error message if the complaint is not "pending" */}
                                {c.status !== "pending" && (
                                    <Typography color="error" variant="body2">
                                    </Typography>
                                )}
                            </Popup>
                        </Marker>
                    ))}

                    
                    {/* Truck Markers */}
                    {trucks.map((t) => (
                        t.latitude && t.longitude ? (
                            <Marker
                                key={t.id}
                                position={[t.latitude, t.longitude]} // Use truck's lat and long
                                icon={truckIconInstance} // Use truck icon
                            >
                                <Popup>
                                    <Typography>Truck ID: {t.id}</Typography>
                                </Popup>
                            </Marker>
                        ) : null
                    ))}
                </MapContainer>
                <button className="Logout2" onClick={handleLogout}>
                    Logout
                </button>
            </Paper>
            <div className="right-section">
            {/* Chart Section */}
            <Paper className="stats-container">
                <Bar data={complaintStatusData} />
            </Paper>

            <Paper className="notification-container">
                <Typography variant="h6">Notifications</Typography>
                {notifications.length > 0 ? (
                    notifications
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // Sort by time in descending order
                    .slice(0, 3) // Get only the last 3 notifications
                    .map((n) => (
                        <Typography key={n.id} className="notification-item">
                        {n.message} - {new Date(n.created_at).toLocaleString()}
                        </Typography>
                    ))
                ) : (
                    <Typography>No new notifications</Typography>
                )}
            </Paper>


            </div>

        </Box>
    );
};

export default AdminDashboard;

