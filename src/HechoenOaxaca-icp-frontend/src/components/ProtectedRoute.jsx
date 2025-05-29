import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "./authContext";
import VerificandoUsuario from "./VerificandoUsuario";

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || !isAuthenticated) return <VerificandoUsuario />;
  return children;
};
