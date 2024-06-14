import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
const app = express();
const port = 3000;
const searchApiUrl='https://openlibrary.org/search.json';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


let users=[
    { id: 1, name: "Angela", color: "teal" },
    { id: 2, name: "Jack", color: "powderblue" },
];
app.get("/",(req,res)=>{
    res.render("home.ejs",{users:users});
});
app.get("/search",(req,res)=>{
res.render("search.ejs",{bookId:14625765,
    authorName:"Magdy Shata"
});
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });