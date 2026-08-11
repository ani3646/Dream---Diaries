const Listing = require("./models/listing");
const Review = require("./models/review");

// Login check middleware
module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "You must be logged in!");

    return res.redirect("/login");
  }

  next();
};

// Owner check middleware
module.exports.isOwner = async (req, res, next) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);

   console.log("Listing Owner =", listing.owner);
    console.log("Logged User =", req.user._id);

  if (!listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have permission!");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

// Review Author check middleware
module.exports.isReviewAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params;

    const review = await Review.findById(reviewId);

    if (!review) {
        req.flash("error", "Review not found!");
        return res.redirect(`/listings/${id}`);
    }

    console.log("Review =", review);
    console.log("Author =", review.author);

    if (!review.author.equals(req.user._id)) {
        req.flash("error", "You don't have permission!");
        return res.redirect(`/listings/${id}`);
    }

    next();
};
