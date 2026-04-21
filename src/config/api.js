export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "https://recording-tools.onrender.com"
).replace(/\/+$/, "");

export const API_ENDPOINTS = {
  CHECK_BACKEND: `${API_BASE_URL}/`,

  // Recording endpoints
  RECORDING_UPLOAD: `${API_BASE_URL}/api/recording/upload`,
  RECORDING_SCRIPTS: `${API_BASE_URL}/api/recording/scripts-with-audio`,
  RECORDING_BY_ID: (id) => `${API_BASE_URL}/api/recording/${id}`,
  USER_RECORDINGS: (userId) => `${API_BASE_URL}/api/recording/user/${userId}`,
  DELETE_RECORDING: (id) => `${API_BASE_URL}/api/recording/${id}`,

  // Script endpoints
  SCRIPT_ASSIGN: `${API_BASE_URL}/api/script/assign`,
  SCRIPT_BULK_UPLOAD: `${API_BASE_URL}/api/script/bulk-upload`,
  SCRIPT_GET: (userId) => `${API_BASE_URL}/api/script/${userId}`,
  SCRIPT_COMPLETE: `${API_BASE_URL}/api/script/complete`,

  // Admin endpoints
  ADMIN_SCRIPTS: `${API_BASE_URL}/api/admin/scripts`,
  ADMIN_USERS: `${API_BASE_URL}/api/admin/users`,
  ADMIN_USER_DETAILS: (id) => `${API_BASE_URL}/api/admin/user/${id}`,
  ADMIN_USER_STATUS: (id) => `${API_BASE_URL}/api/admin/user/${id}/status`,
  ADMIN_DELETE_USER: (id) => `${API_BASE_URL}/api/admin/user/${id}`,
  ADMIN_DELETE_SCRIPT: (id) => `${API_BASE_URL}/api/admin/script/${id}`,
  ADMIN_ADD_USER: `${API_BASE_URL}/api/admin/add-user`,
  ADMIN_BULK_ADD_USERS: `${API_BASE_URL}/api/admin/bulk-users`,
  ADMIN_STATS: `${API_BASE_URL}/api/admin/stats`,

  // Auth endpoints
  AUTH_LOGIN: `${API_BASE_URL}/api/auth/login`,
  AUTH_REGISTER: `${API_BASE_URL}/api/auth/register`,
  AUTH_ACTIVITY: `${API_BASE_URL}/api/auth/activity`,

  // User endpoints
  USER_LOGIN: `${API_BASE_URL}/api/user/login`,
  USER_GET_SCRIPT: (mobile) =>
    `${API_BASE_URL}/api/user/script?mobile=${encodeURIComponent(mobile)}`,
  USER_COMPLETE_SCRIPT: `${API_BASE_URL}/api/user/complete-script`,

  // Audio endpoints
  AUDIO_CONVERT: `${API_BASE_URL}/api/audio/convert`,

  // Media helper
  RESOLVE_MEDIA_URL: (url) => {
    if (!url || typeof url !== "string") return null;

    const trimmed = url.trim();
    if (!trimmed) return null;

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
        .replace("http://localhost:5000", API_BASE_URL)
        .replace("https://localhost:5000", API_BASE_URL)
        .replace("/raw/upload/", "/video/upload/");
    }

    if (trimmed.startsWith("undefined/")) {
      return `${API_BASE_URL}/${trimmed.replace(/^undefined\/+/, "")}`;
    }

    if (trimmed.startsWith("/uploads/")) {
      return `${API_BASE_URL}${trimmed}`;
    }

    if (trimmed.startsWith("uploads/")) {
      return `${API_BASE_URL}/${trimmed}`;
    }

    return trimmed;
  },
};

export const fetchAPI = async (url, options = {}) => {
  try {
    const isFormData = options.body instanceof FormData;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
