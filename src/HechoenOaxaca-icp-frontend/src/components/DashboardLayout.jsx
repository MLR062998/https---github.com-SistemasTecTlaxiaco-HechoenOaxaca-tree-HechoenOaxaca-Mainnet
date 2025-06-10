// src/components/DashboardLayout.jsx
import React from "react";

const DashboardLayout = ({ title, children }) => {
  return (
    <div className="min-h-screen bg-gray-50 cliente-dashboard">
      <header className="bg-white shadow p-4">
        <h1 className="text-xl font-bold">{title}</h1>
      </header>

      <main className="p-4">{children}</main>
    </div>
  );
};

export default DashboardLayout;
