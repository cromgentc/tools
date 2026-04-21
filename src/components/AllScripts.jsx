import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Download, FileText, Clock, Trash2, CheckCircle, Mail, Phone, AlertCircle } from "lucide-react";
import { API_ENDPOINTS } from "../config/api";
import ffmpegPath from "ffmpeg-static";
ffmpeg.setFfmpegPath(ffmpegPath);

/* ================= CONVERT + DOWNLOAD ================= */
export const convertAndDownload = async ({ file, audioUrl, format }) => {
  try {
    const formData = new FormData();

    // 🔥 MUST FIX: always send "file"
    if (file) {
      formData.append("file", file);
    } else if (audioUrl) {
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      formData.append("file", blob, "audio.webm");
    } else {
      throw new Error("No input file");
    }

    formData.append("format", format);

    const response = await fetch(API_ENDPOINTS.AUDIO_CONVERT, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!data.success || !data.url) {
      throw new Error(data.message || "Conversion failed");
    }

    // 🔥 SAFE DOWNLOAD
    const res = await fetch(data.url);
    const blob = await res.blob();

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = blobUrl;
    a.download = `converted.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(blobUrl);

  } catch (err) {
    console.error(err);
    toast.error(err.message);
  }
};

export default function AllScripts() {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const navigate = useNavigate();

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));

    if (!user || user.role !== "admin") {
      toast.error("Access denied. Admin only.");
      navigate("/");
    }
  }, [navigate]);

  /* ================= CHECK BACKEND ================= */
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.CHECK_BACKEND);

        if (res.ok) setBackendStatus("connected");
        else setBackendStatus("error");
      } catch {
        setBackendStatus("error");
      }
    };

    checkBackend();
  }, []);

  /* ================= LOAD ================= */
  const load = async () => {
    try {
      setLoading(true);

      const res = await fetch(API_ENDPOINTS.RECORDING_SCRIPTS);

      const data = await res.json();

      if (Array.isArray(data)) {
        setScripts(data);
      } else if (data.success && Array.isArray(data.scripts)) {
        setScripts(data.scripts);
      } else {
        throw new Error("Invalid response");
      }

      setBackendStatus("connected");

    } catch (err) {
      console.error(err);
      toast.error("Load failed");
      setBackendStatus("error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE ================= */
  const del = async (id) => {
    if (!confirm("Delete this script?")) return;

    try {
      const res = await fetch(API_ENDPOINTS.ADMIN_DELETE_SCRIPT(id), {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Deleted");
        load();
      } else {
        throw new Error(data.message);
      }

    } catch (err) {
      toast.error("Delete failed");
    }
  };

  /* ================= DOWNLOAD AUDIO ================= */
  const downloadAudio = async (url, script) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = blobUrl;
      a.download = `recording-${script.mobile}.wav`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(blobUrl);

    } catch {
      toast.error("Download failed");
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
          onClick={() => convertAndDownload({ 
            audioUrl: s.audioLink, 
            format: "wav",
           })}
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