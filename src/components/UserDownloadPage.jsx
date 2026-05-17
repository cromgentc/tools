import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Download, FileText, Loader, Radio, Trash2, User } from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

const readJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const triggerBrowserDownload = (blob, fileName) => {
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(blobUrl);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeExcelValue = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const EXCEL_LINK_CELL = "__excelLink";

const createExcelLinkCell = (href, text = "Download Recording") =>
  href
    ? {
        [EXCEL_LINK_CELL]: true,
        href,
        text,
      }
    : "";

const renderExcelCell = (value) => {
  if (value?.[EXCEL_LINK_CELL] && value.href) {
    return `<td><a href="${escapeExcelValue(value.href)}">${escapeExcelValue(value.text || value.href)}</a></td>`;
  }

  return `<td>${escapeExcelValue(value)}</td>`;
};

const downloadExcelTable = ({ fileName, sheets }) => {
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; }
          th, td { border: 1px solid #999; padding: 6px; mso-number-format:"\\@"; }
          th { font-weight: 700; background: #e5e7eb; }
          h2 { font-family: Arial, sans-serif; }
        </style>
      </head>
      <body>
        ${sheets
          .map(
            (sheet) => `
              <h2>${escapeExcelValue(sheet.title)}</h2>
              <table>
                <thead>
                  <tr>${sheet.headers.map((header) => `<th>${escapeExcelValue(header)}</th>`).join("")}</tr>
                </thead>
                <tbody>
                  ${sheet.rows
                    .map(
                      (row) =>
                        `<tr>${sheet.headers
                          .map((header) => renderExcelCell(row[header]))
                          .join("")}</tr>`
                    )
                    .join("")}
                </tbody>
              </table>
              <br />
            `
          )
          .join("")}
      </body>
    </html>
  `;

  triggerBrowserDownload(
    new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }),
    fileName
  );
};

const sanitizeFileNamePart = (value) => {
  const safeValue = String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return safeValue || "recording";
};

const formatDateTime = (value) => {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";

  return date.toLocaleString();
};

const truncateText = (value, max = 140) => {
  if (!value) return "No content";
  return value.length > max ? `${value.slice(0, max)}...` : value;
};

const formatDuration = (value) => {
  const totalSeconds = Math.max(0, Number(value) || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const getRecordingDisplayName = (recording, index = 0) =>
  recording?.filename || `recording-${index + 1}`;

const getRecordingDownloadName = (recording, index = 0, format = "wav") => {
  const baseName = getRecordingDisplayName(recording, index).replace(/\.[^./\\]+$/, "");

  return `${sanitizeFileNamePart(baseName)}.${format}`;
};

const getRecordingDirectDownloadLink = (recording, index = 0) => {
  const audioLink = recording?.audioLink || "";

  if (!audioLink) return "";

  const cloudinaryUploadMatch = audioLink.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/)(.+)$/i
  );

  if (!cloudinaryUploadMatch) return audioLink;

  const [, uploadPrefix, assetPath] = cloudinaryUploadMatch;
  const cleanAssetPath = assetPath
    .split("/")
    .filter((segment) => !/^fl_attachment(?::[^/]+)?$/i.test(segment) && !/^f_wav$/i.test(segment))
    .join("/");
  const attachmentName = sanitizeFileNamePart(
    getRecordingDownloadName(recording, index, "wav").replace(/\.[^./\\]+$/, "")
  ).replace(/[^a-zA-Z0-9_-]/g, "-");
  const wavAssetPath = cleanAssetPath.replace(/(?:\.[^./?#]+)?([?#].*)?$/, ".wav$1");

  return `${uploadPrefix}fl_attachment:${encodeURIComponent(attachmentName)}/f_wav/${wavAssetPath}`;
};

const normalizeUserDetails = (user) => ({
  ...user,
  recordings: Array.isArray(user?.recordings)
    ? user.recordings.map((recording) => ({
        ...recording,
        audioLink: API_ENDPOINTS.RESOLVE_MEDIA_URL(recording.audioLink),
      }))
    : [],
  scripts: Array.isArray(user?.scripts) ? user.scripts : [],
});

export default function UserDownloadPage() {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const vendorId = String(queryParams.get("vendorId") || "").trim();
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo"));
    } catch {
      return null;
    }
  }, []);
  const isAdminMode = currentUser?.role === "admin";
  const [user, setUser] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingOneByOne, setDownloadingOneByOne] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [vendorSaving, setVendorSaving] = useState(false);
  const [deletingAllRecordings, setDeletingAllRecordings] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);

        const detailsUrl = vendorId
          ? `${API_ENDPOINTS.ADMIN_USER_DETAILS(userId)}?vendorId=${encodeURIComponent(vendorId)}`
          : API_ENDPOINTS.ADMIN_USER_DETAILS(userId);
        const response = await fetch(detailsUrl);
        const data = await readJsonSafe(response);

        if (!response.ok) {
          throw new Error(data.message || "Failed to load user download page");
        }

        setUser(normalizeUserDetails(data.user));
      } catch (err) {
        console.error("USER DOWNLOAD PAGE ERROR:", err);
        toast.error(err.message || "Failed to load user download page");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId, vendorId]);

  useEffect(() => {
    if (!isAdminMode) return;

    const fetchVendors = async () => {
      try {
        setVendorsLoading(true);
        const response = await fetch(API_ENDPOINTS.ADMIN_VENDORS);
        const data = await readJsonSafe(response);

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch vendors");
        }

        setVendors(Array.isArray(data.vendors) ? data.vendors : []);
      } catch (err) {
        console.error("FETCH VENDORS ERROR:", err);
        toast.error(err.message || "Failed to load vendors");
      } finally {
        setVendorsLoading(false);
      }
    };

    fetchVendors();
  }, [isAdminMode]);

  const downloadableRecordings =
    user?.recordings?.filter((recording) => recording.audioLink) || [];
  const hasAnyRecordings = (user?.recordings?.length || 0) > 0;

  const getUserExportRow = (selectedUser) => ({
    Name: selectedUser?.name || "",
    Mobile: selectedUser?.mobile || "",
    Email: selectedUser?.email || "",
    Role: selectedUser?.role || "",
    "Vendor Name": selectedUser?.vendorName || "Unassigned Vendor",
    "Vendor Code": selectedUser?.vendorCode || "N/A",
    "Account Status": selectedUser?.accountStatus || "",
    Presence: selectedUser?.presenceStatus || "",
    "Completed Scripts": selectedUser?.completedScripts || 0,
    "Pending Scripts": selectedUser?.pendingScripts || 0,
    "Total Recordings": selectedUser?.totalRecordings || selectedUser?.recordings?.length || 0,
    "Active Time": formatDuration(selectedUser?.totalActiveSeconds),
    "Last Active": formatDateTime(selectedUser?.lastActiveAt),
    "Registered On": formatDateTime(selectedUser?.createdAt),
  });

  const downloadUserExcel = () => {
    if (!user) {
      toast.error("User not loaded");
      return;
    }

    const summaryHeaders = Object.keys(getUserExportRow(user));
    const scriptRows = user.scripts.map((script, index) => ({
      "#": index + 1,
      "Script ID": script._id,
      Content: script.content,
      Status: script.status,
      Created: formatDateTime(script.createdAt),
      Completed: formatDateTime(script.completedAt),
    }));
    const recordingRows = user.recordings.map((recording, index) => ({
      "#": index + 1,
      "Recording ID": recording._id,
      "Recording Name": getRecordingDisplayName(recording, index),
      "Recording Link": createExcelLinkCell(
        getRecordingDirectDownloadLink(recording, index),
        "Download Recording"
      ),
      "File Size": recording.fileSize || 0,
      Uploaded: formatDateTime(recording.uploadedAt),
      "Script Content": recording.script?.content || "",
      "Script Status": recording.script?.status || "",
    }));

    downloadExcelTable({
      fileName: `${sanitizeFileNamePart(user.mobile || user.name)}-details.xls`,
      sheets: [
        {
          title: "User Summary",
          headers: summaryHeaders,
          rows: [getUserExportRow(user)],
        },
        {
          title: "Assigned Scripts",
          headers: ["#", "Script ID", "Content", "Status", "Created", "Completed"],
          rows: scriptRows,
        },
        {
          title: "Recordings",
          headers: [
            "#",
            "Recording ID",
            "Recording Name",
            "Recording Link",
            "File Size",
            "Uploaded",
            "Script Content",
            "Script Status",
          ],
          rows: recordingRows,
        },
      ],
    });
    toast.success("User details Excel downloaded");
  };

  const downloadAllZip = async () => {
    if (!user || downloadableRecordings.length === 0) {
      toast.error("No recordings available to download");
      return;
    }

    try {
      setDownloadingAll(true);

      const response = await fetch(API_ENDPOINTS.ADMIN_DOWNLOAD_USER_RECORDINGS(user._id));
      const data = response.ok ? null : await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(data?.message || "All recordings download failed");
      }

      const blob = await response.blob();
      triggerBrowserDownload(blob, `${sanitizeFileNamePart(user.mobile)}-recordings-wav.zip`);
      toast.success("All recordings ZIP downloaded");
    } catch (err) {
      console.error("DOWNLOAD ALL USER RECORDINGS ERROR:", err);
      toast.error(err.message || "All recordings download failed");
    } finally {
      setDownloadingAll(false);
    }
  };

  const downloadOne = async (recording, index) => {
    const downloadUrl = getRecordingDirectDownloadLink(recording, index);

    if (!downloadUrl) {
      toast.error("Audio link not available");
      return;
    }

    try {
      setDownloadingId(recording._id);
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error("Recording download failed");
      }

      const blob = await response.blob();
      triggerBrowserDownload(blob, getRecordingDownloadName(recording, index, "wav"));
      toast.success("Recording downloaded");
    } catch (err) {
      console.error("DOWNLOAD USER RECORDING ERROR:", err);
      toast.error(err.message || "Recording download failed");
    } finally {
      setDownloadingId("");
    }
  };

  const downloadAllOneByOne = async () => {
    if (downloadableRecordings.length === 0) {
      toast.error("No recordings available to download");
      return;
    }

    const loadingToast = toast.loading(
      `Starting ${downloadableRecordings.length} recording(s) one by one...`
    );

    try {
      setDownloadingOneByOne(true);
      let downloadedCount = 0;
      const failedRecordings = [];

      for (const [index, recording] of downloadableRecordings.entries()) {
        toast.loading(`Downloading ${index + 1}/${downloadableRecordings.length} recording(s)...`, {
          id: loadingToast,
        });

        try {
          const downloadUrl = getRecordingDirectDownloadLink(recording, index);
          const response = await fetch(downloadUrl);

          if (!response.ok) {
            throw new Error(`Recording ${index + 1} download failed`);
          }

          const blob = await response.blob();
          triggerBrowserDownload(blob, getRecordingDownloadName(recording, index, "wav"));
          downloadedCount += 1;
        } catch (err) {
          console.error("DOWNLOAD ONE BY ONE ITEM ERROR:", err);
          failedRecordings.push(index + 1);
        }

        if (index < downloadableRecordings.length - 1) {
          await wait(700);
        }
      }

      toast.dismiss(loadingToast);

      if (failedRecordings.length > 0) {
        toast.error(
          `${downloadedCount}/${downloadableRecordings.length} recording(s) downloaded. ${failedRecordings.length} failed.`
        );
        return;
      }

      toast.success(`All ${downloadedCount} recording(s) downloaded one by one`);
    } finally {
      setDownloadingOneByOne(false);
    }
  };

  const handleStatusChange = async (nextStatus) => {
    if (!user) return;

    try {
      setStatusSaving(true);
      const response = await fetch(API_ENDPOINTS.ADMIN_USER_STATUS(user._id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountStatus: nextStatus }),
      });
      const data = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to update status");
      }

      setUser((prev) => (prev ? { ...prev, accountStatus: nextStatus } : prev));
      toast.success("Account status updated");
    } catch (err) {
      console.error("UPDATE USER STATUS ERROR:", err);
      toast.error(err.message || "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleVendorChange = async (nextVendorId) => {
    if (!user) return;

    try {
      setVendorSaving(true);
      const response = await fetch(API_ENDPOINTS.ADMIN_USER_VENDOR(user._id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: nextVendorId }),
      });
      const data = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to update vendor");
      }

      const selectedVendor = vendors.find((vendor) => String(vendor._id) === String(nextVendorId));
      setUser((prev) =>
        prev
          ? {
              ...prev,
              vendorId: nextVendorId || "",
              vendorName: selectedVendor?.name || data.user?.vendorName || "",
              vendorCode: selectedVendor?.vendorCode || data.user?.vendorCode || "N/A",
            }
          : prev
      );
      toast.success("Vendor updated");
    } catch (err) {
      console.error("UPDATE USER VENDOR ERROR:", err);
      toast.error(err.message || "Failed to update vendor");
    } finally {
      setVendorSaving(false);
    }
  };

  const handleDeleteAllRecordings = async () => {
    if (!user || !hasAnyRecordings) return;

    const confirmed = window.confirm(
      `Are you sure to delete all ${user.recordings.length} recording(s) for ${user.mobile}?`
    );

    if (!confirmed) return;

    try {
      setDeletingAllRecordings(true);
      const response = await fetch(API_ENDPOINTS.ADMIN_DELETE_USER_RECORDINGS(user._id), {
        method: "DELETE",
      });
      const data = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete recordings");
      }

      setUser((prev) => (prev ? { ...prev, recordings: [], totalRecordings: 0 } : prev));
      toast.success(data.message || "All recordings deleted");
    } catch (err) {
      console.error("DELETE ALL RECORDINGS ERROR:", err);
      toast.error(err.message || "Failed to delete recordings");
    } finally {
      setDeletingAllRecordings(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      `Are you sure to delete ${user.name || user.mobile}? This will delete all related data.`
    );

    if (!confirmed) return;

    try {
      setDeletingUser(true);
      const response = await fetch(API_ENDPOINTS.ADMIN_DELETE_USER(user._id), {
        method: "DELETE",
      });
      const data = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete user");
      }

      toast.success(data.message || "User deleted");
      navigate("/admin-dashboard");
    } catch (err) {
      console.error("DELETE USER ERROR:", err);
      toast.error(err.message || "Failed to delete user");
    } finally {
      setDeletingUser(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          to="/admin-dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-300 transition hover:border-cyan-500 hover:text-cyan-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center rounded-lg border border-gray-800 bg-gray-900/70">
            <Loader className="h-7 w-7 animate-spin text-cyan-300" />
          </div>
        ) : user ? (
          <>
            <div className="rounded-lg border border-gray-800 bg-gray-900/80 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-300">
                    <User className="h-4 w-4" />
                    User Download Page
                  </p>
                  <h1 className="mt-2 text-2xl font-bold text-white">{user.name}</h1>
                  <p className="mt-1 font-mono text-green-400">{user.mobile}</p>
                  <p className="text-sm text-gray-400">{user.email}</p>
                  <p className="mt-2 text-sm text-cyan-300">
                    Vendor: {user.vendorName || "Auto Vendor"} ({user.vendorCode || "N/A"})
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:max-w-2xl lg:justify-end">
                  {isAdminMode && (
                    <>
                      <button
                        type="button"
                        onClick={downloadUserExcel}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold transition hover:bg-emerald-700"
                      >
                        <Download className="h-4 w-4" />
                        Download User Excel
                      </button>

                      <button
                        type="button"
                        onClick={downloadAllZip}
                        disabled={downloadingAll || downloadableRecordings.length === 0}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                          downloadingAll || downloadableRecordings.length === 0
                            ? "cursor-not-allowed bg-gray-700 text-gray-400"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        {downloadingAll ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {downloadingAll ? "Downloading..." : "Download All ZIP"}
                      </button>

                      <button
                        type="button"
                        onClick={downloadAllOneByOne}
                        disabled={downloadingOneByOne || downloadableRecordings.length === 0}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                          downloadingOneByOne || downloadableRecordings.length === 0
                            ? "cursor-not-allowed bg-gray-700 text-gray-400"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {downloadingOneByOne ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {downloadingOneByOne ? "Starting..." : "Download All One by One"}
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteAllRecordings}
                        disabled={deletingAllRecordings || deletingUser || !hasAnyRecordings}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                          deletingAllRecordings || deletingUser || !hasAnyRecordings
                            ? "cursor-not-allowed bg-gray-700 text-gray-400"
                            : "bg-rose-600 text-white hover:bg-rose-700"
                        }`}
                      >
                        {deletingAllRecordings ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        {deletingAllRecordings ? "Deleting All..." : "Delete All Recordings"}
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteUser}
                        disabled={deletingUser || deletingAllRecordings}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                          deletingUser || deletingAllRecordings
                            ? "cursor-not-allowed bg-gray-700 text-gray-400"
                            : "bg-red-600 text-white hover:bg-red-700"
                        }`}
                      >
                        {deletingUser ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        {deletingUser ? "Deleting..." : "Delete User"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isAdminMode && (
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-4">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Account Status
                    </label>
                    <select
                      value={user.accountStatus || "active"}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={statusSaving}
                      className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="suspended">suspended</option>
                    </select>
                  </div>

                  <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-4">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Change Vendor
                    </label>
                    <select
                      value={user.vendorId || ""}
                      onChange={(e) => handleVendorChange(e.target.value)}
                      disabled={vendorSaving || vendorsLoading}
                      className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">
                        {vendorsLoading ? "Loading vendors..." : "Unassigned Vendor"}
                      </option>
                      {vendors.map((vendor) => (
                        <option key={vendor._id} value={vendor._id}>
                          {vendor.name} ({vendor.vendorCode || "N/A"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
              <div className="rounded-lg border border-blue-600/30 bg-blue-900/20 p-4">
                <p className="text-xs uppercase tracking-wide text-blue-300">Completed</p>
                <p className="mt-2 text-2xl font-bold text-blue-100">{user.completedScripts || 0}</p>
              </div>
              <div className="rounded-lg border border-yellow-600/30 bg-yellow-900/20 p-4">
                <p className="text-xs uppercase tracking-wide text-yellow-300">Pending</p>
                <p className="mt-2 text-2xl font-bold text-yellow-100">{user.pendingScripts || 0}</p>
              </div>
              <div className="rounded-lg border border-purple-600/30 bg-purple-900/20 p-4">
                <p className="text-xs uppercase tracking-wide text-purple-300">Recordings</p>
                <p className="mt-2 text-2xl font-bold text-purple-100">
                  {user.totalRecordings || user.recordings.length}
                </p>
              </div>
              <div className="rounded-lg border border-cyan-600/30 bg-cyan-900/20 p-4">
                <p className="text-xs uppercase tracking-wide text-cyan-300">Active Time In App</p>
                <p className="mt-2 text-2xl font-bold text-cyan-100">
                  {formatDuration(user.totalActiveSeconds)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Vendor Code</p>
                <p className="mt-2 font-mono text-xl font-bold text-white">{user.vendorCode || "N/A"}</p>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Last Active</p>
                <p className="mt-2 text-sm font-semibold text-white">{formatDateTime(user.lastActiveAt)}</p>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Live Presence</p>
                <p className="mt-2 text-sm font-semibold text-white">{user.presenceStatus || "inactive"}</p>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Registered On</p>
                <p className="mt-2 text-sm font-semibold text-white">{formatDateTime(user.createdAt)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Radio className="h-5 w-5 text-orange-400" />
                Recordings ({user.recordings.length})
              </h2>

              <div className="space-y-4">
                {user.recordings.length === 0 && (
                  <p className="text-sm text-gray-400">No recordings found for this user.</p>
                )}

                {user.recordings.map((recording, index) => (
                  <div
                    key={recording._id}
                    className="rounded-lg border border-gray-700 bg-gray-800/70 p-4"
                  >
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Uploaded {formatDateTime(recording.uploadedAt)}
                    </p>
                    <p className="mt-2 text-sm text-gray-300">
                      {truncateText(recording.script?.content || "No linked script")}
                    </p>
                    <p className="mt-2 break-all font-mono text-sm text-cyan-200">
                      {getRecordingDisplayName(recording, index)}
                    </p>

                    {recording.audioLink ? (
                      <>
                        <audio controls preload="none" className="mt-3 w-full">
                          <source src={recording.audioLink} />
                        </audio>

                        {isAdminMode && (
                          <button
                            type="button"
                            onClick={() => downloadOne(recording, index)}
                            disabled={downloadingId === recording._id}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                          >
                            {downloadingId === recording._id ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            Download WAV
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">Audio link not available</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <FileText className="h-5 w-5 text-cyan-400" />
                Assigned Scripts ({user.scripts.length})
              </h2>

              <div className="max-h-[72vh] space-y-3 overflow-auto pr-1">
                {user.scripts.length === 0 && (
                  <p className="text-sm text-gray-400">No scripts assigned to this user.</p>
                )}

                {user.scripts.map((script) => (
                  <div key={script._id} className="rounded-lg border border-gray-700 bg-gray-800/60 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <p className="text-sm text-gray-200">{script.content || "No content"}</p>
                      <span className="inline-flex w-fit rounded-full border border-gray-600 px-3 py-1 text-xs font-semibold text-gray-300">
                        {script.status || "pending"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Created {formatDateTime(script.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-red-700/50 bg-red-950/30 p-6 text-red-200">
            User download page could not be loaded.
          </div>
        )}
      </div>
    </div>
  );
}
