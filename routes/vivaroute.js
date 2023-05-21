const express = require('express');
const router = express.Router();


const Viva = require('../schemas/vivaSchema')

router.get('/testt', async (req, res) => {
    res.json({ 'message': 'fuck br it is working' })
})

router.get('/getselectedviva/:level/:subject', async (req, res) => {
    try {

        const { level, subject } = req.params;

        // Query the Viva collection using the specified subject and level
        const selectedVivas = await Viva.find({ subject, level });

        res.status(200).json({
            message: 'level & subject data fetched successfully',
            data: selectedVivas,
            status: 200,
        });
    } catch (error) {
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            status: 500,
        });
    }
});

router.get('/getselectedviva/:level?', async (req, res) => {
    try {
      const { level } = req.params;
      const { subject } = req.query;
  
      let query = {};
      if (level) {
        query.level = level;
      }
      if (subject) {
        query.subject = subject;
      }
  
      // Query the Viva collection using the specified subject and/or level
      const selectedVivas = await Viva.find(query);
const revertedVivas = selectedVivas.reverse();

      console.log("🚀 ~ file: vivaroute.js:48 ~ router.get ~ selectedVivas:", selectedVivas)
  
      res.status(200).json({
        message: 'Data fetched successfully',
        data: revertedVivas,
        status: 200,
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal Server Error',
        error: error.message,
        status: 500,
      });
    }
  });
  

/*
router.get('/getselectedviva/:level', async (req, res) => {
    try {
        const { level } = req.params;

        // Query the Viva collection using the specified subject and level
        const selectedVivas = await Viva.find({ level });

        res.status(200).json({
            message: 'level data fetched successfully',
            data: selectedVivas,
            status: 200,
        });
    } catch (error) {
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            status: 500,
        });
    }
});

router.get('/getselectedviva/:subject', async (req, res) => {
    try {

        const { subject } = req.params;

        // Query the Viva collection using the specified subject and subject
        const selectedVivas = await Viva.find({ subject });

        res.status(200).json({
            message: 'subject data fetched successfully',
            data: selectedVivas,
            status: 200,
        });
    } catch (error) {
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            status: 500,
        });
    }
});

*/


router.post('/addviva', async (req, res) => {
    try {
        const { author, content, subject, level } = req.body;

        // Create a new viva document
        const newViva = new Viva({
            author,
            content,
            subject,
            level
        });

        // Save the new viva to the database
        await newViva.save();

        res.status(200).json({
            message: 'Viva added successfully',
            data: newViva,
            status: 200,
            meaning: 'OK'
        });
    } catch (error) {
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message,
            status: 500,
            meaning: 'Internal Server Error'
        });
    }
});







module.exports = router;