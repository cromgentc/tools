import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/User.js";

const normalizeWhitespace = (value = "") =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

export const normalizeVendorName = (value = "") => normalizeWhitespace(value);

export const normalizeVendorMobile = (value = "") =>
  String(value ?? "")
    .trim()
    .replace(/\D/g, "");

export const normalizeVendorEmail = (value = "") =>
  String(value ?? "").trim().toLowerCase();

export const isValidVendorMobile = (value = "") => /^\d{10}$/.test(value);

export const isValidVendorEmail = (value = "") =>
  value.includes("@") && value.includes(".");

const toVendorSlug = (value = "") =>
  normalizeVendorName(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeVendorCode = (value = "") => String(value ?? "").trim().toUpperCase();

export const buildVendorProfile = ({ vendorName } = {}) => {
  const normalizedName = normalizeVendorName(vendorName);
  const vendorKey = normalizedName.toLowerCase();
  const compactName = toVendorSlug(normalizedName).replace(/-/g, "");
  const prefix = (compactName.slice(0, 4) || "VEND").padEnd(4, "X");
  const suffix = crypto
    .createHash("sha1")
    .update(vendorKey)
    .digest("hex")
    .slice(0, 6)
    .toUpperCase();

  return {
    name: normalizedName,
    vendorKey,
    vendorCode: `VND-${prefix}-${suffix}`,
  };
};

export const buildVendorSnapshot = (vendor) => {
  if (!vendor) {
    return {
      vendorId: null,
      vendorName: null,
      vendorCode: null,
      vendorKey: null,
    };
  }

  const vendorName = normalizeVendorName(vendor.vendorName || vendor.name);
  const profile = vendorName ? buildVendorProfile({ vendorName }) : null;

  return {
    vendorId: vendor.vendorId || vendor._id || null,
    vendorName: vendorName || null,
    vendorCode: normalizeVendorCode(vendor.vendorCode || profile?.vendorCode || ""),
    vendorKey: vendor.vendorKey || profile?.vendorKey || null,
  };
};

const buildVendorFinderQuery = (conditions = []) => ({
  role: "vendor",
  $or: conditions,
});

export const findVendorById = async (vendorId) => {
  const normalizedId = String(vendorId ?? "").trim();

  if (!normalizedId || !mongoose.Types.ObjectId.isValid(normalizedId)) {
    return null;
  }

  return User.findOne(
    buildVendorFinderQuery([{ _id: normalizedId }, { vendorId: normalizedId }])
  );
};

export const findVendorByName = async (vendorName) => {
  const normalizedName = normalizeVendorName(vendorName);

  if (!normalizedName) {
    return null;
  }

  const { vendorKey } = buildVendorProfile({ vendorName: normalizedName });

  return User.findOne(
    buildVendorFinderQuery([
      { vendorKey },
      { name: normalizedName },
      { vendorName: normalizedName },
    ])
  );
};

export const findVendorByCode = async (vendorCode) => {
  const normalizedCode = normalizeVendorCode(vendorCode);

  if (!normalizedCode) {
    return null;
  }

  return User.findOne(buildVendorFinderQuery([{ vendorCode: normalizedCode }]));
};

export const createVendorUserRecord = async ({
  vendorName,
  name,
  mobile,
  email,
  password,
  accountStatus = "active",
} = {}) => {
  const normalizedName = normalizeVendorName(vendorName || name);

  if (!normalizedName) {
    throw new Error("Vendor name is required");
  }

  const profile = buildVendorProfile({ vendorName: normalizedName });
  const vendorUser = new User({
    name: profile.name,
    mobile: normalizeVendorMobile(mobile),
    email: normalizeVendorEmail(email),
    password,
    role: "vendor",
    accountStatus,
    vendorName: profile.name,
    vendorCode: profile.vendorCode,
    vendorKey: profile.vendorKey,
  });

  vendorUser.vendorId = vendorUser._id;
  await vendorUser.save();

  return vendorUser;
};

export const resolveVendorAssignment = async ({
  vendorId,
  vendorName,
  vendorCode,
} = {}) => {
  const directVendor = await findVendorById(vendorId);

  if (vendorId && !directVendor) {
    throw new Error("Selected vendor not found");
  }

  if (directVendor) {
    return buildVendorSnapshot(directVendor);
  }

  const vendorByCode = await findVendorByCode(vendorCode);
  if (vendorByCode) {
    return buildVendorSnapshot(vendorByCode);
  }

  const normalizedName = normalizeVendorName(vendorName);

  if (!normalizedName) {
    return buildVendorSnapshot(null);
  }

  const vendor = await findVendorByName(normalizedName);

  if (!vendor) {
    throw new Error(`Vendor "${normalizedName}" not found`);
  }

  return buildVendorSnapshot(vendor);
};

export const syncVendorUserReferences = async () => {
  const vendorUsers = await User.find({ role: "vendor" })
    .select("_id name vendorId vendorName vendorCode vendorKey")
    .lean();

  if (vendorUsers.length === 0) {
    return {
      vendorUsersUpdated: 0,
      assignedUsersUpdated: 0,
    };
  }

  const vendorUserUpdates = [];
  const vendorById = new Map();
  const vendorByCode = new Map();
  const vendorByKey = new Map();

  for (const vendorUser of vendorUsers) {
    const profile = buildVendorProfile({
      vendorName: vendorUser.vendorName || vendorUser.name,
    });
    const nextSnapshot = {
      vendorId: vendorUser._id,
      vendorName: profile.name,
      vendorCode: normalizeVendorCode(vendorUser.vendorCode || profile.vendorCode),
      vendorKey: profile.vendorKey,
    };

    const currentVendorId = String(vendorUser.vendorId || "");
    const currentVendorCode = normalizeVendorCode(vendorUser.vendorCode || "");
    const currentVendorKey = String(vendorUser.vendorKey || "").trim().toLowerCase();
    const needsUpdate =
      currentVendorId !== String(vendorUser._id) ||
      normalizeVendorName(vendorUser.vendorName || vendorUser.name) !== nextSnapshot.vendorName ||
      currentVendorCode !== nextSnapshot.vendorCode ||
      currentVendorKey !== nextSnapshot.vendorKey;

    if (needsUpdate) {
      vendorUserUpdates.push({
        updateOne: {
          filter: { _id: vendorUser._id },
          update: { $set: nextSnapshot },
        },
      });
    }

    const snapshot = {
      vendorId: vendorUser._id,
      vendorName: nextSnapshot.vendorName,
      vendorCode: nextSnapshot.vendorCode,
      vendorKey: nextSnapshot.vendorKey,
    };

    vendorById.set(String(vendorUser._id), snapshot);

    if (currentVendorId) {
      vendorById.set(currentVendorId, snapshot);
    }

    if (snapshot.vendorCode) {
      vendorByCode.set(snapshot.vendorCode, snapshot);
    }

    if (snapshot.vendorKey) {
      vendorByKey.set(snapshot.vendorKey, snapshot);
    }
  }

  if (vendorUserUpdates.length > 0) {
    await User.bulkWrite(vendorUserUpdates);
  }

  const assignedUsers = await User.find({
    role: { $nin: ["admin", "vendor"] },
    $or: [
      { vendorId: { $ne: null } },
      { vendorName: { $ne: null } },
      { vendorCode: { $ne: null } },
      { vendorKey: { $ne: null } },
    ],
  })
    .select("_id vendorId vendorName vendorCode vendorKey")
    .lean();

  const assignedUserUpdates = [];

  for (const user of assignedUsers) {
    const currentVendorId = String(user.vendorId || "").trim();
    const currentVendorCode = normalizeVendorCode(user.vendorCode || "");
    const currentVendorKey =
      String(user.vendorKey || "").trim().toLowerCase() ||
      buildVendorProfile({ vendorName: user.vendorName || "" }).vendorKey;

    const matchedVendor =
      vendorById.get(currentVendorId) ||
      vendorByCode.get(currentVendorCode) ||
      vendorByKey.get(currentVendorKey);

    if (!matchedVendor) {
      continue;
    }

    const needsUpdate =
      currentVendorId !== String(matchedVendor.vendorId) ||
      normalizeVendorName(user.vendorName || "") !== matchedVendor.vendorName ||
      currentVendorCode !== matchedVendor.vendorCode ||
      String(user.vendorKey || "").trim().toLowerCase() !== matchedVendor.vendorKey;

    if (!needsUpdate) {
      continue;
    }

    assignedUserUpdates.push({
      updateOne: {
        filter: { _id: user._id },
        update: {
          $set: {
            vendorId: matchedVendor.vendorId,
            vendorName: matchedVendor.vendorName,
            vendorCode: matchedVendor.vendorCode,
            vendorKey: matchedVendor.vendorKey,
          },
        },
      },
    });
  }

  if (assignedUserUpdates.length > 0) {
    await User.bulkWrite(assignedUserUpdates);
  }

  return {
    vendorUsersUpdated: vendorUserUpdates.length,
    assignedUsersUpdated: assignedUserUpdates.length,
  };
};
