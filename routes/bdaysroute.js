const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");

const moment = require("moment");

const Person = require("../schemas/personSchema");
const ReviewUser = require("../schemas/reviewSchema");
const Suggestion = require("../schemas/suggestionSchema");
const Emails = require("../schemas/Emails");

router.get("/", (req, res) => {
  res.json({ data: "this is home page" });
});

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});
// const {CLOUDINARY_cloud_name,CLOUDINARY_api_key,CLOUDINARY_api_secret} = require('../vars.js')

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_cloud_name,
  api_key: process.env.CLOUDINARY_api_key,
  api_secret: process.env.CLOUDINARY_api_secret,
});

// Set up multer storage settings
const DIR = "./public/";
const uploadDir = `${DIR}uploads/`;
fse.ensureDir(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// Route handler for adding a new person
router.post("/addperson", upload.single("pic"), async (req, res) => {
  try {
    const { name, bday, bio } = req.body;

    // Create a new person instance based on the schema
    const newPerson = new Person({
      name: name,
      bday: bday,
      pic: "",
      bio: bio || "",
      year: "",
      dob: "",
      min: Math.floor(Math.random() * 9) + 1,
      sec: Math.floor(Math.random() * 9) + 1,
    });

    // If a file was uploaded, upload it to Cloudinary and set the person's pic property to the returned URL
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      const url = cloudinary.url(result.public_id, {
        width: 300,
        height: 300,
        crop: "fill",
      });
      newPerson.pic = url;
      // console.log('pic url', result.secure_url);
      fs.unlinkSync(req.file.path); // Delete the file from the server
    }

    // Save the new person instance to the database
    const savedPerson = await newPerson.save();

    res.status(201).json({
      message: "New person added successfully",
      person: newPerson,
      status: 201,
      meaning: "created",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Failed to add a new person",
      error: error,
      status: 500,
      meaning: "internal server error",
    });
  }
});

// GET all persons with reviews
router.get("/getreviewperson", async (req, res) => {
  try {
    const reviewPersons = await ReviewUser.find({ review: true });
    const newPersons = await Person.find({ published: false, review: true });
    const allPersons = reviewPersons.concat(newPersons);

    res.status(200).json({
      message: "Success",
      data: allPersons,
      status: 200,
      meaning: "OK",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
      status: 500,
      meaning: "Internal Server Error",
    });
  }
});

// GET all persons
router.get("/getallperson", async (req, res) => {
  try {
    const persons = await Person.find({ published: true, todelete: false });

    res.status(200).json({
      message: "Success",
      data: persons,
      status: 200,
      meaning: "OK",
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
      status: 500,
      meaning: "Internal Server Error",
    });
  }
});

// update person after review
router.post("/updateperson", async (req, res) => {
  const { person } = req.body;
  const { id, name, bio, bday, pic, published, review, todelete, reject } =
    person;

  console.log("the received person", person);

  try {
    // Find the person by ID
    const toperson = await Person.findById(person.id);

    // const toperson2 = await Person.findById('64342aecca1f1ffa9027dd5f');

    // console.log(person.id)

    console.log(toperson);

    if (!toperson) {
      // await ReviewUser.findOneAndDelete({ _id: person.id });
      return res.status(404).json({
        message: "Person not found",
        status: 404,
        meaning: "not found",
      });
    }

    if (reject === true) {
      toperson.review = false;
      toperson.published = person.published;
      await toperson.save();

      const personinreview = await ReviewUser.find({ _id: person._id });

      if (personinreview) {
        const personinreview = await ReviewUser.findOneAndDelete({
          _id: person._id,
        });
      }

      return res.status(200).json({
        message: "Person rejected",
        status: 200,
        meaning: "ok",
        person: toperson,
      });
    }

    if (name) {
      toperson.name = name;
    }
    if (bio) {
      toperson.bio = bio;
    }
    if (bday) {
      toperson.bday = bday;
    }
    if (pic) {
      toperson.pic = pic;
    }

    if (published !== undefined) {
      toperson.published = published;
    }
    if (review !== undefined) {
      toperson.review = review;
    }
    if (todelete !== undefined) {
      toperson.todelete = todelete;
    }

    // Save the updated person to the database
    await toperson.save();
    await ReviewUser.findOneAndDelete({ _id: person._id });

    return res.status(200).json({
      message: "Person updated",
      person: toperson,
      status: 200,
      meaning: "ok",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Error saving person to database",
      status: 500,
      meaning: "internal server error",
    });
  }
});

