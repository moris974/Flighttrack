"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMsg(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(traduciErrore(error.message));
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(traduciErrore(error.message));
      } else {
        setInfoMsg("Controlla la tua email per confermare la registrazione.");
      }
    }

    setLoading(false);
  }

  async function handleGoogleLogin() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(traduciErrore(error.message));
    }
  }

  return (
    <main className="max-w-sm mx-auto p-6 mt-12">
      <h1 className="text-2xl font-semibold mb-6">
        {mode === "login" ? "Accedi" : "Crea account"}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-base-700 bg-base-900 rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-base-700 bg-base-900 rounded px-3 py-2"
          minLength={6}
          required
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {infoMsg && <p className="text-green-400 text-sm">{infoMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-accent-teal text-base-950 font-medium rounded px-4 py-2 disabled:opacity-50"
        >
          {loading
            ? "Attendi..."
            : mode === "login"
            ? "Accedi"
            : "Registrati"}
        </button>
      </form>

      <button
        onClick={handleGoogleLogin}
        className="w-full border border-base-700 rounded px-4 py-2 mt-3"
      >
        Continua con Google
      </button>

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="text-sm text-gray-400 mt-4 underline"
      >
        {mode === "login"
          ? "Non hai un account? Registrati"
          : "Hai già un account? Accedi"}
      </button>
    </main>
  );
}

function traduciErrore(msg) {
  const mappa = {
    "Invalid login credentials": "Email o password non corrette.",
    "User already registered": "Esiste già un account con questa email.",
  };
  return mappa[msg] || msg;
}
