import {
    getMyProfile,
    getUserById,
    searchUsers,
    updateProfile,
    blockUser,
    unblockUser,
    getBlockedUsers
} from "../services/userservices.js";
import chatmodel from "../models/chatmodel.js";


// get my profile
const getMyProfileController = async (req, res, next) => {
    try {
        const user = await getMyProfile(req.user.userId);

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        next(error);
    }
};


// get user by id
const getUserByIdController = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const user = await getUserById(userId);

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        next(error);
    }
};


// search users
const searchUsersController = async (req, res, next) => {
    try {
        const { query } = req.body;

        const users = await searchUsers(query, req.user.userId);

        res.status(200).json({
            success: true,
            data: users
        });

    } catch (error) {
        next(error);
    }
};


// update profile
const updateProfileController = async (req, res, next) => {
    try {
        const { username } = req.body;
        const file = req.file;

        const user = await updateProfile(
            req.user.userId,
            username,
            file
        );

        // Broadcast profile update to all relevant users in real-time
        const io = req.app.get("io");
        if (io) {
            const chats = await chatmodel.find({ participants: req.user.userId }).select("participants");
            const relevantUserIds = new Set();
            for (let chat of chats) {
                chat.participants.forEach(id => {
                    const idStr = id.toString();
                    if (idStr !== req.user.userId) {
                        relevantUserIds.add(idStr);
                    }
                });
            }

            const eventPayload = {
                userId: user._id,
                username: user.username,
                avatar: user.avatar
            };

            for (let otherUserId of relevantUserIds) {
                io.to(otherUserId).emit("profile_updated", eventPayload);
            }
            // Also emit to the user's other active sessions (tabs)
            io.to(req.user.userId).emit("profile_updated", eventPayload);
        }

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        next(error);
    }
};


// block user
const blockUserController = async (req, res, next) => {
    try {
        const { userId } = req.body;

        const blockedUsers = await blockUser(
            req.user.userId,
            userId
        );

        res.status(200).json({
            success: true,
            data: blockedUsers
        });

    } catch (error) {
        next(error);
    }
};


// unblock user
const unblockUserController = async (req, res, next) => {
    try {
        const { userId } = req.body;

        const blockedUsers = await unblockUser(
            req.user.userId,
            userId
        );

        res.status(200).json({
            success: true,
            data: blockedUsers
        });

    } catch (error) {
        next(error);
    }
};


// get blocked users
const getBlockedUsersController = async (req, res, next) => {
    try {
        const blockedUsers = await getBlockedUsers(req.user.userId);

        res.status(200).json({
            success: true,
            data: blockedUsers
        });

    } catch (error) {
        next(error);
    }
};


export {
    getMyProfileController,
    getUserByIdController,
    searchUsersController,
    updateProfileController,
    blockUserController,
    unblockUserController,
    getBlockedUsersController
};