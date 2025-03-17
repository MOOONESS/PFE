import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import destinationIconImg from "../assets/icons/complaint.png";
import "../assets/style/driverDashboard.css";
import "../assets/style/glowingMarker.css";
import { FaLocationArrow } from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";



// Fix Leaflet marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

const DriverDashboard = () => {
  const [geolocation, setGeolocation] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isLocationVisible, setLocationVisibility] = useState(false);
  const [driverId, setDriverId] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const glowingIcon = L.divIcon({
      className: 'glowing-marker-container', // The wrapper class (not animated)
      html: '<div class="glowing-marker"></div>', // This is the glowing effect div
      iconSize: [20, 20], // Ensure it matches the CSS size
      iconAnchor: [10, 10], // Center the icon properly
  });
  

  const handleMarkAsDone = async (complaintId) => {
    try {
      // Update the complaint status to "resolved"
      const response = await axios.put(
  `http://localhost:8000/complaints/${complaintId}/status`,
  { status: "resolved" }, // Send status in the request body
  { headers: { "Content-Type": "application/json" } }
);

    console.log("Complaint updated:", response.data);
  
      // Remove the complaint from the driver's list
      setComplaints(complaints.filter((complaint) => complaint.id !== complaintId));
  
      // Notify the admin (you can adjust this based on your backend setup)
      await axios.post("http://localhost:8000/notifications", {
        message: `Complaint ${complaintId} has been resolved by driver.`,
        recipient: "admin",  // Adjust based on how you manage admin users
      });
  
      alert(`Complaint ${complaintId} has been marked as resolved!`);
  
    } catch (error) {
      console.error("Error updating complaint status:", error);
    }
  };
  
  const mapRef = useRef(null);
  const routingControl = useRef(null);

  const getDriverId = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found!");
        return null;
      }
  
      // Make the request to your API
      const response = await axios.get("http://localhost:8000/driver/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      // Assuming response.data contains an object with citizen_id
      if (response.data) {
        return response.data;
      } else {
        console.error("driver ID not found in response!");
        return null;
      }
    } catch (error) {
      console.error("Error fetching driver ID:", error);
      return null;
    }
  };
  
  useEffect(() => {
    const fetchDriverId = async () => {
      const id = await getDriverId();
      if (id) {
        setDriverId(id);  // set the driver ID in your state
        fetchGeolocation(id); // Fetch geolocation with the ID immediately after setting it
        fetchComplaints(id);  // Fetch complaints with the ID immediately after setting it
      }
    };
  
    fetchDriverId();
  }, []); // Empty dependency array to fetch the driver ID only once
  
  const fetchGeolocation = async (driverId) => {
    try {
      const response = await axios.get(`http://localhost:8000/trucks/${driverId}`);
      const userLocation = {
        latitude: response.data.latitude,
        longitude: response.data.longitude,
      };
      
      setGeolocation(userLocation);
      mapRef.current?.flyTo([userLocation.latitude, userLocation.longitude], 13, {
        animate: true,
        duration: 2,
      });
    } catch (error) {
      console.error("Error fetching driver's geolocation:", error);
      setGeolocation({ latitude: 36.8065, longitude: 7.1815 }); // Default fallback
    }
  };
  
  const fetchComplaints = async (driverId) => {
    try {
      const response = await axios.get(`http://localhost:8000/complaints/assigned/${driverId}`);
      setComplaints(response.data);
    } catch (error) {
      console.error("Error fetching complaints:", error);
    }
  };
  

  const handleLocationToggle = () => {
    if (geolocation) {
      setLocationVisibility(!isLocationVisible);
      mapRef.current?.flyTo([geolocation.latitude, geolocation.longitude], 13, {
        animate: true,
        duration: 2,
      });
    } else {
      alert("Geolocation not available!");
    }
  };

  const findShortestPath = (complaint) => {
    if (!mapRef.current || !geolocation || !complaint) return;

    // Remove existing route if any
    if (routingControl.current) {
      mapRef.current.removeControl(routingControl.current);
    }

    routingControl.current = L.Routing.control({
      waypoints: [
        L.latLng(geolocation.latitude, geolocation.longitude), // Driver's current position
        L.latLng(complaint.latitude, complaint.longitude), // Complaint location
      ],
      createMarker: () => null, // Prevent extra markers
      routeWhileDragging: true,
    }).addTo(mapRef.current);
  };
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("Token"); // Example, adjust if you use session or cookies
    navigate("/login");
  };
  const destinationIcon = L.icon({ iconUrl: destinationIconImg, iconSize: [30, 30] });

  return (
    <div className="dashboard-container1">
      <div className="button-container1">
        <button className="geo-location-btn1" onClick={handleLocationToggle}>
          <FaLocationArrow size={20} />
        </button>
      </div>

      <div className="complaints-list">
        <ul>
          {complaints
            .filter((complaint) => complaint.status === "In progress") // Filter complaints
            .map((complaint) => (
              <li key={complaint.id}>
                <span
                  onClick={() => {
                    setSelectedComplaint(complaint);
                    findShortestPath(complaint);
                  }}
                >
                  Complaint {complaint.id}
                </span>
                <button
                  onClick={() => handleMarkAsDone(complaint.id)}
                  className="done-button"
                >
                  Done
                </button>
              </li>
            ))}
        </ul>
        <button className="Logout1" onClick={handleLogout}>
          Logout
        </button>
      </div>
      
      <div className="map-container1">
        <MapContainer
          center={geolocation ? [geolocation.latitude, geolocation.longitude] : [36.8065, 10.1815]}
          zoom={13}
          ref={mapRef}
          style={{ height: "600px", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          
          {isLocationVisible && geolocation && (
            <Marker position={[geolocation.latitude, geolocation.longitude]} icon={glowingIcon} >
              <Popup>Driver, You are here!</Popup>
            </Marker>
          )}
          
          {selectedComplaint && (
            <Marker position={[selectedComplaint.latitude, selectedComplaint.longitude]} icon={destinationIcon}>
              <Popup>{selectedComplaint.description}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default DriverDashboard;
