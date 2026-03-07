import mongoose from "mongoose";

const notificationSchema=new mongoose.Schema(
    {
        user:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true
        },
        type:{
            type:String,
            enum:["new message","added to the group","removed from the group","admin promoted","changes applied"],
            required:true
        },
        sender:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true
        },
        chat:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Chat',
            required:true
        },
        message:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Message',
        },
        isRead:{
            type:Boolean,
            default:false
        }
    },{timestamps:true}
)

const notificationmodel=new mongoose.model("Notification",notificationSchema);
export default notificationmodel;