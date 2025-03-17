// PieChart.jsx
import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';

const PieChart = ({ citizenId }) => {
  const [data, setData] = useState({ pending: 0, total: 0 });

  // Fetching data (mockup)
  useEffect(() => {
    const fetchData = async () => {
      // Replace this with your API call
      const response = await fetch(`/api/complaints/${citizenId}`);
      const result = await response.json();
      setData({
        pending: result.pendingComplaints,
        total: result.totalComplaints,
      });
    };
    
    fetchData();
  }, [citizenId]);

  // Pie chart data
  const chartData = {
    labels: ['Pending Complaints', 'Total Complaints'],
    datasets: [
      {
        data: [data.pending, data.total - data.pending],
        backgroundColor: ['#FF6384', '#36A2EB'],
        hoverBackgroundColor: ['#FF6384', '#36A2EB'],
      },
    ],
  };

  return (
    <div>
      <h2>Complaints Overview</h2>
      <Pie data={chartData} />
    </div>
  );
};

export default PieChart;