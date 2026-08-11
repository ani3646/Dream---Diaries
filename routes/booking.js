

const express = require("express");
const router = express.Router();

const Booking = require("../models/booking");
const crypto = require("crypto");

const Listing = require("../models/listing");
const PDFDocument = require("pdfkit");
const { isLoggedIn } = require("../middleware");
const razorpay = require("../config/razorpay");

router.post("/:id/create-order", isLoggedIn, async (req, res) => {

    try {

        console.log("CREATE ORDER BODY =", req.body);

        const { id } = req.params;

        const listing = await Listing.findById(id);

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: "Listing not found!",
            });
        }

        const checkIn = new Date(req.body.checkIn);
        const checkOut = new Date(req.body.checkOut);

        if (
            Number.isNaN(checkIn.getTime()) ||
            Number.isNaN(checkOut.getTime())
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking dates!",
            });
        }

        const totalNights = Math.ceil(
            (checkOut - checkIn) /
            (1000 * 60 * 60 * 24)
        );

        if (totalNights <= 0) {
            return res.status(400).json({
                success: false,
                message: "Check-out must be after check-in!",
            });
        }

        const pricePerNight = Number(listing.price);

        if (!Number.isFinite(pricePerNight) || pricePerNight <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid listing price!",
            });
        }

        const totalPrice = pricePerNight * totalNights;

        // Razorpay amount = paise
        const amountInPaise = Math.round(totalPrice * 100);

        if (amountInPaise < 100) {
            return res.status(400).json({
                success: false,
                message: "Booking amount must be at least ₹1!",
            });
        }

        console.log("PRICE PER NIGHT =", pricePerNight);
        console.log("TOTAL NIGHTS =", totalNights);
        console.log("TOTAL PRICE =", totalPrice);
        console.log("RAZORPAY AMOUNT =", amountInPaise);

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `booking_${Date.now()}`,
        };

        console.log("RAZORPAY OPTIONS =", options);

        const order = await razorpay.orders.create(options);

        console.log("RAZORPAY ORDER CREATED =", order);

        return res.json({
            success: true,
            order,
            totalPrice,
            totalNights,
        });

    } catch (error) {

        console.error("RAZORPAY CREATE ORDER ERROR:");
        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                error?.error?.description ||
                error?.message ||
                "Unable to create Razorpay order!",
        });
    }
});




router.post("/:id/book", isLoggedIn, async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id);

    
    

    if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
}

// Razorpay Payment Verification

const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature
} = req.body;

if (
    !razorpay_payment_id ||
    !razorpay_order_id ||
    !razorpay_signature
) {
    req.flash("error", "Payment verification details missing!");
    return res.redirect(`/listings/${id}`);
}

const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(
        razorpay_order_id + "|" + razorpay_payment_id
    )
    .digest("hex");

if (generatedSignature !== razorpay_signature) {

    req.flash(
        "error",
        "Payment verification failed!"
    );

    return res.redirect(`/listings/${id}`);
}


// Data Calculation 

const checkIn = new Date(req.body.checkIn);
const checkOut = new Date(req.body.checkOut);

if (
    isNaN(checkIn.getTime()) ||
    isNaN(checkOut.getTime()) ||
    checkIn >= checkOut
) {
    req.flash("error", "Invalid booking dates!");
    return res.redirect(`/listings/${id}`);
}

const today = new Date();
today.setHours(0, 0, 0, 0);

if (checkIn < today) {
    req.flash("error", "Check-in date cannot be in the past!");
    return res.redirect(`/listings/${id}`);
}


// Check if listing is already booked for selected dates
const existingBooking = await Booking.findOne({
    listing: id,
    status: { $ne: "Cancelled" }, // Pending aur Confirmed dono block honge
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
});

if (existingBooking) {
    req.flash(
        "error",
        "These dates are already booked!"
    );

    return res.redirect(`/listings/${id}`);
}

const totalNights = Math.ceil(
    (checkOut - checkIn) / (1000 * 60 * 60 * 24)
);

if (totalNights <= 0) {
    req.flash("error", "Invalid booking dates!");
    return res.redirect(`/listings/${id}`);
}

const guests = Number(req.body.guests);

if (!Number.isInteger(guests) || guests < 1) {
    req.flash("error", "Guests must be at least 1.");
    return res.redirect(`/listings/${id}`);
}

const totalPrice = listing.price * totalNights;

const booking = new Booking({
    listing: id,
    user: req.user._id,
    checkIn,
    checkOut,
    guests,
    totalNights,
    totalPrice,
});

    await booking.save();

    listing.bookings.push(booking);

    await listing.save();

    req.flash("success", "Booking Confirmed!");

    res.redirect("/bookings");
});

router.get("/", isLoggedIn, async (req, res) => {

    const bookings = await Booking.find({
    user: req.user._id,
})
.populate({
    path: "listing",
    populate: {
        path: "owner",
    },
})
.sort({ createdAt: -1 });

 res.render("users/bookings", {
        bookings,
    });

});


router.delete("/:bookingId", isLoggedIn, async (req, res) => {

    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
        req.flash("error", "Booking not found!");
        return res.redirect("/bookings");
    }

    const listing = await Listing.findById(booking.listing);

    if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/bookings");
}

