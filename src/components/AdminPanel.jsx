import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock, User, Mail, FileText, Send } from "lucide-react";

export default function AdminPanel() {
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ================= AUTH CHECK =================
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));

    if (!user || user.role !== "admin") {
      toast.error("Access denied. Admin only.");
      navigate("/");
    }
  }, [navigate]);

  // ================= ADD SCRIPT =================
  const addScript = async () => {
    if (!mobile || !email || !content) {
      return toast.error("All fields are required");
    }

    if (!email.includes("@")) {
      return toast.error("Enter valid email address");
    }

    if (mobile.length !== 10) {
      return toast.error("Mobile number must be 10 digits");
    }

    try {
      setLoading(true);

      const res = await fetch("/api/script/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobile, email, content }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to add script");
      }

      toast.success("Script assigned successfully!");

      setMobile("");
      setEmail("");
      setContent("");

    } catch (err) {
      console.error(err);
      toast.error(err.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl rounded-2xl p-8 w-full max-w-md border border-gray-700">

        {/* Header */}
        <div className="flex justify-center mb-6">
          <Lock className="w-10 h-10 text-blue-400" />
        </div>

        <h2 className="text-3xl font-bold mb-2 text-center text-white">
          Admin Panel
        </h2>
        
        <p className="text-center text-gray-400 mb-8">Assign scripts to users</p>

        <div className="space-y-4">
          {/* Mobile */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Mobile Number
            </label>
            <input
              type="tel"
              placeholder="Enter 10-digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Script */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Script Content
            </label>
            <textarea
              placeholder="Enter script content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows="6"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
            />
          </div>

          {/* Button */}
          <button
            onClick={addScript}
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2 mt-6 ${
              loading
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:scale-95"
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Assigning...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Assign Script
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}