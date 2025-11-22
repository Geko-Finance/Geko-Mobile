import { useLogin } from "@features/auth/hooks/useLogin";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { ScreenContainer } from "@shared/components/ui/screen-container";
import { Text } from "@shared/components/ui/text";
import { View } from "@shared/components/ui/view";
import { VStack } from "@shared/components/ui/vstack";
import { useState } from "react";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { mutate: login, isPending, error } = useLogin();

  const handleLogin = () => {
    if (!email || !password) {
      return;
    }

    login({ email, password });
  };

  return (
    <ScreenContainer
      className="justify-center px-4"
      backgroundImage={require("@assets/images/login-background.png")}
    >
      <VStack space="xl" className="w-full">
        <Text className="text-2xl font-bold text-center mb-4">
          Iniciar Sesión
        </Text>

        <VStack space="xl">
          <Input
            placeholder="Email"
            value={email}
            onChange={setEmail}
            autoCapitalize="none"
          />

          <Input
            placeholder="Contraseña"
            value={password}
            onChange={setPassword}
            isPassword
          />

          {error && (
            <Text className="text-red-500 text-sm">
              {error.message || "Error al iniciar sesión"}
            </Text>
          )}
        </VStack>

        <Button
          onPress={handleLogin}
          isLoading={isPending}
          isDisabled={isPending}
          value="Iniciar Sesión"
          textClassName="text-white"
          className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl"
        />
      </VStack>
    </ScreenContainer>
  );
}
