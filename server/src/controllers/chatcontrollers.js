import {
    creategroupchat,
    getmychats,
    getorcreateOnetoOneChat,
    getparticularchat,
    addMemberToGroup,
    removeMemberFromGroup,
    promoteToAdmin,
    demoteAdmin,
    archiveChat,
    unarchiveChat
} from "../services/chatservices.js";

import { createNotification } from "../services/notificationservices.js";


// create or get one to one chat
const createOnetoOneChatcontroller = async (req, res, next) => {
    try {
        const currentUserId = req.user.userId;
        const { userId } = req.body;

        const chat = await getorcreateOnetoOneChat(currentUserId, userId);

        const io = req.app.get("io");
        if (chat && chat.participants) {
            chat.participants.forEach(p => {
                const pId = p._id.toString();
                // Dynamically join the new room so immediate messages aren't lost
                io.in(pId).socketsJoin(chat._id.toString());
                if (pId !== currentUserId.toString()) {
                    io.to(pId).emit("new_chat", chat);
                }
            });
        }

        res.status(200).json({ success: true, data: chat });
    } catch (error) {
        next(error);
    }
};


// create group chat
const createGroupChatcontroller = async (req, res, next) => {
    try {
        const currentUserId = req.user.userId;
        const { participants, name } = req.body;

        const chat = await creategroupchat(currentUserId, participants, name);

        const io = req.app.get("io");
        if (chat && chat.participants) {
            chat.participants.forEach(p => {
                const pId = p._id.toString();
                io.in(pId).socketsJoin(chat._id.toString());
                if (pId !== currentUserId.toString()) {
                    io.to(pId).emit("new_chat", chat);
                }
            });
        }

        res.status(200).json({ success: true, data: chat });
    } catch (error) {
        next(error);
    }
};


// get all chats
const getchatscontroller = async (req, res, next) => {
    try {
        const currentUserId = req.user.userId;
        const isArchived = req.query.archived === 'true';

        const chats = await getmychats(currentUserId, isArchived);

        res.status(200).json({ success: true, data: chats });
    } catch (error) {
        next(error);
    }
};


// get single chat
const getparticularchatcontroller = async (req, res, next) => {
    try {
        const currentUserId = req.user.userId;
        const { chatId } = req.params;

        const chat = await getparticularchat(chatId, currentUserId);

        res.status(200).json({ success: true, data: chat });
    } catch (error) {
        next(error);
    }
};


// add member
const addMemberController = async (req, res, next) => {
    try {
        const adminId = req.user.userId;
        const { chatId, userId } = req.body;
        const io = req.app.get("io");

        const updatedChat = await addMemberToGroup(chatId, adminId, userId);

        const notification = await createNotification({
            userId,
            type: "added-to-group",
            senderId: adminId,
            chatId
        });

        // Add the newly added user to the socket room instantly
        io.in(userId).socketsJoin(chatId);

        io.to(chatId).emit("group_updated", updatedChat);
        io.to(userId).emit("new_notification", notification);
        // Also fire new_chat so the user adds it to their sidebar array immediately
        io.to(userId).emit("new_chat", updatedChat);

        res.status(200).json({ success: true, data: updatedChat });
    } catch (error) {
        next(error);
    }
};


// remove member
const removeMemberController = async (req, res, next) => {
    try {
        const adminId = req.user.userId;
        const { chatId, userId } = req.body;
        const io = req.app.get("io");

        const updatedChat = await removeMemberFromGroup(chatId, adminId, userId);

        const notification = await createNotification({
            userId,
            type: "removed-from-group",
            senderId: adminId,
            chatId
        });

        io.to(chatId).emit("group_updated", updatedChat);
        io.to(userId).emit("new_notification", notification);

        // Tell the user's client they've been removed to clear UI
        io.to(userId).emit("removed_from_group", { chatId });

        io.in(userId).socketsLeave(chatId);

        res.status(200).json({ success: true, data: updatedChat });
    } catch (error) {
        next(error);
    }
};


// promote admin
const promoteAdminController = async (req, res, next) => {
    try {
        const adminId = req.user.userId;
        const { chatId, userId } = req.body;
        const io = req.app.get("io");

        const updatedChat = await promoteToAdmin(chatId, adminId, userId);

        const notification = await createNotification({
            userId,
            type: "promoted-to-admin",
            senderId: adminId,
            chatId
        });

        io.to(chatId).emit("group_updated", updatedChat);
        io.to(userId).emit("new_notification", notification);

        res.status(200).json({ success: true, data: updatedChat });
    } catch (error) {
        next(error);
    }
};


