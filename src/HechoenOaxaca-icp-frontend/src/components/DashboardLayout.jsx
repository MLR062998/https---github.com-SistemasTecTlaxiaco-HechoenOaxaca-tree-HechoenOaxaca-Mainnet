// src/components/DashboardLayout.jsx
import React from "react";
import Menu from "./Menu";
import "./DashboardLayout.scss"; // Asegúrate de crear este archivo

const DashboardLayout = ({ children, title }) => {
  return (
    <div className="dashboard-layout">
      {/* Menú fijo en la parte superior */}
      <div className="dashboard-navbar">
        <Menu />
      </div>
      
      {/* Contenido principal con scroll independiente */}
      <main className="dashboard-content">
        {title && (
          <div className="dashboard-header">
            <h1>{title}</h1>
          </div>
        )}
        <div className="dashboard-body">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;