import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "./authContext";
import { handleActorError } from "../utils/handleActorError";

// ✅ Set de principals anónimos conocidos
const ANONYMOUS_PRINCIPALS = new Set([
  "2vxsx-fae",
  "2vxsx-fae-cai"
]);

export function useVerifyUserRedirect() {
  const { authState, actor, logout, principalId, isLoading, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const verificationAttempted = useRef(false);

  useEffect(() => {
    // ✅ PREVENIR LOOPS: No ejecutar si ya está en una ruta protegida
    const isOnProtectedRoute = 
      location.pathname.startsWith("/artesano-dashboard") ||
      location.pathname.startsWith("/cliente-dashboard") || 
      location.pathname.startsWith("/intermediario-dashboard") ||
      location.pathname === "/registro";

    if (isAuthenticated && isOnProtectedRoute) {
      console.log("✅ Ya autenticado en ruta protegida, skipping verification");
      return;
    }

    // ✅ No ejecutar en la página de login-success para evitar loops
    if (location.pathname === "/login-success") {
      console.log("⏭️ Saltando verificación en /login-success");
      return;
    }

    // Evitar múltiples ejecuciones
    if (verificationAttempted.current || isLoading) {
      console.log("⏭️ Verificación ya intentada o loading activo");
      return;
    }

    // ✅ Verificación mejorada de principal anónimo
    const isAnonymous = !principalId || ANONYMOUS_PRINCIPALS.has(principalId) || principalId.endsWith("-cai");
    
    // Verificar condiciones para proceder
    const shouldProceed = 
      isAuthenticated &&
      actor &&
      typeof actor.obtenerUsuario === "function" &&
      !isAnonymous;

    if (!shouldProceed) {
      console.log("⏳ Esperando condiciones:", {
        autenticado: isAuthenticated,
        actor: !!actor,
        metodo: typeof actor?.obtenerUsuario,
        principal: principalId && !isAnonymous,
        loading: isLoading,
        rutaActual: location.pathname
      });
      return;
    }

    verificationAttempted.current = true;
    let isMounted = true;

    const verifyAndRedirect = async () => {
      console.log("🔍 Iniciando verificación de usuario...");
      console.log("🎯 Actor disponible:", !!actor);
      console.log("📋 Método obtenerUsuario:", typeof actor?.obtenerUsuario);
      console.log("👤 Principal ID:", principalId);
      console.log("🔐 Estado autenticación:", authState.status);

      try {
        console.log("📞 Llamando a actor.obtenerUsuario()...");
        const res = await actor.obtenerUsuario();
        console.log("✅ Respuesta de obtenerUsuario:", res);

        if (!isMounted) {
          console.log("⏭️ Componente desmontado, cancelando redirección");
          return;
        }

        if ("ok" in res) {
          const rol = Object.keys(res.ok.rol)[0];
          console.log("🎯 Rol detectado:", rol);
          localStorage.setItem("rol", rol);

          const route = {
            Artesano: "/artesano-dashboard",
            Cliente: "/cliente-dashboard",
            Intermediario: "/intermediario-dashboard"
          }[rol] || "/registro";

          // ✅ NO redirigir si ya está en la ruta correcta
          if (location.pathname === route) {
            console.log("✅ Ya está en la ruta correcta, no redirigir");
            return;
          }

          console.log("🚀 Redirigiendo a:", route);
          navigate(route, { replace: true });
        } else if ("err" in res) {
          console.log("🆕 Usuario no registrado - Redirigiendo a registro");
          console.log("📋 Razón:", res.err);
          
          // ✅ NO redirigir si ya está en registro
          if (location.pathname !== "/registro") {
            navigate("/registro", { replace: true });
          }
        } else {
          console.log("❌ Respuesta inesperada del backend:", res);
          if (location.pathname !== "/registro") {
            navigate("/registro", { replace: true });
          }
        }
      } catch (err) {
        console.error("🚨 Error en verificación:", err);
        console.error("📋 Detalles del error:", {
          message: err.message,
          name: err.name,
          stack: err.stack
        });

        if (!isMounted) return;

        // ✅ Manejar específicamente errores de timeout o conexión
        if (err.message.includes("fail") || err.message.includes("503") || err.message.includes("timeout")) {
          console.warn("⏰ Error de conexión con el backend - Redirigiendo a registro");
          if (location.pathname !== "/registro") {
            navigate("/registro", { replace: true });
          }
          return;
        }

        const handled = await handleActorError(err, logout);
        if (!handled) {
          console.warn("⚠️ Sesión inválida - Forzando logout");
          await logout();
          navigate("/", { replace: true });
        }
      }
    };

    // ✅ Timeout para evitar bloqueo si el backend no responde
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Timeout: Backend no respondió después de 10 segundos"));
      }, 10000);
    });

    Promise.race([verifyAndRedirect(), timeoutPromise]).catch((error) => {
      console.error("⏰ Timeout en verificación:", error);
      if (isMounted) {
        console.warn("🔧 Redirigiendo a registro por timeout");
        if (location.pathname !== "/registro") {
          navigate("/registro", { replace: true });
        }
      }
    });

    return () => {
      isMounted = false;
      console.log("🧹 Limpiando verificación de usuario");
    };
  }, [authState.status, actor, principalId, isLoading, navigate, logout, isAuthenticated, location.pathname]);
}