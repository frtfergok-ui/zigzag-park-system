"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  getAuth,
} from "firebase/auth";

import { app } from "@/firebase";

const auth = getAuth(app);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const login = async () => {
    try {
      setMessage("⏳ Вход...");

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      window.location.href = "/admin";

    } catch (error) {
      console.error(error);

      setMessage("❌ Неверный логин или пароль");
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 flex items-center justify-center p-6">

      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-2xl">

        <h1 className="text-5xl font-bold text-black text-center mb-8">
          ADMIN LOGIN
        </h1>

        <div className="grid gap-5">

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="p-6 rounded-2xl border text-3xl text-black"
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="p-6 rounded-2xl border text-3xl text-black"
          />

          {message && (
            <div className="bg-yellow-100 p-5 rounded-2xl text-2xl text-center font-bold text-black">
              {message}
            </div>
          )}

          <button
            onClick={login}
            className="bg-blue-600 text-white p-6 rounded-2xl text-3xl font-bold"
          >
            Войти
          </button>

        </div>

      </div>

    </div>
  );
}