if (!listing.owner) {
    req.flash("error", "Listing owner not found!");
    return res.redirect("/bookings");
}

    // Sirf booking owner ya listing owner cancel kar sakta hai
    const isBookingOwner = booking.user.equals(req.user._id);

console.log("Booking =", booking);
console.log("Listing =", listing);
console.log("Listing Owner =", listing.owner);
console.log("Logged User =", req.user._id);
    const isListingOwner = listing.owner.equals(req.user._id);

    if (!isBookingOwner && !isListingOwner) {
        req.flash("error", "Access Denied!");
        return res.redirect("back");
    }

    await Listing.findByIdAndUpdate(
        booking.listing,
        {
            $pull: {
                bookings: bookingId,
            },
        }
    );

    await Booking.findByIdAndDelete(bookingId);

    req.flash("success", "Booking Cancelled Successfully!");

    if (isListingOwner) {
        return res.redirect(`/host/listings/${listing._id}`);
    }

    res.redirect("/bookings");
});


router.get("/:bookingId/invoice", isLoggedIn, async (req, res) => {

    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
        .populate({
            path: "listing",
            populate: {
                path: "owner",
            },
        })
        .populate("user");

    if (!booking) {
        req.flash("error", "Booking not found!");
        return res.redirect("/bookings");
    }

    if (!booking.user._id.equals(req.user._id)) {
        req.flash("error", "Access Denied!");
        return res.redirect("/bookings");
    }

    const doc = new PDFDocument({
        margin: 50,
    });

    res.setHeader(
        "Content-Disposition",
        `attachment; filename=Invoice-${booking._id}.pdf`
    );

    res.setHeader(
        "Content-Type",
        "application/pdf"
    );

    // IMPORTANT
    doc.pipe(res);

    // ================= HEADER =================

    doc
        .rect(0, 0, 650, 90)
        .fill("#e63946");

    doc
        .fillColor("white")
        .fontSize(28)
        .text("DreamDiaries", 50, 30);

    doc
        .fontSize(16)
        .text("BOOKING INVOICE", 50, 60);

    doc.fillColor("black");

    // ================= INVOICE INFO =================

    doc.moveDown(3);

    doc
        .fontSize(11)
        .text(
            `Invoice No : INV-${booking._id.toString().slice(-6)}`,
            {
                align: "right",
            }
        );

    doc.text(
        `Issue Date : ${new Date().toDateString()}`,
        {
            align: "right",
        }
    );

    doc.moveDown();

    // ================= GUEST =================

    doc
        .fillColor("#e63946")
        .fontSize(16)
        .text("Guest Information");

    doc.fillColor("black");

    doc.moveDown(0.5);

    doc.fontSize(12);

    doc.text(`Guest Name : ${booking.user.username}`);
    doc.text(`Host Name : ${booking.listing.owner.username}`);

    doc.moveDown();

    // ================= PROPERTY =================

    doc
        .fillColor("#e63946")
        .fontSize(16)
        .text("Property Information");

    doc.fillColor("black");

    doc.moveDown(0.5);

    doc.fontSize(12);

    doc.text(`Property : ${booking.listing.title}`);
    doc.text(
        `Location : ${booking.listing.location}, ${booking.listing.country}`
    );

    doc.moveDown();

    // ================= BOOKING =================

    doc
        .fillColor("#e63946")
        .fontSize(16)
        .text("Booking Details");

    doc.fillColor("black");

    doc.moveDown(0.5);

    doc.fontSize(12);

    doc.text(`Check In : ${booking.checkIn.toDateString()}`);
    doc.text(`Check Out : ${booking.checkOut.toDateString()}`);
    doc.text(`Guests : ${booking.guests}`);
    doc.text(`Total Nights : ${booking.totalNights}`);

    doc.moveDown(2);

    // ================= TOTAL =================

    const boxY = doc.y;

    doc
        .roundedRect(50, boxY, 500, 60, 8)
        .fill("#f8f9fa");

    doc
        .fillColor("black")
        .fontSize(15)
        .text(
            "TOTAL AMOUNT",
            70,
            boxY + 20
        );

    doc
        .fillColor("#e63946")
        .fontSize(20)
        .text(
            `₹ ${booking.totalPrice.toLocaleString("en-IN")}`,
            360,
            boxY + 18
        );

    doc.y = boxY + 80;

    // ================= STATUS =================

    doc
        .fillColor("green")
        .fontSize(14)
        .text(
            `Booking Status : ${booking.status}`
        );

    doc.moveDown(3);

    // ================= FOOTER =================

    doc
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .strokeColor("#cccccc")
        .stroke();

    doc.moveDown();

    doc
        .fillColor("#666")
        .fontSize(11)
        .text(
            "Thank you for choosing DreamDiaries.",
            {
                align: "center",
            }
        );

    doc.text(
        "Have a wonderful stay.",
        {
            align: "center",
        }
    );

    doc.moveDown();

    doc.text(
        "www.dreamdiaries.com",
        {
            align: "center",
        }
    );

    doc.end();

});


module.exports = router;