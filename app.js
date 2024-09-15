const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const piiRoutes = require('./routes/piiRoutes');

app.use(express.json());



// Enable CORS for all origins (for development purposes)
app.use(cors());

// Setup routes
app.use('/detectPII', piiRoutes);

app.get('/results/:filename', (req, res) => {
    const filename = req.params.filename; // Correct parameter name
    const filePath = path.join(__dirname, "outputs", filename); // Use filename correctly
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        res.json({"verdict" : "Starting"});
      } else {
        res.sendFile(filePath);
      }
    });
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
