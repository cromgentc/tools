import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FileText, Copy, CheckCircle } from "lucide-react";

export default function ScriptViewer({ userId }) {
  const [script, setScript] = useState("");
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      toast.success("Script copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  useEffect(() => {
    if (!userId) return;

    const loadScript = async () => {
      try {
        const res = await fetch(`/api/script/${userId}`);
        const data = await res.json();

        setScript(data?.content || "");
        setEmail(data?.email || "");
      } catch (err) {
        toast.error("Error loading script");
        setScript("");
      }
    };

    loadScript();
  }, [userId]);

  return (
    <div className="w-full max-w-2xl bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl text-white border border-gray-700 shadow-xl">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-6 h-6 text-blue-400" />
        <h3 className="text-xl font-bold">Your Script</h3>
      </div>

      {/* Email Display (if available) */}
      {email && (
        <div className="bg-gray-700 p-3 rounded-lg mb-4 text-sm">
          <p className="text-gray-300">Email: <span className="text-blue-400 font-semibold">{email}</span></p>
        </div>
      )}

      {/* Script Content */}
      {script ? (
        <div className="space-y-3">
          <div className="bg-gray-950 p-4 rounded-lg border border-gray-600 min-h-32 max-h-96 overflow-y-auto">
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{script}</p>
          </div>

          {/* Copy Button */}
          <button
            onClick={copyToClipboard}
            className={`w-full py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              copied
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {copied ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy Script
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="bg-gray-950 p-8 rounded-lg border border-gray-600 text-center">
          <p className="text-gray-400">No script assigned yet</p>
        </div>
      )}
    </div>
  );
}