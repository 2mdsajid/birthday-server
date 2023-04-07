const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  bday: {
    type: String,
    required: true
  },
  pic: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  isbirthday: {
    type: Boolean,
    default: false
  },
  published: {
    type: Boolean,
    default: false
  },
  review: {
    type: Boolean,
    default: false
  },
  todelete: {
    type: Boolean,
    default: false
  },
  dob: {
    type: String,
    default: ''
  },
  min: {
    type: String,
    default: ''
  },
  sec: {
    type: String,
    default: ''
  }
});

personSchema.methods.addName = async function (name) {
  try {
      this.name = name;
      // await this.save();
      return this.name;
  } catch (error) {
      console.log(error);
  }
}
personSchema.methods.addPic = async function (picUrl) {
  try {
      this.pic = picUrl;
      // await this.save();
      return this.pic;
  } catch (error) {
      console.log(error);
  }
}


personSchema.methods.addBio = async function (bio) {
  try {
      this.bio = bio;
      // await this.save();
      return this.bio;
  } catch (error) {
      console.log(error);
  }
}

personSchema.methods.addReview = async function () {
  try {
      this.review = true;
      // await this.save();
      return this.review;
  } catch (error) {
      console.log(error);
  }
}

personSchema.methods.removeReview = async function () {
  try {
      this.review = false;
      // await this.save();
      return this.review;
  } catch (error) {
      console.log(error);
  }
}

personSchema.methods.addBday = async function (bday) {
  try {
      this.bday = bday;
      // await this.save();
      return this.bday;
  } catch (error) {
      console.log(error);
  }
}


const Person = mongoose.model('PERSON', personSchema);

module.exports = Person;
