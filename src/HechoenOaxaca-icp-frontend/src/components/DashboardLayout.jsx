// src/components/DashboardLayout.jsx
import React from "react";
import Menu from "./Menu";
import "./DashboardLayout.scss";

const DashboardLayout = ({ children }) => {
  return (
    <div className="dashboard-layout">
      {/* Menú fijo en la parte superior */}
      <div className="dashboard-navbar">
        <Menu />
      </div>
      
      {/* Contenido principal con scroll independiente */}
      <main className="dashboard-content">
        <div className="dashboard-body">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;