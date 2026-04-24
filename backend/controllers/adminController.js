import User from "../models/User.js";
import Script from "../models/Script.js";
import Recording from "../models/Recording.js";
import Record from "../models/Record.js";
import Metadata from "../models/Metadata.js";
import { removeRecordingAssets } from "../utils/recordingCleanup.js";
import fs from "fs";
import mongoose from "mongoose";
import xlsx from "xlsx";
import { serializeUserActivity } from "../utils/userActivity.js";
import {
  resolveUserRole,
  USER_ROLE_VALIDATION_MESSAGE,
} from "../utils/userRoles.js";
import {
  buildVendorProfile,
  createVendorUserRecord,
  isValidVendorEmail,
  isValidVendorMobile,
  normalizeVendorEmail,
  normalizeVendorMobile,
  normalizeVendorName,
  resolveVendorAssignment,
} from "../utils/vendor.js";

const USER_ACCOUNT_STATUSES = new Set(["active", "inactive", "suspended"]);

const normalizeUserPayload = (input = {}) => ({
  name: String(input.name ?? input.Name ?? input.fullName ?? input["Full Name"] ?? "").trim(),
  mobile: String(input.mobile ?? input.Mobile ?? input.phone ?? input.Phone ?? "").trim(),
  email: String(input.email ?? input.Email ?? "").trim().toLowerCase(),
  password: String(input.password ?? input.Password ?? input.pass ?? input.Pass ?? "").trim(),
  vendorId: String(input.vendorId ?? input.vendorID ?? input.VendorId ?? input["Vendor ID"] ?? "").trim(),
  vendorName: String(
    input.vendorName ??
      input.VendorName ??
      input.vendor ??
      input.Vendor ??
      input["Vendor Name"] ??
      input["vendor name"] ??
      ""
  ).trim(),
  role: resolveUserRole(
    input.role ??
      input.Role ??
      input.userRole ??
      input.user_role ??
      input["User Role"] ??
      input["user role"]
  ),
});

const validateUserPayload = ({ name, mobile, email, password, role }) => {
  if (!name || !mobile || !email || !password) {
    return "All fields are required";
  }

  if (!role) {
    return USER_ROLE_VALIDATION_MESSAGE;
  }

  if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
    return "Mobile must be 10 digits";
  }

  if (!email.includes("@") || !email.includes(".")) {
    return "Invalid email address";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }

  return null;
};

const safeDeleteFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const createUserError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const createVendorError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeVendorPayload = (input = {}) => ({
  name: normalizeVendorName(input.name ?? input.vendorName ?? input.Name ?? input["Vendor Name"]),
  mobile: normalizeVendorMobile(input.mobile ?? input.Mobile ?? ""),
  email: normalizeVendorEmail(input.email ?? input.Email ?? ""),
});

const validateVendorPayload = ({ name, mobile, email }) => {
  if (!name || !mobile || !email) {
    return "Vendor name, mobile number and email are required";
  }

  if (!isValidVendorMobile(mobile)) {
    return "Vendor mobile must be 10 digits";
  }

  if (!isValidVendorEmail(email)) {
    return "Invalid vendor email address";
  }

  return null;
};

const buildUserVendorFields = (vendor) => ({
  vendorId: vendor?.vendorId || null,
  vendorName: vendor?.vendorName || null,
  vendorCode: vendor?.vendorCode || null,
  vendorKey: vendor?.vendorKey || null,
});

const getVendorQueryForPayload = ({ name, mobile, email }) => {
  const conditions = [];
  const profile = name ? buildVendorProfile({ vendorName: name }) : null;

  if (profile?.vendorKey) {
    conditions.push({ vendorKey: profile.vendorKey });
  }

  if (mobile) {
    conditions.push({ mobile });
  }

  if (email) {
    conditions.push({ email });
  }

  return conditions.length > 0 ? { role: "vendor", $or: conditions } : null;
};

