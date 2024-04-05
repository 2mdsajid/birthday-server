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
  const today = moment().format("MMM DD");
  async function getPersonsWithTodayBirthday() {
    const persons = await Person.find({
      published: true,
      review: false,
    });
    const personsWithTodayBirthday = persons.filter((person) => {
      const bday = moment(person.bday.toLowerCase(), "MMM D").format("MMM DD");
      return bday === today;
    });
    return personsWithTodayBirthday;
  }
  const bdays = await getPersonsWithTodayBirthday();
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
      <div style="font-size: 12px; color: #999999; text-align: center; margin: 7px 0;">
        <strong><i>THIS IS AN AUTO GENERATED MAIL FROM THE MAIN WEBSITE. THIS WILL BE GENERATED WHENEVER THERE IS A BIRTHDAY</i></strong>
      </div>
      <div style="font-size: 12px; color: #999999; text-align: center;">
        You can visit the original website
        <a href="${process.env.FRONTEND}/" style="color: #999999; text-decoration: underline;">here</a>.
      </div>
      <div style="font-size: 12px; color: #999999; text-align: center;">
        Or add your birthday <a href="${process.env.FRONTEND}/addnew/" style="color: #999999; text-decoration: underline;">here</a>.
      </div>
      <div style="font-size: 12px; color: #999999; text-align: center;">
        Or learn more about us <a href="${process.env.FRONTEND}/about/" style="color: #999999; text-decoration: underline;">here</a>.
      </div>
      <div style="font-size: 12px; color: #999999; text-align: center;">
        And sorry if you did not like this and do not want to receive reminders in the future then <a href="${process.env.FRONTEND}/unsubscribe" style="color: #999999; text-decoration: underline;">click here</a>.
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
    const emails = [
      '2alamsajid@gmail.com',
      'livingasrb007@gmail.com'
    ]
    // const { email } = req.body;
    emails.forEach(async (email) => {
      const existingEmail = await Emails.findOne({ email });
      if (!existingEmail) {
        const newEmail = new Emails({ email });
        console.log("🚀 ~ emails.forEach ~ newEmail:", newEmail)
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
      return res.status(200).json({ message: "Email Doesn't Exist" });
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
