import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  RefreshCw,
  Smartphone,
  User,
  UserPlus,
} from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

const isValidMobile = (value) => /^\d{10}$/.test(value);
const isValidEmail = (value) => value.includes("@") && value.includes(".");
const isValidOtp = (value) => /^\d{6}$/.test(value);

const readResponseData = async (response) => {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export default function Auth() {
  const [authMode, setAuthMode] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [registerRole, setRegisterRole] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [resetMethod, setResetMethod] = useState("email");
  const [resetStep, setResetStep] = useState("request");
  const [resetEmail, setResetEmail] = useState("");
  const [resetMobile, setResetMobile] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [otpDestination, setOtpDestination] = useState("");

  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");

  const navigate = useNavigate();

  const isLogin = authMode === "login";
  const isRegister = authMode === "register";
  const isForgotPassword = authMode === "forgot";
  const isBackendOffline = backendStatus === "error";

  const clearForgotPasswordFlow = () => {
    setResetMethod("email");
    setResetStep("request");
    setResetEmail("");
    setResetMobile("");
    setResetOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setOtpDestination("");
  };

  const openForgotPassword = () => {
    clearForgotPasswordFlow();
    setResetEmail(email.trim().toLowerCase());
    setResetMobile(mobile.trim());
    setAuthMode("forgot");
  };

  const goToLogin = () => {
    clearForgotPasswordFlow();
    setAuthMode("login");
  };

  const switchResetMethod = (method) => {
    setResetMethod(method);
    setResetStep("request");
    setResetOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setOtpDestination("");
  };

  useEffect(() => {
    try {
      const userInfo = localStorage.getItem("userInfo");

      if (userInfo) {
        const user = JSON.parse(userInfo);

        if (user?._id && user?.role) {
          user.role === "admin"
            ? navigate("/admin-dashboard", { replace: true })
            : navigate("/recording", { replace: true });
        }
      }
    } catch (err) {
      console.error("Auto-redirect error:", err);
    }
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;

    const checkBackend = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.CHECK_BACKEND);

        if (!isMounted) return;

        setBackendStatus(res.ok ? "connected" : "error");
      } catch {
        if (isMounted) {
          setBackendStatus("error");
        }
      }
    };

    checkBackend();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    const normalizedMobile = mobile.trim();

    if (!normalizedMobile || !password) {
      return toast.error("All fields required");
    }

    if (!isValidMobile(normalizedMobile)) {
      return toast.error("Mobile must be 10 digits");
    }

    setLoading(true);

    try {
      const res = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: normalizedMobile, password }),
      });

      const data = await readResponseData(res);

      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      if (!data.success) throw new Error(data.message || "Login failed");

      const userData = data.data || data.user;

      localStorage.setItem("userInfo", JSON.stringify(userData));
      toast.success("Login successful!");

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

  const handleRegister = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobile.trim();

    if (!name.trim() || !normalizedEmail || !normalizedMobile || !password) {
      return toast.error("All fields required");
    }

    if (!isValidMobile(normalizedMobile)) {
      return toast.error("Mobile must be 10 digits");
    }

    if (!isValidEmail(normalizedEmail)) {
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
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          mobile: normalizedMobile,
          password,
          role: registerRole || undefined,
        }),
      });

      const data = await readResponseData(res);

      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      if (!data.success) throw new Error(data.message || "Registration failed");

      toast.success("Registered successfully! Please login.");

      setAuthMode("login");
      setName("");
      setEmail("");
      setMobile(normalizedMobile);
      setPassword("");
      setRegisterRole("");
      setShowPass(false);
    } catch (err) {
      console.error("Register error:", err);
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetOtp = async (e) => {
    e?.preventDefault();

    const normalizedEmail = resetEmail.trim().toLowerCase();
    const normalizedMobile = resetMobile.trim();
    const payload =
      resetMethod === "email"
        ? { method: "email", email: normalizedEmail }
        : { method: "mobile", mobile: normalizedMobile };

    if (resetMethod === "email" && !isValidEmail(normalizedEmail)) {
      return toast.error("Enter a valid email address");
    }

    if (resetMethod === "mobile" && !isValidMobile(normalizedMobile)) {
      return toast.error("Mobile must be 10 digits");
    }

    setLoading(true);

    try {
      const res = await fetch(API_ENDPOINTS.AUTH_FORGOT_PASSWORD_REQUEST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readResponseData(res);

      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      if (!data.success) throw new Error(data.message || "Failed to send OTP");

      setResetEmail(normalizedEmail);
      setResetMobile(normalizedMobile);
      setResetStep("verify");
      setResetOtp("");
      setResetToken("");
      setOtpDestination(data.deliveryTarget || (resetMethod === "email" ? normalizedEmail : normalizedMobile));

      toast.success(data.message || "OTP sent successfully");
    } catch (err) {
      console.error("Send reset OTP error:", err);
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();

    const normalizedOtp = resetOtp.trim();
    const normalizedEmail = resetEmail.trim().toLowerCase();
    const normalizedMobile = resetMobile.trim();

    if (!isValidOtp(normalizedOtp)) {
      return toast.error("Enter a valid 6-digit OTP");
    }

    setLoading(true);

    try {
      const res = await fetch(API_ENDPOINTS.AUTH_FORGOT_PASSWORD_VERIFY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          resetMethod === "email"
            ? { method: "email", email: normalizedEmail, otp: normalizedOtp }
            : { method: "mobile", mobile: normalizedMobile, otp: normalizedOtp }
        ),
      });

      const data = await readResponseData(res);

      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      if (!data.success) throw new Error(data.message || "OTP verification failed");

      setResetToken(data.resetToken || "");
      setResetStep("reset");
      setResetOtp("");

      if (data.mobile) {
        setMobile(data.mobile);
      }

      toast.success(data.message || "OTP verified");
    } catch (err) {
      console.error("Verify reset OTP error:", err);
      toast.error(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!resetToken) {
      return toast.error("Verify OTP first");
    }

    if (newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    if (newPassword !== confirmNewPassword) {
      return toast.error("Passwords do not match");
    }

    setLoading(true);

    try {
      const res = await fetch(API_ENDPOINTS.AUTH_FORGOT_PASSWORD_RESET, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      const data = await readResponseData(res);

      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      if (!data.success) throw new Error(data.message || "Password reset failed");

      setMobile(data.user?.mobile || mobile);
      setPassword("");
      setShowPass(false);
      goToLogin();

      toast.success("Password updated! Login with your mobile number.");
    } catch (err) {
      console.error("Reset password error:", err);
      toast.error(err.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  const statusLabel =
    backendStatus === "connected"
      ? "Backend Connected"
      : backendStatus === "checking"
        ? "Checking Backend"
        : "Offline";

  const statusDotClass =
    backendStatus === "connected"
      ? "bg-green-500"
      : backendStatus === "checking"
        ? "bg-yellow-400"
        : "bg-red-500";

  const statusTextColor =
    backendStatus === "connected"
      ? "#10b981"
      : backendStatus === "checking"
        ? "#facc15"
        : "#ef4444";

  const title = isForgotPassword
    ? resetStep === "request"
      ? "Forgot Password"
      : resetStep === "verify"
        ? "Verify OTP"
        : "Set New Password"
    : isLogin
      ? "Welcome Back"
      : "Create Account";

  const subtitle = isForgotPassword
    ? resetStep === "request"
      ? "Choose email or mobile and receive your OTP"
      : resetStep === "verify"
        ? "Enter the OTP sent to your selected method"
        : "Save your new password and login again"
    : isLogin
      ? "Login to your account"
      : "Join us today";

  const submitDisabled = loading || isBackendOffline;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-black px-4 py-8">
      <div className="bg-gray-800 w-full max-w-[440px] p-8 rounded-2xl shadow-2xl border border-gray-700">
        <div className="flex justify-end items-center gap-2 mb-4 px-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${statusDotClass}`}></div>
          <span className="text-xs font-semibold" style={{ color: statusTextColor }}>
            {statusLabel}
          </span>
        </div>

        {isBackendOffline && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-600/50 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">Backend unavailable. Check if server is running.</p>
          </div>
        )}

        <div className="flex justify-center mb-3">
          {isForgotPassword ? (
            <KeyRound className="w-10 h-10 text-amber-400" />
          ) : isLogin ? (
            <Lock className="w-10 h-10 text-blue-400" />
          ) : (
            <UserPlus className="w-10 h-10 text-green-400" />
          )}
        </div>

        <h2 className="text-3xl font-bold text-center mb-2 text-white">{title}</h2>
        <p className="text-center text-gray-400 mb-6">{subtitle}</p>

        {!isForgotPassword && (
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {isRegister && (
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

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Account Role
                  </label>
                  <select
                    value={registerRole}
                    onChange={(e) => setRegisterRole(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Default User</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="vendor">Vendor</option>
                  </select>
                  <p className="mt-2 text-xs text-gray-400">
                    Blank chhodoge to account automatically user role se register hoga.
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Mobile Number
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter 10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
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
                  onClick={() => setShowPass((prev) => !prev)}
                  className="absolute right-3 top-3.5 text-blue-400 hover:text-blue-300"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {isLogin && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            <button
              disabled={submitDisabled}
              className={`w-full p-3 rounded-lg font-semibold text-white transition-all mt-6 flex items-center justify-center gap-2 ${
                submitDisabled
                  ? "bg-gray-600 cursor-not-allowed opacity-60"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95"
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Please wait...
                </>
              ) : isBackendOffline ? (
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
        )}

        {isForgotPassword && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-900/70 p-1">
              <button
                type="button"
                onClick={() => switchResetMethod("email")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  resetMethod === "email"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>

              <button
                type="button"
                onClick={() => switchResetMethod("mobile")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  resetMethod === "mobile"
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Mobile
              </button>
            </div>

            {resetStep === "request" && (
              <form onSubmit={handleSendResetOtp} className="space-y-4">
                {resetMethod === "email" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Registered Email
                    </label>
                    <input
                      type="email"
                      className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your registered email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Registered Mobile
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your registered mobile"
                      value={resetMobile}
                      onChange={(e) => setResetMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    />
                  </div>
                )}

                <button
                  disabled={submitDisabled}
                  className={`w-full p-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                    submitDisabled
                      ? "bg-gray-600 cursor-not-allowed opacity-60"
                      : "bg-amber-500 hover:bg-amber-600 active:scale-95"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Sending OTP...
                    </>
                  ) : isBackendOffline ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      Backend Offline
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-5 h-5" />
                      Send OTP
                    </>
                  )}
                </button>
              </form>
            )}

            {resetStep === "verify" && (
              <form onSubmit={handleVerifyResetOtp} className="space-y-4">
                <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 text-sm text-blue-200">
                  OTP sent to <span className="font-semibold">{otpDestination}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-[0.35em]"
                    placeholder="Enter 6-digit OTP"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </div>

                <button
                  disabled={submitDisabled}
                  className={`w-full p-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                    submitDisabled
                      ? "bg-gray-600 cursor-not-allowed opacity-60"
                      : "bg-blue-600 hover:bg-blue-700 active:scale-95"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Verifying...
                    </>
                  ) : isBackendOffline ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      Backend Offline
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-5 h-5" />
                      Verify OTP
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSendResetOtp}
                  disabled={submitDisabled}
                  className="w-full p-3 rounded-lg font-semibold text-blue-300 border border-blue-500/30 hover:bg-blue-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  Resend OTP
                </button>
              </form>
            )}

            {resetStep === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10 text-sm text-green-200">
                  OTP verified. Set your new password, then login using the same mobile number.
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />

                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-3.5 text-blue-400 hover:text-blue-300"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmNewPassword ? "text" : "password"}
                      className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />

                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                      className="absolute right-3 top-3.5 text-blue-400 hover:text-blue-300"
                    >
                      {showConfirmNewPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  disabled={submitDisabled}
                  className={`w-full p-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                    submitDisabled
                      ? "bg-gray-600 cursor-not-allowed opacity-60"
                      : "bg-green-600 hover:bg-green-700 active:scale-95"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving Password...
                    </>
                  ) : isBackendOffline ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      Backend Offline
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Save New Password
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="border-t border-gray-700 mt-6 pt-4">
          {isForgotPassword ? (
            <button
              type="button"
              onClick={goToLogin}
              className="w-full text-center text-sm text-gray-400 hover:text-blue-400 cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              Back to login
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAuthMode(isLogin ? "register" : "login")}
              className="w-full text-center text-sm text-gray-400 hover:text-blue-400 cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              {isLogin ? "Don't have an account? Create one" : "Already have an account? Login"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
