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
  Clock3,
  RefreshCw,
  Building2,
  Download,
  ChevronDown,
  Cloud,
  Send,
  UserPlus,
  Upload,
  Pencil,
  Trash2,
  Settings as SettingsIcon,
  UserCircle,
  BarChart3,
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
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [reportMode, setReportMode] = useState("vendor");
  const [reportVendors, setReportVendors] = useState([]);
  const [vendorReports, setVendorReports] = useState([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportVendorId, setReportVendorId] = useState("");
  const [reportProjectName, setReportProjectName] = useState("");
  const [reportBatch, setReportBatch] = useState("");
  const [reportUrlInput, setReportUrlInput] = useState("");
  const [reportFile, setReportFile] = useState(null);
  const [reportSending, setReportSending] = useState(false);
  const [reportEditingId, setReportEditingId] = useState("");
  const [reportDeleteTarget, setReportDeleteTarget] = useState(null);
  const [scriptStatusFilter, setScriptStatusFilter] = useState("all");
  const [scriptAudioOnly, setScriptAudioOnly] = useState(false);
  const [adminSettings, setAdminSettings] = useState(getAdminSettings());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [excelDownloading, setExcelDownloading] = useState(false);
  const [reportExcelDownloading, setReportExcelDownloading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [stats, setStats] = useState({
    totalScripts: 0,
    totalUsers: 0,
    totalVendors: 0,
    totalRecordings: 0,
    completedRecordings: 0,
    pendingScripts: 0,
  });
  const [vendorStats, setVendorStats] = useState({
    totalUsers: 0,
    totalScripts: 0,
    completedScripts: 0,
    pendingScripts: 0,
    totalRecordings: 0,
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
      setPage("dashboard");
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

  const getCurrentVendorId = () => String(currentUser?.vendorId || currentUser?._id || "").trim();

  const fetchVendorStats = async () => {
    const vendorId = getCurrentVendorId();

    if (!vendorId) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_ENDPOINTS.ADMIN_USERS}?vendorId=${encodeURIComponent(vendorId)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch vendor dashboard");
      }

      const vendorUsers = Array.isArray(data.users) ? data.users : [];
      setVendorStats({
        totalUsers: vendorUsers.length,
        totalScripts: vendorUsers.reduce((sum, user) => sum + Number(user.totalScripts || 0), 0),
        completedScripts: vendorUsers.reduce((sum, user) => sum + Number(user.completedScripts || 0), 0),
        pendingScripts: vendorUsers.reduce((sum, user) => sum + Number(user.pendingScripts || 0), 0),
        totalRecordings: vendorUsers.reduce((sum, user) => sum + Number(user.totalRecordings || 0), 0),
      });
    } catch (err) {
      console.error("Vendor stats error:", err);
      toast.error(err.message || "Failed to load vendor dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminMode) {
      fetchStats();
    }
    if (isVendorMode) {
      fetchVendorStats();
    }
    checkBackend();
    const interval = setInterval(checkBackend, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [isAdminMode, isVendorMode, currentUser?.vendorId, currentUser?._id]);

  useEffect(() => {
    if (page !== "report") return;

    if (isAdminMode) {
      fetchReportVendors();
      fetchVendorReports();
    }

    if (isVendorMode) {
      fetchVendorReports(getCurrentVendorId());
    }
  }, [page, reportMode, isAdminMode, isVendorMode, currentUser?.vendorId, currentUser?._id]);

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

  const readResponseSafe = async (response) => {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();

    return {
      message: text.startsWith("<!DOCTYPE")
        ? "Vendor reports API route not found. Please restart the backend server."
        : text || "Unexpected server response",
    };
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

  const downloadReportExcel = async () => {
    try {
      setReportExcelDownloading(true);
      const response = await fetch(API_ENDPOINTS.ADMIN_REPORT_EXCEL(reportMode));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Report Excel download failed");
      }

      const blob = await response.blob();
      triggerBrowserDownload(blob, `${reportMode}-wise-report.xlsx`);
      toast.success("Report Excel downloaded");
    } catch (err) {
      console.error("REPORT EXCEL ERROR:", err);
      toast.error(err.message || "Report Excel download failed");
    } finally {
      setReportExcelDownloading(false);
    }
  };

  const fetchReportVendors = async () => {
    if (!isAdminMode) return;

    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_VENDORS);
      const data = await readResponseSafe(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch vendors");
      }

      setReportVendors(Array.isArray(data.vendors) ? data.vendors : []);
    } catch (err) {
      console.error("REPORT VENDORS ERROR:", err);
      toast.error(err.message || "Failed to fetch vendors");
    }
  };

  const fetchVendorReports = async (vendorId = "") => {
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_VENDOR_REPORTS(vendorId));
      const data = await readResponseSafe(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch vendor reports");
      }

      setVendorReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (err) {
      console.error("VENDOR REPORTS ERROR:", err);
      toast.error(err.message || "Failed to fetch vendor reports");
    }
  };

  const openShareReportModal = () => {
    setReportVendorId(reportVendors[0]?._id || "");
    setReportProjectName("");
    setReportBatch("");
    setReportUrlInput("");
    setReportFile(null);
    setReportEditingId("");
    setReportModalOpen(true);
  };

  const openEditReportModal = (report) => {
    setReportVendorId(String(report.vendorId || ""));
    setReportProjectName(report.projectName || "");
    setReportBatch(report.batch || "");
    setReportUrlInput(report.reportUrl || "");
    setReportFile(null);
    setReportEditingId(report._id);
    setReportModalOpen(true);
  };

  const getDirectReportDownloadUrl = (rawUrl) => {
    try {
      const url = new URL(rawUrl);
      const host = url.hostname.toLowerCase();

      if (host.includes("drive.google.com")) {
        const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
        const fileId = fileMatch?.[1] || url.searchParams.get("id");

        if (fileId) {
          return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
        }
      }

      if (host.includes("docs.google.com")) {
        const docMatch = url.pathname.match(/\/(spreadsheets|document|presentation)\/d\/([^/]+)/);
        const docType = docMatch?.[1];
        const docId = docMatch?.[2];
        const exportFormats = {
          spreadsheets: "xlsx",
          document: "docx",
          presentation: "pptx",
        };

        if (docType && docId) {
          return `https://docs.google.com/${docType}/d/${docId}/export?format=${exportFormats[docType]}`;
        }
      }
    } catch {
      return rawUrl;
    }

    return rawUrl;
  };

  const downloadVendorReport = (report) => {
    const targetUrl = report.fileUrl || report.reportUrl;

    if (!targetUrl) {
      return toast.error("No report file or URL available");
    }

    const downloadUrl = getDirectReportDownloadUrl(targetUrl);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = report.fileName || `${report.projectName || "vendor-report"}`;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const sendVendorReport = async () => {
    if (!reportVendorId) {
      return toast.error("Please select vendor");
    }

    if (!reportEditingId && !reportFile && !reportUrlInput.trim()) {
      return toast.error("Choose file or paste report URL");
    }

    try {
      setReportSending(true);
      const formData = new FormData();
      formData.append("vendorId", reportVendorId);
      formData.append("projectName", reportProjectName.trim());
      formData.append("batch", reportBatch.trim());
      formData.append("reportUrl", reportUrlInput.trim());

      if (reportFile) {
        formData.append("file", reportFile);
      }

      const response = await fetch(
        reportEditingId
          ? API_ENDPOINTS.ADMIN_VENDOR_REPORT(reportEditingId)
          : API_ENDPOINTS.ADMIN_SHARE_VENDOR_REPORT,
        {
        method: reportEditingId ? "PATCH" : "POST",
        body: formData,
        }
      );
      const data = await readResponseSafe(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to share report");
      }

      toast.success(data.message || (reportEditingId ? "Report updated" : "Report shared with vendor"));
      setReportModalOpen(false);
      setReportEditingId("");
      setReportFile(null);
      setReportProjectName("");
      setReportBatch("");
      setReportUrlInput("");
      await fetchVendorReports();
    } catch (err) {
      console.error("SEND VENDOR REPORT ERROR:", err);
      toast.error(err.message || "Failed to share report");
    } finally {
      setReportSending(false);
    }
  };

  const deleteVendorReport = async () => {
    if (!reportDeleteTarget?._id) return;

    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_VENDOR_REPORT(reportDeleteTarget._id), {
        method: "DELETE",
      });
      const data = await readResponseSafe(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete report");
      }

      toast.success(data.message || "Report deleted");
      setReportDeleteTarget(null);
      await fetchVendorReports();
    } catch (err) {
      console.error("DELETE VENDOR REPORT ERROR:", err);
      toast.error(err.message || "Failed to delete report");
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

  const openReportMode = (mode) => {
    setPage("report");
    setReportMenuOpen(true);
    setReportMode(mode);
    closeSidebarOnMobile();
  };

  const reportMenu = () => (
    <div>
      <button
        type="button"
        onClick={() => {
          setPage("report");
          setReportMenuOpen((prev) => !prev);
        }}
        className={`w-full px-4 py-2.5 rounded-lg cursor-pointer transition flex items-center gap-3 text-sm ${
          page === "report"
            ? "bg-blue-600 text-white font-semibold shadow-lg"
            : "hover:bg-gray-800 text-gray-300 hover:text-white"
        }`}
      >
        <BarChart3 className="w-5 h-5" />
        <span className="flex-1 text-left">Report</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${reportMenuOpen ? "rotate-180" : ""}`} />
      </button>

      {reportMenuOpen && (
        <div className="mt-2 space-y-1 pl-4">
          <button
            type="button"
            onClick={() => openReportMode("vendor")}
            className={`w-full rounded-lg px-4 py-2 text-left text-xs transition flex items-center gap-2 ${
              page === "report" && reportMode === "vendor"
                ? "bg-cyan-500/20 text-cyan-200"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Vendor Wise
          </button>

          <button
            type="button"
            onClick={() => openReportMode("user")}
            className={`w-full rounded-lg px-4 py-2 text-left text-xs transition flex items-center gap-2 ${
              page === "report" && reportMode === "user"
                ? "bg-purple-500/20 text-purple-200"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            User Wise
          </button>
        </div>
      )}
    </div>
  );

  const StatGraph = ({ title, icon, data, accent = "blue" }) => {
    const maxValue = Math.max(...data.map((item) => Number(item.value) || 0), 1);
    const accentClasses = {
      blue: "from-blue-500 to-cyan-400",
      green: "from-green-500 to-emerald-400",
      purple: "from-purple-500 to-fuchsia-400",
      orange: "from-orange-500 to-amber-400",
    };

    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 md:p-6">
        <h4 className="mb-5 flex items-center gap-2 text-base font-bold text-white md:text-lg">
          {icon}
          {title}
        </h4>

        <div className="flex h-64 items-end gap-3 overflow-x-auto pb-2 sm:gap-4">
          {data.map((item) => {
            const value = Number(item.value) || 0;
            const height = Math.max((value / maxValue) * 100, value > 0 ? 8 : 2);

            return (
              <div key={item.label} className="flex min-w-[76px] flex-1 flex-col items-center justify-end gap-2">
                <div className="text-xs font-semibold text-gray-200">{value}</div>
                <div className="flex h-44 w-full items-end rounded-lg bg-gray-900/70 p-1">
                  <div
                    className={`w-full rounded-md bg-gradient-to-t ${accentClasses[accent] || accentClasses.blue} transition-all duration-500`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <div className="min-h-[32px] text-center text-[11px] font-medium leading-tight text-gray-400">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
          {isVendorMode && menuItem("dashboard", "Dashboard", <LayoutDashboard className="w-5 h-5" />)}
          {isVendorMode && menuItem("report", "Report", <BarChart3 className="w-5 h-5" />)}
          {isAdminMode && scriptAssignMenu()}
          {isAdminMode && menuItem("vendors", "Vendor Management", <Building2 className="w-5 h-5" />)}
          {userManagementMenu()}
          {isAdminMode && scriptManagementMenu()}
          {isAdminMode && accountManagementMenu()}
          {isAdminMode && reportMenu()}
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
          {isAdminMode && menuItem("settings", "Settings", <SettingsIcon className="w-5 h-5" />)}
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
            {page === "report" && (
              <>
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <span className="truncate">Report</span>
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

          {isVendorMode && page === "dashboard" && (
            <div className="space-y-6">
              {backendStatus === "error" && (
                <div className="flex items-center gap-3 rounded-lg border border-red-600/50 bg-red-900/20 p-4">
                  <AlertCircle className="h-6 w-6 shrink-0 text-red-400" />
                  <div>
                    <p className="font-semibold text-red-400">Backend Connection Error</p>
                    <p className="text-sm text-red-300">Vendor dashboard may not update.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white md:text-2xl">
                    {currentUser?.vendorName || currentUser?.name || "Vendor"} Dashboard
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Only your assigned users and their scripts are shown here.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchVendorStats}
                  disabled={loading}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all ${
                    loading ? "cursor-not-allowed bg-gray-600" : "bg-blue-600 hover:bg-blue-700 active:scale-95"
                  }`}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ["Total Users", vendorStats.totalUsers, <Users className="h-8 w-8 text-green-400 opacity-60" />, "text-green-400", "border-green-600/30 bg-green-900/10"],
                  ["Total Scripts", vendorStats.totalScripts, <FileText className="h-8 w-8 text-blue-400 opacity-60" />, "text-blue-400", "border-blue-600/30 bg-blue-900/10"],
                  ["Completed Scripts", vendorStats.completedScripts, <Radio className="h-8 w-8 text-purple-400 opacity-60" />, "text-purple-400", "border-purple-600/30 bg-purple-900/10"],
                  ["Pending Scripts", vendorStats.pendingScripts, <Clock3 className="h-8 w-8 text-yellow-400 opacity-60" />, "text-yellow-400", "border-yellow-600/30 bg-yellow-900/10"],
                  ["Total Recordings", vendorStats.totalRecordings, <Download className="h-8 w-8 text-orange-400 opacity-60" />, "text-orange-400", "border-orange-600/30 bg-orange-900/10"],
                ].map(([label, value, icon, textClass, cardClass]) => (
                  <div key={label} className={`rounded-xl border p-5 ${cardClass}`}>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">{label}</p>
                        <p className={`text-3xl font-bold ${textClass}`}>{value || 0}</p>
                      </div>
                      {icon}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <StatGraph
                  title="Vendor Dashboard Graph"
                  icon={<LayoutDashboard className="h-5 w-5 text-blue-400" />}
                  accent="blue"
                  data={[
                    { label: "Users", value: vendorStats.totalUsers },
                    { label: "Scripts", value: vendorStats.totalScripts },
                    { label: "Completed", value: vendorStats.completedScripts },
                    { label: "Pending", value: vendorStats.pendingScripts },
                    { label: "Recordings", value: vendorStats.totalRecordings },
                  ]}
                />

                <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 md:p-6">
                  <h4 className="mb-5 flex items-center gap-2 text-base font-bold text-white md:text-lg">
                    <Radio className="h-5 w-5 text-green-400" />
                    Script Completion
                  </h4>
                  <div className="space-y-5">
                    {[
                      ["Completed Scripts", vendorStats.completedScripts, "from-green-500 to-emerald-400", "text-green-400"],
                      ["Pending Scripts", vendorStats.pendingScripts, "from-yellow-500 to-amber-400", "text-yellow-400"],
                    ].map(([label, value, barClass, textClass]) => {
                      const total = Math.max(vendorStats.totalScripts || 0, 1);
                      const percent = Math.min((Number(value || 0) / total) * 100, 100);

                      return (
                        <div key={label}>
                          <div className="mb-2 flex justify-between text-sm">
                            <span className="text-gray-300">{label}</span>
                            <span className={`font-semibold ${textClass}`}>{value || 0}</span>
                          </div>
                          <div className="h-4 overflow-hidden rounded-full bg-gray-900">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${barClass} transition-all duration-500`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 border-t border-gray-700 pt-4 text-center">
                    <p className="text-sm text-gray-300">
                      <span className="text-lg font-bold text-green-400">
                        {vendorStats.totalScripts > 0
                          ? Math.round((vendorStats.completedScripts / vendorStats.totalScripts) * 100)
                          : 0}%
                      </span>{" "}
                      Completion Rate
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isVendorMode && page === "report" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-5">
                <h3 className="flex items-center gap-2 text-xl font-bold text-white">
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
                  My Reports
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Reports shared with your vendor account are shown here.
                </p>
              </div>

              <div className="rounded-xl border border-gray-700 bg-gray-900 p-5">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-gray-700 text-xs uppercase tracking-wide text-gray-400">
                      <tr>
                        <th className="px-3 py-3">Sr No</th>
                        <th className="px-3 py-3">Vendor</th>
                        <th className="px-3 py-3">Project Name</th>
                        <th className="px-3 py-3">Batch</th>
                        <th className="px-3 py-3">Report</th>
                        <th className="px-3 py-3">Shared On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {vendorReports.length === 0 && (
                        <tr>
                          <td className="px-3 py-5 text-center text-gray-400" colSpan={6}>
                            No reports shared with your vendor account yet.
                          </td>
                        </tr>
                      )}

                      {vendorReports.map((report, index) => (
                        <tr key={report._id} className="text-gray-200">
                          <td className="px-3 py-3">{index + 1}</td>
                          <td className="px-3 py-3 font-semibold">{report.vendorName}</td>
                          <td className="px-3 py-3">{report.projectName || "N/A"}</td>
                          <td className="px-3 py-3">{report.batch || "N/A"}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-1">
                              {report.fileUrl && (
                                <span className="text-blue-300">
                                  {report.fileName || "Open file"}
                                </span>
                              )}
                              {report.reportUrl && (
                                <span className="break-all text-green-300">
                                  {report.reportUrl}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-gray-400">
                            {report.createdAt ? new Date(report.createdAt).toLocaleString() : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

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
                <StatGraph
                  title="Dashboard Graph"
                  icon={<LayoutDashboard className="h-5 w-5 text-blue-400" />}
                  accent="blue"
                  data={[
                    { label: "Scripts", value: stats.totalScripts },
                    { label: "Users", value: stats.totalUsers },
                    { label: "Vendors", value: stats.totalVendors },
                    { label: "Recordings", value: stats.totalRecordings },
                    { label: "Completed", value: stats.completedRecordings },
                  ]}
                />
                
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
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 lg:col-span-2">
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
          {isAdminMode && page === "report" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-700 bg-gray-900 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-xl font-bold text-white">
                      {reportMode === "vendor" ? (
                        <Building2 className="h-5 w-5 text-cyan-400" />
                      ) : (
                        <Users className="h-5 w-5 text-purple-400" />
                      )}
                      {reportMode === "vendor" ? "Vendor Wise Report" : "User Wise Report"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-400">
                      {reportMode === "vendor"
                        ? "Vendor registration and vendor-level activity summary."
                        : "User, script, and recording activity summary."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={downloadReportExcel}
                      disabled={reportExcelDownloading}
                      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        reportExcelDownloading
                          ? "cursor-not-allowed bg-gray-700 text-gray-400"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {reportExcelDownloading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-200 border-t-transparent" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {reportExcelDownloading ? "Downloading..." : "Download Excel"}
                    </button>

                  </div>
                </div>
              </div>

              {reportMode === "vendor" && (
                <div className="rounded-xl border border-gray-700 bg-gray-900 p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-white">Vendor Shared Reports</h4>
                      <p className="text-sm text-gray-400">Reports are visible only to the selected vendor.</p>
                    </div>
                    <button
                      type="button"
                      onClick={openShareReportModal}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
                    >
                      <Upload className="h-4 w-4" />
                      Send Vendor Report
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-gray-700 text-xs uppercase tracking-wide text-gray-400">
                        <tr>
                          <th className="px-3 py-3">Sr No</th>
                          <th className="px-3 py-3">Vendor</th>
                          <th className="px-3 py-3">Vendor Code</th>
                          <th className="px-3 py-3">Project Name</th>
                          <th className="px-3 py-3">Batch</th>
                          <th className="px-3 py-3">Report</th>
                          <th className="px-3 py-3">Shared On</th>
                          <th className="px-3 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {vendorReports.length === 0 && (
                          <tr>
                            <td className="px-3 py-5 text-center text-gray-400" colSpan={8}>
                              No vendor report shared yet.
                            </td>
                          </tr>
                        )}

                        {vendorReports.map((report, index) => (
                          <tr key={report._id} className="text-gray-200">
                            <td className="px-3 py-3">{index + 1}</td>
                            <td className="px-3 py-3 font-semibold">{report.vendorName}</td>
                            <td className="px-3 py-3 font-mono text-cyan-300">{report.vendorCode || "N/A"}</td>
                            <td className="px-3 py-3">{report.projectName || "N/A"}</td>
                            <td className="px-3 py-3">{report.batch || "N/A"}</td>
                            <td className="px-3 py-3">
                              <div className="flex flex-col gap-1">
                                {report.fileUrl && (
                                  <span className="text-blue-300">
                                    {report.fileName || "Open file"}
                                  </span>
                                )}
                                {report.reportUrl && (
                                  <span className="break-all text-green-300">
                                    {report.reportUrl}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-gray-400">
                              {report.createdAt ? new Date(report.createdAt).toLocaleString() : "N/A"}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => downloadVendorReport(report)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-600/40 text-blue-300 transition hover:bg-blue-600 hover:text-white"
                                  title="Download report"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditReportModal(report)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-600/40 text-amber-300 transition hover:bg-amber-600 hover:text-white"
                                  title="Edit report"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReportDeleteTarget(report)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-600/40 text-red-300 transition hover:bg-red-600 hover:text-white"
                                  title="Delete report"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportMode === "user" && (
                <div className="rounded-xl border border-gray-700 bg-gray-900 p-5">
                  <h4 className="text-lg font-bold text-white">User Wise Reports</h4>
                  <p className="mt-2 text-sm text-gray-400">
                    Use Download Excel from above for user wise report.
                  </p>
                </div>
              )}
            </div>
          )}
          {isAdminMode && page === "settings" && <Settings />}
          {isAdminMode && page === "accountManagement" && <AccountManagement />}
          {page === "profile" && <Profile />}

        </div>
      </div>

      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {reportEditingId ? "Edit Vendor Report" : "Send Vendor Report"}
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Select one vendor. This report will be visible only to that vendor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Vendor
                </label>
                <select
                  value={reportVendorId}
                  onChange={(event) => setReportVendorId(event.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Select vendor</option>
                  {reportVendors.map((vendor) => (
                    <option key={vendor._id} value={vendor._id}>
                      {vendor.name} ({vendor.vendorCode || "N/A"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Project Name
                  </label>
                  <input
                    value={reportProjectName}
                    onChange={(event) => setReportProjectName(event.target.value)}
                    placeholder="Enter project name"
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Batch
                  </label>
                  <input
                    value={reportBatch}
                    onChange={(event) => setReportBatch(event.target.value)}
                    placeholder="Enter batch"
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Choose File
                </label>
                <input
                  type="file"
                  onChange={(event) => setReportFile(event.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-gray-300 file:cursor-pointer file:rounded file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:font-semibold file:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Or Paste Report URL
                </label>
                <input
                  value={reportUrlInput}
                  onChange={(event) => setReportUrlInput(event.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="rounded-lg border border-gray-600 px-4 py-2 font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendVendorReport}
                disabled={reportSending}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold transition ${
                  reportSending
                    ? "cursor-not-allowed bg-gray-700 text-gray-400"
                    : "bg-cyan-600 text-white hover:bg-cyan-700"
                }`}
              >
                {reportSending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {reportSending ? "Saving..." : reportEditingId ? "Update Report" : "Send Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Delete Vendor Report?</h3>
            <p className="mt-2 text-sm text-gray-400">
              This report entry for {reportDeleteTarget.vendorName} will be permanently deleted.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setReportDeleteTarget(null)}
                className="rounded-lg border border-gray-600 px-4 py-2 font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteVendorReport}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
