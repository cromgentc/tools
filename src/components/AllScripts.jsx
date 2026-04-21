import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Download,
  FileText,
  Clock,
  Trash2,
  CheckCircle,
  Mail,
  Phone,
  AlertCircle,
} from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

const normalizeScripts = (payload) => {
  const scriptList = Array.isArray(payload)
    ? payload
    : payload?.success && Array.isArray(payload.scripts)
      ? payload.scripts
      : null;

  if (!scriptList) {
    throw new Error("Invalid response");
  }

  return scriptList.map((script) => ({
    ...script,
    audioLink: API_ENDPOINTS.RESOLVE_MEDIA_URL(script.audioLink),
  }));
};

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

export const convertAndDownload = async ({ file, audioUrl, format }) => {
  try {
    const formData = new FormData();

    if (file) {
      formData.append("file", file);
    } else if (audioUrl) {
      const sourceRes = await fetch(audioUrl);
      if (!sourceRes.ok) {
        throw new Error("Audio file not found");
      }

      const blob = await sourceRes.blob();
      formData.append("file", blob, "audio.webm");
    } else {
      throw new Error("No input file");
    }

    formData.append("format", format);

    const response = await fetch(API_ENDPOINTS.AUDIO_CONVERT, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = "Conversion failed";

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Ignore JSON parse errors and fall back to the generic message.
      }

      throw new Error(errorMessage);
    }

    const convertedBlob = await response.blob();
    triggerBrowserDownload(convertedBlob, `converted.${format}`);
    toast.success(`${format.toUpperCase()} downloaded`);
  } catch (err) {
    console.error(err);
    toast.error(err.message || "Conversion failed");
  }
};

