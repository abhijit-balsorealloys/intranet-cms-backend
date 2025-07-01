const express = require("express");
const cors = require('cors');
const bodyParser = require("body-parser");
const userRoutes = require("./routes/users");

const app = express();

app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 


const PORT = 3014;

app.use(cors({
  origin: ['http://localhost:3011', 'http://80.9.2.78:3011', 'http://117.240.74.202:3011', 'http://localhost:3013','http://80.9.2.78:3013'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Middleware
app.use(bodyParser.json());

// Routes
app.use("/api/users", userRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
