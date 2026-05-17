import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, Cloud, Image, Save, Search, Star } from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

const SETTINGS_KEY = "adminSettings";

const defaultSettings = {
  logoDataUrl: "",
  faviconDataUrl: "",
  siteTitle: "",
  metaDescription: "",
  metaKeywords: "",
  cloudName: "",
  apiKey: "",
  apiSecret: "",
};

const readSettings = () => {
  try {
    return {
      ...defaultSettings,
      ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}),
    };
  } catch {
    return defaultSettings;
  }
};

const readResponseSafe = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return {
    message: text.startsWith("<!DOCTYPE")
      ? "Settings API route not found. Please restart the backend server."
      : text || "Unexpected server response",
  };
};

export const getAdminSettings = readSettings;

const upsertMetaTag = (name, content) => {
  const existingMeta = document.querySelector(`meta[name="${name}"]`);
  const meta = existingMeta || document.createElement("meta");

  meta.setAttribute("name", name);
  meta.setAttribute("content", content || "");

  if (!existingMeta) {
    document.head.appendChild(meta);
  }
};

export const applyAdminSettings = (nextSettings = readSettings()) => {
  if (nextSettings.siteTitle) {
    document.title = nextSettings.siteTitle;
  }

  if (nextSettings.metaDescription) {
    upsertMetaTag("description", nextSettings.metaDescription);
  }

  if (nextSettings.metaKeywords) {
    upsertMetaTag("keywords", nextSettings.metaKeywords);
  }

  if (nextSettings.faviconDataUrl) {
    document
      .querySelectorAll("link[rel='icon'], link[rel='shortcut icon']")
      .forEach((iconLink) => iconLink.remove());

    const icon = document.createElement("link");
    icon.setAttribute("rel", "icon");
    icon.setAttribute("href", nextSettings.faviconDataUrl);
    icon.setAttribute(
      "type",
      nextSettings.faviconDataUrl.startsWith("data:image/")
        ? nextSettings.faviconDataUrl.slice(5, nextSettings.faviconDataUrl.indexOf(";"))
        : "image/x-icon"
    );

    document.head.appendChild(icon);
  }
};

