import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Download, FileText, Clock, Trash2, CheckCircle, Mail, Phone, AlertCircle } from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

export const convertAndDownload = async ({ file, audioUrl, format }) => {
  try {
    const formData = new FormData();

    if (file) {
      formData.append("file", file);
    } else if (audioUrl) {
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      formData.append("file", blob, "audio.webm");
    } else {
      throw new Error("No input");
    }

    formData.append("format", format);

    const response = await fetch(API_ENDPOINTS.AUDIO_CONVERT, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Conversion failed");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `converted.${format}`;
    a.click();

  } catch (err) {
    console.error(err);
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!file) return alert("Select file");

  await convertAndDownload({ file, format });
};

export default function AllScripts() {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const navigate = useNavigate();

  
  // ================= AUTH CHECK =================
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));

    if (!user || user.role !== "admin") {
      toast.error("Access denied. Admin only.");
      navigate("/");
    }
  }, [navigate]);

  // ================= CHECK BACKEND STATUS =================
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch("https://recording-tools.onrender.com/");
        if (response.ok) {
          setBackendStatus("connected");
        } else {
          setBackendStatus("error");
        }
      } catch (err) {
        console.warn("Backend not available on port 5000");
        setBackendStatus("error");
      }
    };

    checkBackend();
  }, []);

  useEffect(() => {
    load();
  }, []);

  // ================= LOAD =================
  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.RECORDING_SCRIPTS);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Handle different response formats
      if (data.success && Array.isArray(data.scripts)) {
        setScripts(data.scripts);
        setBackendStatus("connected");
      } else if (Array.isArray(data)) {
        setScripts(data);
        setBackendStatus("connected");
      } else {
        console.error("Response format:", data);
        toast.error("Invalid response format from server");
        setScripts([]);
      }
    } catch (err) {
      console.error("LOAD ERROR:", err);
      toast.error(`Failed to load scripts: ${err.message}`);
      setScripts([]);
      setBackendStatus("error");
    } finally {
      setLoading(false);
    }
  };

  // ================= DELETE =================
  const del = async (id) => {
    if (!window.confirm("Are you sure you want to delete this script and its recording?")) return;
    
    try {
      const res = await fetch(API_ENDPOINTS.ADMIN_DELETE_SCRIPT(id), {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Failed to delete: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success) {
        toast.success("Script deleted successfully");
        load();
      } else {
        toast.error(data.message || "Failed to delete script");
      }
    } catch (err) {
      console.error("DELETE ERROR:", err);
      toast.error("Delete operation failed");
    }
  };

  // ================= DOWNLOAD =================
  const downloadAudio = async (url, script) => {
    if (!url) {
      toast.error("No audio available to download");
      return;
    }

    try {
      setDownloading(true);
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error("Failed to fetch audio file");
      }

      const blob = await res.blob();
      const timestamp = new Date().toISOString().split("T")[0];
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = blobUrl;
      a.download = `recording-${timestamp}-${script.mobile}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(blobUrl);
      toast.success("Audio downloaded successfully!");
    } catch (err) {
      console.error("DOWNLOAD ERROR:", err);
      toast.error("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  // ================= DOWNLOAD ALL =================
  const downloadAllAudio = async () => {
    const audioScripts = scripts.filter((s) => s.audioLink);
    
    if (audioScripts.length === 0) {
      toast.error("No audio files to download");
      return;
    }

    try {
      setDownloading(true);
      const toastId = toast.loading(`Downloading ${audioScripts.length} file(s)...`);
      
      for (let s of audioScripts) {
        await downloadAudio(s.audioLink, s);
        await new Promise((r) => setTimeout(r, 500));
      }
      
      toast.dismiss(toastId);
      toast.success(`Downloaded ${audioScripts.length} audio file(s)!`);
    } catch (err) {
      console.error("DOWNLOAD ALL ERROR:", err);
      toast.error("Bulk download failed");
    } finally {
      setDownloading(false);
    }
  };
    
  return (
    <div className="p-6 text-white bg-gradient-to-br from-gray-950 via-gray-900 to-black min-h-screen">

      {/* BACKEND STATUS WARNING */}
      {backendStatus === "error" && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-600/50 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-semibold mb-1">Backend Connection Error</h3>
            <p className="text-red-300 text-sm mb-3">Cannot connect to backend on port 5000. Please:</p>
            <ol className="text-red-300 text-sm space-y-1 list-decimal list-inside">
              <li>Open a terminal and run: <code className="bg-black/40 px-2 py-1 rounded">cd backend && npm start</code></li>
              <li>Make sure backend shows: "🚀 Server running on 5000"</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-3xl font-bold text-blue-400 flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Scripts & Recordings Dashboard
          </h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${backendStatus === "connected" ? "bg-green-500" : "bg-red-500"} animate-pulse`}></div>
            <span className="text-sm text-gray-400">{backendStatus === "connected" ? "Connected" : "Offline"}</span>
          </div>
        </div>
        <p className="text-gray-400">
          Total recordings: <span className="text-green-400 font-semibold">{scripts.length}</span>
          {" • "}
          Completed: <span className="text-blue-400 font-semibold">{scripts.filter(s => s.status === "completed").length}</span>
          {" • "}
          Pending: <span className="text-yellow-400 font-semibold">{scripts.filter(s => s.status === "pending").length}</span>
        </p>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={downloadAllAudio}
          disabled={downloading || scripts.length === 0 || backendStatus === "error"}
          className={`px-6 py-2 rounded-lg font-semibold transition-all active:scale-95 flex items-center gap-2 ${
            downloading || scripts.length === 0 || backendStatus === "error"
              ? "bg-gray-600 cursor-not-allowed opacity-60"
              : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          }`}
        >
          {downloading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              Downloading...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download All Audio
            </>
          )}
        </button>

        <button
          onClick={load}
          disabled={loading}
          className={`px-6 py-2 rounded-lg font-semibold transition-all active:scale-95 ${
            loading
              ? "bg-gray-600 cursor-not-allowed opacity-60"
              : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          }`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent inline-block mr-2"></div>
              Refreshing...
            </>
          ) : (
            "Refresh"
          )}
        </button>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && scripts.length === 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400 text-lg">No scripts found</p>
          <button
            onClick={load}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* TABLE CONTAINER */}
      {!loading && scripts.length > 0 && (
        <div className="overflow-x-auto bg-gray-800 rounded-lg border border-gray-700 shadow-xl">
          <table className="w-full">

            <thead className="bg-gradient-to-r from-gray-700 to-gray-800 sticky top-0 z-10">
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
              {scripts.map((s) => (
                <tr key={s._id} className="hover:bg-gray-700 transition-colors border-b border-gray-700">

                  {/* MOBILE */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-400" />
                      <span className="font-mono text-green-400">{s.mobile}</span>
                    </div>
                  </td>

                  {/* EMAIL */}
                  <td className="p-3">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span className="text-gray-300 truncate text-sm">{s.email || "N/A"}</span>
                    </div>
                  </td>

                  {/* CONTENT */}
                  <td className="p-3 max-w-xs">
                    <p className="text-gray-300 truncate text-sm" title={s.content}>
                      {s.content?.substring(0, 50)}...
                    </p>
                  </td>

                  {/* STATUS */}
                  <td className="p-3">
                    {s.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm font-semibold border border-green-600/50">
                        <CheckCircle className="w-4 h-4" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-600/20 text-yellow-400 rounded-full text-sm font-semibold border border-yellow-600/50">
                        <Clock className="w-4 h-4" />
                        Pending
                      </span>
                    )}
                  </td>

                  <td className="p-3">
  {s.audioLink ? (
    <div className="flex flex-col gap-3">

      {/* PLAYER */}
      <audio controls className="w-full max-w-xs">
        <source src={s.audioLink} />
      </audio>

      {/* BUTTONS */}
      <div className="flex gap-2">

        {/* MP3 */}
        <button
          onClick={() => convertAndDownload({ audioUrl: s.audioLink, format: "mp3" })}
          className="bg-green-600 px-3 py-1 rounded text-sm font-bold"
        >
          MP3
        </button>

        {/* WAV */}
        <button
          onClick={() => convertAndDownload({ audioUrl: s.audioLink, format: "wav" })}
          className="bg-blue-600 px-3 py-1 rounded text-sm font-bold"
        >
          WAV
        </button>

      </div>

    </div>
  ) : (
    <span>No audio</span>
  )}
</td>

                  {/* DATE */}
                  <td className="p-3 text-gray-400 text-sm whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>

                  {/* ACTION */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => del(s._id)}
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded font-semibold transition-colors active:scale-95 flex items-center gap-1 justify-center text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
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