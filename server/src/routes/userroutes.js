import express from "express";
import authuser from "../middlewares/authmiddleware.js";
import upload from "../middlewares/uploadmiddleware.js";

import {
    getMyProfileController,
    getUserByIdController,
    searchUsersController,
    updateProfileController,
    blockUserController,
    unblockUserController,
    getBlockedUsersController
} from "../controllers/usercontrollers.js";

const userrouter = express.Router();

// get my profile
userrouter.get("/users/me", authuser, getMyProfileController);

// search users
userrouter.post("/users/search", authuser, searchUsersController);

// get blocked users list
userrouter.get("/users/blocked", authuser, getBlockedUsersController);

// update profile (username + avatar)
userrouter.patch(
    "/users/profile",
    authuser,
    upload.single("avatar"),
    updateProfileController
);

// block user
userrouter.patch("/users/block", authuser, blockUserController);

// unblock user
userrouter.patch("/users/unblock", authuser, unblockUserController);

// get user by id MUST GO LAST to prevent wildcard matching issues
userrouter.get("/users/:userId", authuser, getUserByIdController);

export default userrouter;