import {
    getUserNotifications,
    markNotificationRead
} from "../services/notificationservices.js";


const getNotificationsController = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const notifications = await getUserNotifications(userId);

        res.status(200).json({
            success: true,
            data: notifications
        });

    } catch (error) {
        next(error);
    }
};


const markNotificationReadController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { notificationId } = req.params;

        const updatedNotification = await markNotificationRead(
            notificationId,
            userId
        );

        res.status(200).json({
            success: true,
            data: updatedNotification
        });

    } catch (error) {
        next(error);
    }
};


export {
    getNotificationsController,
    markNotificationReadController
};
