import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Cloud, Eye, Pencil, Plus, Save, Trash2, UserCircle, X } from "lucide-react";
import { API_ENDPOINTS } from "../config/api";
import { getAdminSettings } from "./Settings";

const CLOUDINARY_ACCOUNTS_KEY = "cloudinaryAccountEntries";

const emptyCloudinary = {
  cloudName: "",
  apiKey: "",
  apiSecret: "",
};

const readResponseSafe = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return {
    message: "Settings API not available. Please restart the backend server.",
  };
};

const readCloudinaryAccounts = () => {
  try {
    const accounts = JSON.parse(localStorage.getItem(CLOUDINARY_ACCOUNTS_KEY));
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
};

export default function AccountManagement() {
  const [cloudinary, setCloudinary] = useState(emptyCloudinary);
  const [cloudinaryAccounts, setCloudinaryAccounts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewAccount, setViewAccount] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedAccounts = readCloudinaryAccounts();
    const localSettings = getAdminSettings();
    setCloudinaryAccounts(storedAccounts);
    setCloudinary((prev) => ({
      ...prev,
      ...localSettings,
    }));

    if (
      storedAccounts.length === 0 &&
      (localSettings.cloudName || localSettings.apiKey || localSettings.apiSecret)
    ) {
      const initialAccount = {
        id: Date.now(),
        cloudName: localSettings.cloudName || "",
        apiKey: localSettings.apiKey || "",
        apiSecret: localSettings.apiSecret || "",
      };

      localStorage.setItem(CLOUDINARY_ACCOUNTS_KEY, JSON.stringify([initialAccount]));
      setCloudinaryAccounts([initialAccount]);
    }

    const fetchCloudinary = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.ADMIN_SETTINGS);
        const data = await readResponseSafe(response);

        if (!response.ok) {
          throw new Error(data.message || "Failed to load Cloudinary details");
        }

        setCloudinary((prev) => ({
          ...prev,
          ...(data.settings || {}),
        }));

        const settings = data.settings || {};
        const hasBackendAccount = settings.cloudName || settings.apiKey || settings.apiSecret;
        const latestStoredAccounts = readCloudinaryAccounts();

        if (hasBackendAccount && latestStoredAccounts.length === 0) {
          const initialAccount = {
            id: Date.now(),
            cloudName: settings.cloudName || "",
            apiKey: settings.apiKey || "",
            apiSecret: settings.apiSecret || "",
          };

          localStorage.setItem(CLOUDINARY_ACCOUNTS_KEY, JSON.stringify([initialAccount]));
          setCloudinaryAccounts([initialAccount]);
        }
      } catch (err) {
        console.error("FETCH CLOUDINARY DETAILS ERROR:", err);
      }
    };

    fetchCloudinary();
  }, []);

  const updateCloudinaryField = (field, value) => {
    setCloudinary((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const persistActiveCloudinary = async (account) => {
    const nextSettings = {
      ...getAdminSettings(),
      cloudName: account?.cloudName || "",
      apiKey: account?.apiKey || "",
      apiSecret: account?.apiSecret || "",
    };

    localStorage.setItem("adminSettings", JSON.stringify(nextSettings));

    const response = await fetch(API_ENDPOINTS.ADMIN_SETTINGS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cloudName: nextSettings.cloudName,
        apiKey: nextSettings.apiKey,
        apiSecret: nextSettings.apiSecret,
      }),
    });
    const data = await readResponseSafe(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to save Cloudinary details");
    }
  };

  const openAddModal = () => {
    setCloudinary(emptyCloudinary);
    setEditingIndex(null);
    setModalOpen(true);
  };

  const openEditModal = (account, index) => {
    setCloudinary({
      cloudName: account.cloudName || "",
      apiKey: account.apiKey || "",
      apiSecret: account.apiSecret || "",
    });
    setEditingIndex(index);
    setModalOpen(true);
  };

  const performDeleteCloudinaryAccount = async (index) => {
    try {
      const nextAccounts = cloudinaryAccounts.filter((_, accountIndex) => accountIndex !== index);
      const activeAccount = nextAccounts[nextAccounts.length - 1] || emptyCloudinary;

      localStorage.setItem(CLOUDINARY_ACCOUNTS_KEY, JSON.stringify(nextAccounts));
      setCloudinaryAccounts(nextAccounts);
      setSelectedIndexes([]);
      setDeleteConfirm(null);
      await persistActiveCloudinary(activeAccount);
      toast.success("Cloudinary account deleted");
    } catch (err) {
      console.error("DELETE CLOUDINARY DETAILS ERROR:", err);
      toast.error(err.message || "Failed to delete Cloudinary details");
    }
  };

  const toggleSelectedIndex = (index) => {
    setSelectedIndexes((prev) =>
      prev.includes(index)
        ? prev.filter((selectedIndex) => selectedIndex !== index)
        : [...prev, index]
    );
  };

  const toggleSelectAll = () => {
    setSelectedIndexes((prev) =>
      prev.length === cloudinaryAccounts.length ? [] : cloudinaryAccounts.map((_, index) => index)
    );
  };

  const requestDeleteSelectedCloudinaryAccounts = () => {
    if (selectedIndexes.length === 0) {
      toast.error("Please select account details first");
      return;
    }

    setDeleteConfirm({
      type: "selected",
      title: "Delete Selected Cloudinary Accounts",
      message: `Delete selected ${selectedIndexes.length} Cloudinary account detail(s)?`,
    });
  };

  const performDeleteSelectedCloudinaryAccounts = async () => {
    try {
      const selectedSet = new Set(selectedIndexes);
      const nextAccounts = cloudinaryAccounts.filter((_, index) => !selectedSet.has(index));
      const activeAccount = nextAccounts[nextAccounts.length - 1] || emptyCloudinary;

      localStorage.setItem(CLOUDINARY_ACCOUNTS_KEY, JSON.stringify(nextAccounts));
      setCloudinaryAccounts(nextAccounts);
      setSelectedIndexes([]);
      setDeleteConfirm(null);
      await persistActiveCloudinary(activeAccount);
      toast.success("Selected Cloudinary account details deleted");
    } catch (err) {
      console.error("DELETE SELECTED CLOUDINARY DETAILS ERROR:", err);
      toast.error(err.message || "Failed to delete selected Cloudinary details");
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === "single") {
      performDeleteCloudinaryAccount(deleteConfirm.index);
      return;
    }

    performDeleteSelectedCloudinaryAccounts();
  };

  const saveCloudinary = async () => {
    try {
      setSaving(true);
      const trimmedCloudinary = {
        cloudName: cloudinary.cloudName.trim(),
        apiKey: cloudinary.apiKey.trim(),
        apiSecret: cloudinary.apiSecret.trim(),
      };

      if (!trimmedCloudinary.cloudName || !trimmedCloudinary.apiKey || !trimmedCloudinary.apiSecret) {
        toast.error("Please fill all Cloudinary fields");
        return;
      }

      const nextAccount = {
        id: editingIndex === null ? Date.now() : cloudinaryAccounts[editingIndex]?.id || Date.now(),
        ...trimmedCloudinary,
      };
      const nextAccounts =
        editingIndex === null
          ? [...cloudinaryAccounts, nextAccount]
          : cloudinaryAccounts.map((account, index) => (index === editingIndex ? nextAccount : account));

      localStorage.setItem(CLOUDINARY_ACCOUNTS_KEY, JSON.stringify(nextAccounts));
      setCloudinaryAccounts(nextAccounts);
      setSelectedIndexes([]);

      await persistActiveCloudinary(nextAccount);

      toast.success(editingIndex === null ? "Cloudinary account added" : "Cloudinary account updated");
      setCloudinary(emptyCloudinary);
      setEditingIndex(null);
      setModalOpen(false);
    } catch (err) {
      console.error("SAVE CLOUDINARY DETAILS ERROR:", err);
      toast.error(err.message || "Failed to save Cloudinary details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-white">
      <div className="rounded-xl border border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-5 shadow-xl">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <UserCircle className="h-6 w-6 text-blue-400" />
          Account Management
        </h2>
        <p className="mt-1 text-sm text-gray-400">View current account information.</p>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-xl md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-semibold">
              <Cloud className="h-5 w-5 text-cyan-400" />
              Cloudinary Account Details
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Keep account details here so you remember where files upload.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={requestDeleteSelectedCloudinaryAccounts}
              disabled={selectedIndexes.length === 0}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold transition ${
                selectedIndexes.length === 0
                  ? "cursor-not-allowed bg-gray-800 text-gray-500"
                  : "bg-red-600 hover:bg-red-700 active:scale-95"
              }`}
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 font-semibold transition hover:bg-cyan-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Add Details
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-gray-300">
                  <input
                    type="checkbox"
                    checked={
                      cloudinaryAccounts.length > 0 &&
                      selectedIndexes.length === cloudinaryAccounts.length
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-900 accent-red-600"
                    aria-label="Select all Cloudinary accounts"
                  />
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-300">Sr No</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-300">Cloud Name</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-300">API Key</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-300">API Secret</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cloudinaryAccounts.length > 0 ? (
                cloudinaryAccounts.map((account, index) => (
                  <tr key={account.id || `${account.cloudName}-${index}`} className="border-t border-gray-700">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIndexes.includes(index)}
                        onChange={() => toggleSelectedIndex(index)}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-900 accent-red-600"
                        aria-label={`Select Cloudinary account ${index + 1}`}
                      />
                    </td>
                    <td className="p-3 font-semibold text-gray-300">{index + 1}</td>
                    <td className="p-3 font-mono text-cyan-300">{account.cloudName || "N/A"}</td>
                    <td className="p-3 font-mono text-blue-300">{account.apiKey || "N/A"}</td>
                    <td className="break-all p-3 font-mono text-gray-300">{account.apiSecret || "N/A"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewAccount(account)}
                          className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-2 text-blue-300 transition hover:bg-blue-600 hover:text-white"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(account, index)}
                          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-amber-300 transition hover:bg-amber-600 hover:text-white"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirm({
                              type: "single",
                              index,
                              title: "Delete Cloudinary Account",
                              message: "Delete this Cloudinary account detail?",
                              account,
                            })
                          }
                          className="rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-600 hover:text-white"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-gray-700">
                  <td colSpan="6" className="p-5 text-center text-sm text-gray-400">
                    No Cloudinary account details added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-xl font-semibold">
                <Cloud className="h-5 w-5 text-cyan-400" />
                {editingIndex === null ? "Add Cloudinary Account" : "Edit Cloudinary Account"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditingIndex(null);
                }}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Cloud Name
                </label>
                <input
                  value={cloudinary.cloudName}
                  onChange={(e) => updateCloudinaryField("cloudName", e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Cloud name"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  API Key
                </label>
                <input
                  value={cloudinary.apiKey}
                  onChange={(e) => updateCloudinaryField("apiKey", e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="API key"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  API Secret
                </label>
                <input
                  value={cloudinary.apiSecret}
                  onChange={(e) => updateCloudinaryField("apiSecret", e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="API secret"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditingIndex(null);
                }}
                className="rounded-lg border border-gray-600 px-4 py-2 font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCloudinary}
                disabled={saving}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition ${
                  saving ? "cursor-not-allowed bg-gray-700 text-gray-400" : "bg-cyan-600 hover:bg-cyan-700"
                }`}
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : editingIndex === null ? "Save" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-xl font-semibold">
                <Eye className="h-5 w-5 text-blue-400" />
                View Cloudinary Account
              </h3>
              <button
                type="button"
                onClick={() => setViewAccount(null)}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                ["Cloud Name", viewAccount.cloudName],
                ["API Key", viewAccount.apiKey],
                ["API Secret", viewAccount.apiSecret],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                  <p className="break-all font-mono text-sm text-gray-100">{value || "N/A"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-gray-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                  <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white">{deleteConfirm.title}</h3>
                <p className="mt-2 text-sm text-gray-300">{deleteConfirm.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {deleteConfirm.account && (
              <div className="mb-5 rounded-lg border border-gray-700 bg-gray-800/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Cloud Name</p>
                <p className="mt-1 break-all font-mono text-sm text-cyan-300">
                  {deleteConfirm.account.cloudName || "N/A"}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-gray-600 px-4 py-2 font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
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
