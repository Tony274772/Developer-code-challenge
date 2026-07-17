const User = require("../models/User");
const { SUPPORTED_PLATFORMS, fetchPlatformStats } = require("./platforms");
const { recalculateRanks } = require("./rankService");

async function syncUser(user) {
  let totalSolved = 0;

  user.platforms = user.platforms.filter((platform) => SUPPORTED_PLATFORMS.includes(platform.platform));

  user.platforms = await Promise.all(
    user.platforms.map(async (platform) => {
      const stats = await fetchPlatformStats(platform.platform, platform.username);
      totalSolved += stats.solved;
      return {
        ...platform.toObject(),
        solved: stats.solved,
        profileUrl: stats.profileUrl || platform.profileUrl,
        status: stats.status,
        lastSyncedAt: new Date()
      };
    })
  );

  user.totalSolved = totalSolved;
  await user.save();
  return user;
}

async function refreshUser(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  await syncUser(user);
  await recalculateRanks();
  return User.findById(userId);
}

async function refreshAllUsers(io) {
  const users = await User.find();
  for (const user of users) {
    await syncUser(user);
  }
  const ranked = await recalculateRanks();
  if (io) io.emit("leaderboard:update", ranked);
  return ranked;
}

module.exports = { refreshAllUsers, refreshUser };
