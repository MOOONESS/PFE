import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import pendingIcon from "../assets/icons/complaint.png";
import progressIcon from "../assets/icons/progress.png";
import resolvedIcon from "../assets/icons/resolved.png";
import { Pie } from "react-chartjs-2"; 
import "leaflet/dist/leaflet.css";
import "../assets/style/citizenDashboard.css";
import "../assets/style/glowingMarker.css";
import { Chart, ArcElement } from 'chart.js';
import { FaLocationArrow } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
Chart.register(ArcElement);
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

const CitizenDashboard = () => {
  const [geolocation, setGeolocation] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [isLocationVisible, setLocationVisibility] = useState(false);
  const [isComplaintFormVisible, setComplaintFormVisibility] = useState(false);
  const [complaintPosition, setComplaintPosition] = useState(null);
  const [complaintDescription, setComplaintDescription] = useState("");
  const [citizenId, setCitizenId] = useState(null);
  const mapRef = useRef();
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
  const glowingIcon = L.divIcon({
    className: 'glowing-marker-container',
    html: '<div class="glowing-marker"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  const getCitizenId = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found!");
        return null;
      }
      const response = await axios.get("http://localhost:8000/citizen/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        return response.data;
      } else {
        console.error("Citizen ID not found in response!");
        return null;
      }
    } catch (error) {
      console.error("Error fetching citizen ID:", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchCitizenId = async () => {
      const id = await getCitizenId();
      if (id) setCitizenId(id);
    };
    fetchCitizenId();
  }, []);

  useEffect(() => {
    const fetchGeolocation = async () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setGeolocation(userLocation);
          },
          (error) => {
            console.error("Error fetching geolocation:", error);
          }
        );
      } else {
        console.error("Geolocation is not supported by this browser.");
      }
    };

    const fetchComplaints = async () => {
      if (citizenId) {
        try {
          const response = await axios.get(`http://localhost:8000/complaints/${citizenId}`);
          setComplaints(response.data);
        } catch (error) {
          console.error("Error fetching complaints:", error);
        }
      }
    };
    fetchGeolocation();
    fetchComplaints();
  }, [citizenId]);

  // const complaintIcon = L.icon({ iconUrl: complaintIconImg, iconSize: [25, 25] });

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

  const handleComplaintClick = () => {
    setComplaintFormVisibility(true);
    setComplaintPosition(null);
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        if (isComplaintFormVisible) {
          setComplaintPosition([e.latlng.lat, e.latlng.lng]);
        }
      },
    });
    return null;
  };

  const handleSubmitComplaint = async () => {
    if (!complaintPosition || !complaintDescription) {
      alert("Please set a location and provide a description before submitting.");
      return;
    }

    const newComplaint = {
      citizen_id: citizenId,
      description: complaintDescription,
      latitude: complaintPosition[0], 
      longitude: complaintPosition[1], 
      status: "pending",
    };

    try {
      await axios.post("http://localhost:8000/complaints/", newComplaint);
      alert("Complaint submitted successfully!");
      setComplaintFormVisibility(false);
      setComplaintPosition(null);
      setComplaintDescription("");
      setComplaints((prev) => [...prev, newComplaint]); 
    } catch (error) {
      console.error("Error submitting complaint:", error);
    }
  };
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("Token"); // Example, adjust if you use session or cookies
    navigate("/login");
  };
  const getChartData = () => {
    const statusCount = complaints.reduce((acc, complaint) => {
      acc[complaint.status] = (acc[complaint.status] || 0) + 1;
      return acc;
    }, {});
  
    const labels = Object.keys(statusCount);
    const data = Object.values(statusCount);
    const colors = labels.map((_, index) => ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"][index % 4]);
  
    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        hoverBackgroundColor: colors.map(color => color + "B3"),
      }],
    };
  };

  const chartOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: function(tooltipItem) {
            const label = tooltipItem.label || '';
            const value = tooltipItem.raw || 0;
            return `${label}: ${value}`;
          }
        }
      }
    }
  };

  return (
    
    <div className="dashboard-container0">

      <div className="button-container0">
        <button className="geo-location-btn0" onClick={handleLocationToggle}>
          <FaLocationArrow size={20} />
        </button>
        <button className="post-complaint-btn0" onClick={handleComplaintClick}>
          P
        </button>
      </div>
      <button className="Logout0" onClick={handleLogout}>
          Logout
      </button>

      <div className="map-container0">
        <MapContainer
          center={geolocation ? [geolocation.latitude, geolocation.longitude] : [36.8065, 10.1815]}
          zoom={13}
          ref={mapRef}
          style={{ height: "600px", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler />
          
          {isLocationVisible && geolocation && (
            <Marker position={[geolocation.latitude, geolocation.longitude]} icon={glowingIcon}>
              <Popup>You are here, citizen!</Popup>
            </Marker>
          )}

          {complaints
            // .filter(complaint => complaint.status === "pending")
            .map((complaint, index) =>
              complaint.latitude && complaint.longitude ? (
                <Marker key={index} position={[complaint.latitude, complaint.longitude]} icon={complaintIconInstance(complaint.status)}>
                  <Popup>{complaint.description}</Popup>
                </Marker>
              ) : null
            )}

          {complaintPosition && (
            <Marker
              position={complaintPosition}
              draggable={true}
              eventHandlers={{
                dragend: (e) => setComplaintPosition([e.target.getLatLng().lat, e.target.getLatLng().lng]),
              }}
            >
              <Popup>Drag marker to adjust location</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      
      <div className="container0">
        {isComplaintFormVisible && complaintPosition && (
          <div className="complaint-form-container0">
            <h3 className="complaint-form-title0">Submit a Complaint</h3>
            <textarea
              className="complaint-description-textarea0"
              placeholder="Describe your complaint..."
              value={complaintDescription}
              onChange={(e) => setComplaintDescription(e.target.value)}
              rows="3"
            />
            <button className="submit-complaint-btn0" onClick={handleSubmitComplaint}>Submit Complaint</button>
          </div>
        )}

        <div className="pie-chart-container0">
          <h3 className="chart-header0">Complaint Status Distribution</h3>
          <Pie 
            className="pie-chart0" 
            data={getChartData()} 
            options={chartOptions} 
          />
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
