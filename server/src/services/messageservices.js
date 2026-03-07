import mongoose from "mongoose";
import chatmodel from '../models/chatmodel.js'
import usermodel from "../models/usermodel.js";
import messagemodel from '../models/messagemodel.js'
import { uploadToCloudinary } from './mediaservices.js'

// API to send  messages (text+media)
const sendmessage = async (ChatId, senderId, content, file, type) => {

    if (!mongoose.Types.ObjectId.isValid(ChatId)) {
        throw new Error("invalid chat id");
    }

    if (!content && !file) {
        throw new Error("message cannot be empty");
    }

    const chat = await chatmodel.findOne({
        _id: ChatId,
        participants: senderId
    });

    if (!chat) {
        throw new Error("chat not found");
    }

    // If a chat was archived, receiving or sending a new message automatically unarchives it.
    if (chat.isArchieved) {
        chat.isArchieved = false;
        // Don't save here, it will be saved downstream along with the lastMessage update.
    }

    const sender = await usermodel.findById(senderId).select("blockedUsers");

    if (chat.participants.length === 2) {
        for (let participant of chat.participants) {
            const participantId = participant.toString();

            if (participantId !== senderId) {
                const otherUser = await usermodel.findById(participantId).select("blockedUsers");

                if (sender.blockedUsers.includes(participantId)) {
                    throw new Error("You cannot send messages to a blocked contact");
                }

                if (otherUser.blockedUsers.includes(senderId)) {
                    throw new Error("You have been blocked by this user");
                }
            }
        }
    }

    const messagedata = {
        chat: ChatId,
        sender: senderId,
        readBy: []
    };

    if (content && content.trim()) {
        messagedata.type = "text";
        messagedata.content = content.trim();
    }

    if (file) {

        if (!["image", "file"].includes(type)) {
            throw new Error("media type not supported");
        }

        const folder = type === "image"
            ? "chat/media/images"
            : "chat/media/files";

        const uploaded = await uploadToCloudinary(file.path, folder);

        messagedata.type = type;
        messagedata.media = uploaded;

        if (content && content.trim()) {
            messagedata.content = content.trim();
        }
    }

    const message = await messagemodel.create(messagedata);

    chat.lastMessage = {
        sender: senderId,
        messageType: messagedata.type,
        content: messagedata.content || messagedata.type,
        createdAt: message.createdAt
    };

    await chat.save();

    // Populate sender before returning so sockets get the full object for notifications
    const populatedMessage = await messagemodel.findById(message._id).populate("sender", "username avatar");

    return populatedMessage;
};


// api to get messages
const getchatmessages = async (ChatId, UserId, page = 1, limit = 20) => {

    if (!mongoose.Types.ObjectId.isValid(ChatId)) {
        throw new Error("invalid chat id");
    }

    page = Math.max(1, parseInt(page));
    limit = Math.min(100, Math.max(1, parseInt(limit)));

    const chat = await chatmodel.findOne({
        _id: ChatId,
        participants: UserId
    });

    if (!chat) {
        throw new Error("access denied");
    }

    const messages = await messagemodel.find({ chat: ChatId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("sender", "avatar");

    return messages;
};

// api to mark messages as read
const markmessageread = async (ChatId, UserId) => {

    if (!mongoose.Types.ObjectId.isValid(ChatId)) {
        throw new Error("invalid chat id");
    }
    const result = await messagemodel.updateMany({
        chat: ChatId,
        sender: { $ne: UserId },
        readBy: { $ne: UserId },
    },
        {
            $push: { readBy: UserId },
            status: "read"
        });

}

export { sendmessage, markmessageread, getchatmessages };
