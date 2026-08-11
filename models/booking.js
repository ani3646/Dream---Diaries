const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const bookingSchema = new Schema({

    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true,
    },

    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    checkIn: {
        type: Date,
        required: true,
    },

    checkOut: {
        type: Date,
        required: true,
    },

    guests: {
        type: Number,
        default: 1,
    },

    totalPrice: {
    type: Number,
    required: true,
},

totalNights: {
    type: Number,
    required: true,
},

   status: {
    type: String,
    enum: ["Pending", "Confirmed", "Cancelled"],
    default: "Pending",
},

paymentId: {
    type: String,
},

orderId: {
    type: String,
},

paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed"],
    default: "Pending",
},



}, {
    timestamps: true,
});

module.exports = mongoose.model("Booking", bookingSchema);