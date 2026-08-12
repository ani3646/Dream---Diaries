require("dotenv").config();

const hostRoutes = require("./routes/host");
const userRouter = require("./routes/user");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");  
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema , reviewSchema} = require("./schema.js");
const Review = require("./models/review.js");
const User = require("./models/user.js");
const listings = require("./routes/listing.js");
// Authentication 
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const flash = require("connect-flash");
const { isLoggedIn, isReviewAuthor } = require("./middleware.js");
const bookingRoutes = require("./routes/booking");


//Data Base Function
const MONGO_URL = process.env.MONGO_URL;
const store = MongoStore.create({
    mongoUrl: MONGO_URL,
    
    touchAfter: 24 * 3600,
});

const sessionOptions = {
    store,
    secret: "mysecretcode",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};




main()
.then(() => {
    console.log("Connected To DB");
})
.catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);
}

app.engine("ejs", ejsMate);

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));

app.use(express.urlencoded({extended:true}));

app.use(methodOverride("_method"));
app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
// app.use((req, res, next) => {
//     res.locals.success = req.flash("success");
//     res.locals.error = req.flash("error");
//     res.locals.currUser = req.user;
//     next();
// });

app.use(express.static(path.join(__dirname,"public")));


// app.use(express.static(path.join(__dirname, "public")));

app.use(async (req, res, next) => {

    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    

    if (req.user) {

        const user = await User.findById(req.user._id);


        res.locals.currUser = user;

        res.locals.wishlistCount = user.wishlist.length;

    } else {

        res.locals.currUser = null;
        res.locals.wishlistCount = 0;
        
    }

    next();

});

app.use("/listings", listings);
app.use("/", userRouter);

app.use("/bookings", bookingRoutes);
app.use("/host", hostRoutes);

// app.use(express.static('public'));





const validateReview = (req, res, next) => {

     console.log("========== REVIEW BODY ==========");
      console.dir(req.body, { depth: null });
    console.log("=================================");

    let { error } = reviewSchema.validate(req.body);

    if(error){
        let errMsg = error.details.map((el)=>el.message).join(",");
        throw new Error(errMsg);
    }else{
        next();
    }
};




//Reviews
//Post Routs
app.post(
    "/listings/:id/reviews",
    isLoggedIn,
    validateReview,
    wrapAsync(async (req, res) => {

        console.log("STEP 1");

        const listing = await Listing.findById(req.params.id);

        console.log("STEP 2");

        const newReview = new Review(req.body.review);

        console.log("STEP 3");

        newReview.author = req.user._id;

        listing.reviews.push(newReview);

        console.log("STEP 4");

        await newReview.save();

await listing.save();

// Reload listing with reviews
const updatedListing = await Listing.findById(listing._id).populate("reviews");

const reviewCount = updatedListing.reviews.length;

let averageRating = 0;

if (reviewCount > 0) {

    const total = updatedListing.reviews.reduce((sum, review) => {
        return sum + review.rating;
    }, 0);

    averageRating = total / reviewCount;
}

updatedListing.averageRating = averageRating;
updatedListing.reviewCount = reviewCount;

await updatedListing.save();

req.flash("success", "Review Added!");

res.redirect(`/listings/${listing._id}`);
    })

);

app.delete(
    "/listings/:id/reviews/:reviewId",
    isLoggedIn,
    isReviewAuthor,
    wrapAsync(async (req, res) => {

        let { id, reviewId } = req.params;

        await Listing.findByIdAndUpdate(id, {
    $pull: {
        reviews: reviewId,
    },
});

await Review.findByIdAndDelete(reviewId);

// Reload listing
const updatedListing = await Listing.findById(id).populate("reviews");

const reviewCount = updatedListing.reviews.length;

let averageRating = 0;

if (reviewCount > 0) {

    const total = updatedListing.reviews.reduce((sum, review) => {
        return sum + review.rating;
    }, 0);

    averageRating = total / reviewCount;
}

updatedListing.averageRating = averageRating;
updatedListing.reviewCount = reviewCount;

await updatedListing.save();

req.flash("success", "Review Deleted!");

res.redirect(`/listings/${id}`);

    })
       
);

app.get("/", (req,res) => {
    res.redirect("/listings");
});


app.get("/healthz", (req, res) => {
    res.status(200).send("OK");
});



// 404 Route

app.all("/*splat", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
});


// Global Error Handler

app.use((err, req, res, next) => {

    const { statusCode = 500 } = err;

    if (!err.message) {
        err.message = "Something Went Wrong";
    }

    res.status(statusCode).render("error.ejs", {
        err,
    });

});




app.listen(process.env.PORT || 8080, () => {
    console.log(`Server is listening on port ${process.env.PORT || 8080}`);
});