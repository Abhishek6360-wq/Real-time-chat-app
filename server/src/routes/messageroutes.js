import express from "express";
import authuser from "../middlewares/authmiddleware.js";
import upload from "../middlewares/uploadmiddleware.js";

import {sendMessageController,
  getChatMessagesController,
  markMessagesReadController
} from "../controllers/messagecontrollers.js";

const messagerouter = express.Router();

messagerouter.post("/messages",authuser,upload.single("file"),sendMessageController);
messagerouter.get("/messages/:chatId",authuser,getChatMessagesController);
messagerouter.patch("/messages/:chatId/read",authuser,markMessagesReadController);


export default messagerouter;
