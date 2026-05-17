import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Download, Loader, Radio, User } from "lucide-react";
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
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const vendorId = String(queryParams.get("vendorId") || "").trim();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");

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

  const downloadableRecordings =
    user?.recordings?.filter((recording) => recording.audioLink) || [];

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
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-300">
                    <User className="h-4 w-4" />
                    User Download Page
                  </p>
                  <h1 className="mt-2 text-2xl font-bold text-white">{user.name}</h1>
                  <p className="mt-1 font-mono text-green-400">{user.mobile}</p>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>

                <button
                  type="button"
                  onClick={downloadAllZip}
                  disabled={downloadingAll || downloadableRecordings.length === 0}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
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
              </div>
            </div>

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
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">Audio link not available</p>
                    )}
                  </div>
                ))}
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