// demote admin
const demoteAdminController = async (req, res, next) => {
    try {
        const adminId = req.user.userId;
        const { chatId, userId } = req.body;
        const io = req.app.get("io");

        const updatedChat = await demoteAdmin(chatId, adminId, userId);

        const notification = await createNotification({
            userId,
            type: "demoted-from-admin",
            senderId: adminId,
            chatId
        });

        io.to(chatId).emit("group_updated", updatedChat);
        io.to(userId).emit("new_notification", notification);

        res.status(200).json({ success: true, data: updatedChat });
    } catch (error) {
        next(error);
    }
};

// http request to rename group
// http request to rename group
const renameGroupController = async (req, res, next) => {
    try {
        const adminId = req.user.userId;
        const { chatId, name } = req.body;
        const io = req.app.get("io");

        const updatedChat = await renameGroup(chatId, adminId, name);

        // notify all participants except admin
        for (let participant of updatedChat.participants) {
            const participantId = participant._id.toString();
            if (participantId !== adminId) {
                const notification = await createNotification({
                    userId: participantId,
                    type: "group-renamed",
                    senderId: adminId,
                    chatId
                });
                io.to(participantId).emit("new_notification", notification);
            }
        }

        // emit updated chat to room
        io.to(chatId).emit("group_updated", updatedChat);

        res.status(200).json({ success: true, data: updatedChat });

    } catch (error) {
        next(error);
    }
};

// http request to leave group
const leaveGroupController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { chatId } = req.body;
        const io = req.app.get("io");

        const updatedChat = await leaveGroup(chatId, userId);

        if (updatedChat.deleted) {
            io.to(chatId).emit("group_deleted", { chatId });
            io.to(userId).emit("removed_from_group", { chatId });
            io.in(userId).socketsLeave(chatId);
            return res.status(200).json({ success: true, message: "group deleted", data: updatedChat });
        }

        // notify remaining participants
        for (let participant of updatedChat.participants) {

            const participantId = participant._id.toString();

            const notification = await createNotification({
                userId: participantId,
                type: "member-left",
                senderId: userId,
                chatId
            });

            io.to(participantId).emit("new_notification", notification);
        }

        io.to(chatId).emit("group_updated", updatedChat);

        // tell the leaving user to wipe the UI
        io.to(userId).emit("removed_from_group", { chatId });

        // remove all sockets of this user from room
        io.in(userId).socketsLeave(chatId);

        res.status(200).json({ success: true, data: updatedChat });

    } catch (error) {
        next(error);
    }
};


// http request to delete group
const deleteGroupController = async (req, res, next) => {
    try {
        const adminId = req.user.userId;
        const { chatId } = req.body;
        const io = req.app.get("io");

        const chat = await deleteGroup(chatId, adminId);

        for (let participant of chat.participants) {

            const participantId = participant.toString();

            const notification = await createNotification({
                userId: participantId,
                type: "group-deleted",
                senderId: adminId,
                chatId
            });

            io.to(participantId).emit("new_notification", notification);

            // tell all participants to clear UI
            io.to(participantId).emit("removed_from_group", { chatId });

            io.in(participantId).socketsLeave(chatId);
        }

        io.to(chatId).emit("group_deleted", { chatId });

        res.status(200).json({ success: true, message: "group deleted" });

    } catch (error) {
        next(error);
    }
};

// http request to change group avatar
const changeGroupAvatarController = async (req, res, next) => {
    try {
        const adminId = req.user.userId;
        const { chatId } = req.body;
        const file = req.file;
        const io = req.app.get("io");

        const updatedChat = await changeGroupAvatar(chatId, adminId, file);

        for (let participant of updatedChat.participants) {

            const participantId = participant._id.toString();

            if (participantId !== adminId) {

                const notification = await createNotification({
                    userId: participantId,
                    type: "group-avatar-changed",
                    senderId: adminId,
                    chatId
                });

                io.to(participantId).emit("new_notification", notification);
            }
        }

        io.to(chatId).emit("group_updated", updatedChat);

        res.status(200).json({ success: true, data: updatedChat });

    } catch (error) {
        next(error);
    }
};


// http request to archive chat
const archiveChatController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { chatId } = req.body;
        const chat = await archiveChat(chatId, userId);
        res.status(200).json({ success: true, data: chat });
    } catch (error) {
        next(error);
    }
};

// http request to unarchive chat
const unarchiveChatController = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { chatId } = req.body;
        const chat = await unarchiveChat(chatId, userId);
        res.status(200).json({ success: true, data: chat });
    } catch (error) {
        next(error);
    }
};

export {
    createOnetoOneChatcontroller,
    createGroupChatcontroller,
    getchatscontroller,
    getparticularchatcontroller,
    addMemberController,
    removeMemberController,
    promoteAdminController,
    demoteAdminController,
    renameGroupController,
    leaveGroupController,
    deleteGroupController,
    changeGroupAvatarController,
    archiveChatController,
    unarchiveChatController
};