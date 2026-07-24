// Utilidades para manejo de imágenes
export const arrayToBase64 = (byteArray, mimeType = "image/jpeg") => {
  try {
    if (!byteArray || byteArray.length === 0) return null;
    
    // Si ya es un string base64 (viene del backend), retornarlo directamente
    if (typeof byteArray === 'string') {
      if (byteArray.startsWith('data:')) return byteArray;
      return `data:${mimeType};base64,${byteArray}`;
    }
    
    // Si es un array de bytes, convertirlo
    const uint8Array = new Uint8Array(byteArray);
    const binary = uint8Array.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
    return `data:${mimeType};base64,${btoa(binary)}`;
  } catch (error) {
    console.error("Error converting to base64:", error);
    return null;
  }
};

export const processProductImages = (product) => {
  if (!product || !product.imagenes) return product;
  
  const precioICP = Number(product.precio) / 100_000_000;
  const imagenesProcesadas = product.imagenes
    .map(img => arrayToBase64(img))
    .filter(img => img !== null);
  
  return {
    ...product,
    precioICP,
    imagenes: imagenesProcesadas,
    imgUrl: imagenesProcesadas[0] || null // Para compatibilidad
  };
};

export const processProductsList = (products) => {
  if (!Array.isArray(products)) return [];
  
  return products.map(processProductImages);
};