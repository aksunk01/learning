"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { login, register } from "@/lib/auth-api";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  const [mode, setMode] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      router.replace("/dashboard");
    }
  }, [router]);

  const signIn = async (targetEmail, targetPassword) => {
    const response = await login(targetEmail, targetPassword);

    if (!response.access_token) {
      throw new Error("Login failed: Invalid response from server");
    }

    localStorage.setItem("access_token", response.access_token);
    router.push("/dashboard");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (mode === "create-account") {
        await register(email, password);
      }

      await signIn(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = (value) => {
    setMode(value);
    setError("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Academic Assistant</CardTitle>
          <CardDescription className="text-center">
            Your personal academic productivity companion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="sign-in" className="flex-1">Sign in</TabsTrigger>
              <TabsTrigger value="create-account" className="flex-1">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value={mode}>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-destructive">
                    {error}
                  </div>
                )}
                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading
                    ? (mode === "create-account" ? "Creating account..." : "Signing in...")
                    : (mode === "create-account" ? "Create account" : "Sign in")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
