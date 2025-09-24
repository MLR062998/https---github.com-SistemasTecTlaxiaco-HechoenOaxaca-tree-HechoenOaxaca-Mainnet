import VerificandoUsuario from "../components/VerificandoUsuario";

export default function LoginSuccess() {
  // ✅ Este componente solo muestra la UI de carga
  // ✅ La redirección la maneja useVerifyUserRedirect automáticamente
  return <VerificandoUsuario />;
}