// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const API_ENDPOINTS = {
   BASE: `${API_BASE_URL}`,
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
  ADMIN_DELETE_SCRIPT: (id) => `${API_BASE_URL}/api/admin/script/${id}`,
  ADMIN_ADD_USER: `${API_BASE_URL}/api/admin/add-user`,
  ADMIN_STATS: `${API_BASE_URL}/api/admin/stats`,

  // Auth endpoints
  AUTH_LOGIN: `${API_BASE_URL}/api/auth/login`,
  AUTH_REGISTER: `${API_BASE_URL}/api/auth/register`,

  // User endpoints
  USER_LOGIN: `${API_BASE_URL}/api/user/login`,
  USER_GET_SCRIPT: (mobile) => `${API_BASE_URL}/api/user/script?mobile=${mobile}`,
  USER_COMPLETE_SCRIPT: `${API_BASE_URL}/api/user/complete-script`,
  // Audio endpoints
  AUDIO_CONVERT: `${API_BASE_URL}/api/audio/convert`,
};

// API helper function
export const fetchAPI = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
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
