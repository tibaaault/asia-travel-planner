import { useState } from "react";
import { supabase } from "../config/supabaseClient";
import {
  KeyRound,
  Lock,
  LogOut,
  Loader2,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

export default function Auth({ session }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const normalizeUsername = (value) => value.trim().toLowerCase();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback("");

    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) {
      setFeedback("Indique un username.");
      setLoading(false);
      return;
    }

    const { data, error: lookupError } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (lookupError || !data?.email) {
      setFeedback("Username introuvable.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password,
    });
    if (error) alert("Erreur de connexion : " + error.message);
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback("");

    if (!session) {
      setFeedback("La création de compte est réservée aux utilisateurs connectés.");
      setLoading(false);
      return;
    }

    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername || !email.trim() || !password) {
      setFeedback("Username, email et mot de passe sont requis.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: normalizedUsername,
        },
      },
    });

    if (error) {
      setFeedback("Erreur de création : " + error.message);
    } else {
      setFeedback(
        "Compte créé. Tu peux maintenant te connecter avec ton username.",
      );
      setMode("login");
      setEmail("");
      setPassword("");
    }

    setLoading(false);
  };

  const handleLogout = () => supabase.auth.signOut();

  // Si on est connecté, on peut aussi créer un compte
  if (session) {
    return (
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:border-red-200 hover:text-red-300 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white">
            <ShieldCheck size={14} className="text-emerald-500" /> Admin
            connecté
            <LogOut size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              setFeedback("");
              setMode((currentMode) =>
                currentMode === "signup" ? "login" : "signup",
              );
            }}
            className="inline-flex items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-300 shadow-sm transition hover:bg-sky-500/15">
            <UserPlus size={14} className="mr-1" /> Créer un compte
          </button>
        </div>

        {mode === "signup" && (
          <form
            onSubmit={handleSignup}
            className="flex flex-wrap items-stretch gap-2 rounded-xl border border-slate-700 bg-slate-950/85 p-2 text-white shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
            <div className="w-full px-1 pb-1 text-[11px] font-medium text-white/80 dark:text-white/80">
              Création d'un compte autorisée uniquement pour les utilisateurs connectés.
            </div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="min-w-40 flex-1 rounded-lg border border-transparent bg-slate-950/70 px-3 py-2 text-xs text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-950 focus:ring-4 focus:ring-sky-500/10 dark:bg-slate-950/70 dark:text-white dark:focus:bg-slate-950"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-40 flex-1 rounded-lg border border-transparent bg-slate-950/70 px-3 py-2 text-xs text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-950 focus:ring-4 focus:ring-sky-500/10 dark:bg-slate-950/70 dark:text-white dark:focus:bg-slate-950"
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-w-40 flex-1 rounded-lg border border-transparent bg-slate-950/70 px-3 py-2 text-xs text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-950 focus:ring-4 focus:ring-sky-500/10 dark:bg-slate-950/70 dark:text-white dark:focus:bg-slate-950"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 text-slate-950 shadow-md shadow-slate-900/15 hover:bg-slate-200 disabled:cursor-wait disabled:opacity-70">
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setFeedback("");
                setMode("login");
              }}
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:hover:bg-slate-800">
              Retour
            </button>
            {feedback && (
              <p className="w-full text-[11px] font-medium text-white/80 dark:text-white/80">
                {feedback}
              </p>
            )}
          </form>
        )}
      </div>
    );
  }

  // Sinon, le mini formulaire de connexion uniquement
  return (
    <form
      onSubmit={handleLogin}
      className="flex flex-wrap items-stretch gap-2 rounded-xl border border-slate-700 bg-slate-950/85 p-2 text-white shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="w-full px-1 pb-1 text-[11px] font-medium text-white/80 dark:text-white/80">
        Connexion avec ton username et ton mot de passe.
      </div>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="min-w-40 flex-1 rounded-lg border border-transparent bg-slate-950/70 px-3 py-2 text-xs text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-950 focus:ring-4 focus:ring-sky-500/10 dark:bg-slate-950/70 dark:text-white dark:focus:bg-slate-950"
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="min-w-40 flex-1 rounded-lg border border-transparent bg-slate-950/70 px-3 py-2 text-xs text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-950 focus:ring-4 focus:ring-sky-500/10 dark:bg-slate-950/70 dark:text-white dark:focus:bg-slate-950"
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-3 py-2 text-white shadow-md shadow-slate-900/15 hover:bg-slate-700 disabled:cursor-wait disabled:opacity-70 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
      </button>
      {feedback && (
        <p className="w-full text-[11px] font-medium text-white/80 dark:text-white/80">
          {feedback}
        </p>
      )}
    </form>
  );
}
