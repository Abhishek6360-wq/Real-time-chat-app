import express from 'express'
import authuser from '../middlewares/authmiddleware.js';
import {
    createGroupChatcontroller,
    createOnetoOneChatcontroller,
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
} from '../controllers/chatcontrollers.js';
import upload from '../middlewares/uploadmiddleware.js';

const chatrouter = express.Router();

chatrouter.post('/chats/one-to-one', authuser, createOnetoOneChatcontroller);
chatrouter.post('/chats/group', authuser, createGroupChatcontroller);
chatrouter.get('/chats', authuser, getchatscontroller);
chatrouter.get('/chats/:chatId', authuser, getparticularchatcontroller);
chatrouter.post('/group/:chatId/add-member', authuser, addMemberController);
chatrouter.post('/group/:chatId/remove-member', authuser, removeMemberController);
chatrouter.post('/group/:chatId/promote', authuser, promoteAdminController);
chatrouter.post('/group/:chatId/demote', authuser, demoteAdminController);
chatrouter.post("/group/rename", authuser, renameGroupController);
chatrouter.post("/group/leave", authuser, leaveGroupController);
chatrouter.delete("/group/delete", authuser, deleteGroupController);
chatrouter.patch("/group/avatar", authuser, upload.single("file"), changeGroupAvatarController);
chatrouter.post('/chats/archive', authuser, archiveChatController);
chatrouter.post('/chats/unarchive', authuser, unarchiveChatController);

export default chatrouter;