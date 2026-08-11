const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware");
const Listing = require("../models/listing");

const multer = require("multer");
const { storage } = require("../config/cloudConfig");
const upload = multer({ storage });


router.get("/signup", (req, res) => {
  res.render("users/signup.ejs");
});

router.get("/login", (req, res) => {
    res.render("users/login.ejs");
});

router.post(
    "/login",
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true,
        
    }),
    (req, res) => {
        res.redirect("/listings");
    }
);

router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }

        req.flash("success", "Logged out successfully!");

        res.redirect("/listings");
    });
});

router.get("/profile", isLoggedIn, async (req, res) => {

    const user = await User.findById(req.user._id)
        .populate("wishlist");

    const totalListings = await Listing.countDocuments({
        owner: req.user._id,
    });

    res.render("users/profile.ejs", {
        user,
        totalListings,
    });

});

router.get("/profile/edit", isLoggedIn, async (req, res) => {

    const user = await User.findById(req.user._id);

    res.render("users/editProfile.ejs", {
        user,
    });

});

router.put("/profile", isLoggedIn, async (req, res) => {

    const { username, email, phone, city, country, bio } = req.body;

    await User.findByIdAndUpdate(req.user._id, {
        username,
        email,
        phone,
        city,
        country,
        bio,
    });

    req.flash("success", "Profile Updated Successfully!");

    res.redirect("/profile");

});

router.post(
    "/profile/photo",
    isLoggedIn,
    upload.single("profileImage"),
    async (req, res) => {

        const user = await User.findById(req.user._id);

        user.profileImage = {
            url: req.file.path,
            filename: req.file.filename,
        };

        await user.save();

        req.flash("success", "Profile picture updated!");

        res.redirect("/profile");
    }
);


router.post(
    "/signup",
    wrapAsync(async (req, res, next) => {
        try {
            const { username, email, password } = req.body;

            const newUser = new User({
                email,
                username,
            });

            const registeredUser = await User.register(newUser, password);

            req.login(registeredUser, (err) => {
                if (err) {
                    return next(err);
                }

                req.flash("success", "Welcome to Dream Diaries!");

                res.redirect("/listings");
            });

        } catch (err) {
            req.flash("error", err.message);
            res.redirect("/signup");
        }
    })
);

router.get("/wishlist", isLoggedIn, async (req, res) => {

    const user = await User.findById(req.user._id)
        .populate("wishlist");

    const validWishlist = user.wishlist.filter(listing => listing);

    if (validWishlist.length !== user.wishlist.length) {
        user.wishlist = validWishlist.map(listing => listing._id);
        await user.save();
    }

    console.log("Wishlist Route =", validWishlist);

    res.render("users/wishlist.ejs", {
        wishlist: validWishlist,
    });

});

const Booking = require("../models/booking");

router.get("/bookings", isLoggedIn, async (req, res) => {

    const bookings = await Booking.find({
        user: req.user._id,
    }).populate("listing");

    res.render("users/bookings.ejs", {
        bookings,
    });

});

router.get("/dashboard", isLoggedIn, async (req, res) => {

    const user = await User.findById(req.user._id)
        .populate("wishlist");

    const myListings = await Listing.find({
        owner: req.user._id,
    });

    const Booking = require("../models/booking");

    const myBookings = await Booking.find({
        user: req.user._id,
    }).populate("listing");

    res.render("users/dashboard.ejs", {
        user,
        myListings,
        myBookings,
    });

});

module.exports = router;
