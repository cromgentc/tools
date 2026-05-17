import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Cloud, Save } from "lucide-react";
import { API_ENDPOINTS } from "../config/api";
import { getAdminSettings } from "./Settings";

const readResponseSafe = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return {
    message: "Cloudinary settings API not available. Please restart the backend server.",
  };
};

export default function CloudinaryAccount() {
  const [form, setForm] = useState({
    cloudName: "",
    apiKey: "",
    apiSecret: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      ...getAdminSettings(),
    }));

    const fetchSettings = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.ADMIN_SETTINGS);
        const data = await readResponseSafe(response);

        if (!response.ok) {
          throw new Error(data.message || "Failed to load Cloudinary account");
        }

        setForm((prev) => ({
          ...prev,
          ...(data.settings || {}),
        }));
      } catch (err) {
        console.error("FETCH CLOUDINARY ACCOUNT ERROR:", err);
      }
    };

    fetchSettings();
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveCloudinaryAccount = async () => {
    try {
      setSaving(true);
      const localSettings = {
        ...getAdminSettings(),
        cloudName: form.cloudName,
        apiKey: form.apiKey,
        apiSecret: form.apiSecret,
      };

      localStorage.setItem("adminSettings", JSON.stringify(localSettings));

      const response = await fetch(API_ENDPOINTS.ADMIN_SETTINGS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cloudName: form.cloudName,
          apiKey: form.apiKey,
          apiSecret: form.apiSecret,
        }),
      });
      const data = await readResponseSafe(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to save Cloudinary account");
      }

      toast.success("Cloudinary account saved");
    } catch (err) {
      console.error("SAVE CLOUDINARY ACCOUNT ERROR:", err);
      toast.error(err.message || "Failed to save Cloudinary account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-white">
      <div className="rounded-xl border border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-5 shadow-xl">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Cloud className="h-6 w-6 text-cyan-400" />
          Cloudinary Account
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Audio uploads will use this Cloudinary account data.
        </p>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-xl md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              CLOUD_NAME
            </label>
            <input
              value={form.cloudName}
              onChange={(e) => updateField("cloudName", e.target.value)}
              placeholder="CLOUD_NAME"
              className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              API_KEY
            </label>
            <input
              value={form.apiKey}
              onChange={(e) => updateField("apiKey", e.target.value)}
              placeholder="API_KEY"
              className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              API_SECRET
            </label>
            <input
              type="password"
              value={form.apiSecret}
              onChange={(e) => updateField("apiSecret", e.target.value)}
              placeholder="API_SECRET"
              className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={saveCloudinaryAccount}
            disabled={saving}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 font-semibold transition active:scale-95 ${
              saving ? "cursor-not-allowed bg-gray-700 text-gray-400" : "bg-cyan-600 hover:bg-cyan-700"
            }`}
          >
            <Save className="h-5 w-5" />
            {saving ? "Saving..." : "Save Cloudinary Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
