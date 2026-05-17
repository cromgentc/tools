import { useState, useEffect } from "react";
import AddScript from "./AddScript";
import AccountManagement from "./AccountManagement";
import AllScripts from "./AllScripts";
import AddUser from "./AddUser";
import AddVendor from "./AddVendor";
import Profile from "./Profile";
import Settings, { getAdminSettings } from "./Settings";
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
  Download,
  ChevronDown,
  Cloud,
  Send,
  UserPlus,
  Upload,
  Settings as SettingsIcon,
  UserCircle,
} from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

export default function AdminDashboard() {
  const readCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("userInfo"));
    } catch {
      return null;
    }
  };
  const [currentUser, setCurrentUser] = useState(readCurrentUser);
  const isAdminMode = currentUser?.role === "admin";
  const isVendorMode = currentUser?.role === "vendor";
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 768
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userManagementMode, setUserManagementMode] = useState("");
  const [scriptAssignMenuOpen, setScriptAssignMenuOpen] = useState(false);
  const [scriptAssignMode, setScriptAssignMode] = useState("bulk");
  const [scriptMenuOpen, setScriptMenuOpen] = useState(false);
  const [scriptManagementMode, setScriptManagementMode] = useState("all");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [scriptStatusFilter, setScriptStatusFilter] = useState("all");
  const [scriptAudioOnly, setScriptAudioOnly] = useState(false);
  const [adminSettings, setAdminSettings] = useState(getAdminSettings());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [excelDownloading, setExcelDownloading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [stats, setStats] = useState({
    totalScripts: 0,
    totalUsers: 0,
    totalVendors: 0,
    totalRecordings: 0,
    completedRecordings: 0,
    pendingScripts: 0,
  });

  const navigate = useNavigate();

  const closeSidebarOnMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const goToPage = (nextPage) => {
    setPage(nextPage);
    closeSidebarOnMobile();
  };

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
      setUserMenuOpen(true);
    }

    const params = new URLSearchParams(window.location.search);
    const section = params.get("section");

    if (section === "users") {
      setPage("addUser");
      setUserMenuOpen(true);
      setUserManagementMode("");
    }

    if (section === "vendors" && user.role === "admin") {
      setPage("vendors");
    }

    if (section === "scripts" && user.role === "admin") {
      setPage("all");
      setScriptMenuOpen(true);
      setScriptManagementMode(params.get("scriptMode") || "all");
      setScriptStatusFilter(params.get("status") || "all");
      setScriptAudioOnly(params.get("audioOnly") === "true");
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
          totalVendors: data.data?.totalVendors || 0,
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

  useEffect(() => {
    const refreshSettings = () => setAdminSettings(getAdminSettings());
    const refreshCurrentUser = () => setCurrentUser(readCurrentUser());

    window.addEventListener("storage", refreshSettings);
    window.addEventListener("storage", refreshCurrentUser);
    window.addEventListener("admin-settings-updated", refreshSettings);
    const interval = setInterval(refreshSettings, 1000);

    return () => {
      window.removeEventListener("storage", refreshSettings);
      window.removeEventListener("storage", refreshCurrentUser);
      window.removeEventListener("admin-settings-updated", refreshSettings);
      clearInterval(interval);
    };
  }, []);

  const triggerBrowserDownload = (blob, fileName) => {
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(blobUrl);
  };

  const downloadScriptsExcel = async () => {
    try {
      setExcelDownloading(true);
      const response = await fetch(API_ENDPOINTS.RECORDING_SCRIPTS_EXCEL);

      if (!response.ok) {
        let errorMessage = "Excel download failed";

        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Keep the generic message when the response is not JSON.
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      triggerBrowserDownload(blob, "scripts-mobile-email-content.xlsx");
      toast.success("Excel downloaded");
    } catch (err) {
      console.error("SIDEBAR EXCEL DOWNLOAD ERROR:", err);
      toast.error(err.message || "Excel download failed");
    } finally {
      setExcelDownloading(false);
    }
  };

  // ================= MENU ITEM =================
  const menuItem = (key, label, icon) => (
    <button
      onClick={() => goToPage(key)}
      className={`w-full px-4 py-2.5 rounded-lg cursor-pointer transition flex items-center gap-3 text-sm
      ${page === key 
        ? "bg-blue-600 text-white font-semibold shadow-lg" 
        : "hover:bg-gray-800 text-gray-300 hover:text-white"}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const openUserManagementMode = (mode) => {
    setPage("addUser");
    setUserMenuOpen(true);
    setUserManagementMode(mode);
    closeSidebarOnMobile();
  };

  const userManagementMenu = () => (
    <div>
      <button
        onClick={() => {
          setPage("addUser");
          setUserManagementMode("");
          setUserMenuOpen((prev) => !prev);
        }}
        className={`w-full px-4 py-2.5 rounded-lg cursor-pointer transition flex items-center gap-3 text-sm ${
          page === "addUser"
            ? "bg-blue-600 text-white font-semibold shadow-lg"
            : "hover:bg-gray-800 text-gray-300 hover:text-white"
        }`}
      >
        <Users className="w-5 h-5" />
        <span className="flex-1 text-left">User Management</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
      </button>

      {userMenuOpen && (
        <div className="mt-2 space-y-1 pl-4">
          <button
            type="button"
            onClick={() => openUserManagementMode("single")}
            className={`w-full rounded-lg px-4 py-2 text-left text-xs transition flex items-center gap-2 ${
              page === "addUser" && userManagementMode === "single"
                ? "bg-blue-500/20 text-blue-200"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Add New User
          </button>

          <button
            type="button"
            onClick={() => openUserManagementMode("bulk")}
            className={`w-full rounded-lg px-4 py-2 text-left text-xs transition flex items-center gap-2 ${
              page === "addUser" && userManagementMode === "bulk"
                ? "bg-green-500/20 text-green-200"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Upload className="w-4 h-4" />
            Bulk Add Users
          </button>
        </div>
      )}
    </div>
  );

  const openScriptAssignMode = (mode) => {
    setPage("addScript");
    setScriptAssignMenuOpen(true);
    setScriptAssignMode(mode);
    closeSidebarOnMobile();
  };

  const scriptAssignMenu = () => (
    <div>
      <button
        type="button"
        onClick={() => {
          setPage("addScript");
          setScriptAssignMenuOpen((prev) => !prev);
        }}
        className={`w-full px-4 py-2.5 rounded-lg cursor-pointer transition flex items-center gap-3 text-sm ${
          page === "addScript"
            ? "bg-blue-600 text-white font-semibold shadow-lg"
            : "hover:bg-gray-800 text-gray-300 hover:text-white"
        }`}
      >
        <FileText className="w-5 h-5" />
        <span className="flex-1 text-left">Script Assign</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${scriptAssignMenuOpen ? "rotate-180" : ""}`} />
      </button>

      {scriptAssignMenuOpen && (
        <div className="mt-2 space-y-1 pl-4">
          <button
            type="button"
            onClick={() => openScriptAssignMode("single")}
            className={`w-full rounded-lg px-4 py-2 text-left text-xs transition flex items-center gap-2 ${
              page === "addScript" && scriptAssignMode === "single"
                ? "bg-blue-500/20 text-blue-200"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Send className="w-4 h-4" />
            Single Script Assign
          </button>

          <button
            type="button"
            onClick={() => openScriptAssignMode("bulk")}
            className={`w-full rounded-lg px-4 py-2 text-left text-xs transition flex items-center gap-2 ${
              page === "addScript" && scriptAssignMode === "bulk"
                ? "bg-green-500/20 text-green-200"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Upload className="w-4 h-4" />
            Bulk Script Add
          </button>
        </div>
      )}
    </div>
  );

  const openScriptManagementMode = (mode) => {
    setPage("all");
    setScriptMenuOpen(true);
    setScriptManagementMode(mode);
    setScriptStatusFilter("all");
    setScriptAudioOnly(false);
    closeSidebarOnMobile();
  };

  const openDashboardTarget = (target) => {
    const url = new URL("/admin-dashboard", window.location.origin);

    if (target === "scripts") {
      url.searchParams.set("section", "scripts");
      url.searchParams.set("scriptMode", "all");
    }

    if (target === "users") {
      url.searchParams.set("section", "users");
    }

    if (target === "vendors") {
      url.searchParams.set("section", "vendors");
    }

    if (target === "recordings") {
      url.searchParams.set("section", "scripts");
      url.searchParams.set("scriptMode", "all");
      url.searchParams.set("audioOnly", "true");
    }

    if (target === "completed") {
      url.searchParams.set("section", "scripts");
      url.searchParams.set("scriptMode", "all");
      url.searchParams.set("status", "completed");
    }

    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  const scriptManagementMenu = () => (
    <div>
      <button
        onClick={() => {
          setPage("all");
          setScriptMenuOpen((prev) => !prev);
        }}
        className={`w-full px-4 py-2.5 rounded-lg cursor-pointer transition flex items-center gap-3 text-sm ${
          page === "all"
            ? "bg-blue-600 text-white font-semibold shadow-lg"
            : "hover:bg-gray-800 text-gray-300 hover:text-white"
        }`}
      >
        <Radio className="w-5 h-5" />
        <span className="flex-1 text-left">Script Management</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${scriptMenuOpen ? "rotate-180" : ""}`} />
      </button>

      {scriptMenuOpen && (
        <div className="mt-2 space-y-1 pl-4">
          <button
            type="button"
            onClick={() => openScriptManagementMode("vendor")}
            className={`w-full rounded-lg px-4 py-2 text-left text-xs transition flex items-center gap-2 ${
              page === "all" && scriptManagementMode === "vendor"
                ? "bg-cyan-500/20 text-cyan-200"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Vendor Wise
          </button>

          <button
            type="button"
            onClick={() => openScriptManagementMode("user")}
            className={`w-full rounded-lg px-4 py-2 text-left text-xs transition flex items-center gap-2 ${
              page === "all" && scriptManagementMode === "user"
                ? "bg-purple-500/20 text-purple-200"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            User Wise
          </button>

          <button
            type="button"
            onClick={() => openScriptManagementMode("all")}
            className={`w-full rounded-lg px-4 py-2 text-left text-xs transition flex items-center gap-2 ${
              page === "all" && scriptManagementMode === "all"
                ? "bg-orange-500/20 text-orange-200"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            All Script
          </button>
        </div>
      )}
    </div>
  );

  const openAccountManagementMode = () => {
    setPage("accountManagement");
    setAccountMenuOpen(true);
    closeSidebarOnMobile();
  };

  const accountManagementMenu = () => (
    <div>
      <button
        type="button"
        onClick={() => {
          setPage("accountManagement");
          setAccountMenuOpen((prev) => !prev);
        }}
        className={`w-full px-4 py-2.5 rounded-lg cursor-pointer transition flex items-center gap-3 text-sm ${
          page === "accountManagement"
            ? "bg-blue-600 text-white font-semibold shadow-lg"
            : "hover:bg-gray-800 text-gray-300 hover:text-white"
        }`}
      >
        <UserCircle className="w-5 h-5" />
        <span className="flex-1 text-left">Account Management</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${accountMenuOpen ? "rotate-180" : ""}`} />
      </button>

      {accountMenuOpen && (
        <div className="mt-2 space-y-1 pl-4">
          <button
            type="button"
            onClick={openAccountManagementMode}
            className={`w-full rounded-lg px-4 py-2 text-left text-xs transition flex items-center gap-2 ${
              page === "accountManagement"
                ? "bg-cyan-500/20 text-cyan-200"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Cloud className="w-4 h-4" />
            Cloudinary Account
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-80 max-w-[90vw] bg-gradient-to-b from-gray-900 to-black border-r border-gray-800 flex flex-col transition-all duration-300 md:static md:z-auto md:max-w-none ${
          sidebarOpen ? "translate-x-0 md:w-72" : "-translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden md:border-r-0"
        }`}
      >

        <div className="flex items-center justify-between gap-3 border-b border-gray-800 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 p-1.5">
              {adminSettings.logoDataUrl ? (
                <img src={adminSettings.logoDataUrl} alt="Logo" className="h-full w-full rounded-lg object-contain" />
              ) : (
                <LayoutDashboard className="h-7 w-7 text-blue-400" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-white">
                {isVendorMode ? "Vendor Panel" : "Admin Panel"}
              </h1>
              <p className="truncate text-xs font-semibold uppercase tracking-wide text-blue-300">
                {isVendorMode ? "Vendor Access" : "Admin Access"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-gray-300 hover:bg-gray-800 md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {isAdminMode && menuItem("dashboard", "Dashboard", <LayoutDashboard className="w-5 h-5" />)}
          {isAdminMode && scriptAssignMenu()}
          {isAdminMode && menuItem("vendors", "Vendor Management", <Building2 className="w-5 h-5" />)}
          {userManagementMenu()}
          {isAdminMode && scriptManagementMenu()}
          {accountManagementMenu()}
          {isAdminMode && menuItem("settings", "Settings", <SettingsIcon className="w-5 h-5" />)}
          {isAdminMode && (
            <button
              onClick={() => {
                downloadScriptsExcel();
                closeSidebarOnMobile();
              }}
              disabled={excelDownloading || backendStatus === "error"}
              className={`w-full px-4 py-2.5 rounded-lg transition flex items-center gap-3 text-sm ${
                excelDownloading || backendStatus === "error"
                  ? "cursor-not-allowed bg-gray-800 text-gray-500"
                  : "bg-green-600/20 text-green-300 hover:bg-green-600 hover:text-white"
              }`}
            >
              {excelDownloading ? (
                <div className="w-5 h-5 animate-spin rounded-full border-2 border-green-200 border-t-transparent" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span>{excelDownloading ? "Downloading..." : "Download Excel"}</span>
            </button>
          )}
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
      <div className="flex-1 flex min-w-0 flex-col">

        {/* TOPBAR */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800 px-3 py-3 md:px-6 md:py-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          <h2 className="min-w-0 flex-1 justify-center text-center text-sm font-semibold capitalize flex items-center gap-2 md:text-lg">
            {page === "dashboard" && (
              <>
                <LayoutDashboard className="w-5 h-5 text-blue-400" />
                <span className="truncate">Dashboard</span>
              </>
            )}
            {page === "addScript" && (
              <>
                <FileText className="w-5 h-5 text-green-400" />
                <span className="truncate">Script Assign</span>
              </>
            )}
            {page === "addUser" && (
              <>
                <Users className="w-5 h-5 text-purple-400" />
                <span className="truncate">{isVendorMode ? "Vendor User Management" : "User Management"}</span>
              </>
            )}
            {isAdminMode && page === "vendors" && (
              <>
                <Building2 className="w-5 h-5 text-cyan-400" />
                <span className="truncate">Vendor Management</span>
              </>
            )}
            {isAdminMode && page === "all" && (
              <>
                <Radio className="w-5 h-5 text-orange-400" />
                <span className="truncate">Script Management</span>
              </>
            )}
            {isAdminMode && page === "settings" && (
              <>
                <SettingsIcon className="w-5 h-5 text-blue-400" />
                <span className="truncate">Settings</span>
              </>
            )}
            {page === "accountManagement" && (
              <>
                <UserCircle className="w-5 h-5 text-blue-400" />
                <span className="truncate">Account Management</span>
              </>
            )}
            {page === "profile" && (
              <>
                <UserCircle className="w-5 h-5 text-blue-400" />
                <span className="truncate">Profile</span>
              </>
            )}
          </h2>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="flex max-w-[140px] items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-200 transition hover:border-blue-500 hover:text-white md:max-w-[220px]"
            >
              <UserCircle className="h-4 w-4 text-blue-300" />
              <span className="truncate">{currentUser?.name || "Profile"}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-gray-700 bg-gray-900 p-2 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setPage("profile");
                    setProfileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-300 transition hover:bg-gray-800 hover:text-white"
                >
                  <UserCircle className="h-4 w-4" />
                  Profile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto p-3 md:p-6">

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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-xl font-bold text-white md:text-2xl">Statistics Dashboard</h3>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {/* TOTAL SCRIPTS */}
                <button
                  type="button"
                  onClick={() => openDashboardTarget("scripts")}
                  className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-600/30 p-6 rounded-xl text-left hover:shadow-lg hover:border-blue-400 transition active:scale-95"
                >
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
                </button>

                {/* TOTAL USERS */}
                <button
                  type="button"
                  onClick={() => openDashboardTarget("users")}
                  className="bg-gradient-to-br from-green-900/30 to-green-900/10 border border-green-600/30 p-6 rounded-xl text-left hover:shadow-lg hover:border-green-400 transition active:scale-95"
                >
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
                </button>

                {/* TOTAL VENDORS */}
                <button
                  type="button"
                  onClick={() => openDashboardTarget("vendors")}
                  className="bg-gradient-to-br from-cyan-900/30 to-cyan-900/10 border border-cyan-600/30 p-6 rounded-xl text-left hover:shadow-lg hover:border-cyan-400 transition active:scale-95"
                >
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <h3 className="text-gray-400 text-xs uppercase tracking-wide mb-1">Vendor Registered</h3>
                      <p className="text-3xl font-bold text-cyan-400">{stats.totalVendors || 0}</p>
                    </div>
                    <Building2 className="w-8 h-8 text-cyan-400 opacity-50" />
                  </div>
                  <div className="w-full bg-cyan-900/30 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full transition-all duration-500"
                      style={{ width: `${Math.min((stats.totalVendors || 0) * 10, 100)}%` }}
                    ></div>
                  </div>
                </button>

                {/* TOTAL RECORDINGS */}
                <button
                  type="button"
                  onClick={() => openDashboardTarget("recordings")}
                  className="bg-gradient-to-br from-orange-900/30 to-orange-900/10 border border-orange-600/30 p-6 rounded-xl text-left hover:shadow-lg hover:border-orange-400 transition active:scale-95"
                >
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
                </button>

                {/* COMPLETED RECORDINGS */}
                <button
                  type="button"
                  onClick={() => openDashboardTarget("completed")}
                  className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border border-purple-600/30 p-6 rounded-xl text-left hover:shadow-lg hover:border-purple-400 transition active:scale-95"
                >
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
                </button>
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

          {isAdminMode && page === "addScript" && <AddScript mode={scriptAssignMode} />}
          {isAdminMode && page === "vendors" && <AddVendor />}
          {page === "addUser" && (
            <AddUser
              accessRole={isVendorMode ? "vendor" : "admin"}
              initialAddMode={userManagementMode}
            />
          )}
          {isAdminMode && page === "all" && (
            <AllScripts
              viewMode={scriptManagementMode}
              statusFilter={scriptStatusFilter}
              audioOnly={scriptAudioOnly}
            />
          )}
          {isAdminMode && page === "settings" && <Settings />}
          {page === "accountManagement" && <AccountManagement />}
          {page === "profile" && <Profile />}

        </div>
      </div>
    </div>
  );
}
