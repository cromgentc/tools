import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock, User, Mail, Eye, EyeOff, LogIn, UserPlus, ArrowRight, AlertCircle } from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");

  const navigate = useNavigate();

  /* ================= AUTO REDIRECT ================= */
  useEffect(() => {
    try {
      const userInfo = localStorage.getItem("userInfo");
      if (userInfo) {
        const user = JSON.parse(userInfo);
        if (user?._id && user?.role) {
          user.role === "admin" ? navigate("/admin-dashboard", { replace: true }) : navigate("/recording", { replace: true });
        }
      }
    } catch (err) {
      console.error("Auto-redirect error:", err);
    }
  }, []);

  /* ================= CHECK BACKEND ================= */
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch("https://recording-tools.onrender.com/");
        if (res.ok) setBackendStatus("connected");
        else setBackendStatus("error");
      } catch {
        setBackendStatus("error");
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ================= LOGIN ================= */
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!mobile || !password) {
      return toast.error("All fields required");
    }

    if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      return toast.error("Mobile must be 10 digits");
    }

    setLoading(true);

    try {
      const res = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, password }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (!data.success) throw new Error(data.message || "Login failed");

      localStorage.setItem("userInfo", JSON.stringify(data.data || data.user));

      toast.success("Login successful !");

      const userData = data.data || data.user;
      userData.role === "admin"
        ? navigate("/admin-dashboard", { replace: true })
        : navigate("/recording", { replace: true });

    } catch (err) {
      console.error("Login error:", err);
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= REGISTER ================= */
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!name || !email || !mobile || !password) {
      return toast.error("All fields required");
    }

    if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
      return toast.error("Mobile must be 10 digits");
    }

    if (!email.includes("@") || !email.includes(".")) {
      return toast.error("Enter valid email");
    }

    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setLoading(true);

    try {
      const res = await fetch(API_ENDPOINTS.AUTH_REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, mobile, password }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (!data.success) throw new Error(data.message || "Registration failed");

      toast.success("✅ Registered successfully! Please login.");

      setIsLogin(true);
      setName("");
      setEmail("");
      setMobile("");
      setPassword("");

    } catch (err) {
      console.error("Register error:", err);
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-black">

      <div className="bg-gray-800 w-[420px] p-8 rounded-2xl shadow-2xl border border-gray-700">

        {/* BACKEND STATUS */}
        <div className="flex justify-end items-center gap-2 mb-4 px-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${backendStatus === "connected" ? "bg-green-500" : "bg-red-500"}`}></div>
          <span className="text-xs font-semibold" style={{ color: backendStatus === "connected" ? "#10b981" : "#ef4444" }}>
            {backendStatus === "connected" ? "Backend Connected" : "Offline"}
          </span>
        </div>

        {backendStatus === "error" && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-600/50 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">Backend unavailable. Check if server is running.</p>
          </div>
        )}

        <div className="flex justify-center mb-3">
          {isLogin ? 
            <Lock className="w-10 h-10 text-blue-400" /> :
            <UserPlus className="w-10 h-10 text-green-400" />
          }
        </div>

        <h2 className="text-3xl font-bold text-center mb-2 text-white">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>

        <p className="text-center text-gray-400 mb-6">
          {isLogin ? "Login to your account" : "Join us today"}
        </p>

        <form
          onSubmit={isLogin ? handleLogin : handleRegister}
          className="space-y-4"
        >

          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </label>
                <input
                  className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Mobile Number
            </label>
            <input
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter 10-digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-3.5 text-blue-400 hover:text-blue-300"
              >
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            disabled={loading || backendStatus === "error"}
            className={`w-full p-3 rounded-lg font-semibold text-white transition-all mt-6 flex items-center justify-center gap-2 ${
              loading || backendStatus === "error"
                ? "bg-gray-600 cursor-not-allowed opacity-60"
                : "bg-blue-600 hover:bg-blue-700 active:scale-95"
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Please wait...
              </>
            ) : backendStatus === "error" ? (
              <>
                <AlertCircle className="w-5 h-5" />
                Backend Offline
              </>
            ) : isLogin ? (
              <>
                <LogIn className="w-5 h-5" />
                Login
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Register
              </>
            )}
          </button>
        </form>

        <div className="border-t border-gray-700 mt-6 pt-4">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-center text-sm text-gray-400 hover:text-blue-400 cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            {isLogin ? (
              <>
                Don't have an account? Create one
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Already have an account? Login
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}