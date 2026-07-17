const mongoose = require("mongoose");

const platformSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["leetcode", "codechef", "codeforces"],
      required: true
    },
    username: { type: String, required: true },
    solved: { type: Number, default: 0 },
    profileUrl: { type: String, default: "" },
    status: { type: String, default: "pending" },
    lastSyncedAt: { type: Date }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    avatarColor: { type: String, default: "#2563eb" },
    platforms: [platformSchema],
    totalSolved: { type: Number, default: 0 },
    rank: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
