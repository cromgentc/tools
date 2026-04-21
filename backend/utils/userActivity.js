import User from "../models/User.js";

export const PRESENCE_WINDOW_MS = 5 * 60 * 1000;
const HEARTBEAT_CAP_SECONDS = 2 * 60;

export const getPresenceStatus = (user) => {
  const accountStatus = user?.accountStatus || "active";

  if (accountStatus === "suspended") {
    return "suspended";
  }

  if (accountStatus === "inactive") {
    return "inactive";
  }

  if (!user?.lastActiveAt) {
    return "inactive";
  }

  const lastActiveTime = new Date(user.lastActiveAt).getTime();

  if (Number.isNaN(lastActiveTime)) {
    return "inactive";
  }

  return Date.now() - lastActiveTime <= PRESENCE_WINDOW_MS ? "active" : "inactive";
};

export const touchUserActivity = async (userId) => {
  if (!userId) return null;

  const user = await User.findById(userId);

  if (!user) {
    return null;
  }

  const now = new Date();
  let incrementSeconds = 0;

  if (user.lastActiveAt) {
    const diffSeconds = Math.floor(
      (now.getTime() - new Date(user.lastActiveAt).getTime()) / 1000
    );

    if (diffSeconds > 0 && diffSeconds <= HEARTBEAT_CAP_SECONDS) {
      incrementSeconds = diffSeconds;
    }
  }

  user.lastActiveAt = now;
  user.totalActiveSeconds = Math.max(0, (user.totalActiveSeconds || 0) + incrementSeconds);

  await user.save();
  return user;
};

export const serializeUserActivity = (user) => ({
  accountStatus: user?.accountStatus || "active",
  presenceStatus: getPresenceStatus(user),
  lastActiveAt: user?.lastActiveAt || null,
  totalActiveSeconds: user?.totalActiveSeconds || 0,
});
