// src/components/LoadingScreen.jsx
import React from 'react';
import Spinner from 'react-bootstrap/Spinner';
import 'bootstrap/dist/css/bootstrap.min.css';
import logo from "../assets/oaxaca.png";

const LoadingScreen = () => (
  <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: "100vh", backgroundColor: "#ffffff" }}>
    <img 
      src={logo} 
      alt="Hecho en Oaxaca Logo" 
      style={{ width: '150px', height: '150px', marginBottom: '20px', animation: 'spin 3s linear infinite' }}
    />
    <Spinner animation="border" variant="primary" style={{ width: '4rem', height: '4rem', marginBottom: '20px' }} />
    <h4>Conectando al Marketplace...</h4>

    {/* Animación CSS */}
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

export default LoadingScreen;
