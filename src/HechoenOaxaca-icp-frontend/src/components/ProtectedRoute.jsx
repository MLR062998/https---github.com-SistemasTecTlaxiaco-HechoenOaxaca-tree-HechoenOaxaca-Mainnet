
import { Navigate } from "react-router-dom";
import { useAuthContext } from "./authContext";
import VerificandoUsuario from "./VerificandoUsuario";

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const { authState, rol } = useAuthContext();

  if (authState.status === 'initializing' || authState.status === 'authenticating') {
    return <VerificandoUsuario />;
  }

  if (authState.status !== 'authenticated') {
    return <Navigate to="/" replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(rol)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  return children;
}