// adding a person after review
router.post("/addreview", upload.single("pic"), async (req, res) => {
  // console.log('to add review user')

  let urls = [];
  const { id, name, bio, bday, del } = req.body;
  const pic = req.file && req.file.path;

  if (pic) {
    // Upload pic to cloudinary and store url in person's pic field
    try {
      const result = await cloudinary.uploader.upload(pic);
      const url = cloudinary.url(result.public_id, {
        width: 300,
        height: 300,
        crop: "fill",
      });
      urls.push(url);
      fs.unlinkSync(req.file.path);
      // console.log(url)
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: "Error uploading pic",
        status: 500,
        meaning: "internal server error",
      });
    }
  } else {
    const picurl = req.body.pic;
    urls.push(picurl);
  }

  try {
    let reviewUser = await ReviewUser.findOne({ id: id });
    if (reviewUser) {
      reviewUser.name = name || reviewUser.name;
      reviewUser.bio = bio || reviewUser.bio;
      reviewUser.bday = bday || reviewUser.bday;
      reviewUser.pic = urls[0] || reviewUser.pic;
      reviewUser.todelete = del || reviewUser.todelete;
      reviewUser.review = true || reviewUser.review;
      reviewUser.published = true || reviewUser.published;
    } else {
      reviewUser = new ReviewUser({
        id,
        name,
        bio,
        bday,
        pic: urls[0] || "",
        todelete: del,
        review: true,
        published: true,
      });
    }

    console.log(reviewUser);
    await reviewUser.save();

    // console.log('del in rev', reviewUser)

    if (reviewUser.todelete === true) {
      console.log("delet...............");
      return res.status(201).json({
        message: "User has been marked for deletion",
        status: 200,
        meaning: "Success",
        user: reviewUser,
      });
    } else {
      return res.status(201).json({
        message: "Data sent for review",
        reviewUser: reviewUser,
        status: 201,
        meaning: "Created",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Unable to send the data for review",
      status: 500,
      meaning: "Internal Server Error",
    });
  }
});

