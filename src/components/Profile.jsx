import { useState } from "react";
import toast from "react-hot-toast";
import { Loader, Mail, Pencil, Phone, Save, Shield, UserCircle, X } from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

const readJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("userInfo")) || {};
  } catch {
    return {};
  }
};

export default function Profile() {
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState(currentUser.name || "");
  const [editEmail, setEditEmail] = useState(currentUser.email || "");
  const [editMobile, setEditMobile] = useState(currentUser.mobile || currentUser.phone || "");

  const profileRows = [
    { label: "Name", value: currentUser.name || "N/A", icon: <UserCircle className="h-5 w-5 text-blue-400" /> },
    { label: "Email", value: currentUser.email || "N/A", icon: <Mail className="h-5 w-5 text-cyan-400" /> },
    { label: "Mobile", value: currentUser.mobile || currentUser.phone || "N/A", icon: <Phone className="h-5 w-5 text-green-400" /> },
    { label: "Role", value: currentUser.role || "N/A", icon: <Shield className="h-5 w-5 text-purple-400" /> },
  ];

  const openEdit = () => {
    setEditName(currentUser.name || "");
    setEditEmail(currentUser.email || "");
    setEditMobile(currentUser.mobile || currentUser.phone || "");
    setEditing(true);
  };

  const closeEdit = () => {
    if (saving) return;
    setEditing(false);
  };

  const updateProfile = async (event) => {
    event.preventDefault();

    const userId = currentUser._id || currentUser.id;
    const payload = {
      name: editName.trim(),
      email: editEmail.trim().toLowerCase(),
      mobile: editMobile.trim(),
    };

    if (!userId) {
      toast.error("Profile user ID not found. Please login again.");
      return;
    }

    if (!payload.name || !payload.email || !payload.mobile) {
      toast.error("Name, email and mobile are required");
      return;
    }

    if (!payload.email.includes("@") || !payload.email.includes(".")) {
      toast.error("Enter valid email address");
      return;
    }

    if (!/^\d{10}$/.test(payload.mobile)) {
      toast.error("Enter valid 10-digit mobile number");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(API_ENDPOINTS.ADMIN_UPDATE_USER(userId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJsonSafe(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      const nextUser = {
        ...currentUser,
        ...(data.user || {}),
        ...payload,
      };

      localStorage.setItem("userInfo", JSON.stringify(nextUser));
      setCurrentUser(nextUser);
      setEditing(false);
      window.dispatchEvent(new Event("storage"));
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err);
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-white">
      <div className="rounded-xl border border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-5 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <UserCircle className="h-6 w-6 text-blue-400" />
              Profile
            </h2>
            <p className="mt-1 text-sm text-gray-400">Logged in account details.</p>
          </div>
          <button
            type="button"
            onClick={openEdit}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 font-semibold transition hover:bg-amber-700 active:scale-95"
          >
            <Pencil className="h-4 w-4" />
            Edit Profile
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-xl md:p-6">
        <div className="mb-5 flex items-center gap-3 border-b border-gray-700 pb-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
            <UserCircle className="h-8 w-8" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold">{currentUser.name || "Profile"}</h3>
            <p className="truncate text-sm text-gray-400">{currentUser.email || currentUser.role || "Account"}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {profileRows.map((row) => (
            <div key={row.label} className="rounded-lg border border-gray-700 bg-gray-800/60 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-400">
                {row.icon}
                {row.label}
              </div>
              <p className="break-words text-base font-semibold text-gray-100">{row.value}</p>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-white">Edit Profile</h3>
                <p className="mt-1 text-sm text-gray-400">Update your name, email and mobile.</p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="rounded-full bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={updateProfile} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Name</label>
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Mobile</label>
                <input
                  type="tel"
                  value={editMobile}
                  onChange={(event) => setEditMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500"
                  placeholder="Enter 10-digit mobile"
                />
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={saving}
                  className="rounded-lg border border-gray-600 px-4 py-3 font-semibold text-gray-200 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-all ${
                    saving ? "cursor-not-allowed bg-gray-600" : "bg-cyan-600 hover:bg-cyan-700 active:scale-95"
                  }`}
                >
                  {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Updating..." : "Update Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
