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
        const parsed = JSON.parse(saved);
        // ✅ CORREGIDO: Convertir strings de BigInt de vuelta a números
        const carritoProcesado = parsed.map(item => ({
          ...item,
          // Si precio era un BigInt guardado como string, convertirlo a número ICP
          precioICP: item.precioICP || (item.precio ? Number(item.precio) / 100_000_000 : 0)
        }));
        setCarrito(carritoProcesado);
      } catch {
        console.warn("❌ Carrito en localStorage corrupto");
        localStorage.removeItem("carrito");
      }
    }
  }, []);

  useEffect(() => {
    const replacer = (key, value) => {
      // ✅ CORREGIDO: Manejar correctamente BigInt y otros tipos
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    };

    try {
      const json = JSON.stringify(carrito, replacer);
      localStorage.setItem("carrito", json);
    } catch (error) {
      console.error("❌ Error serializando el carrito:", error);
    }
  }, [carrito]);

  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      // Evitar duplicados
      if (prev.some((item) => item.id === producto.id)) {
        console.warn("Producto ya está en el carrito");
        return prev;
      }
      
      // ✅ CORREGIDO: Asegurar que el producto tenga precioICP
      const productoConPrecioICP = {
        ...producto,
        precioICP: producto.precioICP || (Number(producto.precio || 0) / 100_000_000)
      };
      
      return [...prev, productoConPrecioICP];
    });
  };

  const eliminarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((p) => p.id !== id));
  };

  const vaciarCarrito = () => {
    setCarrito([]);
    localStorage.removeItem("carrito");
  };

  // ✅ CORREGIDO: Calcular total correctamente sin mezclar BigInt
  const total = useMemo(() => {
    if (!carrito || carrito.length === 0) return 0;
    
    return carrito.reduce((sum, item) => {
      // Usar precioICP si existe (ya está en formato número ICP)
      if (item.precioICP !== undefined && item.precioICP !== null) {
        return sum + Number(item.precioICP);
      }
      
      // Si no tiene precioICP, convertir precio a número ICP
      let precioNumerico = 0;
      try {
        if (typeof item.precio === 'bigint') {
          precioNumerico = Number(item.precio) / 100_000_000;
        } else if (typeof item.precio === 'string') {
          // Si fue guardado como string desde BigInt
          precioNumerico = Number(item.precio) / 100_000_000;
        } else {
          precioNumerico = Number(item.precio || 0) / 100_000_000;
        }
      } catch (error) {
        console.error("Error convirtiendo precio:", error, item);
        precioNumerico = 0;
      }
      
      return sum + precioNumerico;
    }, 0);
  }, [carrito]);

  // ✅ Función adicional para obtener el total en e8s (para el backend)
  const totalE8s = useMemo(() => {
    return BigInt(Math.floor(total * 100_000_000));
  }, [total]);

  // ✅ Función para obtener resumen del carrito
  const resumenCarrito = useMemo(() => {
    return {
      totalItems: carrito.length,
      totalICP: total,
      totalE8s: totalE8s.toString(),
      productos: carrito.map(item => ({
        id: item.id,
        nombre: item.nombre,
        precioICP: item.precioICP || (Number(item.precio || 0) / 100_000_000),
        cantidad: 1 // Por ahora cada producto es único
      }))
    };
  }, [carrito, total, totalE8s]);

  return (
    <CarritoContext.Provider
      value={{
        carrito,
        setCarrito,
        agregarAlCarrito,
        eliminarDelCarrito,
        vaciarCarrito,
        total,           // Total en ICP (número)
        totalE8s,        // Total en e8s (BigInt) para el backend
        resumenCarrito,  // Resumen completo
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
};