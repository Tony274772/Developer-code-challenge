require("dotenv").config();

const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const { seedIfEmpty } = require("./services/seedService");
const { refreshAllUsers } = require("./services/refreshService");

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const REFRESH_INTERVAL_MS = Number(process.env.REFRESH_INTERVAL_MS || 180000);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE"]
  }
});

app.set("io", io);
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.use("/api", leaderboardRoutes);

if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../../dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

io.on("connection", (socket) => {
  socket.emit("connected", { message: "Live leaderboard connected" });
});

async function start() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required. Copy .env.example to .env and configure MongoDB.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  if (process.env.SEED_DEMO_DATA === "true") {
    await seedIfEmpty();
  }
  server.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });

  await refreshAllUsers(io);
  setInterval(() => refreshAllUsers(io), REFRESH_INTERVAL_MS);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
