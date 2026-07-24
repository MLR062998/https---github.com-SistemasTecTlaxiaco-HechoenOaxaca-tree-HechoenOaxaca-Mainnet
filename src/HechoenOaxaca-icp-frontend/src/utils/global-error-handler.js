// Manejo global de errores para la aplicación
export const setupGlobalErrorHandling = () => {
  console.log('🛡️ Configurando manejo global de errores...');

  // Manejar errores no capturados
  window.addEventListener('error', (event) => {
    console.error('❌ Error global capturado:', event.error);
    
    const errorString = event.error ? event.error.toString() : '';
    
    // Detectar errores de conexión/verificación
    if (errorString.includes('503') || 
        errorString.includes('Verification') ||
        errorString.includes('Failed to fetch') ||
        errorString.includes('Network Error')) {
      
      console.log('🔁 Error de conexión detectado, redirigiendo al inicio...');
      
      // Mostrar mensaje al usuario
      if (!document.getElementById('connection-error-message')) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'connection-error-message';
        errorDiv.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #f8d7da;
          color: #721c24;
          padding: 15px 20px;
          border-radius: 5px;
          border: 1px solid #f5c6cb;
          z-index: 9999;
          max-width: 90%;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        errorDiv.innerHTML = `
          <strong>Error de conexión</strong><br>
          Redirigiendo al inicio...
        `;
        document.body.appendChild(errorDiv);
      }
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        localStorage.removeItem('rol');
        window.location.href = '/';
      }, 2000);
      
      // Prevenir el comportamiento por defecto
      event.preventDefault();
      return false;
    }
  });

  // Manejar rechazos de promesas no capturados
  window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise rejection no manejado:', event.reason);
    
    const errorString = event.reason ? event.reason.toString() : '';
    
    // Detectar errores de conexión en promesas
    if (errorString.includes('503') || 
        errorString.includes('Verification') ||
        errorString.includes('Failed to fetch') ||
        errorString.includes('Network Error')) {
      
      console.log('🔁 Error de conexión en promise, redirigiendo...');
      
      // Mostrar mensaje al usuario
      if (!document.getElementById('connection-error-message')) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'connection-error-message';
        errorDiv.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #f8d7da;
          color: #721c24;
          padding: 15px 20px;
          border-radius: 5px;
          border: 1px solid #f5c6cb;
          z-index: 9999;
          max-width: 90%;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        errorDiv.innerHTML = `
          <strong>Error de conexión</strong><br>
          Redirigiendo al inicio...
        `;
        document.body.appendChild(errorDiv);
      }
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        localStorage.removeItem('rol');
        window.location.href = '/';
      }, 2000);
      
      // Prevenir el comportamiento por defecto
      event.preventDefault();
    }
  });

  // Manejar errores de recursos (imágenes, CSS, etc.)
  window.addEventListener('resourceerror', (event) => {
    console.error('❌ Error de recurso:', event);
  });

  console.log('✅ Manejo global de errores configurado correctamente');
};

// Función para mostrar errores amigables al usuario
export const showUserFriendlyError = (error) => {
  const errorMessage = document.createElement('div');
  errorMessage.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f8d7da;
    color: #721c24;
    padding: 15px 20px;
    border-radius: 5px;
    border: 1px solid #f5c6cb;
    z-index: 9999;
    max-width: 300px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;
  
  let message = 'Ha ocurrido un error inesperado';
  
  if (error && error.toString().includes('503')) {
    message = 'Error de conexión. Por favor, intenta nuevamente.';
  } else if (error && error.toString().includes('Verification')) {
    message = 'Error de verificación. La página se recargará.';
  } else if (error && error.toString().includes('Failed to fetch')) {
    message = 'Error de red. Verifica tu conexión a internet.';
  }
  
  errorMessage.innerHTML = `
    <strong>Error</strong><br>
    ${message}
    <button onclick="this.parentElement.remove()" style="
      background: none;
      border: none;
      color: #721c24;
      float: right;
      cursor: pointer;
      font-weight: bold;
    ">×</button>
  `;
  
  document.body.appendChild(errorMessage);
  
  // Auto-remover después de 5 segundos
  setTimeout(() => {
    if (errorMessage.parentElement) {
      errorMessage.remove();
    }
  }, 5000);
};

// Función para verificar la conexión
export const checkConnection = async () => {
  try {
    const response = await fetch('/', { method: 'HEAD', cache: 'no-cache' });
    return response.ok;
  } catch (error) {
    console.error('❌ Error verificando conexión:', error);
    return false;
  }
};