export default function AllScripts() {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const navigate = useNavigate();

  useEffect(() => {
    let user = null;

    try {
      user = JSON.parse(localStorage.getItem("userInfo"));
    } catch {
      user = null;
    }

    if (!user || user.role !== "admin") {
      toast.error("Access denied. Admin only.");
      navigate("/", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const initializePage = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.CHECK_BACKEND);
        setBackendStatus(res.ok ? "connected" : "error");
      } catch {
        setBackendStatus("error");
      }

      try {
        setLoading(true);
        const res = await fetch(API_ENDPOINTS.RECORDING_SCRIPTS);
        const data = await res.json();
        setScripts(normalizeScripts(data));
        setBackendStatus("connected");
      } catch (err) {
        console.error(err);
        toast.error("Load failed");
        setBackendStatus("error");
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, []);

  const load = async () => {
    try {
      setLoading(true);

      const res = await fetch(API_ENDPOINTS.RECORDING_SCRIPTS);
      const data = await res.json();

      setScripts(normalizeScripts(data));
      setBackendStatus("connected");
    } catch (err) {
      console.error(err);
      toast.error("Load failed");
      setBackendStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this script?")) return;

    try {
      const res = await fetch(API_ENDPOINTS.ADMIN_DELETE_SCRIPT(id), {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Delete failed");
      }

      toast.success("Deleted");
      load();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Delete failed");
    }
  };

  const downloadAllAudio = async () => {
    const audioScripts = scripts.filter((script) => script.audioLink);

    if (audioScripts.length === 0) {
      toast.error("No audio files to download");
      return;
    }

    try {
      setDownloading(true);
      const toastId = toast.loading(`Downloading ${audioScripts.length} WAV file(s)...`);

      for (const script of audioScripts) {
        await convertAndDownload({
          audioUrl: script.audioLink,
          format: "wav",
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      toast.dismiss(toastId);
      toast.success(`Downloaded ${audioScripts.length} WAV file(s)!`);
    } catch (err) {
      console.error("DOWNLOAD ALL ERROR:", err);
      toast.error("Bulk download failed");
    } finally {
      setDownloading(false);
    }
  };

  const completedCount = scripts.filter((script) => script.status === "completed").length;
  const pendingCount = scripts.filter((script) => script.status === "pending").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6 text-white">
      {backendStatus === "error" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-600/50 bg-red-900/20 p-4">
          <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-400" />
          <div>
            <h3 className="mb-1 font-semibold text-red-400">Backend Connection Error</h3>
            <p className="mb-3 text-sm text-red-300">
              Cannot connect to the backend server. Please:
            </p>
            <ol className="list-inside list-decimal space-y-1 text-sm text-red-300">
              <li>
                Open a terminal and run{" "}
                <code className="rounded bg-black/40 px-2 py-1">cd backend && npm start</code>
              </li>
              <li>Make sure the backend server is running properly</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-3xl font-bold text-blue-400">
            <FileText className="h-8 w-8" />
            Scripts & Recordings Dashboard
          </h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                backendStatus === "connected" ? "bg-green-500" : "bg-red-500"
              } animate-pulse`}
            />
            <span className="text-sm text-gray-400">
              {backendStatus === "connected" ? "Connected" : "Offline"}
            </span>
          </div>
        </div>
        <p className="text-gray-400">
          Total recordings: <span className="font-semibold text-green-400">{scripts.length}</span>
          {" • "}
          Completed: <span className="font-semibold text-blue-400">{completedCount}</span>
          {" • "}
          Pending: <span className="font-semibold text-yellow-400">{pendingCount}</span>
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={downloadAllAudio}
          disabled={downloading || scripts.length === 0 || backendStatus === "error"}
          className={`flex items-center gap-2 rounded-lg px-6 py-2 font-semibold transition-all active:scale-95 ${
            downloading || scripts.length === 0 || backendStatus === "error"
              ? "cursor-not-allowed bg-gray-600 opacity-60"
              : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          }`}
        >
          {downloading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              Download All Audio
            </>
          )}
        </button>

        <button
          onClick={load}
          disabled={loading}
          className={`rounded-lg px-6 py-2 font-semibold transition-all active:scale-95 ${
            loading
              ? "cursor-not-allowed bg-gray-600 opacity-60"
              : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          }`}
        >
          {loading ? (
            <>
              <div className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Refreshing...
            </>
          ) : (
            "Refresh"
          )}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}

      {!loading && scripts.length === 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-12 text-center">
          <FileText className="mx-auto mb-4 h-16 w-16 text-gray-500" />
          <p className="text-lg text-gray-400">No scripts found</p>
          <button
            onClick={load}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-semibold transition-colors hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && scripts.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-700 to-gray-800">
              <tr>
                <th className="border-b border-gray-600 p-3 text-left">Mobile</th>
                <th className="border-b border-gray-600 p-3 text-left">Email</th>
                <th className="border-b border-gray-600 p-3 text-left">Content</th>
                <th className="border-b border-gray-600 p-3 text-left">Status</th>
                <th className="border-b border-gray-600 p-3 text-left">Audio</th>
                <th className="border-b border-gray-600 p-3 text-left">Date</th>
                <th className="border-b border-gray-600 p-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {scripts.map((script) => (
                <tr
                  key={script._id}
                  className="border-b border-gray-700 transition-colors hover:bg-gray-700"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-blue-400" />
                      <span className="font-mono text-green-400">{script.mobile}</span>
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-4 w-4 flex-shrink-0 text-purple-400" />
                      <span className="truncate text-sm text-gray-300">
                        {script.email || "N/A"}
                      </span>
                    </div>
                  </td>

                  <td className="max-w-xs p-3">
                    <p className="truncate text-sm text-gray-300" title={script.content}>
                      {script.content ? `${script.content.substring(0, 50)}...` : "No content"}
                    </p>
                  </td>

                  <td className="p-3">
                    {script.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-green-600/50 bg-green-600/20 px-3 py-1 text-sm font-semibold text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-yellow-600/50 bg-yellow-600/20 px-3 py-1 text-sm font-semibold text-yellow-400">
                        <Clock className="h-4 w-4" />
                        Pending
                      </span>
                    )}
                  </td>

                  <td className="p-3">
                    {script.audioLink ? (
                      <div className="flex flex-col gap-3">
                        <audio controls className="w-full max-w-xs" preload="none">
                          <source src={script.audioLink} />
                        </audio>

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              convertAndDownload({
                                audioUrl: script.audioLink,
                                format: "wav",
                              })
                            }
                            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-sm font-bold"
                          >
                            <Download className="h-4 w-4" />
                            Download WAV
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">No audio</span>
                    )}
                  </td>

                  <td className="whitespace-nowrap p-3 text-sm text-gray-400">
                    {new Date(script.createdAt).toLocaleString()}
                  </td>

                  <td className="p-3 text-center">
                    <button
                      onClick={() => del(script._id)}
                      className="flex items-center justify-center gap-1 rounded bg-red-600 px-3 py-1 text-sm font-semibold transition-colors active:scale-95 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
