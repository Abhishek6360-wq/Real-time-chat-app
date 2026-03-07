import notificationmodel from "../models/notificatonmodel.js";

const createNotification = async ({
    userId,
    type,
    senderId,
    chatId,
    messageId = null
}) => {

    const notification = await notificationmodel.create({
        user: userId,
        type,
        sender: senderId,
        chat: chatId,
        message: messageId
    });
    return notification;
};


const getUserNotifications = async (userId) => {

    const notifications = await notificationmodel
        .find({ user: userId })
        .sort({ createdAt: -1 })
        .populate("sender", "username avatar")
        .populate("chat", "name");

    return notifications;
};


const markNotificationRead = async (notificationId, userId) => {

    const notification = await notificationmodel.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { isRead: true },
        { new: true }
    );

    return notification;
};


export {
    createNotification,
    getUserNotifications,
    markNotificationRead
};
