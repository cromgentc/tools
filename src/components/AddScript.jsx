import { useState } from "react";
import toast from "react-hot-toast";
import { API_ENDPOINTS } from "../config/api";
import { FileText, Upload, CheckCircle } from "lucide-react";


export default function AddScript() {
  const [excelFile, setExcelFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState([]);

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
