require("dotenv").config();

const mongoose = require("mongoose");
const initdata = require("./data.js");
const Listing = require("../models/listing.js");

const MONGO_URL = process.env.MONGO_URL;



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

const initDB = async () => {
    await Listing.deleteMany({});
        const listings = initdata.data.map((obj) => ({
        ...obj,
        owner: "6a520f92eb18aa2953a12550", 
    }));

    await Listing.insertMany(listings);
    console.log("Data was initialized");
}

initDB();