const findExistingVendorByPayload = async ({ name, mobile, email, excludeVendorId = null } = {}) => {
  const vendorQuery = getVendorQueryForPayload({ name, mobile, email });

  if (!vendorQuery) {
    return null;
  }

  return User.findOne({
    ...vendorQuery,
    ...(excludeVendorId ? { _id: { $ne: excludeVendorId } } : {}),
  });
};

const validatePasswordValue = (value = "") => {
  if (String(value ?? "").trim().length < 6) {
    return "Password must be at least 6 characters";
  }

  return null;
};

const ensureVendorLoginUserAvailable = async ({
  mobile,
  email,
  excludeUserId = null,
} = {}) => {
  const existingUser = await User.findOne({
    ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
    $or: [{ mobile }, { email }],
  });

  if (!existingUser) {
    return null;
  }

  throw createVendorError(
    existingUser.mobile === mobile
      ? "Mobile number already registered"
      : "Email already registered"
  );
};

const createOrUpdateVendorLoginUser = async ({ payload, password }) => {
  const vendorQuery = getVendorQueryForPayload(payload);
  const existingVendorUser = vendorQuery ? await User.findOne(vendorQuery) : null;
  const profile = buildVendorProfile({ vendorName: payload.name });

  if (existingVendorUser) {
    if (existingVendorUser.role !== "vendor") {
      throw createVendorError(
        existingVendorUser.mobile === payload.mobile
          ? "Mobile number already registered"
          : "Email already registered"
      );
    }

    await ensureVendorLoginUserAvailable({
      mobile: payload.mobile,
      email: payload.email,
      excludeUserId: existingVendorUser._id,
    });

    existingVendorUser.name = profile.name;
    existingVendorUser.mobile = payload.mobile;
    existingVendorUser.email = payload.email;
    existingVendorUser.password = password;
    existingVendorUser.role = "vendor";
    existingVendorUser.accountStatus = "active";
    existingVendorUser.vendorId = existingVendorUser._id;
    existingVendorUser.vendorName = profile.name;
    existingVendorUser.vendorCode = existingVendorUser.vendorCode || profile.vendorCode;
    existingVendorUser.vendorKey = profile.vendorKey;
    await existingVendorUser.save();

    return {
      vendorUser: existingVendorUser,
      action: "updated",
    };
  }

  await ensureVendorLoginUserAvailable(payload);

  const vendorUser = await createVendorUserRecord({
    vendorName: profile.name,
    mobile: payload.mobile,
    email: payload.email,
    password,
  });

  return {
    vendorUser,
    action: "created",
  };
};

const createVendorWithLogin = async (rawInput) => {
  const payload = normalizeVendorPayload(rawInput);
  const validationError = validateVendorPayload(payload);
  const normalizedPassword = String(rawInput?.password ?? rawInput?.Password ?? "").trim();

  if (validationError) {
    throw createVendorError(validationError);
  }

  const passwordError = validatePasswordValue(normalizedPassword);

  if (passwordError) {
    throw createVendorError(passwordError);
  }

  const { vendorUser, action } = await createOrUpdateVendorLoginUser({
    payload,
    password: normalizedPassword,
  });

  return {
    vendor: vendorUser,
    vendorUser,
    action: action === "updated" ? "login-enabled" : "created",
  };
};

const createUserRecord = async (rawInput) => {
  const payload = normalizeUserPayload(rawInput);
  const validationError = validateUserPayload(payload);

  if (validationError) {
    throw createUserError(validationError);
  }

  if (payload.role === "vendor") {
    const { vendorUser } = await createVendorWithLogin({
      ...rawInput,
      name: payload.name,
      mobile: payload.mobile,
      email: payload.email,
      password: payload.password,
      vendorName: payload.vendorName || payload.name,
    }).catch((error) => {
      throw createUserError(error.message, error.statusCode || 400);
    });

    return vendorUser;
  }

  const existingUser = await User.findOne({
    $or: [{ mobile: payload.mobile }, { email: payload.email }],
  });

  if (existingUser) {
    throw createUserError(
      existingUser.mobile === payload.mobile
        ? "Mobile number already registered"
        : "Email already registered"
    );
  }

  const effectiveVendorName =
    payload.role === "vendor"
      ? normalizeVendorName(payload.vendorName || payload.name)
      : payload.vendorName;

  const vendorAssignment = await resolveVendorAssignment({
    vendorId: payload.role === "vendor" ? "" : payload.vendorId,
    vendorName: effectiveVendorName,
    vendorCode: rawInput?.vendorCode,
  }).catch((error) => {
    throw createUserError(error.message);
  });

  return User.create({
    ...payload,
    ...buildUserVendorFields(vendorAssignment),
  });
};