// adding suggestion
router.post("/addsuggestion", async (req, res) => {
  const { name, email, suggestion } = req.body;

  try {
    const newSuggestion = new Suggestion({ name, email, suggestion });
    const savedSuggestion = await newSuggestion.save();

    if (savedSuggestion) {
      client.messages
        .create({
          body: JSON.stringify(req.body),
          from: "whatsapp:+14155238886",
          to: "whatsapp:+9779823316313",
        })
        .then((message) => console.log(message.sid));

      res.status(201).json({
        message: "Suggestion Received",
        suggestion: savedSuggestion,
        status: 201,
        meaning: "created",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
      status: 500,
      meaning: "internal server error",
    });
  }
});

// get suggestions
router.get("/getsuggestions", async (req, res) => {
  try {
    const suggestions = await Suggestion.find();
    if (suggestions) {
      res.status(200).json({
        message: "Success",
        data: suggestions,
        status: 200,
        meaning: "OK",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
      status: 500,
      meaning: "Internal Server Error",
    });
  }
});

router.get("/sendmails", async (req, res) => {
  const today = moment().add(1, 'days').format("MMM DD");
  const persons = await Person.find({
    published: true,
    review: false,
  });

  const bdays = persons.filter((person) => {
    const bday = moment(person.bday.toLowerCase(), "MMM D").format("MMM DD");
    return bday === today;
  });
  if (bdays.length === 0)
    return res.status(200).json({ message: "No birthdays found for today" });

  const emails = await Emails.find({ status: false }).select('email');
  const emailsArray = emails.map(email => email.email);
  

  if (emailsArray.length === 0)
    return res.status(200).json({ message: "No email found to send" });
  const mailOptions = {
    from: '"MCOMS Birthday Reminder" <livingasrb007@gmail.com>',
    to: emailsArray[0],
    bcc: emailsArray.join(', '),
    subject: "MCOMS Birthday Reminder",
    html: `<div style="background-color: #f0f0f0; border-radius: 16px; box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2); max-width: 400px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; background-color: #3399ff; border-radius: 16px; padding: 20px;">
        <p style="font-size: 18px;">🎂🎉</p>
        <div style="font-size: 28px; font-weight: bold; text-transform: capitalize; margin: 16px 0;">Happy Birthday!</div>
      </div>
      <div style="font-size: 18px; margin: 16px 0; text-align: center; color: #000000;">
        <div style="font-size: 16px; margin: 16px 0; color: #000000;">
          <b>Wallah habibi and habibi, it's <span style="font-size: 18px; color: #3399ff;"><strong>${today}</strong></span> and guess whose birthday is here ??</b>
        </div>
        <p>Let's wish a very happy birthday to</p>
        ${bdays.length > 1
        ? bdays
          .map((b) => {
            return `<b style="text-transform: capitalize; font-size: 26px">${b.name}</b><br>`;
          })
          .join("&<br/>")
        : `<b style="text-transform: capitalize; font-size: 26px">${bdays[0].name}</b><br>`
      }
      </div>
      <div style="font-style: italic; font-size: 15px; margin: 16px 0; text-align: center; color: #000000;">
        <b>"May his/her day be filled with joy, laughter, and cherished moments. Wishing him/her a wonderful and happy birthday!"
        </b>
      </div>
      <div style="display: flex; justify-content: center; align-items: center; text-align: center; margin: 7px auto; width: fit-content;">  
      <a href="${process.env.FRONTEND}/" style="color: #999999; text-decoration: underline;">View Upcoming Birthdays</a> &nbsp;
</div>
      <div style="font-size: 8px; color: #999999; text-align: center; margin: 7px 0;">
        <strong><i>**THIS EMAIL WILL BE GENERATED ON EVERY BIRTHDAY OF MCOMS-2020 STUDENTS**</i></strong>
      </div>
      <div style="font-size: 8px; color: #999999; text-align: center; margin: 7px 0;">
        <strong><i>if you dont like, you can <a href="${process.env.FRONTEND}/unsubscribe" style="color: #999999; text-decoration: underline;">Remove Your Email.</a></i></strong>
      </div>
      <div style="font-size: 8px; color: #999999; text-align: center; margin: 7px 0;">
        Made with ❤️ by <a href='sajidaalam.com.np'>sajid</a>
      </div>
    </div>
      `,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to`);
    return res.status(200).json({ message: "Email sent successfully - " + emailsArray.length });
  } catch (error) {
    if (error.message.includes("Invalid recipient")) {
      console.log(`Wrong email address: `);
    } else {
      console.log(error);
    }
  }
});

router.post("/addemail", async (req, res) => {
  try {

    return res
      .status(201)
      .json({ message: "deprecated!" });

      
    const { email } = req.body;
    const existingEmail = await Emails.findOne({ email });
    if (existingEmail) {
      return res.status(200).json({ message: "Email already exists" });
    }
    const newEmail = new Emails({ email });
    await newEmail.save();
    return res
      .status(201)
      .json({ message: "Email added successfully", email: newEmail });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to add email",
      error: error.message,
    });
  }
});

router.get("/add-emails", async (req, res) => {
  try {
    // const emails = [
    //   '2alamsajid@gmail.com',
    //   'livingasrb007@gmail.com'
    // ]

    return res
      .status(201)
      .json({ message: "deprecated!" });

    const emails = ['2mdsajid@gmail.com','livingasrb007@gmail.com', 'anuzmessi44@gmail.com', 'keshav.acharya059@gmail.com', 'rx.laxman1@gmail.com', '1sameeradhikari2@gmail.com', 'prabeshalam7@gmail.com', 'bishalbanmala833@gmail.com', 'ashishbaral1856@gmail.com', 'baralb123@gmail.com', 'prashantbasel56@gmail.com', 'rajbasel056@gmail.com', 'abhibelbase@gmail.com', 'bhandarishristi485@gmail.com', 'bhandarisuyog3@gmail.com', 'adityabhardwaj113@gmail.com', 'suprasanna.bhatta@gmail.com', 'bhujel963@gmail.com', 'syrussenchury@gmail.com', 'bistsujata60@gmail.com', 'dshubhamraj2002@gmail.com', 'serajahamad3134@gmail.com', 'aditigautam06@gmail.com', 'ugeshgjm32@gmail.com', 'magardiksha03@gmail.com', 'aashutoshg51@gmail.com', 'roniyar.sachin78@gmail.com', 'bishruti111@gmail.com', 'sardogurung@gmail.com', 'shijangyawali70@gmail.com', 'iamayusss@gmail.com', 'himani2020jha@gmail.com', 'manas4jha@gmail.com', 'sneha.jha4567@gmail.com', 'aryanjoshi.np@gmail.com', 'mukeshjoshi68021@gmail.com', 'mukund224227@gmail.com', 'purakkc787@gmail.com', 'manishkapar632@gmail.com', 'binitkarki1475@gmail.com', 'sungarsh35@gmail.com', 'chetryseeja7890@gmail.com', 'alpukayastha.h@gmail.com', 'kcbishal613@gmail.com', 'khadkapuru777@gmail.com', 'surajmedico4567@gmail.comBatch', 'shubhamkundliya@gmail.com', 'preranakunwar2058@gmail.com', 'anishalamichhane2000@gmail.com', 'anupama.lamichhane123@gmail.com', 'maharjansajina.4@gmail.con', 'anilnobul@gmail.com', 'annchalsheema@gmail.com', 'neupaneaamod1@gmail.com', 'akashnishad026@gmail.com', 'nishantpandey057@gmail.com', 'umeshpant174@gmail.com', 'grishmaparajuli12@gmail.com', 'visikaparajuli@gmail.com', 'patelgautam1867@gmail.com', 'ahsuni977@gmail.com', 'sainpokhrel666@gmail.com', 'pokhrelsujal123@gmail.com', 'poudel.abhisekh25@gmail.com', 'hritikaprasad2002@gmail.com', 'akankshapriya1414@gmail.com', 'nehapuri2058@gmail.com', 'manasa.rajbanshi@gmail.com', 'isharegmi091@gmail.com', 'smritirimal5@gmail.com', 'ramchandraruchal2002@gmail.com', 'amar215678@gmail.com', 'sahmanisha839@gmail.com', 'memayank004@gmail.com', 'roxkks@gmail.com', 'shahran72779673@gmail.com', 'shahsaurav18ab@gmail.com', 'shahvenessa3@gmail.com', 'A1522079861331792@gmail.com', 'anuskastha321@gmail.com', 'jeenashresthadha@gmail.com', 'sthaprerana505@gmail.com', 'samirstha411@gmail.com', 'samirshre12@gmail.com', 'devyanshshukla.as.ds@gmail.com', 'meelansnrr@gmail.com', 'aparnaghising50@gmail.com', 'thakuranjana184@gmail.com', 'aayashathapa321@gmail.com', 'sumiranthapa84@gmail.com', 'bijayatimilsina64@gamil.comBatch', 'apinatiwari123@gmail.com', 'pranita2027@gmail.com', 'aashishyadav683@gmail.com', 'ay357717@gmail.com', 'yadavbarun900@gmail.com', 'yadavshruti7090@gmail.com', 'yadavuniverse123@gmail.com', 'yadavivek428@gmail.com', 'aayushkoirala1999@gmail.com']

    // const { email } = req.body;
    emails.forEach(async (email) => {
      const existingEmail = await Emails.findOne({ email });
      if (!existingEmail) {
        const newEmail = new Emails({ email });
        await newEmail.save();
      }
    })

    return res
      .status(201)
      .json({ message: "Email added successfully", emails: emails.length });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to add email",
      error: error.message,
    });
  }
});



router.post("/addunsubnotificemail", async (req, res) => {
  try {
    const { email } = req.body;
    const existingEmail = await Emails.findOne({ email });
    if (!existingEmail) {
      return res.status(400).json({ message: "Email Doesn't Exist" });
    }
    existingEmail.status = true;
    await existingEmail.save();
    return res.status(201).json({
      message: "Email unsubscribed successfully",
      email: existingEmail,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to unsubscribe email",
      error: error.message,
    });
  }
});

module.exports = router;
