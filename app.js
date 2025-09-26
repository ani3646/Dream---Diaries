const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");  
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
// const wrapAsync = require("./utils/wrapAsync.js");
//  const ExpressError = require("./utils/ExpressError.js");
const { listingSchema } = require("./schema.js");



//Data Base Function
const MONGO_URL = "mongodb://127.0.0.1:27017/Dream-Diaries";

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

app.set("view engine", "ejs");
app.set("views", path.join(__dirname,"views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname,"/public")));
app.use(express.static('public'));


app.get("/", (req,res) => {
    res.send("Server is Working Perfectly ");
});

const validatelisting = (req, res , next) => {
     let {error} = listingSchema.validate(req.body);
        
        
        // if(error) {
        //     let errMsg = error.details.map((el) => el.message).join(",");
        //     throw new (400, error);
        // }else {
        //     next();
        // }
}

//Index Route
app.get("/listings", async(req, res) =>{
    const allListings = await Listing.find({})
    // res.send(allListings);
    res.render("listings/index.ejs",{ allListings });
});

//New Route
app.get("/listings/new", (req, res) => {
    res.render("listings/new.ejs");
});

//Show Route
app.get("/listings/:id", async (req,  res) =>{
    let {id} = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/show.ejs", {listing});
});

//Create Route
app.post(
    "/listings",validatelisting ,
    async(req, res, next) => {
        const newListing = new Listing(req.body.listing);
        await newListing.save();
        res.redirect("/listings");
    
    
}); 

//Edit Route
app.get("/listings/:id/edit", async(req,res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", {listing});
});

//Update Route
app.put("/listings/:id",
    validatelisting,
    async(req,res) => {
    let {id} = req.params;
    await Listing.findByIdAndUpdate(id, {...req.body.listing});
    res.redirect(`/listings/${id}`);
});

//Delete Route
app.delete("/listings/:id", async (req, res) => {
      let {id} = req.params;
      let deletedListing = await Listing.findByIdAndDelete(id);
      console.log(deletedListing);
      res.redirect("/listings");
});

// app.get("/testListing", async(req, res) => {
//     let smapleListing = new Listing({
//         title: "My Home",
//         description:"By the Road",
//         price:45000,
//         location:"Gorakhpur, UP",
//         country:"India"
//     });

//     await smapleListing.save();
//     console.log("Sample was saved");
//     res.send("Successfull");
// });



//////////////////// it is for the all route errors and the express for also ////////////////


// app.all("*", (req, res, next) => {
//     next(new ExpressError(404, "Page Not Found!"));
// });

// app.use((err, req, res, next) => {
//   const { statusCode = 500 } = err;
//   if (!err.message) err.message = "Oh No, Something Went Wrong!";
//   res.status(statusCode).send(err.message);
// });


app.listen(8080, () =>{
    console.log("Server is listening Port ");
});