import React, { useState } from "react";
import api from "../api";
import { useParams, useNavigate } from "react-router-dom";

export default function ResetPassword() {

  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    try {

      await api.post("/api/reset-password/", {
        uid,
        token,
        password
      });

      setMessage("Password reset successful!");

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (error) {

      setMessage("Invalid or expired reset link.");

    }
  };

  return (

    <div className="min-h-screen flex items-center justify-center bg-slate-900">

      <div className="bg-white p-8 rounded-xl shadow-lg w-[400px]">

        <h2 className="text-2xl font-bold mb-6 text-center">
          Reset Password
        </h2>

        {message && (
          <p className="text-blue-600 mb-4 text-sm">
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="password"
            placeholder="Enter new password"
            className="w-full border rounded-lg px-4 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg"
          >
            Reset Password
          </button>

        </form>

      </div>

    </div>

  );
}
