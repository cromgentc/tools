import { useState, useEffect } from "react";
import AddScript from "./AddScript";
import AllScripts from "./AllScripts";
import AddUser from "./AddUser";
import AddVendor from "./AddVendor";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  FileText,
  Users,
  Radio,
  LogOut,
  Menu,
  X,
  AlertCircle,
  RefreshCw,
  Building2,
} from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

export default function AdminDashboard() {
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo"));
    } catch {
      return null;
    }
  })();
  const isAdminMode = currentUser?.role === "admin";
  const isVendorMode = currentUser?.role === "vendor";
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [stats, setStats] = useState({
    totalScripts: 0,
    totalUsers: 0,
    totalRecordings: 0,
    completedRecordings: 0,
    pendingScripts: 0,
  });

  const navigate = useNavigate();

  // ================= AUTH CHECK =================
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));

    if (!user || !["admin", "vendor"].includes(user.role)) {
      toast.error("Access denied.");
      navigate("/");
      return;
    }

    if (user.role === "vendor") {
      setPage("addUser");
    }
  }, [navigate]);

  // ================= BACKEND CHECK =================
  const checkBackend = async () => {
  try {
    const res = await fetch(API_ENDPOINTS.CHECK_BACKEND);

    if (res.ok) setBackendStatus("connected");
    else setBackendStatus("error");

  } catch {
    setBackendStatus("error");
  }
};

  // ================= FETCH STATS =================
  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.ADMIN_STATS);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Stats response:", data);
      
      if (data.success) {
        setStats({
          totalScripts: data.data?.totalScripts || 0,
          totalUsers: data.data?.totalUsers || 0,
          totalRecordings: data.data?.totalRecordings || 0,
          completedRecordings: data.data?.completedRecordings || 0,
          pendingScripts: data.data?.pendingScripts || 0,
        });
      } else {
        throw new Error(data.message || "Failed to fetch stats");
      }
    } catch (err) {
      console.error("Stats error:", err);
      toast.error("Failed to load statistics: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminMode) {
      fetchStats();
    }
    checkBackend();
    const interval = setInterval(checkBackend, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [isAdminMode]);

  // ================= LOGOUT =================
  const logout = () => {
    localStorage.removeItem("userInfo");
    toast.success("Logged out successfully!");
    navigate("/");
  };

  // ================= MENU ITEM =================
  const menuItem = (key, label, icon) => (
    <button
      onClick={() => setPage(key)}
      className={`w-full px-4 py-3 rounded-lg cursor-pointer transition flex items-center gap-3 
      ${page === key 
        ? "bg-blue-600 text-white font-semibold shadow-lg" 
        : "hover:bg-gray-800 text-gray-300 hover:text-white"}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? "w-64" : "w-0"} bg-gradient-to-b from-gray-900 to-black border-r border-gray-800 flex flex-col transition-all duration-300 overflow-hidden`}>

        <div className="p-5 text-center border-b border-gray-800">
          <h1 className="text-2xl font-bold text-blue-400 flex items-center justify-center gap-2">
            <LayoutDashboard className="w-6 h-6" />
            {isVendorMode ? "Vendor" : "Admin"}
          </h1>
        </div>

        <div className="flex-1 p-4 space-y-2">
          {isAdminMode && menuItem("dashboard", "Dashboard", <LayoutDashboard className="w-5 h-5" />)}
          {isAdminMode && menuItem("addScript", "Add Script", <FileText className="w-5 h-5" />)}
          {isAdminMode && menuItem("vendors", "Vendor Management", <Building2 className="w-5 h-5" />)}
          {menuItem("addUser", "User Management", <Users className="w-5 h-5" />)}
          {isAdminMode && menuItem("all", "All Scripts", <Radio className="w-5 h-5" />)}
        </div>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg transition flex items-center justify-center gap-2 font-semibold"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>

      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">

        {/* TOPBAR */}
        <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          <h2 className="text-lg font-semibold capitalize flex items-center gap-2">
            {page === "dashboard" && (
              <>
                <LayoutDashboard className="w-5 h-5 text-blue-400" />
                Dashboard
              </>
            )}
            {page === "addScript" && (
              <>
                <FileText className="w-5 h-5 text-green-400" />
                Add Script
              </>
            )}
            {page === "addUser" && (
              <>
                <Users className="w-5 h-5 text-purple-400" />
                {isVendorMode ? "Vendor User Management" : "User Management"}
              </>
            )}
            {isAdminMode && page === "vendors" && (
              <>
                <Building2 className="w-5 h-5 text-cyan-400" />
                Vendor Management
              </>
            )}
            {isAdminMode && page === "all" && (
              <>
                <Radio className="w-5 h-5 text-orange-400" />
                All Scripts
              </>
            )}
          </h2>

          <div className="w-6"></div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 p-6 overflow-auto">

          {/* DASHBOARD */}
          {isAdminMode && page === "dashboard" && (
            <div className="space-y-6">
              {/* BACKEND STATUS */}
              {backendStatus === "error" && (
                <div className="p-4 bg-red-900/20 border border-red-600/50 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-red-400 font-semibold">Backend Connection Error</p>
                    <p className="text-red-300 text-sm">Statistics may not update. Ensure backend is running on port 5000.</p>
                  </div>
                </div>
              )}

              {/* HEADER WITH REFRESH */}
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white">📊 Statistics Dashboard</h3>
                <button
                  onClick={fetchStats}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                    loading
                      ? "bg-gray-600 opacity-60 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 active:scale-95"
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>

              {/* STAT CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* TOTAL SCRIPTS */}
                <div className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-600/30 p-6 rounded-xl hover:shadow-lg transition">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <h3 className="text-gray-400 text-xs uppercase tracking-wide mb-1">Total Scripts</h3>
                      <p className="text-3xl font-bold text-blue-400">{stats.totalScripts || 0}</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-400 opacity-50" />
                  </div>
                  <div className="w-full bg-blue-900/30 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all duration-500" 
                      style={{ width: `${Math.min((stats.totalScripts || 0) * 10, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* TOTAL USERS */}
                <div className="bg-gradient-to-br from-green-900/30 to-green-900/10 border border-green-600/30 p-6 rounded-xl hover:shadow-lg transition">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <h3 className="text-gray-400 text-xs uppercase tracking-wide mb-1">Total Users</h3>
                      <p className="text-3xl font-bold text-green-400">{stats.totalUsers || 0}</p>
                    </div>
                    <Users className="w-8 h-8 text-green-400 opacity-50" />
                  </div>
                  <div className="w-full bg-green-900/30 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 h-full transition-all duration-500" 
                      style={{ width: `${Math.min((stats.totalUsers || 0) * 10, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* TOTAL RECORDINGS */}
                <div className="bg-gradient-to-br from-orange-900/30 to-orange-900/10 border border-orange-600/30 p-6 rounded-xl hover:shadow-lg transition">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <h3 className="text-gray-400 text-xs uppercase tracking-wide mb-1">Total Recordings</h3>
                      <p className="text-3xl font-bold text-orange-400">{stats.totalRecordings || 0}</p>
                    </div>
                    <Radio className="w-8 h-8 text-orange-400 opacity-50" />
                  </div>
                  <div className="w-full bg-orange-900/30 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-orange-500 h-full transition-all duration-500" 
                      style={{ width: `${Math.min((stats.totalRecordings || 0) * 10, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* COMPLETED RECORDINGS */}
                <div className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border border-purple-600/30 p-6 rounded-xl hover:shadow-lg transition">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <h3 className="text-gray-400 text-xs uppercase tracking-wide mb-1">Completed</h3>
                      <p className="text-3xl font-bold text-purple-400">{stats.completedRecordings || 0}</p>
                    </div>
                    <Radio className="w-8 h-8 text-purple-400 opacity-50" />
                  </div>
                  <div className="w-full bg-purple-900/30 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full transition-all duration-500" 
                      style={{ width: `${Math.min((stats.completedRecordings || 0) * 10, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* CHARTS SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                
                {/* DISTRIBUTION CHART */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Radio className="w-5 h-5 text-blue-400" />
                    Recording Distribution
                  </h4>
                  <div className="space-y-4">
                    {/* Completed */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">✅ Completed</span>
                        <span className="text-purple-400 font-semibold">{stats.completedRecordings || 0}</span>
                      </div>
                      <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-full transition-all duration-500" 
                          style={{ 
                            width: stats.totalRecordings > 0 
                              ? `${(stats.completedRecordings / stats.totalRecordings) * 100}%` 
                              : "0%"
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Pending */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">⏳ Pending</span>
                        <span className="text-yellow-400 font-semibold">{(stats.totalRecordings || 0) - (stats.completedRecordings || 0)}</span>
                      </div>
                      <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-full transition-all duration-500" 
                          style={{ 
                            width: stats.totalRecordings > 0 
                              ? `${(((stats.totalRecordings || 0) - (stats.completedRecordings || 0)) / stats.totalRecordings) * 100}%` 
                              : "0%"
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Percentage */}
                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <p className="text-center text-gray-300 text-sm">
                      <span className="text-purple-400 font-bold text-lg">
                        {stats.totalRecordings > 0 
                          ? Math.round((stats.completedRecordings / stats.totalRecordings) * 100)
                          : 0}%
                      </span>
                      {" "}Completion Rate
                    </p>
                  </div>
                </div>

                {/* SUMMARY STATS */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-green-400" />
                    Quick Summary
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600/30">
                      <p className="text-gray-400 text-sm mb-1">Scripts per User</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {stats.totalUsers > 0 ? (stats.totalScripts / stats.totalUsers).toFixed(1) : "0"}
                      </p>
                    </div>

                    <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600/30">
                      <p className="text-gray-400 text-sm mb-1">Recordings per User</p>
                      <p className="text-2xl font-bold text-orange-400">
                        {stats.totalUsers > 0 ? (stats.totalRecordings / stats.totalUsers).toFixed(1) : "0"}
                      </p>
                    </div>

                    <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600/30">
                      <p className="text-gray-400 text-sm mb-1">Pending Scripts</p>
                      <p className="text-2xl font-bold text-yellow-400">
                        {stats.pendingScripts || 0}
                      </p>
                    </div>

                    <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600/30">
                      <p className="text-gray-400 text-sm mb-1">Completion Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-bold text-green-400">
                          {stats.totalRecordings > 0 
                            ? Math.round((stats.completedRecordings / stats.totalRecordings) * 100)
                            : 0}%
                        </span>
                        <div className="flex-1 bg-gray-600 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-green-600 h-full" 
                            style={{ 
                              width: stats.totalRecordings > 0 
                                ? `${(stats.completedRecordings / stats.totalRecordings) * 100}%` 
                                : "0%"
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LOADING STATE */}
              {loading && (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                </div>
              )}
            </div>
          )}

          {isAdminMode && page === "addScript" && <AddScript />}
          {isAdminMode && page === "vendors" && <AddVendor />}
          {page === "addUser" && <AddUser accessRole={isVendorMode ? "vendor" : "admin"} />}
          {isAdminMode && page === "all" && <AllScripts />}

        </div>
      </div>
    </div>
  );
}
