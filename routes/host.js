const express = require("express");
const router = express.Router();

const Listing = require("../models/listing");
const Booking = require("../models/booking");
const { isLoggedIn } = require("../middleware");

router.get("/dashboard", isLoggedIn, async (req, res) => {

    const listings = await Listing.find({
    owner: req.user._id,
})
.populate({
    path: "bookings",
    populate: {
        path: "user",
    },
});

    let totalBookings = 0;
    let totalEarnings = 0;
    let recentBookings = [];

    // Analytics variables
    let pendingBookings = 0;
    let confirmedBookings = 0;
    let cancelledBookings = 0;

    listings.forEach(listing => {

    totalBookings += listing.bookings.length;

    listing.bookings.forEach(booking => {

        totalEarnings += booking.totalPrice;

        recentBookings.push({
            ...booking.toObject(),
            listingTitle: listing.title,
        });

        if (booking.status === "Pending") {
                pendingBookings++;
            } else if (booking.status === "Confirmed") {
                confirmedBookings++;
            } else if (booking.status === "Cancelled") {
                cancelledBookings++;
            }

    });

});

recentBookings.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
);

recentBookings = recentBookings.slice(0, 5);

    res.render("host/dashboard", {
        listings,
        totalBookings,
        totalEarnings,
        recentBookings,
        pendingBookings,
        confirmedBookings,
        cancelledBookings
    });

});

router.get("/listings/:id", isLoggedIn, async (req, res) => {

    const listing = await Listing.findById(req.params.id)
        .populate({
            path: "bookings",
            populate: {
                path: "user",
            },
        });

    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/host/dashboard");
    }

    if (!listing.owner.equals(req.user._id)) {
        req.flash("error", "Access Denied!");
        return res.redirect("/host/dashboard");
    }

    res.render("host/bookings", { listing });

});


// Accept Booking
router.put("/bookings/:bookingId/accept", isLoggedIn, async (req, res) => {

    console.log("ACCEPT ROUTE HIT");

    const booking = await Booking.findById(req.params.bookingId)
        .populate("listing");

    if (!booking) {
        req.flash("error", "Booking not found!");
        return res.redirect("/host/dashboard");
    }

    if (!booking.listing.owner.equals(req.user._id)) {
        req.flash("error", "Unauthorized!");
        return res.redirect("/host/dashboard");
    }

    booking.status = "Confirmed";
    await booking.save();

    req.flash("success", "Booking Accepted!");
    res.redirect(`/host/listings/${booking.listing._id}`);
});

// Reject Booking
router.put("/bookings/:bookingId/reject", isLoggedIn, async (req, res) => {

    console.log("REJECT ROUTE HIT");

    const booking = await Booking.findById(req.params.bookingId)
        .populate("listing");

    if (!booking) {
        req.flash("error", "Booking not found!");
        return res.redirect("/host/dashboard");
    }

    if (!booking.listing.owner.equals(req.user._id)) {
        req.flash("error", "Unauthorized!");
        return res.redirect("/host/dashboard");
    }

    booking.status = "Cancelled";
    await booking.save();

    req.flash("success", "Booking Rejected!");
    res.redirect(`/host/listings/${booking.listing._id}`);
});




module.exports = router;