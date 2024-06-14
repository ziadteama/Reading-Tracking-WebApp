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

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];
app.get("/", (req, res) => {
  res.render("home.ejs", { users: users });
});
app.get("/mybooks",async (req,res)=>{
    const result = await db.query('SELECT * FROM public.books');
    const myBooks= result.rows;
    
    res.render
});

app.post("/search", async (req, res) => {
  const searchTitle = req.body.searchTitle;
  console.log(searchTitle);
  const response = await axios.get(
   searchApiUrl+`?title=${searchTitle}`
  );
  const booksFound = response.data;
  res.render("search.ejs", {
    booksFound: booksFound.docs,
    numFound: booksFound.numFound,
  });
});
app.post("/add", async (req,res)=>{
    const authorName = req.body.authorName;
    const publishYear = req.body.PublishYear;
    const bookTitle = req.body.bookTitle;
    const bookId = req.body.bookId;

    const result = await db.query(`INSERT INTO public.books(
	 title, author, publishyear, coverid)
	VALUES ($1, $2, $3, $4);`,[bookTitle,authorName,publishYear,bookId]);
    res.redirect("/search");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
