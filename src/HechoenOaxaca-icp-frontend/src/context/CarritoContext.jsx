// src/context/CarritoContext.jsx
import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

const CarritoContext = createContext();

export const useCarrito = () => useContext(CarritoContext);

export const CarritoProvider = ({ children }) => {
  const [carrito, setCarrito] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("carrito");
    if (saved) {
      try {
        setCarrito(JSON.parse(saved));
      } catch {
        console.warn("❌ Carrito en localStorage corrupto");
        localStorage.removeItem("carrito");
      }
    }
  }, []);

  useEffect(() => {
    const replacer = (key, value) =>
      typeof value === "bigint" ? value.toString() : value;

    try {
      const json = JSON.stringify(carrito, replacer);
      localStorage.setItem("carrito", json);
    } catch (error) {
      console.error("❌ Error serializando el carrito:", error);
    }
  }, [carrito]);

  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      if (prev.some((item) => item.id === producto.id)) return prev;
      return [...prev, producto];
    });
  };

  const eliminarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((p) => p.id !== id));
  };

  const vaciarCarrito = () => {
    setCarrito([]);
    localStorage.removeItem("carrito");
  };

  const total = useMemo(() => {
    return carrito.reduce((sum, item) => sum + (item.precio || 0), 0);
  }, [carrito]);

  return (
    <CarritoContext.Provider
      value={{
        carrito,
        setCarrito,
        agregarAlCarrito,
        eliminarDelCarrito,
        vaciarCarrito,
        total,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
};
