const ALLOWED_USER_ROLES = ["user", "admin", "vendor"];
const ALLOWED_USER_ROLE_SET = new Set(ALLOWED_USER_ROLES);

const USER_ROLE_VALIDATION_MESSAGE =
  "Invalid role. Allowed roles are user, admin, vendor";

const normalizeUserRole = (value = "") =>
  String(value ?? "").trim().toLowerCase();

const resolveUserRole = (value) => {
  const normalizedRole = normalizeUserRole(value);

  if (!normalizedRole) {
    return "user";
  }

  return ALLOWED_USER_ROLE_SET.has(normalizedRole) ? normalizedRole : null;
};

export {
  ALLOWED_USER_ROLES,
  USER_ROLE_VALIDATION_MESSAGE,
  normalizeUserRole,
  resolveUserRole,
};