const buildUserSummary = ({ user, scripts, recordings }) => {
  const completedScripts = scripts.filter((script) => script.status === "completed").length;
  const pendingScripts = scripts.filter((script) => script.status === "pending").length;

  return {
    _id: user._id,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
    vendorId: user.vendorId || null,
    vendorName: user.vendorName || "Unassigned Vendor",
    vendorCode: user.vendorCode || "N/A",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    totalScripts: scripts.length,
    completedScripts,
    pendingScripts,
    totalRecordings: recordings.length,
    ...serializeUserActivity(user),
  };
};

const findRelatedScripts = async (user) =>
  Script.find({
    $or: [{ userId: user._id }, { mobile: user.mobile }, { email: user.email }],
  })
    .select("_id")
    .lean();

const buildRelatedRecordingsQuery = (userId, scriptIds = []) => ({
  $or: [
    { userId },
    { user: userId },
    ...(scriptIds.length > 0
      ? [{ scriptId: { $in: scriptIds } }, { script: { $in: scriptIds } }]
      : []),
  ],
});

const getLinkedScriptIdsFromRecordings = (recordings = []) => [
  ...new Set(
    recordings
      .flatMap((recording) => [recording.scriptId, recording.script])
      .filter(Boolean)
      .map((value) => String(value))
  ),
];

// =========================
// ADD VENDOR
// =========================
export const addVendor = async (req, res) => {
  try {
    const { vendor, vendorUser, action } = await createVendorWithLogin(req.body);
    const message =
      action === "login-enabled"
        ? "Vendor already existed. Vendor login enabled successfully"
        : "Vendor and vendor login created successfully";

    res.status(action === "created" ? 201 : 200).json({
      success: true,
      message,
      vendor: {
        _id: vendor._id,
        name: vendor.name,
        mobile: vendor.mobile,
        email: vendor.email,
        vendorCode: vendor.vendorCode,
      },
      user: {
        _id: vendorUser._id,
        name: vendorUser.name,
        mobile: vendorUser.mobile,
        email: vendorUser.email,
        role: vendorUser.role,
        vendorId: vendorUser.vendorId,
        vendorName: vendorUser.vendorName,
        vendorCode: vendorUser.vendorCode,
      },
    });
  } catch (err) {
    console.error("ADD VENDOR ERROR:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to create vendor",
    });
  }
};

// =========================
// BULK ADD VENDORS
// =========================
export const bulkAddVendors = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      safeDeleteFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Excel or CSV file is empty",
      });
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

    if (!Array.isArray(rows) || rows.length === 0) {
      safeDeleteFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Excel or CSV file is empty or invalid format",
      });
    }

    const inserted = [];
    const errors = [];

    for (let i = 0; i < rows.length; i += 1) {
      try {
        const { vendor, vendorUser, action } = await createVendorWithLogin(rows[i]);

        inserted.push({
          vendorId: vendor._id,
          userId: vendorUser._id,
          name: vendor.name,
          mobile: vendor.mobile,
          email: vendor.email,
          vendorCode: vendor.vendorCode,
          role: vendorUser.role,
          status: action === "created" ? "Added" : "Login Enabled",
        });
      } catch (rowErr) {
        errors.push(`Row ${i + 1}: ${rowErr.message}`);
      }
    }

    safeDeleteFile(req.file.path);

    res.json({
      success: true,
      message: `Bulk vendor upload completed. ${inserted.length} vendors added, ${errors.length} errors`,
      inserted,
      errors,
    });
  } catch (err) {
    safeDeleteFile(req.file?.path);
    console.error("BULK ADD VENDOR ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to process bulk vendor upload",
    });
  }
};

