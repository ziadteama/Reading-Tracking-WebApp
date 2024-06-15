import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import { config } from "process";
const app = express();
const port = 3000;
const searchApiUrl = "https://openlibrary.org/search.json";
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "book",
  password: "Ziadteama1",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
let favBookName;
let noOfBooksRead = 0;
let favouriteAuthor;
let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

function findMostRepeatedText(array, key) {
  let counts = {};
  let mostRepeatedText = null;
  let highestCount = 0;

  array.forEach((obj) => {
    let text = obj[key];
    counts[text] = (counts[text] || 0) + 1;
    if (counts[text] > highestCount) {
      highestCount = counts[text];
      mostRepeatedText = text;
    }
  });

  return mostRepeatedText;
}

app.get("/", async (req, res) => {
  const result = await db.query(
    "SELECT * FROM public.books ORDER BY rate DESC "
  );
  const myBooks = result.rows;
  favBookName = myBooks[0].title;
  noOfBooksRead = result.rowCount;
  favouriteAuthor = findMostRepeatedText(myBooks, `author`);
  res.render("home.ejs", {
    booksRead: noOfBooksRead,
    favouriteAuthor: favouriteAuthor,
    favBookName: favBookName,
  });
});
app.get("/mybooks", async (req, res) => {
  const result = await db.query(
    "SELECT * FROM public.books ORDER BY rate DESC "
  );
  const mybooks=result.rows;
  res.render("mybooks.ejs", { myBooks: mybooks });
});

app.post("/search", async (req, res) => {
  const searchTitle = req.body.searchTitle;
  console.log(searchTitle);
  const response = await axios.get(searchApiUrl + `?title=${searchTitle}`);
  const booksFound = response.data;
  res.render("search.ejs", {
    booksFound: booksFound.docs,
    numFound: booksFound.numFound,
  });
});
app.post("/add", async (req, res) => {
  const authorName = req.body.authorName;
  const publishYear = req.body.PublishYear;
  const bookTitle = req.body.bookTitle;
  const bookId = req.body.bookId;

  const result = await db.query(
    `INSERT INTO public.books(
	 title, author, publishyear, coverid)
	VALUES ($1, $2, $3, $4);`,
    [bookTitle, authorName, publishYear, bookId]
  );
  res.redirect("/mybooks");
});
app.post("/savemybooks", async (req, res) => {
  const newNotes = req.body.newNotes;
  const coverId = req.body.coverId;
  const bookRate = req.body.rate;
  const notes = newNotes.trimStart();
  if (bookRate) {
    const result = await db.query(
      `UPDATE books
SET notes =$1, rate=$2
WHERE coverid = $3;`,
      [notes, bookRate, coverId]
    );
  } else {
    const result = await db.query(
      `UPDATE books
SET notes =$1
WHERE coverid = $2;`,
      [notes, coverId]
    );
  }

  res.redirect("/mybooks");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
