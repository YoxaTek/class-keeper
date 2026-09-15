import { getEnabledProviders } from "@/lib/authProviders";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const providers = getEnabledProviders();

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <LoginForm providers={providers} />
    </div>
  );
}
