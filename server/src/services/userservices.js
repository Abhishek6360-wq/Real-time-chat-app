import mongoose from "mongoose";
import usermodel from "../models/usermodel.js";
import { uploadToCloudinary } from "./mediaservices.js";


// api to get my profile
const getMyProfile = async (userId) => {

    const user = await usermodel
        .findById(userId)
        .select("-password");

    if (!user) {
        throw new Error("user not found");
    }

    return user;
};


// api to get user by id
const getUserById = async (targetUserId) => {

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        throw new Error("invalid user id");
    }

    const user = await usermodel
        .findById(targetUserId)
        .select("username avatar isOnline lastSeen");

    if (!user) {
        throw new Error("user not found");
    }

    return user;
};


// api to search users
const searchUsers = async (query, currentUserId) => {

    if (!query || !query.trim()) {
        throw new Error("search query required");
    }

    const searchRegex = new RegExp(query.trim(), "i");

    const users = await usermodel.find({
        _id: { $ne: currentUserId },
        $or: [
            { username: searchRegex },
            { email: searchRegex }
        ]
    })
        .select("username avatar isOnline lastSeen email")
        .limit(20);

    return users;
};


// api to update profile
const updateProfile = async (userId, username, file) => {

    const user = await usermodel.findById(userId);

    if (!user) {
        throw new Error("user not found");
    }

    if (username && username.trim()) {
        user.username = username.trim();
    }

    if (file) {

        const uploaded = await uploadToCloudinary(
            file.path,
            "users/avatars"
        );

        user.avatar = uploaded;
    }

    await user.save();

    return user;
};


// api to block user
const blockUser = async (currentUserId, targetUserId) => {

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        throw new Error("invalid user id");
    }

    if (currentUserId === targetUserId) {
        throw new Error("cannot block yourself");
    }

    const user = await usermodel.findById(currentUserId);

    if (!user) {
        throw new Error("user not found");
    }

    if (user.blockedUsers.includes(targetUserId)) {
        throw new Error("user already blocked");
    }

    user.blockedUsers.push(targetUserId);
    await user.save();

    return user.blockedUsers;
};


// api to unblock user
const unblockUser = async (currentUserId, targetUserId) => {

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        throw new Error("invalid user id");
    }

    const user = await usermodel.findById(currentUserId);

    if (!user) {
        throw new Error("user not found");
    }

    user.blockedUsers.pull(targetUserId);
    await user.save();

    return user.blockedUsers;
};


// api to get blocked users list
const getBlockedUsers = async (userId) => {

    const user = await usermodel
        .findById(userId)
        .populate("blockedUsers", "username avatar");

    if (!user) {
        throw new Error("user not found");
    }

    return user.blockedUsers;
};


export {
    getMyProfile,
    getUserById,
    searchUsers,
    updateProfile,
    blockUser,
    unblockUser,
    getBlockedUsers
};