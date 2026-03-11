import chatmodel from "../models/chatmodel.js";
import mongoose from "mongoose";
import messagemodel from "../models/messagemodel.js";
import usermodel from "../models/usermodel.js";
import { uploadToCloudinary } from "./mediaservices.js";


// api to create or get one to one chat
const getorcreateOnetoOneChat = async (currentUserId, otherUserId) => {

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
        throw new Error("invalid user id");
    }

    if (currentUserId === otherUserId) {
        throw new Error("cannot create chat with yourself");
    }

    const currentuser = await usermodel.findById(currentUserId).select("blockedUsers");
    const otheruser = await usermodel.findById(otherUserId).select("blockedUsers");

    if (
        currentuser.blockedUsers.includes(otherUserId) ||
        otheruser.blockedUsers.includes(currentUserId)
    ) {
        throw new Error("cannot create chat with blocked user");
    }

    // checking if chat already exists
    const existingChat = await chatmodel.findOne({
        type: "one to one",
        participants: { $all: [currentUserId, otherUserId] }
    }).populate("participants", "username avatar isOnline lastSeen");

    if (existingChat) {
        return existingChat;
    }

    // create new chat
    const newChat = await chatmodel.create({
        type: "one to one",
        participants: [currentUserId, otherUserId],
        createdBy: currentUserId
    });

    await newChat.populate("participants", "username avatar isOnline lastSeen");

    return newChat;
};


// api to create group chat
const creategroupchat = async (currentUserId, participants, name) => {

    if (!participants || participants.length < 2) {
        throw new Error("not enough members to form group");
    }

    if (!name || !name.trim()) {
        throw new Error("group name is required");
    }

    // make sure creator is included
    if (!participants.includes(currentUserId)) {
        participants.push(currentUserId);
    }

    // remove duplicates
    const uniquemembers = [...new Set(participants.map(id => id.toString()))];

    if (uniquemembers.length < 3) {
        throw new Error("group must have atleast 3 members");
    }

    const groupchat = await chatmodel.create({
        type: "group",
        isGroup: true,
        participants: uniquemembers,
        admins: [currentUserId],
        name: name.trim(),
        createdBy: currentUserId
    });

    await groupchat.populate("participants", "username avatar isOnline lastSeen");
    await groupchat.populate("admins", "username avatar");

    return groupchat;
};


// api to get my chats
const getmychats = async (currentUserId, archived = false) => {

    const chats = await chatmodel.find({
        participants: currentUserId,
        isArchieved: archived
    })
        .populate("participants", "username avatar isOnline lastSeen")
        .populate("admins", "username avatar")
        .sort({ "lastMessage.createdAt": -1, updatedAt: -1 });

    return chats;
};


// api to get single chat
const getparticularchat = async (chatId, currentUserId) => {

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        throw new Error("invalid chat id");
    }

    const chat = await chatmodel.findOne({
        _id: chatId,
        participants: currentUserId
    })
        .populate("participants", "username avatar isOnline lastSeen")
        .populate("admins", "username avatar");

    if (!chat) {
        throw new Error("chat not found");
    }

    return chat;
};


// api to add member to group
const addMemberToGroup = async (chatId, adminId, userIdToAdd) => {

    if (
        !mongoose.Types.ObjectId.isValid(chatId) ||
        !mongoose.Types.ObjectId.isValid(userIdToAdd)
    ) {
        throw new Error("invalid ids");
    }

    if (adminId.toString() === userIdToAdd.toString()) {
        throw new Error("cannot add yourself again");
    }

    const chat = await chatmodel.findById(chatId);

    if (!chat || !chat.isGroup) {
        throw new Error("group not found");
    }

    const isAdmin = chat.admins.some(id => id.toString() === adminId.toString());
    if (!isAdmin) {
        throw new Error("only admin can add members");
    }

    const alreadyMember = chat.participants.some(
        id => id.toString() === userIdToAdd.toString()
    );

    if (alreadyMember) {
        throw new Error("user already in group");
    }

    const userToAdd = await usermodel.findById(userIdToAdd).select("blockedUsers");

    // check block relation with all participants
    for (let participant of chat.participants) {

        const participantId = participant.toString();
        const existingUser = await usermodel.findById(participantId).select("blockedUsers");

        if (
            existingUser.blockedUsers.includes(userIdToAdd) ||
            userToAdd.blockedUsers.includes(participantId)
        ) {
            throw new Error("cannot add blocked user to group");
        }
    }

    chat.participants.push(userIdToAdd);
    await chat.save();

    await chat.populate("participants", "username avatar isOnline lastSeen");
    await chat.populate("admins", "username avatar");

    return chat;
};


