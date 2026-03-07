import mongoose from "mongoose";

const chatSchema=new mongoose.Schema(
    {
        type:{
            type:String,
            enum:["one to one","group"],
            required:true
        },
        isGroup:{
            type:Boolean,
            default:false
        },
        participants:[{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true
        }],
        admins:[
            {
                type:mongoose.Schema.Types.ObjectId,
                ref:'User',
            }
        ],
        name:{
            type:String,
            trim:true
        },

        groupAvatar:{
            url:String,
            publicId:String,
            uploadedAt:{
                type:Date,
                default:Date.now
            }
        },
        lastMessage:{
            sender:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'User'
            },
            messageType: {
                type: String,
                enum: ["text", "image", "file"]
            },
            content:String,
            createdAt:Date
        },
        isArchieved:{
            type:Boolean,
            default:false
        },
        isMuted:{
            type:Boolean,
            default:false
        },
        createdBy:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true
        }
    },{timestamps:true}
)

const chatmodel=mongoose.model("Chat",chatSchema);
export default chatmodel;