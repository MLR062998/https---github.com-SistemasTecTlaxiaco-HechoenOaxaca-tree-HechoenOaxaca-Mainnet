import { useEffect } from "react";
import { useAuthContext } from "../context/authContext";
import VerificandoUsuario from "../components/VerificandoUsuario";

export default function LoginSuccess() {
  const { isLoading, authState } = useAuthContext();

  useEffect(() => {
    console.log("🔄 Estado de autenticación:", authState.status);
  }, [authState]);

  return <VerificandoUsuario 
    message={isLoading ? "Cargando..." : "Verificando credenciales..."} 
  />;
}