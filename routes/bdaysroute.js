const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');


const Person = require('../schemas/personSchema');
const ReviewUser = require('../schemas/reviewSchema')
const Suggestion = require('../schemas/suggestionSchema')

router.get('/', (req, res) => {
  res.json({ data: 'this is home page' })
})

// TWILLIO CONFIG
const accountSid = 'AC108aa98b939e85693261d39bad6c8518';
const authToken = '2fdf40b03ed15fb4ec3cb78ee313e5f6';
const client = require('twilio')(accountSid, authToken);

// Configure cloudinary
cloudinary.config({
  cloud_name: 'dww0rxb4q',
  api_key: '459624268647755',
  api_secret: 'nnvB3I1oDJI5dDutlXIQ7ECE6H4'
});


// Set up multer storage settings
const DIR = './public/';
const uploadDir = `${DIR}uploads/`;
fse.ensureDir(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });


// Route handler for adding a new person
router.post('/addperson', upload.single('pic'), async (req, res) => {
  try {
    const { name, bday, bio } = req.body;

    // Create a new person instance based on the schema
    const newPerson = new Person({
      name: name,
      bday: bday,
      pic: '',
      bio: bio || '',
      year: '',
      dob: '',
      min: Math.floor(Math.random() * 9) + 1,
      sec: Math.floor(Math.random() * 9) + 1
    });

    // If a file was uploaded, upload it to Cloudinary and set the person's pic property to the returned URL
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      const url = cloudinary.url(result.public_id, { width: 300, height: 300, crop: "fill" });
      newPerson.pic = url;
      // console.log('pic url', result.secure_url);
      fs.unlinkSync(req.file.path); // Delete the file from the server
    }

    // Save the new person instance to the database
    const savedPerson = await newPerson.save();

    res.status(201).json({
      message: 'New person added successfully',
      person: newPerson,
      status: 201,
      meaning: 'created'
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: 'Failed to add a new person',
      error: error,
      status: 500,
      meaning: 'internal server error'
    });
  }
});


// GET all persons with reviews
router.get('/getreviewperson', async (req, res) => {
  try {
    const reviewPersons = await ReviewUser.find({ review: true });
    const newPersons = await Person.find({ published: false, review: true });
    const allPersons = reviewPersons.concat(newPersons);

    res.status(200).json({
      message: 'Success',
      data: allPersons,
      status: 200,
      meaning: 'OK'
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
      status: 500,
      meaning: 'Internal Server Error'
    });
  }
});


// GET all persons
router.get('/getallperson', async (req, res) => {
  try {
    const persons = await Person.find({ published: true, todelete: false });

    res.status(200).json({
      message: 'Success',
      data: persons,
      status: 200,
      meaning: 'OK'
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
      status: 500,
      meaning: 'Internal Server Error'
    });
  }
});

// update person after review
router.post('/updateperson', async (req, res) => {
  const { person } = req.body;
  const { id, name, bio, bday, pic, published, review, todelete, reject } = person;



  try {
    // Find the person by ID
    const toperson = await Person.findById(id);

    if (!toperson) {
      return res.status(404).json({
        message: 'Person not found',
        status: 404,
        meaning: 'not found'
      });
    }

    if (reject === true) {
      await ReviewUser.findOneAndDelete({ _id: person.id });
      toperson.review = false
      toperson.published = false
      return res.status(200).json({
        message: 'Person rejected',
        status: 200,
        meaning: 'ok',
        person: toperson
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
      message: 'Person updated',
      person: toperson,
      status: 200,
      meaning: 'ok'
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Error saving person to database',
      status: 500,
      meaning: 'internal server error'
    });
  }
});

// adding a person after review
router.post('/addreview', upload.single('pic'), async (req, res) => {
  // console.log('to add review user')
  
  let urls=[]
  const { id, name, bio, bday, del } = req.body;
  const pic = req.file && req.file.path;



  // if (!reviewUser) {
  //   return res.status(400).json({
  //     message: "User not found",
  //     status: 400,
  //     meaning: "The user with the given ID does not exist",
  //   });
  // }



  if (pic) {
    // Upload pic to cloudinary and store url in person's pic field
    try {
      const result = await cloudinary.uploader.upload(pic);
      const url = cloudinary.url(result.public_id, { width: 300, height: 300, crop: "fill" });
      urls.push(url)
      fs.unlinkSync(req.file.path);
      // console.log(url)
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: 'Error uploading pic',
        status: 500,
        meaning: 'internal server error'
      });
    }
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
        published: true
      });
    }

    console.log(reviewUser)
    await reviewUser.save();

    // console.log('del in rev', reviewUser)

    if (reviewUser.todelete === true) {
      console.log('delet...............')
      return res.status(201).json({
        message: "User has been marked for deletion",
        status: 200,
        meaning: "Success",
        user: reviewUser
      });
    } else {
      return res.status(201).json({
        message: 'Data sent for review',
        reviewUser: reviewUser,
        status: 201,
        meaning: 'Created'
      });
    }

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: 'Unable to send the data for review',
      status: 500,
      meaning: 'Internal Server Error'
    });
  }
});

// adding suggestion
router.post('/addsuggestion', async (req, res) => {
  const { name, email, suggestion } = req.body;

  try {
    const newSuggestion = new Suggestion({ name, email, suggestion });
    const savedSuggestion = await newSuggestion.save();

    if (savedSuggestion) {

      client.messages
        .create({
          body: JSON.stringify(req.body),
          from: 'whatsapp:+14155238886',
          to: 'whatsapp:+9779823316313'
        })
        .then(message => console.log(message.sid))


      res.status(201).json({
        message: 'Suggestion Received',
        suggestion: savedSuggestion,
        status: 201,
        meaning: 'created'
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Server error',
      status: 500,
      meaning: 'internal server error'
    });
  }
});

// get suggestions
router.get('/getsuggestions', async (req, res) => {
  try {
    const suggestions = await Suggestion.find();
    if (suggestions) {
      res.status(200).json({
        message: 'Success',
        data: suggestions,
        status: 200,
        meaning: 'OK'
      });
    }

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
      status: 500,
      meaning: 'Internal Server Error'
    });
  }
});


module.exports = router;