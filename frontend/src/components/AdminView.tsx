import { useState } from "react";
import { Header } from "./Header";
import { UserManagement } from "./UserManagement";
import { SystemStats } from "./SystemStats";
import { AccountCreation } from "./AccountCreation";
import PressureUpload from "./PressureUpload";
import { ReportsDownload } from "./ReportsDownload";

import { Users, Activity, Settings, Upload } from "lucide-react";

interface AdminViewProps {
  user: {
    id: string;
    name: string;
    role: string;
  };
  onLogout: () => void;
}

export function AdminView({ user, onLogout }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<"users" | "stats" | "upload" | "settings">("users");

  return (
    <div className="min-h-screen pb-8">
      <Header user={user} role="admin" onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-6 pt-24">
        <div className="mb-6 bg-white rounded-xl shadow-lg border border-slate-200 p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("users")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === "users"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              User Management
            </button>

            <button
              onClick={() => setActiveTab("stats")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === "stats"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Activity className="w-5 h-5 inline mr-2" />
              System Statistics
            </button>

            <button
              onClick={() => setActiveTab("upload")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === "upload"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Upload className="w-5 h-5 inline mr-2" />
              Upload Pressure Data
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === "settings"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Settings className="w-5 h-5 inline mr-2" />
              Settings
            </button>
          </div>
        </div>

        {activeTab === "users" && (
          <div className="space-y-6">
            <AccountCreation />
            <UserManagement />
          </div>
        )}

        {activeTab === "stats" && <SystemStats />}

        {activeTab === "upload" && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">
              Upload Patient Pressure CSV
            </h2>
            <PressureUpload />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              System Settings
            </h2>
            <p className="text-slate-600">
              System configuration options would appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}