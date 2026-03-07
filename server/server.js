import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./src/config/dbconfig.js";
import cors from "cors";
import messagerouter from "./src/routes/messageroutes.js";
import chatrouter from "./src/routes/chatroutes.js";
import notificationrouter from "./src/routes/notificationroutes.js";
import initiallizesocket from "./src/sockets/index.js";
import userrouter from "./src/routes/userroutes.js";
import authrouter from "./src/routes/authroutes.js";

const app = express();

app.use(cors({
  origin: [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:5174"],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
connectDB();

app.use("/api", authrouter);
app.use("/api", userrouter);
app.use("/api", messagerouter);
app.use("/api", chatrouter);
app.use("/api", notificationrouter);


const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true
  }
});

app.set("io", io);
initiallizesocket(io);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
