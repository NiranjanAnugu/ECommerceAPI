require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) =>{
res.send("Hello! This is Niranjan Reddy Anugu.")
});

app.get("/greet", (req, res) =>{
res.json({"message": "Welcome to the Node.js API!"});
});

app.listen(PORT, ()=>{
console.info(`Server is Running on PORT: ${PORT}`);
});