// api to remove member from group
const removeMemberFromGroup = async (chatId, adminId, userIdToRemove) => {

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        throw new Error("invalid chat id");
    }

    const chat = await chatmodel.findById(chatId);

    if (!chat || !chat.isGroup) {
        throw new Error("group not found");
    }

    const isAdmin = chat.admins.some(id => id.toString() === adminId.toString());
    if (!isAdmin) {
        throw new Error("only admin can remove members");
    }

    const isParticipant = chat.participants.some(
        id => id.toString() === userIdToRemove.toString()
    );

    if (!isParticipant) {
        throw new Error("user not in group");
    }

    const isRemovingAdmin = chat.admins.some(
        id => id.toString() === userIdToRemove.toString()
    );

    if (isRemovingAdmin && chat.admins.length === 1) {
        throw new Error("cannot remove last admin");
    }

    chat.participants.pull(userIdToRemove);
    chat.admins.pull(userIdToRemove);

    await chat.save();

    await chat.populate("participants", "username avatar isOnline lastSeen");
    await chat.populate("admins", "username avatar");

    return chat;
};


// api to promote to admin
const promoteToAdmin = async (chatId, adminId, userIdToPromote) => {

    if (
        !mongoose.Types.ObjectId.isValid(chatId) ||
        !mongoose.Types.ObjectId.isValid(userIdToPromote)
    ) {
        throw new Error("invalid ids");
    }

    const chat = await chatmodel.findById(chatId);

    if (!chat || !chat.isGroup) {
        throw new Error("group not found");
    }

    const isAdmin = chat.admins.some(id => id.toString() === adminId.toString());
    if (!isAdmin) {
        throw new Error("only admin can promote");
    }

    const isParticipant = chat.participants.some(
        id => id.toString() === userIdToPromote.toString()
    );

    if (!isParticipant) {
        throw new Error("user not in group");
    }

    const alreadyAdmin = chat.admins.some(
        id => id.toString() === userIdToPromote.toString()
    );

    if (alreadyAdmin) {
        throw new Error("user already admin");
    }

    chat.admins.push(userIdToPromote);
    await chat.save();

    await chat.populate("participants", "username avatar isOnline lastSeen");
    await chat.populate("admins", "username avatar");

    return chat;
};


// api to demote admin
const demoteAdmin = async (chatId, adminId, userIdToDemote) => {

    if (
        !mongoose.Types.ObjectId.isValid(chatId) ||
        !mongoose.Types.ObjectId.isValid(userIdToDemote)
    ) {
        throw new Error("invalid ids");
    }

    const chat = await chatmodel.findById(chatId);

    if (!chat || !chat.isGroup) {
        throw new Error("group not found");
    }

    const isAdmin = chat.admins.some(id => id.toString() === adminId.toString());
    if (!isAdmin) {
        throw new Error("only admin can demote");
    }

    const isTargetAdmin = chat.admins.some(
        id => id.toString() === userIdToDemote.toString()
    );

    if (!isTargetAdmin) {
        throw new Error("user is not admin");
    }

    if (chat.admins.length === 1) {
        throw new Error("cannot demote last admin");
    }

    chat.admins.pull(userIdToDemote);

    await chat.save();

    await chat.populate("participants", "username avatar isOnline lastSeen");
    await chat.populate("admins", "username avatar");

    return chat;
};


