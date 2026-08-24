import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    fullName : {
        type : String,
        required : true
    },
    email : {
        type : String,
        required : true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password : {
        type : String,
        required : true
    },
    otp: {
        type : String,
        select: false
    },
    otpExpiresAt: {
        type: Date,
        select: false
    },
    otpRequestedAt: {
        type: Date,
        select: false
    }
    // resetOTP: {
    //     type : Number
    // },
    // resetOTPExpire: {
    //     type : Date
    // }
})

const UserModel = mongoose.model("signUp", userSchema)

export default UserModel
