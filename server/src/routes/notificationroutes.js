import express from "express";
import authuser from "../middlewares/authmiddleware.js";

import {
    getNotificationsController,
    markNotificationReadController
} from "../controllers/notificationcontrollers.js";

const notificationrouter = express.Router();

notificationrouter.get("/notifications",authuser,getNotificationsController);
notificationrouter.patch("/notifications/:notificationId/read",authuser,markNotificationReadController);

export default notificationrouter;
