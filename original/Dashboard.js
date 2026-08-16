import React from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <div className="dashboard-buttons">
        <div className="dashboard-item">
          <img src="C:/Users/advai/Downloads/img2.png" alt="Salary" className="dashboard-image" />
          <button onClick={() => navigate("/salary")} className="button-28">Salary</button>
        </div>
        <div className="dashboard-item">
          <img src="C:/Users/advai/Downloads/img1.png" alt="Savings" className="dashboard-image" />
          <button onClick={() => navigate("/savings")} className="button-28">Savings</button>
        </div>
        <div className="dashboard-item">
          <img src="C:/Usersadvai\Downloads\img3.jpg" alt="Investment" className="dashboard-image" />
          <button onClick={() => navigate("/investment")} className="button-28">Investment</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
