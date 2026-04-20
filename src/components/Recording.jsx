import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Mic, Square, Upload, Trash2, LogOut, User, AlertCircle, Loader, FileText, Music, Circle
} from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

export default function RecordingPage() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("userInfo"));
  const userId = user?._id;

  const [script, setScript] = useState("");
  const [scriptId, setScriptId] = useState(null);

  const [status, setStatus] = useState("idle");
  const [countdown, setCountdown] = useState(null);
  const [duration, setDuration] = useState(0);

  const [audioURL, setAudioURL] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const audioBlobRef = useRef(null);

  // ================= LOGIN CHECK =================
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [navigate]);

  // ================= LOGOUT =================
  const logout = () => {
    localStorage.removeItem("userInfo");
    toast.success("Logged out!");
    navigate("/");
  };

  // ================= LOAD SCRIPT =================
  const loadScript = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const url = API_ENDPOINTS.SCRIPT_GET(userId);
      const res = await fetch(url);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      console.log("Script response:", data);
      
      setScript(data?.content || "No Script Found");
      setScriptId(data?.scriptId || null);
    } catch (err) {
      console.error("Load script error:", err);
      toast.error("Failed to load script");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) loadScript();
  }, [userId]);

  // ================= TIMER =================
  const startTimer = () => {
    setDuration(0);

    timerRef.current = setInterval(() => {
      setDuration((prev) => {
        if (prev >= 20) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopTimer = () => clearInterval(timerRef.current);

  // ================= COUNTDOWN =================
  const startCountdown = () => {
    setStatus("counting");
    setCountdown(3);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(countdownRef.current);
          setCountdown(null);
          startRecording();
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ================= START RECORD =================
  const startRecording = async () => {
    try {
      chunks.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      mediaRecorder.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.start();
      setStatus("recording");

      startTimer();
    } catch {
      alert("Mic permission denied");
    }
  };

  // ================= STOP RECORD =================
  const stopRecording = () => {
    if (!mediaRecorder.current) return;

    setStatus("processing");

    const recorder = mediaRecorder.current;

    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });

      audioBlobRef.current = blob;

      const url = URL.createObjectURL(blob);
      setAudioURL(url);

      setStatus("recorded");
    };

    recorder.stop();
    recorder.stream.getTracks().forEach((t) => t.stop());

    stopTimer();
  };

  // ================= UPLOAD =================
  const uploadAudio = async () => {
    try {
      if (!audioBlobRef.current) {
        toast.error("No audio to upload");
        return;
      }

      if (!scriptId) {
        toast.error("❌ No script assigned. Please refresh and try again.");
        console.error("scriptId is null or undefined");
        return;
      }

      if (!userId) {
        toast.error("User not found. Please login again.");
        return;
      }

      setUploading(true);

      const formData = new FormData();
      // Add filename with .webm extension so multer recognizes it as audio
      formData.append("audio", audioBlobRef.current, "recording.webm");
      formData.append("userId", userId);
      formData.append("scriptId", scriptId);

      console.log("Uploading with:", { userId, scriptId, audioSize: audioBlobRef.current.size });

      const res = await fetch(API_ENDPOINTS.RECORDING_UPLOAD, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("Upload response:", data);

      if (!res.ok) throw new Error(data.message || "Upload failed");

      toast.success("Recording uploaded successfully!");

      setAudioURL(null);
      setStatus("idle");
      setDuration(0);

      await loadScript();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteRecording = () => {
    setAudioURL(null);
    setStatus("idle");
    setDuration(0);
    audioBlobRef.current = null;
    toast.success("Recording deleted");
  };

  // ================= UI =================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">

      {/* TOP BAR */}
      <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-gray-900 to-gray-800 shadow border-b border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-blue-400 flex items-center gap-2">
            <Mic className="w-6 h-6" />
            Recording Studio
          </h1>

          <div className="flex items-center gap-3 text-gray-300 mt-2">
            <User className="w-4 h-4" />
            <span className="font-semibold">{user?.name}</span>
            <span className="text-gray-500">•</span>
            <span className="font-mono text-green-400">{user?.mobile}</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition active:scale-95 font-semibold"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>

      {/* MAIN */}
      <div className="p-6 max-w-3xl mx-auto">

        {/* NO SCRIPT ASSIGNED */}
        {!scriptId && script.includes("🎉") && (
          <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-600/50 p-8 rounded-xl shadow-lg mb-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-green-400 mb-2">✅ All Scripts Completed!</h2>
              <p className="text-gray-300 mb-4">You have successfully completed all your assigned scripts. Great work!</p>
              <div className="bg-gray-800/50 p-4 rounded-lg mt-4 border border-gray-700">
                <p className="text-gray-300 text-sm">Waiting for the admin to assign new scripts...</p>
              </div>
              <button
                onClick={loadScript}
                className="mt-6 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2 justify-center mx-auto"
              >
                <Loader className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* SCRIPT SECTION */}
        {scriptId && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-6 rounded-xl shadow-lg mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2"><FileText className="w-5 h-5" />Your Current Script</h2>
              {loading && <Loader className="w-4 h-4 animate-spin text-yellow-400" />}
            </div>
            <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-600 min-h-24">
              <p className="text-gray-100 leading-relaxed">{script}</p>
            </div>
          </div>
        )}

        {/* DISABLED WHEN NO SCRIPT */}
        {!scriptId && !script.includes("🎉") && (
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-lg mb-6 text-center">
            <Loader className="w-12 h-12 animate-spin text-yellow-400 mx-auto mb-4" />
            <p className="text-gray-300">Loading script...</p>
          </div>
        )}

        {/* STATUS INDICATORS */}
        {scriptId && status === "recording" && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600/50 rounded-lg flex items-center gap-3">
            <Circle className="w-5 h-5 text-red-500 animate-pulse fill-current" />
            <span className="text-red-400 font-semibold text-lg">
              Recording... {String(duration).padStart(2, '0')}s
            </span>
          </div>
        )}

        {countdown !== null && (
          <div className="mb-6 text-center p-6 bg-blue-900/20 border border-blue-600/50 rounded-lg">
            <div className="text-7xl font-bold text-blue-400 animate-pulse">
              {countdown}
            </div>
            <p className="text-blue-300 text-sm mt-2">Get ready to record...</p>
          </div>
        )}

        {status === "processing" && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg flex items-center gap-3">
            <Loader className="w-5 h-5 animate-spin text-yellow-400" />
            <span className="text-yellow-400 font-semibold">Processing audio...</span>
          </div>
        )}

        {/* AUDIO PLAYBACK */}
        {scriptId && audioURL && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 p-6 rounded-xl shadow-lg mb-6">
            <h3 className="text-blue-400 font-bold mb-4 flex items-center gap-2">
              <Music className="w-5 h-5" /> Your Recording
            </h3>
            <audio controls src={audioURL} className="w-full mb-4 rounded-lg" style={{ height: "40px" }} />

            <div className="flex gap-3">
              <button
                onClick={uploadAudio}
                disabled={uploading}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition active:scale-95 flex-1 ${
                  uploading
                    ? "bg-gray-600 opacity-60 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                }`}
              >
                {uploading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload
                  </>
                )}
              </button>

              <button
                onClick={deleteRecording}
                disabled={uploading}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg font-semibold transition active:scale-95 disabled:opacity-60"
              >
                <Trash2 className="w-5 h-5" />
                Delete
              </button>
            </div>
          </div>
        )}

        {/* CONTROLS */}
        <div className="flex justify-center gap-4">

          {(status === "idle" || status === "recorded") && (
            <button
              onClick={startCountdown}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-8 py-4 rounded-xl font-bold text-lg transition active:scale-95 shadow-lg"
            >
              <Mic className="w-6 h-6" />
              Start Recording
            </button>
          )}

          {status === "recording" && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-8 py-4 rounded-xl font-bold text-lg transition active:scale-95 shadow-lg"
            >
              <Square className="w-6 h-6" />
              Stop Recording
            </button>
          )}

        </div>
      </div>
    </div>
  );
}