import jwt from "jsonwebtoken";
import usermodel from "../models/usermodel.js";
import chatmodel from "../models/chatmodel.js";
import messagemodel from "../models/messagemodel.js";

const onlineUsers = new Map(); // userId -> Set(socketIds)

const initiallizesocket = (io) => {

    //  Socket Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;

            if (!token) {
                return next(new Error("Authentication error"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await usermodel
                .findById(decoded.userId)
                .select("_id");

            if (!user) {
                return next(new Error("User not found"));
            }

            socket.userId = user._id.toString();
            next();

        } catch (err) {
            return next(new Error("Authentication error"));
        }
    });


    //  Socket Connection
    io.on("connection", async (socket) => {

        const userId = socket.userId;
        console.log("User connected:", userId);

        // private identity room for eery user which maps user to all of his/her sockets
        socket.join(userId);
        //Auto-join all chats (1-1 and group)
        const chats = await chatmodel.find({ participants: userId }).select("_id participants");
        for (let chat of chats) {
            socket.join(chat._id.toString());
        }
        // Multi-tab socket tracking
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);
        // If first active socket then mark  user as online 
        if (onlineUsers.get(userId).size === 1) {
            await usermodel.findByIdAndUpdate(userId, {
                isOnline: true
            });
            // Notification to relevant members abt user being online
            const relevantUserIds = new Set();
            for (let chat of chats) {
                chat.participants.forEach(id => {
                    const idStr = id.toString();
                    if (idStr !== userId) {
                        relevantUserIds.add(idStr);
                    }
                });
            }
            for (let otherUserId of relevantUserIds) {
                io.to(otherUserId).emit("user_online", { userId });
            }
        }
        // Typing event 
        socket.on("typing", (chatId) => {
            socket.to(chatId).emit("user_typing", {
                chatId,
                userId
            });
        });
        socket.on("stop_typing", (chatId) => {
            socket.to(chatId).emit("user_stop_typing", {
                chatId,
                userId
            });
        });

        // delivered to confirmation 
        socket.on("message_received", async (messageId) => {
            const message = await messagemodel
                .findById(messageId)
                .select("chat");
            if (!message) return;
            await messagemodel.findByIdAndUpdate(messageId, {
                status: "delivered",
                $addToSet: { deliveredTo: userId }
            });
            io.to(message.chat.toString()).emit("message_delivered", {
                messageId,
                userId
            });
        });

        // disconnect
        socket.on("disconnect", async () => {
            console.log("Socket disconnected:", socket.id);
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
            }
            //  If last socket disconnected then mark offline
            if (userSockets && userSockets.size === 0) {
                onlineUsers.delete(userId);
                await usermodel.findByIdAndUpdate(userId, {
                    isOnline: false,
                    lastSeen: new Date()
                });
                // emmitting notification abt user being offline to rel. members
                const relevantChats = await chatmodel.find({ participants: userId }).select("participants");
                const relevantUserIds = new Set();
                for (let chat of relevantChats) {
                    chat.participants.forEach(id => {
                        const idStr = id.toString();
                        if (idStr !== userId) {
                            relevantUserIds.add(idStr);
                        }
                    });
                }
                for (let otherUserId of relevantUserIds) {
                    io.to(otherUserId).emit("user_offline", { userId });
                }
            }
        });
    });
};

export default initiallizesocket;
