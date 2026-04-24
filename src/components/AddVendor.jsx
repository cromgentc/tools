import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  Clock3,
  Loader,
  Pencil,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

const readJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const formatDateTime = (value) => {
  if (!value) return "Never";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return date.toLocaleString();
};

export default function AddVendor() {
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [showVendorsTable, setShowVendorsTable] = useState(true);
  const [editingVendor, setEditingVendor] = useState(null);
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingVendor, setSavingVendor] = useState(false);
  const [deletingVendorId, setDeletingVendorId] = useState(null);
  const [selectedVendorUsers, setSelectedVendorUsers] = useState(null);
  const [vendorUsersLoading, setVendorUsersLoading] = useState(false);

  const fetchVendors = async () => {
    try {
      setVendorsLoading(true);

      const res = await fetch(API_ENDPOINTS.ADMIN_VENDORS);
      const data = await readJsonSafe(res);

      if (!res.ok) {
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

  useEffect(() => {
    fetchVendors();
  }, []);

  const toggleVendorsTable = async () => {
    if (!showVendorsTable && vendors.length === 0) {
      await fetchVendors();
    }

    setShowVendorsTable((prev) => !prev);
  };

  const openEditVendor = (vendor) => {
    setEditingVendor(vendor);
    setEditName(vendor?.name || "");
    setEditMobile(vendor?.mobile || "");
    setEditEmail(vendor?.email || "");
  };

  const closeEditVendor = (force = false) => {
    if (savingVendor && !force) return;

    setEditingVendor(null);
    setEditName("");
    setEditMobile("");
    setEditEmail("");
  };

  const handleUpdateVendor = async (e) => {
    e.preventDefault();

    if (!editingVendor?._id) {
      return toast.error("Vendor not selected");
    }

    const payload = {
      name: editName.trim(),
      mobile: editMobile.trim(),
      email: editEmail.trim().toLowerCase(),
    };

    if (!payload.name || !payload.mobile || !payload.email) {
      return toast.error("Vendor name, mobile and email are required");
    }

    if (!/^\d{10}$/.test(payload.mobile)) {
      return toast.error("Vendor mobile must be 10 digits");
    }

    if (!payload.email.includes("@") || !payload.email.includes(".")) {
      return toast.error("Enter valid vendor email address");
    }

    try {
      setSavingVendor(true);

      const res = await fetch(API_ENDPOINTS.ADMIN_UPDATE_VENDOR(editingVendor._id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data.message || "Failed to update vendor");
      }

      toast.success(data.message || "Vendor updated successfully");
      closeEditVendor(true);
      await fetchVendors();
    } catch (err) {
      console.error("UPDATE VENDOR ERROR:", err);
      toast.error(err.message || "Failed to update vendor");
    } finally {
      setSavingVendor(false);
    }
  };

  const handleDeleteVendor = async (vendor) => {
    if (!vendor?._id) return;

    const confirmed = window.confirm(
      `Delete vendor ${vendor.name}? Linked users will become unassigned.`
    );

    if (!confirmed) return;

    try {
      setDeletingVendorId(vendor._id);

      const res = await fetch(API_ENDPOINTS.ADMIN_DELETE_USER(vendor._id), {
        method: "DELETE",
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete vendor");
      }

      toast.success(data.message || "Vendor deleted successfully");

      if (editingVendor?._id === vendor._id) {
        closeEditVendor();
      }

      await fetchVendors();
    } catch (err) {
      console.error("DELETE VENDOR ERROR:", err);
      toast.error(err.message || "Failed to delete vendor");
    } finally {
      setDeletingVendorId(null);
    }
  };

  const handleViewVendorUsers = async (vendor) => {
    if (!vendor?._id) return;

    try {
      setVendorUsersLoading(true);
      setSelectedVendorUsers({
        vendor,
        users: [],
      });

      const res = await fetch(
        `${API_ENDPOINTS.ADMIN_USERS}?vendorId=${encodeURIComponent(vendor._id)}`
      );
      const data = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch vendor users");
      }

      setSelectedVendorUsers({
        vendor,
        users: Array.isArray(data.users) ? data.users : [],
      });
    } catch (err) {
      console.error("FETCH VENDOR USERS ERROR:", err);
      toast.error(err.message || "Failed to fetch vendor users");
      setSelectedVendorUsers(null);
    } finally {
      setVendorUsersLoading(false);
    }
  };

  const closeVendorUsersModal = () => {
    if (vendorUsersLoading) return;
    setSelectedVendorUsers(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-white">
      <div className="rounded-xl border border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-5 shadow-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
              <Building2 className="h-6 w-6 text-cyan-400" />
              Vendor Management
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              The admin will create the vendor here. A vendor code will be generated automatically, and the vendor login will also be created simultaneously.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchVendors}
            disabled={vendorsLoading}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-all ${
              vendorsLoading
                ? "cursor-not-allowed bg-gray-600"
                : "bg-cyan-600 hover:bg-cyan-700 active:scale-95"
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${vendorsLoading ? "animate-spin" : ""}`} />
            Refresh Vendors
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 p-8 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-full bg-blue-600 p-2">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold">Registered Vendors</h3>
            </div>
            <p className="text-sm text-gray-400">
              All registered vendors and the bulk upload results will be displayed here in a single table.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleVendorsTable}
            disabled={vendorsLoading}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-semibold transition-all ${
              vendorsLoading
                ? "cursor-not-allowed bg-gray-600"
                : "bg-blue-600 hover:bg-blue-700 active:scale-95"
            }`}
          >
            {showVendorsTable ? "Hide Registered Vendors" : "Show Registered Vendors"}
            {vendors.length > 0 ? ` (${vendors.length})` : ""}
          </button>
        </div>

        {showVendorsTable && (
          <div className="mt-6 space-y-4">
            {vendorsLoading && (
              <div className="flex items-center justify-center rounded-lg border border-gray-700 bg-gray-900/60 py-10">
                <Loader className="h-6 w-6 animate-spin text-cyan-400" />
              </div>
            )}

            {!vendorsLoading && vendors.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-600 bg-gray-900/40 p-6 text-center text-gray-400">
                No vendors added yet
              </div>
            )}

            {!vendorsLoading && vendors.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-900/60">
                <table className="w-full min-w-[860px]">
                  <thead className="bg-gray-800/80">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-gray-300">Vendor Name</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-300">Vendor Code</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-300">Mobile</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-300">Email</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-300">Assigned Users</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-300">Created</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-300">Last Active</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-300">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {vendors.map((vendor) => (
                      <tr
                        key={vendor._id}
                        className="border-t border-gray-800 bg-transparent transition hover:bg-gray-800/70"
                      >
                        <td className="p-3 font-semibold text-white">{vendor.name}</td>
                        <td className="p-3 font-mono text-sm text-cyan-300">{vendor.vendorCode}</td>
                        <td className="p-3 font-mono text-green-400">{vendor.mobile}</td>
                        <td className="p-3 text-sm text-gray-300">{vendor.email}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleViewVendorUsers(vendor)}
                            className="rounded-md bg-cyan-900/40 px-3 py-1.5 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-800/60 hover:text-white"
                          >
                            {vendor.totalUsers || 0}
                          </button>
                        </td>
                        <td className="p-3 text-sm text-gray-400">
                          {formatDateTime(vendor.createdAt)}
                        </td>
                        <td className="p-3 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-cyan-300" />
                            <span>{formatDateTime(vendor.lastActiveAt)}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEditVendor(vendor)}
                              disabled={savingVendor || deletingVendorId === vendor._id}
                              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                                savingVendor || deletingVendorId === vendor._id
                                  ? "cursor-not-allowed bg-gray-600 text-gray-200"
                                  : "bg-amber-600 text-white hover:bg-amber-700 active:scale-95"
                              }`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteVendor(vendor)}
                              disabled={savingVendor || deletingVendorId === vendor._id}
                              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                                savingVendor || deletingVendorId === vendor._id
                                  ? "cursor-not-allowed bg-gray-600 text-gray-200"
                                  : "bg-red-600 text-white hover:bg-red-700 active:scale-95"
                              }`}
                            >
                              {deletingVendorId === vendor._id ? (
                                <>
                                  <Loader className="h-3.5 w-3.5 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {editingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-white">Edit Vendor</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Vendor details update karoge to linked users par latest vendor name aur code sync ho jayega.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditVendor}
                disabled={savingVendor}
                className="rounded-full bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateVendor} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Vendor Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter vendor name"
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Mobile Number</label>
                <input
                  type="tel"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Enter 10-digit mobile"
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter vendor email"
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white outline-none transition placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditVendor}
                  disabled={savingVendor}
                  className="rounded-lg border border-gray-600 px-4 py-3 font-semibold text-gray-200 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingVendor}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-all ${
                    savingVendor
                      ? "cursor-not-allowed bg-gray-600"
                      : "bg-amber-600 hover:bg-amber-700 active:scale-95"
                  }`}
                >
                  {savingVendor ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedVendorUsers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-5xl rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2 text-2xl font-bold text-white">
                  <Users className="h-6 w-6 text-cyan-400" />
                  {selectedVendorUsers.vendor.name} Users
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Vendor code: {selectedVendorUsers.vendor.vendorCode || "N/A"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeVendorUsersModal}
                disabled={vendorUsersLoading}
                className="rounded-full bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6">
              {vendorUsersLoading && (
                <div className="flex items-center justify-center rounded-lg border border-gray-700 bg-gray-950/60 py-12">
                  <Loader className="h-6 w-6 animate-spin text-cyan-400" />
                </div>
              )}

              {!vendorUsersLoading && selectedVendorUsers.users.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-600 bg-gray-950/40 p-6 text-center text-gray-400">
                  No users found under this vendor
                </div>
              )}

              {!vendorUsersLoading && selectedVendorUsers.users.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-950/60">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-gray-800/80">
                      <tr>
                        <th className="p-3 text-left text-sm font-semibold text-gray-300">Name</th>
                        <th className="p-3 text-left text-sm font-semibold text-gray-300">Mobile</th>
                        <th className="p-3 text-left text-sm font-semibold text-gray-300">Email</th>
                        <th className="p-3 text-left text-sm font-semibold text-gray-300">Scripts</th>
                        <th className="p-3 text-left text-sm font-semibold text-gray-300">Recordings</th>
                        <th className="p-3 text-left text-sm font-semibold text-gray-300">Created</th>
                        <th className="p-3 text-left text-sm font-semibold text-gray-300">Last Active</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedVendorUsers.users.map((user) => (
                        <tr
                          key={user._id}
                          className="border-t border-gray-800 transition hover:bg-gray-800/70"
                        >
                          <td className="p-3 font-semibold text-white">{user.name}</td>
                          <td className="p-3 font-mono text-green-400">{user.mobile}</td>
                          <td className="p-3 text-sm text-gray-300">{user.email}</td>
                          <td className="p-3 text-blue-300">{user.totalScripts || 0}</td>
                          <td className="p-3 text-purple-300">{user.totalRecordings || 0}</td>
                          <td className="p-3 text-sm text-gray-400">{formatDateTime(user.createdAt)}</td>
                          <td className="p-3 text-sm text-gray-400">{formatDateTime(user.lastActiveAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
