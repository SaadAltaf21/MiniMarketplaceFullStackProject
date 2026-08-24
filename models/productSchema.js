import mongoose from "mongoose"

const productSchema = new mongoose.Schema({
    title : {
        type : String,
        required : true
    },
    description : {
        type : String,
        required : true
    },
    price : {
        type : Number,
        required : true,
        min: 0
    },
    category : {
        type : String,
        required : true
    },
    condition : {
        type : String,
        enum : ["new", "used"]
    },
    location : {
        type : String
    },
    image : {
        type : String,
        required : true
    },
    seller : {
        type : mongoose.Schema.Types.ObjectId,
        ref: "signUp",
        required: true,
        immutable: true
    },
    createDate : {
        type : Date,
        default : Date.now
    }
})

const productModel = mongoose.model("product", productSchema)

export default productModel
