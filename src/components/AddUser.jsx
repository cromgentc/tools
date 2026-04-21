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
} from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

const initialBulkResult = {
  inserted: [],
  errors: [],
};

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

  const resetSingleForm = () => {
    setName("");
    setEmail("");
    setMobile("");
    setPassword("");
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to add user");
      }

      toast.success(data.message || "User added successfully");
      resetSingleForm();
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

      const data = await res.json();

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
    } catch (err) {
      console.log("BULK USER UPLOAD ERROR:", err);
      toast.error(err.message || "Bulk upload failed");
    } finally {
      setBulkLoading(false);
    }
  };

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
              Single user add left side mein hai, aur bulk upload right side mein visible hai.
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
              <p className="mt-2">Har row mein ek user rakho. Example: `name,email,mobile,password`</p>
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
                {bulkResult.inserted.map((item) => (
                  <div
                    key={`${item.email}-${item.mobile}`}
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
    </div>
  );
}
