import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import validator from 'validator'
import usermodel from '../models/usermodel.js'
import mongoose from 'mongoose'

const authuser = async (req, res, next) => {
    try {
        // Extract token from custom header or standard Authorization header
        let token = req.headers.usertoken;
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.json({ success: false, message: "not authorized" });
        }

        const decodedtoken = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedtoken;
        next();
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

export default authuser;