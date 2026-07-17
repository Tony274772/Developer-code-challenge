const express = require("express");
const User = require("../models/User");
const { normalizeName, platformKey, recalculateRanks } = require("../services/rankService");
const { refreshUser } = require("../services/refreshService");
const { SUPPORTED_PLATFORMS } = require("../services/platforms");

const router = express.Router();

function requireAdminAccess(req, res, next) {
  const adminCode = process.env.ADMIN_ACCESS_CODE;
  if (!adminCode) {
    return res.status(500).json({ message: "ADMIN_ACCESS_CODE is not configured" });
  }

  const providedCode = req.header("x-admin-access-code");
  if (!providedCode || providedCode !== adminCode) {
    return res.status(403).json({ message: "Admin access code is required" });
  }

  return next();
}

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "coding-leaderboard" });
});

router.get("/leaderboard", async (_req, res, next) => {
  try {
    await recalculateRanks();
    const users = await User.find().sort({ rank: 1, totalSolved: -1, name: 1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.post("/users", async (req, res, next) => {
  try {
    const requestedName = req.body.name?.trim();
    const requestedPlatforms = (req.body.platforms || []).filter((platform) => SUPPORTED_PLATFORMS.includes(platform.platform));
    if (!requestedName) return res.status(400).json({ message: "Name is required" });

    const users = await User.find();
    let user = users.find((item) => normalizeName(item.name) === normalizeName(requestedName));

    if (user) {
      const existingPlatformKeys = new Set(user.platforms.map((platform) => platformKey(platform)));

      for (const platform of requestedPlatforms) {
        const key = platformKey(platform);
        if (existingPlatformKeys.has(key)) continue;

        user.platforms.push(platform);
        existingPlatformKeys.add(key);
      }

      await user.save();
    } else {
      user = await User.create(req.body);
    }

    const rankedUsers = await recalculateRanks();
    user = (await User.find()).find((item) => normalizeName(item.name) === normalizeName(requestedName));
    const io = req.app.get("io");
    io.emit("leaderboard:update", rankedUsers);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id", requireAdminAccess, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    await recalculateRanks();
    const io = req.app.get("io");
    io.emit("leaderboard:update", await User.find().sort({ rank: 1 }));
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.delete("/users/:id", requireAdminAccess, async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const rankedUsers = await recalculateRanks();
    const io = req.app.get("io");
    io.emit("leaderboard:update", rankedUsers);
    res.json({ message: "User deleted" });
  } catch (error) {
    next(error);
  }
});

router.post("/users/:id/refresh", async (req, res, next) => {
  try {
    const user = await refreshUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const io = req.app.get("io");
    io.emit("leaderboard:update", await User.find().sort({ rank: 1 }));
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Server error" });
});

module.exports = router;
