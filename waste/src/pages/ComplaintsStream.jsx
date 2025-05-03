import { useEffect, useState } from "react";

const ComplaintsStream = () => {
  const [complaints, setComplaints] = useState([]);

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

  return (
    <div>
      <h2>Complaints</h2>
      <ul>
        {complaints.map((complaint) => (
          <li key={complaint.id}>
            📍 {complaint.description} ({complaint.latitude}, {complaint.longitude}) - {complaint.status}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ComplaintsStream;