// api to rename group
const renameGroup = async (chatId, adminId, newName) => {

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        throw new Error("invalid chat id");
    }

    if (!newName || !newName.trim()) {
        throw new Error("group name is required");
    }

    const chat = await chatmodel.findById(chatId);

    if (!chat || !chat.isGroup) {
        throw new Error("group not found");
    }

    const isAdmin = chat.admins.some(id => id.toString() === adminId.toString());
    if (!isAdmin) {
        throw new Error("only admin can rename group");
    }

    if (chat.name === newName.trim()) {
        throw new Error("group name already same");
    }

    chat.name = newName.trim();
    await chat.save();

    await chat.populate("participants", "username avatar isOnline lastSeen");
    await chat.populate("admins", "username avatar");

    return chat;
};


// api to leave group
const leaveGroup = async (chatId, userId) => {

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        throw new Error("invalid chat id");
    }

    const chat = await chatmodel.findById(chatId);

    if (!chat || !chat.isGroup) {
        throw new Error("group not found");
    }

    const isParticipant = chat.participants.some(
        id => id.toString() === userId.toString()
    );

    if (!isParticipant) {
        throw new Error("user not in group");
    }

    const isAdmin = chat.admins.some(
        id => id.toString() === userId.toString()
    );

    if (isAdmin && chat.admins.length === 1) {
        if (chat.participants.length > 1) {
            // Find another participant to make admin
            const newAdminId = chat.participants.find(id => id.toString() !== userId.toString());
            if (newAdminId) {
                chat.admins.push(newAdminId);
            }
        } else {
            // Last member leaving, delete the group and messages
            await messagemodel.deleteMany({ chat: chatId });
            await chatmodel.findByIdAndDelete(chatId);
            return { deleted: true, _id: chatId, participants: [] };
        }
    }

    chat.participants.pull(userId);
    chat.admins.pull(userId);

    await chat.save();

    await chat.populate("participants", "username avatar isOnline lastSeen");
    await chat.populate("admins", "username avatar");

    return chat;
};


// api to delete group
const deleteGroup = async (chatId, adminId) => {

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        throw new Error("invalid chat id");
    }

    const chat = await chatmodel.findById(chatId);

    if (!chat || !chat.isGroup) {
        throw new Error("group not found");
    }

    const isAdmin = chat.admins.some(
        id => id.toString() === adminId.toString()
    );

    if (!isAdmin) {
        throw new Error("only admin can delete group");
    }

    await messagemodel.deleteMany({ chat: chatId });
    await chatmodel.findByIdAndDelete(chatId);

    return chat;
};


// api to change group avatar
const changeGroupAvatar = async (chatId, adminId, file) => {

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        throw new Error("invalid chat id");
    }

    if (!file) {
        throw new Error("avatar file required");
    }

    const chat = await chatmodel.findById(chatId);

    if (!chat || !chat.isGroup) {
        throw new Error("group not found");
    }

    const isAdmin = chat.admins.some(
        id => id.toString() === adminId.toString()
    );

    if (!isAdmin) {
        throw new Error("only admin can change avatar");
    }

    const uploaded = await uploadToCloudinary(
        file.path,
        "chat/group-avatars"
    );

    chat.groupAvatar = uploaded;

    await chat.save();

    await chat.populate("participants", "username avatar isOnline lastSeen");
    await chat.populate("admins", "username avatar");

    return chat;
};


// api to archive chat
const archiveChat = async (chatId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(chatId)) throw new Error("invalid chat id");
    const chat = await chatmodel.findOneAndUpdate(
        { _id: chatId, participants: userId },
        { isArchieved: true },
        { new: true }
    );
    if (!chat) throw new Error("chat not found");
    return chat;
};

// api to unarchive chat
const unarchiveChat = async (chatId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(chatId)) throw new Error("invalid chat id");
    const chat = await chatmodel.findOneAndUpdate(
        { _id: chatId, participants: userId },
        { isArchieved: false },
        { new: true }
    );
    if (!chat) throw new Error("chat not found");
    return chat;
};

export {
    getorcreateOnetoOneChat,
    creategroupchat,
    getmychats,
    getparticularchat,
    addMemberToGroup,
    removeMemberFromGroup,
    promoteToAdmin,
    demoteAdmin,
    renameGroup,
    leaveGroup,
    deleteGroup,
    changeGroupAvatar,
    archiveChat,
    unarchiveChat
};