export default function Settings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [openSection, setOpenSection] = useState("branding");

  useEffect(() => {
    setSettings(readSettings());

    const fetchBackendSettings = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.ADMIN_SETTINGS);
        const data = await readResponseSafe(response);

        if (!response.ok) {
          throw new Error(data.message || "Failed to load Cloudinary settings");
        }

        setSettings((prev) => ({
          ...prev,
          ...(data.settings || {}),
        }));
      } catch (err) {
        console.error("FETCH SETTINGS ERROR:", err);
      }
    };

    fetchBackendSettings();
  }, []);

  const updateField = (field, value) => {
    setSettings((prev) => {
      const nextSettings = {
        ...prev,
        [field]: value,
      };

      if (["siteTitle", "metaDescription", "metaKeywords"].includes(field)) {
        applyAdminSettings(nextSettings);
      }

      return nextSettings;
    });
  };

  const handleImageUpload = (event, field) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const isIconFile = /\.ico$/i.test(file.name);

    if (!file.type.startsWith("image/") && !isIconFile) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = String(reader.result || "");

      setSettings((prev) => {
        const nextSettings = {
          ...prev,
          [field]: dataUrl,
        };

        if (field === "faviconDataUrl") {
          applyAdminSettings(nextSettings);
        }

        localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));

        return nextSettings;
      });
    };

    reader.readAsDataURL(file);
  };

  const saveSettings = async () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applyAdminSettings(settings);
    window.dispatchEvent(new Event("admin-settings-updated"));

    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_SETTINGS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cloudName: settings.cloudName,
          apiKey: settings.apiKey,
          apiSecret: settings.apiSecret,
        }),
      });
      const data = await readResponseSafe(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to save Cloudinary settings");
      }

      toast.success("Settings saved");
    } catch (err) {
      console.error("SAVE SETTINGS ERROR:", err);
      toast.error(err.message || "Settings saved locally, but Cloudinary settings failed");
    }
  };

  const Section = ({ id, title, icon, children }) => {
    const isOpen = openSection === id;

    return (
      <section className="rounded-xl border border-gray-700 bg-gray-900">
        <button
          type="button"
          onClick={() => setOpenSection((prev) => (prev === id ? "" : id))}
          className="flex w-full items-center justify-between gap-3 p-5 text-left"
        >
          <span className="flex items-center gap-2 text-lg font-semibold">
            {icon}
            {title}
          </span>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && <div className="border-t border-gray-800 p-6">{children}</div>}
      </section>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-white">
      <div className="rounded-xl border border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-5 shadow-xl">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="mt-1 text-sm text-gray-400">
          Manage branding, SEO details, and Cloudinary upload configuration.
        </p>
      </div>

      <div className="space-y-4">
        <Section id="branding" title="Logo, Favicon & SEO" icon={<Image className="h-5 w-5 text-blue-400" />}>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Logo</h4>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
              {settings.logoDataUrl ? (
                <img src={settings.logoDataUrl} alt="Logo preview" className="h-full w-full object-contain" />
              ) : (
                <Image className="h-8 w-8 text-gray-500" />
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, "logoDataUrl")}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-gray-300 file:cursor-pointer file:rounded file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white"
            />
          </div>

          <h4 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
            <Star className="h-4 w-4 text-yellow-400" />
            Favicon
          </h4>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
              {settings.faviconDataUrl ? (
                <img src={settings.faviconDataUrl} alt="Favicon preview" className="h-full w-full object-contain" />
              ) : (
                <Star className="h-7 w-7 text-gray-500" />
              )}
            </div>

            <input
              type="file"
              accept="image/*,.ico"
              onChange={(e) => handleImageUpload(e, "faviconDataUrl")}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-gray-300 file:cursor-pointer file:rounded file:border-0 file:bg-yellow-600 file:px-4 file:py-2 file:font-semibold file:text-white"
            />
          </div>

          <h4 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
            <Search className="h-4 w-4 text-green-400" />
            SEO
          </h4>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
            <input
              value={settings.siteTitle}
              onChange={(e) => updateField("siteTitle", e.target.value)}
              placeholder="Site title"
              className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-green-500"
            />
            <textarea
              value={settings.metaDescription}
              onChange={(e) => updateField("metaDescription", e.target.value)}
              placeholder="Meta description"
              rows={3}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              value={settings.metaKeywords}
              onChange={(e) => updateField("metaKeywords", e.target.value)}
              placeholder="Meta keywords"
              className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-green-500"
            />
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                SEO Preview
              </p>
              <p className="break-words text-base font-semibold text-blue-300">
                {settings.siteTitle || "Cromgen Recording Tools"}
              </p>
              <p className="mt-2 break-words text-sm text-gray-300">
                {settings.metaDescription || "Meta description will appear here."}
              </p>
              <p className="mt-3 break-words text-xs text-green-300">
                {settings.metaKeywords || "keywords"}
              </p>
            </div>
          </div>
        </Section>

        <Section id="cloudinary" title="Cloudinary API Upload" icon={<Cloud className="h-5 w-5 text-cyan-400" />}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              value={settings.cloudName}
              onChange={(e) => updateField("cloudName", e.target.value)}
              placeholder="CLOUD_NAME"
              className="rounded-lg border border-gray-600 bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <input
              value={settings.apiKey}
              onChange={(e) => updateField("apiKey", e.target.value)}
              placeholder="API_KEY"
              className="rounded-lg border border-gray-600 bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <input
              type="password"
              value={settings.apiSecret}
              onChange={(e) => updateField("apiSecret", e.target.value)}
              placeholder="API_SECRET"
              className="rounded-lg border border-gray-600 bg-gray-800 p-3 outline-none focus:ring-2 focus:ring-cyan-500 md:col-span-2"
            />
          </div>
        </Section>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveSettings}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-700 active:scale-95"
        >
          <Save className="h-5 w-5" />
          Save Settings
        </button>
      </div>
    </div>
  );
}
