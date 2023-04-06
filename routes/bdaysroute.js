const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const Person = require('../schemas/personSchema');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');


router.get('/', (req, res) => {
  res.json({ data: 'this is home page' })
})

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
    const { name, bday, bio, year } = req.body;

    // Create a new person instance based on the schema
    const newPerson = new Person({
      name: name,
      bday: bday,
      pic: '',
      bio: bio || '',
      year: year || '',
      dob: '',
      min: Math.floor(Math.random() * 9) + 1,
      sec: Math.floor(Math.random() * 9) + 1
    });

    // If a file was uploaded, upload it to Cloudinary and set the person's pic property to the returned URL
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      newPerson.pic = result.secure_url;
      console.log('pic url', result.secure_url);
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


// GET all persons
router.get('/getallperson', async (req, res) => {
  try {
    const persons = await Person.find();
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

// Update user fields if they exist
router.post('/updateperson', upload.single('pic'), async (req, res) => {

  console.log('to update serevr')

  const { id, name, bio, bday } = req.body;
  const pic = req.file && req.file.path;

  console.log(id, name)

  // Check if person with the given ID exists
  const person = await Person.findById(id);
  if (!person) {
    return res.status(404).json({
      message: 'Person not found',
      status: 404,
      meaning: 'not found'
    });
  }

  // Update person's fields if they exist in request body
  if (name) {
    person.addName(name);
    console.log(name)
  }

  if (bio) {
    person.addBio(bio);
    console.log(bio)
  }

  if (bday) {
    person.addBday(bday);
    console.log(bday)
  }

  if (pic) {
    // Upload pic to cloudinary and store url in person's pic field
    try {
      const result = await cloudinary.uploader.upload(pic);
      person.addPic(result.secure_url);
      console.log(result.secure_url)
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: 'Error uploading pic',
        status: 500,
        meaning: 'internal server error'
      });
    }
  }

  // Save updated person to database
  try {
    await person.save();
    return res.status(200).json({
      message: 'Person updated successfully',
      person: person,
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




module.exports = router;