// =========================
// GET ALL VENDORS
// =========================
export const getAllVendors = async (req, res) => {
  try {
    const [vendors, userCounts] = await Promise.all([
      User.find({ role: "vendor" })
        .select("name mobile email vendorCode createdAt lastActiveAt")
        .sort({ name: 1 })
        .lean(),
      User.aggregate([
        { $match: { role: { $nin: ["admin", "vendor"] }, vendorId: { $ne: null } } },
        { $group: { _id: "$vendorId", totalUsers: { $sum: 1 } } },
      ]),
    ]);

    const userCountMap = new Map(
      userCounts.map((item) => [String(item._id), Number(item.totalUsers || 0)])
    );

    res.json({
      success: true,
      count: vendors.length,
      vendors: vendors.map((vendor) => ({
        _id: vendor._id,
        name: vendor.name,
        mobile: vendor.mobile,
        email: vendor.email,
        vendorCode: vendor.vendorCode,
        totalUsers: userCountMap.get(String(vendor._id)) || 0,
        createdAt: vendor.createdAt,
        lastActiveAt: vendor.lastActiveAt || null,
      })),
    });
  } catch (err) {
    console.error("GET ALL VENDORS ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch vendors",
    });
  }
};

// =========================
// UPDATE VENDOR
// =========================
export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = normalizeVendorPayload(req.body);
    const validationError = validateVendorPayload(payload);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required",
      });
    }

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const vendor = await User.findById(id);

    if (!vendor || vendor.role !== "vendor") {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const duplicateVendor = await findExistingVendorByPayload({
      ...payload,
      excludeVendorId: vendor._id,
    });

    if (duplicateVendor) {
      return res.status(400).json({
        success: false,
        message:
          duplicateVendor.mobile === payload.mobile
            ? "Vendor mobile already exists"
            : duplicateVendor.email === payload.email
              ? "Vendor email already exists"
              : "Vendor name already exists",
      });
    }

    await ensureVendorLoginUserAvailable({
      mobile: payload.mobile,
      email: payload.email,
      excludeUserId: vendor._id,
    });

    const profile = buildVendorProfile({ vendorName: payload.name });

    vendor.name = profile.name;
    vendor.mobile = payload.mobile;
    vendor.email = payload.email;
    vendor.vendorName = profile.name;
    vendor.vendorCode = profile.vendorCode;
    vendor.vendorKey = profile.vendorKey;
    vendor.vendorId = vendor._id;

    await vendor.save();

    const linkedUsersUpdate = await User.updateMany(
      { role: { $nin: ["admin", "vendor"] }, vendorId: vendor._id },
      {
        $set: {
          vendorName: profile.name,
          vendorCode: profile.vendorCode,
          vendorKey: profile.vendorKey,
        },
      }
    );

    res.json({
      success: true,
      message: "Vendor updated successfully",
      vendor: {
        _id: vendor._id,
        name: vendor.name,
        mobile: vendor.mobile,
        email: vendor.email,
        vendorCode: vendor.vendorCode,
        totalUsers: linkedUsersUpdate.matchedCount || 0,
        createdAt: vendor.createdAt,
        lastActiveAt: vendor.lastActiveAt || null,
      },
    });
  } catch (err) {
    console.error("UPDATE VENDOR ERROR:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to update vendor",
    });
  }
};

// =========================
// ADD USER
// =========================
export const addUser = async (req, res) => {
  try {
    const user = await createUserRecord(req.body);
    const isVendorUser = user.role === "vendor";

    res.json({
      success: true,
      message: isVendorUser ? "Vendor created successfully" : "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        vendorId: user.vendorId,
        vendorName: user.vendorName,
        vendorCode: user.vendorCode,
      },
    });
  } catch (err) {
    console.error("ADD USER ERROR:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to create user",
    });
  }
};

