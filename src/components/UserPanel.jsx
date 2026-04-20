import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LogIn, LogOut, FileText, CheckCircle, AlertCircle, User } from "lucide-react";

export default function UserPanel() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [script, setScript] = useState(null);

  const navigate = useNavigate();

  // ================= AUTO LOGIN =================
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("userInfo"));
    if (stored) {
      setUser(stored);
      loadScript(stored._id);
    }
  }, []);

  // ================= LOGIN =================
  const login = async () => {
    if (!mobile || !password) {
      return toast.error("Enter mobile & password");
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobile, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      localStorage.setItem("userInfo", JSON.stringify(data));
      setUser(data);

      toast.success("Login successful");
      loadScript(data._id);

    } catch (err) {
      toast.error(err.message || "Login failed");
    }
  };

  // ================= LOAD SCRIPT =================
  const loadScript = async (uid) => {
    try {
      const res = await fetch(`/api/script/${uid}`);
      const data = await res.json();

      if (!data.scriptId) {
        setScript(null);
        return;
      }

      setScript({
        id: data.scriptId,
        content: data.content,
      });

    } catch (err) {
      console.log(err);
      toast.error("Failed to load script");
    }
  };

  // ================= COMPLETE =================
  const complete = async () => {
    try {
      const res = await fetch("/api/script/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scriptId: script.id,
        }),
      });

      if (res.ok) {
        toast.success("Script completed! Loading next...");
        loadScript(user._id);
      } else {
        toast.error("Failed to complete script");
      }

    } catch (err) {
      console.log(err);
      toast.error("Error completing script");
    }
  };

  // ================= LOGOUT =================
  const logout = () => {
    localStorage.removeItem("userInfo");
    setUser(null);
    navigate("/");
  };

  // ================= UI =================
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-black">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
          <div className="flex justify-center mb-4">
            <LogIn className="w-10 h-10 text-blue-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2 text-center">User Login</h2>
          <p className="text-gray-400 text-center mb-6">Sign in to access your scripts</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Mobile Number
              </label>
              <input
                placeholder="Enter 10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="p-3 w-full text-black rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-3 w-full text-black rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              />
            </div>
          </div>

          <button 
            onClick={login} 
            className="bg-blue-600 hover:bg-blue-700 px-4 py-3 w-full rounded-lg font-semibold text-white transition-colors mt-6 flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white min-h-screen">

      {/* Header */}
      <div className="flex justify-between items-center mb-6 bg-gradient-to-r from-gray-800 to-gray-900 p-5 rounded-lg border border-gray-700 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-full">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Welcome back!</h2>
            <p className="text-gray-400 text-sm">{user?.name || "User"}</p>
            {user?.email && <p className="text-gray-500 text-xs">{user.email}</p>}
          </div>
        </div>
        <button 
          onClick={logout} 
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>

      {!script && (
        <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-600 text-yellow-100 p-6 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">No Scripts Assigned</h3>
            <p>Please contact your Vendor Manager to assign scripts.</p>
          </div>
        </div>
      )}

      {script && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold">Your Script</h2>
          </div>
          
          <div className="bg-gray-950 p-5 rounded-lg mb-6 min-h-40 max-h-96 overflow-y-auto border border-gray-700">
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{script.content}</p>
          </div>

          <button
            onClick={complete}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold text-white transition-colors w-full flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Complete & Next Script
          </button>
        </div>
      )}
    </div>
  );
}