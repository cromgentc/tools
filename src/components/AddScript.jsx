import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { API_ENDPOINTS } from "../config/api";
import { Mail, Phone, FileText, Upload, CheckCircle, Send } from "lucide-react";


export default function AddScript() {
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const [excelFile, setExcelFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState([]);

  // ================= SINGLE ASSIGN =================
  const handleAssign = async (e) => {
    e.preventDefault();

    if (!mobile || !email || !content) {
      return toast.error("All fields are required");
    }

    if (mobile.length !== 10) {
      return toast.error("Enter valid 10-digit mobile number");
    }

    if (!email.includes("@")) {
      return toast.error("Enter valid email address");
    }

    try {
      setLoading(true);

      const res = await axios.post(API_ENDPOINTS.SCRIPT_ASSIGN, {
        mobile,
        email,
        content,
      });

      toast.success(res.data.message || "Script assigned successfully");

      setMobile("");
      setEmail("");
      setContent("");

    } catch (err) {
      toast.error(err.response?.data?.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  // ================= BULK =================
  const uploadExcelBulk = async () => {
    if (!excelFile) {
      return toast.error("Please select an Excel file");
    }

    const formData = new FormData();
    formData.append("file", excelFile);

    try {
      setBulkLoading(true);

      const res = await fetch(API_ENDPOINTS.SCRIPT_BULK_UPLOAD, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();

      setBulkResult(data.inserted || []);

      toast.success(`Bulk upload successful! ${data.inserted?.length || 0} records added`);
      setExcelFile(null);

    } catch (err) {
      console.log("BULK UPLOAD ERROR:", err);
      toast.error(err.message || "Bulk upload failed");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-xl shadow-xl text-white border border-gray-700">

      {/* SINGLE ASSIGN SECTION */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Send className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold">Assign Single Script</h2>
        </div>

        <form onSubmit={handleAssign} className="space-y-4">

          {/* Mobile */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Mobile Number
            </label>
            <input
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Enter 10-digit mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
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
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Script Content */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Script Content
            </label>
            <textarea
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
              placeholder="Write the script content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows="6"
            />
          </div>

          <button
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
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
        </form>
      </div>

      {/* DIVIDER */}
      <div className="border-t border-gray-600 my-8"></div>

      {/* BULK UPLOAD SECTION */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Upload className="w-6 h-6 text-green-400" />
          <h3 className="text-2xl font-bold">Bulk Assign via Excel</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Select Excel File
            </label>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setExcelFile(e.target.files[0])}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 file:bg-blue-600 file:border-0 file:rounded file:px-4 file:py-2 file:text-white file:cursor-pointer file:font-semibold hover:bg-gray-600 transition"
            />
            {excelFile && (
              <p className="mt-2 text-sm text-green-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {excelFile.name}
              </p>
            )}
          </div>

          <button
            onClick={uploadExcelBulk}
            disabled={bulkLoading}
            className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              bulkLoading
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 active:scale-95"
            }`}
          >
            {bulkLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload Excel
              </>
            )}
          </button>
        </div>
      </div>

      {/* RESULTS */}
      {bulkResult.length > 0 && (
        <div className="bg-gradient-to-br from-gray-700 to-gray-800 p-6 rounded-lg border border-green-600/30">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h4 className="text-green-400 font-semibold text-lg">Bulk Upload Results</h4>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {bulkResult.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-900 p-3 rounded border border-gray-600 text-sm">
                <span className="text-blue-300 font-mono">{item.mobile || "N/A"}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  item.status === "Added" ? "bg-green-600 text-white" : "bg-gray-600 text-gray-200"
                }`}>
                  {item.status || "Added"}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-gray-400 text-center">
            Total: <span className="text-green-400 font-semibold">{bulkResult.length}</span> records
          </p>
        </div>
      )}
    </div>
  );
}