// =========================
// BULK ADD USERS
// =========================
export const bulkAddUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      safeDeleteFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Excel or CSV file is empty",
      });
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

    if (!Array.isArray(rows) || rows.length === 0) {
      safeDeleteFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Excel or CSV file is empty or invalid format",
      });
    }

    const inserted = [];
    const errors = [];
    const defaultVendorId = String(req.body?.defaultVendorId ?? "").trim();
    const requestedDefaultRole = resolveUserRole(req.body?.defaultRole);
    const defaultRole = requestedDefaultRole || "";

    for (let i = 0; i < rows.length; i += 1) {
      try {
        const user = await createUserRecord({
          ...rows[i],
          ...(defaultVendorId ? { vendorId: defaultVendorId } : {}),
          ...(defaultRole ? { role: defaultRole } : {}),
        });

        inserted.push({
          userId: user._id,
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          role: user.role,
          vendorName: user.vendorName,
          vendorCode: user.vendorCode,
          status: "Added",
        });
      } catch (rowErr) {
        errors.push(`Row ${i + 1}: ${rowErr.message}`);
      }
    }

    safeDeleteFile(req.file.path);

    res.json({
      success: true,
      message: `Bulk user upload completed. ${inserted.length} users added, ${errors.length} errors`,
      inserted,
      errors,
    });
  } catch (err) {
    safeDeleteFile(req.file?.path);
    console.error("BULK ADD USER ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to process bulk user upload",
    });
  }
};

// =========================
// GET ALL USERS
// =========================
export const getAllUsers = async (req, res) => {
  try {
    const vendorScopeId = String(req.query?.vendorId ?? "").trim();
    if (vendorScopeId && !mongoose.Types.ObjectId.isValid(vendorScopeId)) {
      return res.json({
        success: true,
        count: 0,
        users: [],
      });
    }

    const userQuery = vendorScopeId
      ? {
          role: { $nin: ["admin", "vendor"] },
          vendorId: vendorScopeId,
        }
      : { role: { $nin: ["admin", "vendor"] } };

    const users = await User.find(userQuery)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const userIds = users.map((user) => user._id);

    const [scripts, recordings] = await Promise.all([
      Script.find({ userId: { $in: userIds } }).select("userId status").lean(),
      Recording.find({ userId: { $in: userIds } }).select("userId").lean(),
    ]);

    const scriptsByUser = new Map();
    const recordingsByUser = new Map();

    for (const script of scripts) {
      const key = String(script.userId);
      const current = scriptsByUser.get(key) || [];
      current.push(script);
      scriptsByUser.set(key, current);
    }

    for (const recording of recordings) {
      const key = String(recording.userId);
      const current = recordingsByUser.get(key) || [];
      current.push(recording);
      recordingsByUser.set(key, current);
    }

    const result = users.map((user) =>
      buildUserSummary({
        user,
        scripts: scriptsByUser.get(String(user._id)) || [],
        recordings: recordingsByUser.get(String(user._id)) || [],
      })
    );

    res.json({
      success: true,
      count: result.length,
      users: result,
    });
  } catch (err) {
    console.error("GET ALL USERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch users",
    });
  }
};

