import express from "express";
import { register, userLogin, userLogout } from "../controllers/authcontrollers.js";

const authrouter = express.Router();

authrouter.post("/auth/register", register);
authrouter.post("/auth/login", userLogin);
authrouter.get("/auth/logout", userLogout);

export default authrouter;