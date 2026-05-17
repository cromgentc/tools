import { Mail, Phone, Shield, UserCircle } from "lucide-react";

export default function Profile() {
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo")) || {};
    } catch {
      return {};
    }
  })();

  const profileRows = [
    { label: "Name", value: currentUser.name || "N/A", icon: <UserCircle className="h-5 w-5 text-blue-400" /> },
    { label: "Email", value: currentUser.email || "N/A", icon: <Mail className="h-5 w-5 text-cyan-400" /> },
    { label: "Mobile", value: currentUser.mobile || currentUser.phone || "N/A", icon: <Phone className="h-5 w-5 text-green-400" /> },
    { label: "Role", value: currentUser.role || "N/A", icon: <Shield className="h-5 w-5 text-purple-400" /> },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-white">
      <div className="rounded-xl border border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-5 shadow-xl">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <UserCircle className="h-6 w-6 text-blue-400" />
          Profile
        </h2>
        <p className="mt-1 text-sm text-gray-400">Logged in account details.</p>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-xl md:p-6">
        <div className="mb-5 flex items-center gap-3 border-b border-gray-700 pb-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
            <UserCircle className="h-8 w-8" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold">{currentUser.name || "Profile"}</h3>
            <p className="truncate text-sm text-gray-400">{currentUser.email || currentUser.role || "Account"}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {profileRows.map((row) => (
            <div key={row.label} className="rounded-lg border border-gray-700 bg-gray-800/60 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-400">
                {row.icon}
                {row.label}
              </div>
              <p className="break-words text-base font-semibold text-gray-100">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
