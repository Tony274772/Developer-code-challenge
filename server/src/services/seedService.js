const User = require("../models/User");
const { recalculateRanks } = require("./rankService");

async function seedIfEmpty() {
  const count = await User.countDocuments();
  if (count > 0) return;

  await User.insertMany([
    {
      name: "Ada Lovelace",
      avatarColor: "#0f766e",
      platforms: [
        { platform: "leetcode", username: "leetcode" },
        { platform: "codeforces", username: "tourist" }
      ]
    },
    {
      name: "Grace Hopper",
      avatarColor: "#7c3aed",
      platforms: [
        { platform: "leetcode", username: "johnsmith" },
        { platform: "hackerrank", username: "gracehopper" }
      ]
    },
    {
      name: "Katherine Johnson",
      avatarColor: "#dc2626",
      platforms: [
        { platform: "codechef", username: "admin" },
        { platform: "codeforces", username: "Petr" }
      ]
    }
  ]);

  await recalculateRanks();
}

module.exports = { seedIfEmpty };
