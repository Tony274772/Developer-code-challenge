const User = require("../models/User");

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function platformKey(platform) {
  return `${platform.platform}:${platform.username}`.toLowerCase();
}

async function mergeDuplicateUsers() {
  const users = await User.find().sort({ createdAt: 1, name: 1 });
  const groupedUsers = new Map();

  for (const user of users) {
    const key = normalizeName(user.name);
    if (!groupedUsers.has(key)) groupedUsers.set(key, []);
    groupedUsers.get(key).push(user);
  }

  for (const duplicateGroup of groupedUsers.values()) {
    if (duplicateGroup.length < 2) continue;

    const primaryUser = duplicateGroup[0];
    const platformsByKey = new Map();

    for (const user of duplicateGroup) {
      for (const platform of user.platforms) {
        const key = platformKey(platform);
        const existingPlatform = platformsByKey.get(key);

        if (!existingPlatform || platform.solved > existingPlatform.solved) {
          platformsByKey.set(key, platform.toObject ? platform.toObject() : platform);
        }
      }
    }

    primaryUser.platforms = Array.from(platformsByKey.values());
    primaryUser.totalSolved = primaryUser.platforms.reduce(
      (sum, platform) => sum + (platform.solved || 0),
      0
    );
    await primaryUser.save();

    const duplicateIds = duplicateGroup.slice(1).map((user) => user._id);
    await User.deleteMany({ _id: { $in: duplicateIds } });
  }
}

async function recalculateRanks() {
  await mergeDuplicateUsers();
  const users = await User.find().sort({ totalSolved: -1, name: 1 });

  for (let index = 0; index < users.length; index += 1) {
    users[index].rank = index + 1;
    await users[index].save();
  }

  return users;
}

module.exports = { mergeDuplicateUsers, normalizeName, platformKey, recalculateRanks };
