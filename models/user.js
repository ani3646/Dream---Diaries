const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose").default;
const Listing = require("../models/listing");

const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
    },

    profileImage: {
    url: {
        type: String,
        default:
            "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    },

    filename: String,
},

phone: {
    type: String,
},

city: {
    type: String,
},

country: {
    type: String,
},

bio: {
    type: String,
    maxlength: 250,
},

    createdAt: {
        type: Date,
        default: Date.now,
    },


    wishlist: [
    {
        type: Schema.Types.ObjectId,
        ref: "Listing",
    },
],

});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);