// =========================
// GET USER DETAILS
// =========================
export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorScopeId = String(req.query?.vendorId ?? "").trim();

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (vendorScopeId && !mongoose.Types.ObjectId.isValid(vendorScopeId)) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = await User.findById(id).select("-password").lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      vendorScopeId &&
      (user.role === "vendor" || String(user.vendorId || "") !== vendorScopeId)
    ) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const [scripts, recordings] = await Promise.all([
      Script.find({ userId: id }).sort({ createdAt: -1 }).lean(),
      Recording.find({ userId: id })
        .populate("scriptId", "content status createdAt completedAt")
        .sort({ uploadedAt: -1 })
        .lean(),
    ]);

    const summary = buildUserSummary({
      user,
      scripts,
      recordings,
    });

    res.json({
      success: true,
      user: {
        ...summary,
        history: user.history || [],
        scripts: scripts.map((script) => ({
          _id: script._id,
          content: script.content,
          status: script.status,
          createdAt: script.createdAt,
          completedAt: script.completedAt || null,
        })),
        recordings: recordings.map((recording) => ({
          _id: recording._id,
          filename: recording.filename,
          audioLink: recording.audioLink,
          fileSize: recording.fileSize || 0,
          uploadedAt: recording.uploadedAt,
          script: recording.scriptId
            ? {
                _id: recording.scriptId._id,
                content: recording.scriptId.content,
                status: recording.scriptId.status,
                createdAt: recording.scriptId.createdAt,
                completedAt: recording.scriptId.completedAt || null,
              }
            : null,
        })),
      },
    });
  } catch (err) {
    console.error("GET USER DETAILS ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch user details",
    });
  }
};

// =========================
// UPDATE USER STATUS
// =========================
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!USER_ACCOUNT_STATUSES.has(accountStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user status",
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        accountStatus,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User status updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        vendorId: user.vendorId || null,
        vendorName: user.vendorName,
        vendorCode: user.vendorCode,
        ...serializeUserActivity(user),
      },
    });
  } catch (err) {
    console.error("UPDATE USER STATUS ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update user status",
    });
  }
};

// =========================
// UPDATE USER VENDOR
// =========================
export const updateUserVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!String(vendorId ?? "").trim()) {
      user.vendorId = null;
      user.vendorName = null;
      user.vendorCode = null;
      user.vendorKey = null;
      await user.save();

      return res.json({
        success: true,
        message: "Vendor removed from user",
        user: {
          _id: user._id,
          name: user.name,
          vendorId: null,
          vendorName: null,
          vendorCode: null,
        },
      });
    }

    const vendor = await resolveVendorAssignment({ vendorId }).catch((error) => {
      throw createUserError(error.message, 404);
    });

    user.vendorId = vendor.vendorId;
    user.vendorName = vendor.vendorName;
    user.vendorCode = vendor.vendorCode;
    user.vendorKey = vendor.vendorKey;
    await user.save();

    res.json({
      success: true,
      message: "User vendor updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        vendorId: user.vendorId,
        vendorName: user.vendorName,
        vendorCode: user.vendorCode,
      },
    });
  } catch (err) {
    console.error("UPDATE USER VENDOR ERROR:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to update user vendor",
    });
  }
};

// =========================
// DELETE USER
// =========================
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin users cannot be deleted from this screen",
      });
    }

    const userIdString = String(user._id);

    const scripts = await findRelatedScripts(user);

    const scriptIds = scripts.map((script) => script._id);

    const recordings = await Recording.find(buildRelatedRecordingsQuery(id, scriptIds));

    for (const recording of recordings) {
      await removeRecordingAssets(recording);
    }

    if (recordings.length > 0) {
      await Recording.deleteMany({
        _id: { $in: recordings.map((recording) => recording._id) },
      });
    }

    const [deletedScriptsResult, deletedRecordsResult, deletedMetadataResult] = await Promise.all([
      Script.deleteMany({
        $or: [{ userId: id }, { mobile: user.mobile }, { email: user.email }],
      }),
      Record.deleteMany({ userId: userIdString }),
      Metadata.deleteMany({ userId: userIdString }),
      user.role === "vendor"
        ? User.updateMany(
            { role: { $nin: ["admin", "vendor"] }, vendorId: user._id },
            {
              $set: {
                vendorId: null,
                vendorName: null,
                vendorCode: null,
                vendorKey: null,
              },
            }
          )
        : Promise.resolve(null),
    ]);

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "User and all related backend data deleted successfully",
      deletedScripts: deletedScriptsResult.deletedCount || scripts.length,
      deletedRecordings: recordings.length,
      deletedRecords: deletedRecordsResult.deletedCount || 0,
      deletedMetadata: deletedMetadataResult.deletedCount || 0,
    });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete user",
    });
  }
};

