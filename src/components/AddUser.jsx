import { useState } from "react";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Lock,
  Phone,
  UserPlus,
  Users,
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  ChevronDown,
  Trash2,
  Radio,
  Clock3,
  Download,
  Activity,
  Loader,
} from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

const initialBulkResult = {
  inserted: [],
  errors: [],
};

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

const convertAndDownload = async ({ audioUrl, format = "wav" }) => {
  try {
    if (!audioUrl) {
      throw new Error("Audio not available");
    }

    const sourceRes = await fetch(audioUrl);

    if (!sourceRes.ok) {
      throw new Error("Audio file not found");
    }

    const blob = await sourceRes.blob();
    const formData = new FormData();

    formData.append("file", blob, "audio.webm");
    formData.append("format", format);

    const response = await fetch(API_ENDPOINTS.AUDIO_CONVERT, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await readJsonSafe(response);
      throw new Error(errorData.message || errorData.error || "Conversion failed");
    }

    const convertedBlob = await response.blob();
    triggerBrowserDownload(convertedBlob, `recording-${Date.now()}.${format}`);
    toast.success(`${format.toUpperCase()} downloaded`);
  } catch (err) {
    console.error("DOWNLOAD AUDIO ERROR:", err);
    toast.error(err.message || "Download failed");
  }
};

