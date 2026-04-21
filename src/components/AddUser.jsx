import { useState } from "react";
import toast from "react-hot-toast";
import { User, Mail, Lock, Phone, UserPlus } from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

export default function AddUser() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const addUser = async () => {
    if (!name || !email || !mobile || !password) {
      return toast.error("All fields are required");
    }

    if (!email.includes("@")) {
      return toast.error("Enter valid email address");
    }

    if (mobile.length !== 10) {
      return toast.error("Enter valid 10-digit mobile number");
    }

    if (password.length < 4) {
      return toast.error("Password must be at least 4 characters");
    }

    try {
      setLoading(true);

      const res = await fetch(API_ENDPOINTS.ADMIN_ADD_USER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          mobile,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to add user");
      }

      toast.success(data.message || "User added successfully");

      // reset fields
      setName("");
      setEmail("");
      setMobile("");
      setPassword("");

    } catch (err) {
      console.log("ADD USER ERROR:", err);
      toast.error(err.message || "Error adding user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-xl max-w-md w-full text-white shadow-xl border border-gray-700">

      <div className="flex items-center gap-2 mb-6">
        <div className="bg-blue-600 p-2 rounded-full">
          <UserPlus className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold">Add New User</h2>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <User className="w-4 h-4" />
            Full Name
          </label>
          <input
            placeholder="Enter full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition"
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
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Mobile */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Mobile Number
          </label>
          <input
            type="tel"
            placeholder="Enter 10-digit mobile"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Password
          </label>
          <input
            type="password"
            placeholder="Enter password (min 4 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>
      </div>

      <button
        onClick={addUser}
        disabled={loading}
        className={`w-full py-3 rounded-lg font-semibold transition-all mt-6 flex items-center justify-center gap-2 ${
          loading
            ? "bg-gray-600 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 active:scale-95"
        }`}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            Adding User...
          </>
        ) : (
          <>
            <UserPlus className="w-5 h-5" />
            Add User
          </>
        )}
      </button>
    </div>
  );
}