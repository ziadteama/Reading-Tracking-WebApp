import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
const app = express();
const port = 3000;
const searchApiUrl = "https://openlibrary.org/search.json";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];
app.get("/", (req, res) => {
  res.render("home.ejs", { users: users });
});
app.post("/search", async (req, res) => {
  const searchTitle = req.body.searchTitle;
  console.log(searchTitle);
  const response = await axios.get(
   searchApiUrl+`?title=${searchTitle}`
  );
  const booksFound = response.data;
  console.log(booksFound.numsFound);
  res.render("search.ejs", {
    booksFound: booksFound.docs,
    numFound: booksFound.numFound,
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