const formatDuration = (value) => {
  const totalSeconds = Math.max(0, Number(value) || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

const formatDateTime = (value) => {
  if (!value) return "Never";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return date.toLocaleString();
};

const truncateText = (value, max = 120) => {
  if (!value) return "No content";
  return value.length > max ? `${value.slice(0, max)}...` : value;
};

const accountStatusClasses = {
  active: "border-green-600/40 bg-green-600/20 text-green-300",
  inactive: "border-yellow-600/40 bg-yellow-600/20 text-yellow-300",
  suspended: "border-red-600/40 bg-red-600/20 text-red-300",
};

const presenceClasses = {
  active: "bg-green-500",
  inactive: "bg-gray-500",
  suspended: "bg-red-500",
};

const normalizeUserSummary = (user) => ({
  ...user,
  totalActiveSeconds: Number(user?.totalActiveSeconds || 0),
  completedScripts: Number(user?.completedScripts || 0),
  pendingScripts: Number(user?.pendingScripts || 0),
  totalRecordings: Number(user?.totalRecordings || 0),
});

const normalizeUserDetails = (user) => ({
  ...normalizeUserSummary(user),
  recordings: Array.isArray(user?.recordings)
    ? user.recordings.map((recording) => ({
        ...recording,
        audioLink: API_ENDPOINTS.RESOLVE_MEDIA_URL(recording.audioLink),
      }))
    : [],
  scripts: Array.isArray(user?.scripts) ? user.scripts : [],
});

export default function AddUser() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [excelFile, setExcelFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(initialBulkResult);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [showUsersTable, setShowUsersTable] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);

  const resetSingleForm = () => {
    setName("");
    setEmail("");
    setMobile("");
    setPassword("");
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);

      const res = await fetch(API_ENDPOINTS.ADMIN_USERS);
      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch users");
      }

      const nextUsers = Array.isArray(data.users)
        ? data.users.map(normalizeUserSummary)
        : [];

      setUsers(nextUsers);
      return nextUsers;
    } catch (err) {
      console.error("FETCH USERS ERROR:", err);
      toast.error(err.message || "Failed to load users");
      return [];
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      setDetailLoading(true);
      setSelectedUserId(userId);

      const res = await fetch(API_ENDPOINTS.ADMIN_USER_DETAILS(userId));
      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch user details");
      }

      setSelectedUser(normalizeUserDetails(data.user));
    } catch (err) {
      console.error("FETCH USER DETAILS ERROR:", err);
      toast.error(err.message || "Failed to load user details");
      setSelectedUser(null);
      setSelectedUserId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleUsersTable = async () => {
    if (!showUsersTable) {
      if (users.length === 0) {
        await fetchUsers();
      }

      setShowUsersTable(true);
      return;
    }

    setShowUsersTable(false);
  };

  const addUser = async (e) => {
    e.preventDefault();

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      password: password.trim(),
    };

    if (!payload.name || !payload.email || !payload.mobile || !payload.password) {
      return toast.error("All fields are required");
    }

    if (!payload.email.includes("@") || !payload.email.includes(".")) {
      return toast.error("Enter valid email address");
    }

    if (!/^\d{10}$/.test(payload.mobile)) {
      return toast.error("Enter valid 10-digit mobile number");
    }

    if (payload.password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    try {
      setLoading(true);

      const res = await fetch(API_ENDPOINTS.ADMIN_ADD_USER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data.message || "Failed to add user");
      }

      toast.success(data.message || "User added successfully");
      resetSingleForm();

      if (showUsersTable) {
        await fetchUsers();
      }
    } catch (err) {
      console.log("ADD USER ERROR:", err);
      toast.error(err.message || "Error adding user");
    } finally {
      setLoading(false);
    }
  };

  const uploadBulkUsers = async () => {
    if (!excelFile) {
      return toast.error("Please select an Excel or CSV file");
    }

    const formData = new FormData();
    formData.append("file", excelFile);

    try {
      setBulkLoading(true);

      const res = await fetch(API_ENDPOINTS.ADMIN_BULK_ADD_USERS, {
        method: "POST",
        body: formData,
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data.message || "Bulk upload failed");
      }

      setBulkResult({
        inserted: Array.isArray(data.inserted) ? data.inserted : [],
        errors: Array.isArray(data.errors) ? data.errors : [],
      });

      toast.success(data.message || "Bulk users uploaded successfully");
      setExcelFile(null);
      setFileInputKey((prev) => prev + 1);

      if (showUsersTable) {
        await fetchUsers();
      }
    } catch (err) {
      console.log("BULK USER UPLOAD ERROR:", err);
      toast.error(err.message || "Bulk upload failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleStatusChange = async (nextStatus) => {
    if (!selectedUser) return;

    try {
      setStatusSaving(true);

      const res = await fetch(API_ENDPOINTS.ADMIN_USER_STATUS(selectedUser._id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountStatus: nextStatus }),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data.message || "Failed to update status");
      }

      toast.success(data.message || "User status updated");

      setSelectedUser((prev) =>
        prev
          ? {
              ...prev,
              ...data.user,
            }
          : prev
      );

      setUsers((prev) =>
        prev.map((user) =>
          user._id === selectedUser._id
            ? {
                ...user,
                ...data.user,
              }
            : user
        )
      );
    } catch (err) {
      console.error("UPDATE USER STATUS ERROR:", err);
      toast.error(err.message || "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    const confirmed = window.confirm(
      `Delete ${selectedUser.name}? This will remove user, scripts, recordings and backend files permanently.`
    );

    if (!confirmed) return;

    try {
      setDeletingUser(true);

      const res = await fetch(API_ENDPOINTS.ADMIN_DELETE_USER(selectedUser._id), {
        method: "DELETE",
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete user");
      }

      toast.success(data.message || "User deleted successfully");

      setSelectedUser(null);
      setSelectedUserId(null);
      const nextUsers = await fetchUsers();

      if (nextUsers.length === 0) {
        setShowUsersTable(false);
      }
    } catch (err) {
      console.error("DELETE USER ERROR:", err);
      toast.error(err.message || "Failed to delete user");
    } finally {
      setDeletingUser(false);
    }
  };

  const tableButtonLabel = showUsersTable ? "Hide Registered Users" : "Show Registered Users";

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-white">
      <div className="rounded-xl border border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-5 shadow-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
              <Users className="h-6 w-6 text-purple-400" />
              User Management
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Single user create karo, bulk import karo, aur neeche registered users ka full admin view open karo.
            </p>
          </div>
          <div className="rounded-lg border border-blue-600/30 bg-blue-900/10 px-4 py-3 text-sm text-blue-200">
            Bulk file columns:{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">name</code>,{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">email</code>,{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">mobile</code>,{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5">password</code>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-8 shadow-xl">
          <div className="mb-6 flex items-center gap-2">
            <div className="rounded-full bg-blue-600 p-2">
              <UserPlus className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold">Add New User</h3>
          </div>

          <form onSubmit={addUser} className="space-y-4">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
                <User className="h-4 w-4" />
                Full Name
              </label>
              <input
                placeholder="Enter full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-white outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
                <Mail className="h-4 w-4" />
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-white outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
                <Phone className="h-4 w-4" />
                Mobile Number
              </label>
              <input
                type="tel"
                placeholder="Enter 10-digit mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-white outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
                <Lock className="h-4 w-4" />
                Password
              </label>
              <input
                type="password"
                placeholder="Enter password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-white outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold transition-all ${
                loading
                  ? "cursor-not-allowed bg-gray-600"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95"
              }`}
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Adding User...
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Add User
                </>
              )}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-8 shadow-xl">
          <div className="mb-6 flex items-center gap-2">
            <div className="rounded-full bg-green-600 p-2">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold">Bulk Add Users</h3>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-blue-600/30 bg-blue-900/10 p-4 text-sm text-blue-200">
              <p className="flex items-center gap-2 font-semibold text-blue-300">
                <FileText className="h-4 w-4" />
                Supported columns
              </p>
              <p className="mt-2">
                Use Excel or CSV with columns like{" "}
                <code className="rounded bg-black/30 px-1.5 py-0.5">name</code>,{" "}
                <code className="rounded bg-black/30 px-1.5 py-0.5">email</code>,{" "}
                <code className="rounded bg-black/30 px-1.5 py-0.5">mobile</code>,{" "}
                <code className="rounded bg-black/30 px-1.5 py-0.5">password</code>.
              </p>
            </div>

            <div className="rounded-lg border border-green-600/20 bg-green-900/10 p-4 text-sm text-green-200">
              <p className="font-semibold text-green-300">Template tip</p>
              <p className="mt-2">Har row mein ek user rakho. Example: name,email,mobile,password</p>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-300">
                <Upload className="h-4 w-4" />
                Select Excel or CSV File
              </label>
              <input
                key={fileInputKey}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 p-3 text-gray-300 transition file:cursor-pointer file:rounded file:border-0 file:bg-green-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:bg-gray-600"
              />

              {excelFile && (
                <p className="mt-2 flex items-center gap-1 text-sm text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  {excelFile.name}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={uploadBulkUsers}
              disabled={bulkLoading}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold transition-all ${
                bulkLoading
                  ? "cursor-not-allowed bg-gray-600"
                  : "bg-green-600 hover:bg-green-700 active:scale-95"
              }`}
            >
              {bulkLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Uploading Users...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Upload Bulk Users
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {(bulkResult.inserted.length > 0 || bulkResult.errors.length > 0) && (
        <div className="rounded-lg border border-gray-600 bg-gradient-to-br from-gray-700 to-gray-800 p-6">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <h4 className="text-lg font-semibold text-white">Bulk Upload Results</h4>
          </div>

          <p className="mb-4 text-sm text-gray-300">
            Added: <span className="font-semibold text-green-400">{bulkResult.inserted.length}</span>
            {" | "}
            Errors: <span className="font-semibold text-red-400">{bulkResult.errors.length}</span>
          </p>

          {bulkResult.inserted.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-sm font-semibold text-green-400">Added Users</p>
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {bulkResult.inserted.map((item, index) => (
                  <div
                    key={`${item.email}-${item.mobile}-${index}`}
                    className="flex items-center justify-between rounded border border-gray-600 bg-gray-900 p-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-blue-300">{item.name}</p>
                      <p className="text-gray-400">{item.email}</p>
                    </div>
                    <span className="font-mono text-green-400">{item.mobile}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bulkResult.errors.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-400">
                <AlertCircle className="h-4 w-4" />
                Errors
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {bulkResult.errors.map((error, index) => (
                  <div
                    key={`${error}-${index}`}
                    className="rounded border border-red-600/30 bg-red-900/10 p-3 text-sm text-red-200"
                  >
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-2xl font-bold">
              <Users className="h-6 w-6 text-cyan-400" />
              Registered Users
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Click button to open users table. Row par click karoge to full user details neeche show honge.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleUsersTable}
            disabled={usersLoading}
            className={`flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-semibold transition-all ${
              usersLoading
                ? "cursor-not-allowed bg-gray-600"
                : "bg-cyan-600 hover:bg-cyan-700 active:scale-95"
            }`}
          >
            {usersLoading ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Loading Users...
              </>
            ) : (
              <>
                <ChevronDown className={`h-5 w-5 transition-transform ${showUsersTable ? "rotate-180" : ""}`} />
                {tableButtonLabel}
                {users.length > 0 ? `(${users.length})` : ""}
              </>
            )}
          </button>
        </div>

        {showUsersTable && (
          <div className="mt-6 space-y-6">
            <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-900/60">
              <table className="w-full min-w-[920px]">
                <thead className="bg-gray-800/80">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-gray-300">Name</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-300">Mobile</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-300">Email</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-300">Account</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-300">Presence</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-300">Completed</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-300">Pending</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-300">Recordings</th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-300">Last Active</th>
                  </tr>
                </thead>

                <tbody>
                  {users.length === 0 && !usersLoading && (
                    <tr>
                      <td colSpan="9" className="p-6 text-center text-gray-400">
                        No registered users found
                      </td>
                    </tr>
                  )}

                  {users.map((user) => (
                    <tr
                      key={user._id}
                      onClick={() => fetchUserDetails(user._id)}
                      className={`cursor-pointer border-t border-gray-800 transition hover:bg-gray-800/70 ${
                        selectedUserId === user._id ? "bg-gray-800" : "bg-transparent"
                      }`}
                    >
                      <td className="p-3">
                        <div>
                          <p className="font-semibold text-white">{user.name}</p>
                          <p className="text-xs text-gray-500">Joined {formatDateTime(user.createdAt)}</p>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-green-400">{user.mobile}</td>
                      <td className="p-3 text-sm text-gray-300">{user.email}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                            accountStatusClasses[user.accountStatus] || accountStatusClasses.inactive
                          }`}
                        >
                          {user.accountStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              presenceClasses[user.presenceStatus] || presenceClasses.inactive
                            }`}
                          />
                          <span className="text-sm text-gray-300">{user.presenceStatus}</span>
                        </div>
                      </td>
                      <td className="p-3 text-blue-300">{user.completedScripts}</td>
                      <td className="p-3 text-yellow-300">{user.pendingScripts}</td>
                      <td className="p-3 text-purple-300">{user.totalRecordings}</td>
                      <td className="p-3 text-sm text-gray-400">{formatDateTime(user.lastActiveAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detailLoading && (
              <div className="flex items-center justify-center rounded-lg border border-gray-700 bg-gray-900/60 py-10">
                <Loader className="h-6 w-6 animate-spin text-cyan-400" />
              </div>
            )}

            {selectedUser && !detailLoading && (
              <div className="rounded-xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-800 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h4 className="text-2xl font-bold text-white">{selectedUser.name}</h4>
                    <p className="mt-1 text-gray-400">{selectedUser.email}</p>
                    <p className="font-mono text-green-400">{selectedUser.mobile}</p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-3">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Account Status
                      </label>
                      <select
                        value={selectedUser.accountStatus}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={statusSaving}
                        className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                        <option value="suspended">suspended</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleDeleteUser}
                      disabled={deletingUser}
                      className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-all ${
                        deletingUser
                          ? "cursor-not-allowed bg-gray-600"
                          : "bg-red-600 hover:bg-red-700 active:scale-95"
                      }`}
                    >
                      {deletingUser ? (
                        <>
                          <Loader className="h-5 w-5 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-5 w-5" />
                          Delete User
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-blue-600/30 bg-blue-900/10 p-4">
                    <p className="text-sm text-gray-400">Completed Scripts</p>
                    <p className="mt-2 text-2xl font-bold text-blue-300">{selectedUser.completedScripts}</p>
                  </div>

                  <div className="rounded-lg border border-yellow-600/30 bg-yellow-900/10 p-4">
                    <p className="text-sm text-gray-400">Pending Scripts</p>
                    <p className="mt-2 text-2xl font-bold text-yellow-300">{selectedUser.pendingScripts}</p>
                  </div>

                  <div className="rounded-lg border border-purple-600/30 bg-purple-900/10 p-4">
                    <p className="text-sm text-gray-400">Total Recordings</p>
                    <p className="mt-2 text-2xl font-bold text-purple-300">{selectedUser.totalRecordings}</p>
                  </div>

                  <div className="rounded-lg border border-green-600/30 bg-green-900/10 p-4">
                    <p className="text-sm text-gray-400">Active Time In App</p>
                    <p className="mt-2 text-2xl font-bold text-green-300">
                      {formatDuration(selectedUser.totalActiveSeconds)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-4">
                    <p className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock3 className="h-4 w-4 text-cyan-400" />
                      Last Active
                    </p>
                    <p className="mt-2 font-semibold text-white">{formatDateTime(selectedUser.lastActiveAt)}</p>
                  </div>

                  <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-4">
                    <p className="flex items-center gap-2 text-sm text-gray-400">
                      <Activity className="h-4 w-4 text-cyan-400" />
                      Live Presence
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`h-3 w-3 rounded-full ${
                          presenceClasses[selectedUser.presenceStatus] || presenceClasses.inactive
                        }`}
                      />
                      <span className="font-semibold capitalize text-white">{selectedUser.presenceStatus}</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-4">
                    <p className="flex items-center gap-2 text-sm text-gray-400">
                      <User className="h-4 w-4 text-cyan-400" />
                      Registered On
                    </p>
                    <p className="mt-2 font-semibold text-white">{formatDateTime(selectedUser.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
                    <h5 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                      <Radio className="h-5 w-5 text-orange-400" />
                      Recordings
                    </h5>

                    <div className="space-y-4">
                      {selectedUser.recordings.length === 0 && (
                        <p className="text-sm text-gray-400">No recordings found for this user.</p>
                      )}

                      {selectedUser.recordings.map((recording) => (
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

                          {recording.audioLink ? (
                            <>
                              <audio controls preload="none" className="mt-3 w-full">
                                <source src={recording.audioLink} />
                              </audio>

                              <button
                                type="button"
                                onClick={() =>
                                  convertAndDownload({
                                    audioUrl: recording.audioLink,
                                    format: "wav",
                                  })
                                }
                                className="mt-3 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold transition hover:bg-blue-700"
                              >
                                <Download className="h-4 w-4" />
                                Download WAV
                              </button>
                            </>
                          ) : (
                            <p className="mt-3 text-sm text-gray-500">Audio link not available</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-5">
                    <h5 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                      <FileText className="h-5 w-5 text-cyan-400" />
                      Assigned Scripts
                    </h5>

                    <div className="space-y-3">
                      {selectedUser.scripts.length === 0 && (
                        <p className="text-sm text-gray-400">No scripts assigned to this user.</p>
                      )}

                      {selectedUser.scripts.map((script) => (
                        <div
                          key={script._id}
                          className="rounded-lg border border-gray-700 bg-gray-800/70 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm text-gray-300">{truncateText(script.content)}</p>
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                script.status === "completed"
                                  ? "border-green-600/40 bg-green-600/20 text-green-300"
                                  : "border-yellow-600/40 bg-yellow-600/20 text-yellow-300"
                              }`}
                            >
                              {script.status}
                            </span>
                          </div>
                          <p className="mt-3 text-xs text-gray-500">
                            Created: {formatDateTime(script.createdAt)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Completed: {formatDateTime(script.completedAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
