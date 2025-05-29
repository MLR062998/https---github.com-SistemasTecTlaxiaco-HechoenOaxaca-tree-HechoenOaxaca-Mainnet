// src/pages/LoginSuccess.jsx
import VerificandoUsuario from "../components/VerificandoUsuario";
import { useVerifyUserRedirect } from "../components/useVerifyUserRedirect";

export default function LoginSuccess() {
  useVerifyUserRedirect();
  return <VerificandoUsuario />;
}
