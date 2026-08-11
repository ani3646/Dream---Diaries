const multer = require("multer");
const { storage } = require("../config/cloudConfig");

const upload = multer({ storage });
const User = require("../models/user");
const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { listingSchema, reviewSchema } = require("../schema.js");
const Listing = require("../models/listing.js");
const { required } = require("joi");

const axios = require("axios");

const { isLoggedIn, isOwner, isReviewAuthor } = require("../middleware");

const validatelisting = (req, res, next) => {
  let { error } = listingSchema.validate(req.body);

  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new Error(errMsg);
  } else {
    next();
  }
};

//Index Route

router.get("/", async (req, res) => {
  let { search, category } = req.query;

  let filter = {};

  // Search Filter
  if (search) {
    filter.$or = [
      {
        title: {
          $regex: search,
          $options: "i",
        },
      },
      {
        location: {
          $regex: search,
          $options: "i",
        },
      },
      {
        country: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  // Category Filter

  if (category) {
    filter.category = category;
  }

  const allListings = await Listing.find(filter)
    .populate("reviews");

  const featuredListings = await Listing.find({
    featured: true,
})
.populate("reviews")
.limit(6);

 const recentListings = await Listing.find()
.populate("reviews")
.sort({ _id: -1 })
.limit(6);

  const topRatedListings = await Listing.find(filter).populate("reviews");

  topRatedListings.forEach((listing) => {
    if (listing.reviews.length > 0) {
      const total = listing.reviews.reduce((sum, review) => {
        return sum + review.rating;
      }, 0);

      listing.avgRating = (total / listing.reviews.length).toFixed(1);
    } else {
      listing.avgRating = "New";
    }
  });

  topRatedListings.sort((a, b) => {
    const ratingA = a.avgRating === "New" ? 0 : Number(a.avgRating);
    const ratingB = b.avgRating === "New" ? 0 : Number(b.avgRating);

    return ratingB - ratingA;
  });

  const topRated = topRatedListings.slice(0, 6);

  res.render("listings/home", {
    allListings,
    featuredListings,
    recentListings,
    topRated,
  });
});

//New Route
router.get("/new", isLoggedIn, (req, res) => {
  res.render("listings/new.ejs");
});


// Show Route
router.get("/:id", async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id)
        .populate("owner")
        .populate("bookings")
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        });

    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }

    // Confirmed bookings ki dates
    const bookedDates = listing.bookings
        .filter(booking => booking.status === "Confirmed")
        .map(booking => ({
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
        }));

    console.log(bookedDates);

    let averageRating = "New";

    if (listing.reviewCount > 0) {
        averageRating = listing.averageRating.toFixed(1);
    }

    const reviewCount = listing.reviewCount;


    const ratingStats = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
};

listing.reviews.forEach((review) => {
    if (review.rating >= 1 && review.rating <= 5) {
        ratingStats[review.rating]++;
    }
});


    let isWishlisted = false;

    if (req.user) {
        const user = await User.findById(req.user._id);

        isWishlisted = user.wishlist.some(listingId =>
            listingId.equals(id)
        );
    }

    

    res.render("listings/show.ejs", {
        listing,
        averageRating,
        reviewCount,
        isWishlisted,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        bookedDates,
        ratingStats,
        
    });
});

// Add / Remove Wishlist
router.post("/:id/wishlist", isLoggedIn, async (req, res) => {

    const { id } = req.params;

    const user = await User.findById(req.user._id);

    console.log("Before:", user.wishlist);

    if (user.wishlist.some((listingId) => listingId.equals(id))) {

        user.wishlist.pull(id);

        req.flash("success", "Removed from Wishlist!");

    } else {

        user.wishlist.push(id);

        req.flash("success", "Added to Wishlist!");

    }

    await user.save();

    console.log("After:", user.wishlist);
    console.log("Count:", user.wishlist.length);

    res.redirect(`/listings/${id}`);
});

// Create Route
router.post(
  "/",
  isLoggedIn,
  upload.array("listing[images]", 10),
  validatelisting,

  wrapAsync(async (req, res) => {
    const newListing = new Listing(req.body.listing);

    // Owner
    newListing.owner = req.user._id;

    // Cloudinary Image
    newListing.images = req.files.map((file) => ({
      url: file.path,
      filename: file.filename,
    }));

    // First image card par show hogi
    newListing.image = newListing.images[0];
    // ==========================
    // Nominatim Geocoding
    // ==========================

    const address = `${newListing.location}, ${newListing.country}`;

    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: address,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "DreamDiaries/1.0",
        },
      },
    );

    if (response.data.length > 0) {
      const place = response.data[0];

      newListing.geometry = {
        type: "Point",
        coordinates: [parseFloat(place.lon), parseFloat(place.lat)],
      };
    }

    console.log("Response =", response.data);
    console.log("Geometry =", newListing.geometry);

    await newListing.save();

    req.flash("success", "New Listing Created!");

    res.redirect("/listings");
  }),
);

//Edit Route
router.get("/:id/edit", isLoggedIn, isOwner, async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/edit.ejs", { listing });
});

//Update Route
router.put(
  "/:id",
  isLoggedIn,
  isOwner,
  upload.array("listing[images]", 10),
  validatelisting,
  async (req, res) => {

      const { id } = req.params;

      const listing = await Listing.findByIdAndUpdate(
          id,
          { ...req.body.listing },
          { new: true }
      );

      if (req.files.length > 0) {
          listing.images = req.files.map(file => ({
              url: file.path,
              filename: file.filename,
          }));

          listing.image = listing.images[0];

          await listing.save();
      }

      req.flash("success", "Listing Updated!");

      res.redirect(`/listings/${id}`);
});

//Delete Route
router.delete("/:id", isLoggedIn, isOwner, async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  res.redirect("/listings");
});

module.exports = router;
