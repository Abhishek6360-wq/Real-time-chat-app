import { sendmessage, markmessageread, getchatmessages } from '../services/messageservices.js'
import chatmodel from '../models/chatmodel.js'
import messagemodel from '../models/messagemodel.js'
import usermodel from '../models/usermodel.js'
import notificationmodel from '../models/notificatonmodel.js'
import { createNotification } from '../services/notificationservices.js'

// controller to send messages
export const sendMessageController = async (req, res, next) => {
    try {
        const senderId = req.user.userId;
        const { chatId, content, type } = req.body;
        const file = req.file;
        const io = req.app.get("io");

        const message = await sendmessage(chatId, senderId, content, file, type)
        // emit message to chat room
        io.to(chatId).emit("new_message", message);
        const chat = await chatmodel
            .findById(chatId)
            .select("participants");
        const receiverIds = chat.participants
            .map(id => id.toString())
            .filter(id => id !== senderId);
        for (let rec of receiverIds) {
            // persist notification
            await createNotification({
                userId: rec,
                type: "new message",
                senderId,
                chatId: chatId,
                messageId: message._id
            });
            io.to(rec).emit("new_notification", {
                chatId: chatId,
                messageId: message._id,
                senderId
            });
            const unreadCount = await messagemodel.countDocuments({
                chat: chatId,
                sender: { $ne: rec },
                readBy: { $ne: rec }
            });
            io.to(rec).emit("chat_unread_update", {
                chatId: chatId,
                unreadCount
            });
        }
        res.status(200).json({ success: true, data: message });
    } catch (error) {
        next(error);
    }
};


// controller to get chat messages
export const getChatMessagesController = async (req, res, next) => {
    try {
        const UserId = req.user.userId
        const { chatId } = req.params;
        const { page, limit } = req.query;
        const messages = await getchatmessages(chatId, UserId, page, limit);
        res.status(200).json({ success: true, data: messages });
    } catch (error) {
        next(error);
    }
}

// controller to read messages
export const markMessagesReadController = async (req, res, next) => {
    try {
        const UserId = req.user.userId;
        const { chatId } = req.params;
        const io = req.app.get("io");

        await markmessageread(chatId, UserId);
        const unreadCount = await messagemodel.countDocuments({
            chat: chatId,
            sender: { $ne: UserId },
            readBy: { $ne: UserId }
        });
        io.to(UserId).emit("chat_unread_update", {
            chatId: chatId,
            unreadCount
        });
        io.to(chatId).emit("message_read", {
            chatId: chatId,
            userId: UserId
        });
        res.status(200).json({ success: true, message: "message is marked as read" });
    } catch (error) {
        next(error);
    }
};