// =========================
// DELETE ALL USER RECORDINGS
// =========================
export const deleteAllUserRecordings = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await User.findById(id).select("name mobile email");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const scripts = await findRelatedScripts(user);
    const scriptIds = scripts.map((script) => script._id);
    const recordings = await Recording.find(buildRelatedRecordingsQuery(id, scriptIds));

    if (recordings.length === 0) {
      return res.json({
        success: true,
        message: "No recordings found for this user",
        deletedRecordings: 0,
        resetScripts: 0,
      });
    }

    for (const recording of recordings) {
      await removeRecordingAssets(recording);
    }

    await Recording.deleteMany({
      _id: { $in: recordings.map((recording) => recording._id) },
    });

    const linkedScriptIds = getLinkedScriptIdsFromRecordings(recordings);
    let resetScripts = 0;

    if (linkedScriptIds.length > 0) {
      const resetResult = await Script.updateMany(
        { _id: { $in: linkedScriptIds } },
        {
          status: "pending",
          completedAt: null,
          $unset: { audioLink: "" },
        }
      );

      resetScripts = resetResult.modifiedCount || 0;
    }

    res.json({
      success: true,
      message: `All recordings deleted successfully for ${user.mobile}`,
      deletedRecordings: recordings.length,
      resetScripts,
    });
  } catch (err) {
    console.error("DELETE ALL USER RECORDINGS ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete user recordings",
    });
  }
};

// =========================
// GET STATS
// =========================
export const getStats = async (req, res) => {
  try {
    const vendorsCollection =
      mongoose.connection?.db?.collection("vendors") || null;

    const [
      totalUsers,
      totalVendors,
      totalScripts,
      totalRecordings,
      completedRecordings,
      pendingScripts,
    ] = await Promise.all([
      User.countDocuments({ role: { $nin: ["admin", "vendor"] } }),
      vendorsCollection ? vendorsCollection.countDocuments({}) : 0,
      Script.countDocuments(),
      Recording.countDocuments(),
      Recording.countDocuments({ status: "completed" }),
      Script.countDocuments({ status: "pending" }),
    ]);

    res.json({
      success: true,
      message: "Stats fetched successfully",
      data: {
        totalUsers,
        totalVendors,
        totalScripts,
        totalRecordings,
        completedRecordings,
        pendingScripts,
      },
    });
  } catch (err) {
    console.error("GET STATS ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to fetch stats",
      data: null
    });
  }
};


// =========================
// GET ALL SCRIPTS
// =========================
export const getAllScripts = async (req, res) => {
  try {
    const scripts = await Script.find()
      .populate("userId", "name mobile email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: scripts.length,
      scripts,
    });
  } catch (err) {
    console.error("GET ALL SCRIPTS ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to fetch scripts" 
    });
  }
};

// =========================
// UPDATE SCRIPT
// =========================
export const updateScript = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id) {
      return res.status(400).json({ message: "Script ID is required" });
    }

    const updated = await Script.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Script not found" });
    }

    res.json({
      success: true,
      message: "Script updated successfully",
      script: updated,
    });

  } catch (err) {
    console.error("UPDATE SCRIPT ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to update script" 
    });
  }
};

// =========================
// DELETE SCRIPT
// =========================
export const deleteScript = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id) {
      return res.status(400).json({ message: "Script ID is required" });
    }

    const script = await Script.findById(id);

    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }

    const recordings = await Recording.find({
      $or: [{ scriptId: id }, { script: id }],
    });

    for (const recording of recordings) {
      await removeRecordingAssets(recording);
    }

    if (recordings.length > 0) {
      await Recording.deleteMany({
        _id: { $in: recordings.map((recording) => recording._id) },
      });
    }

    await Script.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Script and related recordings deleted successfully",
      deletedRecordings: recordings.length,
    });

  } catch (err) {
    console.error("DELETE SCRIPT ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Failed to delete script" 
    });
  }
};
