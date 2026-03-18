"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Invalid credentials");
        return;
      }

      const from = searchParams.get("from") || "/dashboard";
      router.push(from);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-[10px] bg-bg-card border border-border px-3.5 py-2.5 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          placeholder="Enter your password"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-[10px] bg-accent hover:bg-accent-hover text-white font-semibold py-2.5 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <svg viewBox="0 0 74.5549 28.0001" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto text-accent mb-3" aria-label="NaM">
            <path d="M55.7424 27.5041V0.688065H60.528L65.1074 16.1176L69.6455 0.688065H74.5549V27.5041H71.0069V5.96876L66.2213 22.1409H63.8697L59.0841 5.96876V27.5041H55.7424Z" fill="currentColor" />
            <path d="M35.1528 28.0001C32.7875 28.0001 30.9447 27.45 29.6246 26.3499C28.3319 25.2497 27.6855 23.7233 27.6855 21.7705C27.6855 19.9003 28.3044 18.4701 29.542 17.4799C30.7797 16.4898 32.6087 15.9948 35.029 15.9948H41.9599V15.3759C41.9599 13.7257 41.5749 12.5568 40.8048 11.8692C40.0347 11.1816 38.7283 10.8378 36.8855 10.8378C34.3827 10.8378 32.0861 11.4154 29.9959 12.5705L28.8407 9.47639C31.2885 8.18372 34.0664 7.53738 37.1743 7.53738C40.1172 7.53738 42.2625 8.14246 43.6102 9.35262C44.9853 10.5353 45.6729 12.4055 45.6729 14.9634V27.505H42.9088L42.4963 25.6073C41.3961 26.4049 40.241 27.01 39.0308 27.4225C37.8206 27.8076 36.528 28.0001 35.1528 28.0001ZM35.8129 24.6584C38.1232 24.6584 40.1722 24.0533 41.9599 22.8432V19.0477H35.1528C33.8876 19.0477 32.9525 19.2677 32.3474 19.7077C31.7698 20.1478 31.4811 20.8079 31.4811 21.688C31.4811 22.6781 31.8386 23.4207 32.5537 23.9158C33.2688 24.4109 34.3552 24.6584 35.8129 24.6584Z" fill="currentColor" />
            <path d="M0 27.5039V0.687879H4.5381L14.5632 20.4905V0.687879H18.0699V27.5039H14.3156L3.50672 6.1336V27.5039H0Z" fill="currentColor" />
            <path d="M43.8274 2.67029e-05V2.75039H30.0756V2.67029e-05H43.8274Z" fill="currentColor" />
          </svg>
          <p className="text-text-secondary text-sm font-mono">
            Sign in to manage your events
          </p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>

        <p className="mt-8 text-center text-xs text-text-muted">
          Access is by invitation only
        </p>
      </div>
    </div>
  );
}
