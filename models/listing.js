const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ListingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "No description provided",
  },
  image: {
    filename: String,
    url: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1590523278191-995cbcda646b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1080&q=80",
    },
  },

  images: [
    {
        url: String,
        filename: String,
    },
],

  price: Number,

  featured: {
    type: Boolean,
    default: false,
},

averageRating: {
    type: Number,
    default: 0,
},

reviewCount: {
    type: Number,
    default: 0,
},


  location: String,
  country: String,

  


   category: {
    type: String,
    enum: [
      "Beach",
      "Mountain",
      "Camping",
      "Castle",
      "Forest",
      "Island",
      "Pool",
      "Farm",
      "Arctic",
      "Desert",
    ],
    default: "Beach",
  },

  geometry: {
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
  },
  coordinates: {
    type: [Number],
    default: [77.2090, 28.6139], // [longitude, latitude]
  },
},


    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },

  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    }
  ],

  bookings: [
    {
        type: Schema.Types.ObjectId,
        ref: "Booking",
    },
]

});


 

const Listing = mongoose.model("Listing", ListingSchema);
module.exports = Listing;
