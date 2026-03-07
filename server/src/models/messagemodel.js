import mongoose from "mongoose";

const messageSchema=new mongoose.Schema(
    {
        chat:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Chat',
            required:true
        },
        sender:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true
        },
        type:{
            type:String,
            enum:["text","image","file"],
            required:true
        },
        content:String,
        media:{
            url:String,
            publicId:String,
            uploadedAt:{
                type:Date,
                default:Date.now
            }
        },
        deliveredTo:[
            {
                type:mongoose.Schema.Types.ObjectId,
                ref:'User'
            }
        ],
        readBy:[
            {
                type:mongoose.Schema.Types.ObjectId,
                ref:'User'
            }
        ],
        status: {
            type: String,
            enum: ["sent", "delivered", "read"],
            default: "sent"
        }
    },{timestamps:true}
)

const messagemodel=mongoose.model("Message",messageSchema);
export default messagemodel;