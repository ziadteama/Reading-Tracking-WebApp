import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import bcrypt from "bcrypt";
import passport from "passport";
import session from "express-session";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import env from "dotenv";

const app = express();
const port = 3000;
const searchApiUrl = "https://openlibrary.org/search.json";
const saltRounds = 10;
env.config();

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      path: "/",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365,
      secure: false,
    },
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

let favBookName;
let noOfBooksRead = 0;
let favouriteAuthor;

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
  if (req.isAuthenticated()) {
    console.log(req.user.userid);
    const result = await db.query(
      "SELECT * FROM public.books WHERE userid = $1 ORDER BY rate DESC ",
      [req.user.userid]
    );
    const myBooks = result.rows;
    favBookName = myBooks[0] ? myBooks[0].title : "Start Reading Fool";
    noOfBooksRead = result.rowCount;
    favouriteAuthor = findMostRepeatedText(myBooks, `author`);
    res.render("home.ejs", {
      booksRead: noOfBooksRead,
      favouriteAuthor: favouriteAuthor,
      favBookName: favBookName,
      username: req.user.name,
    });
  } else {
    console.log(req.user);
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/books",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

app.get("/mybooks", async (req, res) => {
  if (!req.user) res.redirect("/login");
  else {
    const result = await db.query(
      `SELECT 
    *
FROM 
    users
INNER JOIN 
    books 
ON 
    users.userid = books.userid WHERE users.userid = $1 ORDER BY books.rate DESC`,
      [req.user.userid]
    );
    const mybooks = result.rows;
    res.render("mybooks.ejs", { myBooks: mybooks });
  }
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;
  const name = req.body.name;
  try {
    const checkResult = await db.query(`SELECT * from users WHERE email=$1`, [
      email,
    ]);
    if (checkResult.rows.length) res.redirect("/login");
    else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        let result = await db.query(
          `INSERT INTO users (email,password,name) VALUES ($1,$2,$3) RETURNING *`,
          [email, hash, name]
        );
        const user = result.rows[0];
        console.log(user);
        req.login(user, (err) => {
          console.log("success");
          res.redirect("/");
        });
      });
    }
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

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
  try {
    const result = await db.query(
      `INSERT INTO public.books(
	 title, author, publishyear, coverid, userid)
	VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
      [bookTitle, authorName, publishYear, bookId, req.user.userid]
    );
    console.log(result.rows);
    res.redirect("/mybooks");
  } catch (error) {
    res.status(505).send(error);
  }
});
app.post("/savemybooks", async (req, res) => {
  const coverId = parseInt(req.body.coverId, 10);
  if (req.body.delete) {
    const result = await db.query(
      `DELETE FROM books
WHERE coverid = $1;`,
      [coverId]
    );
  } else {
    const newNotes = req.body.newNotes;
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
  }

  res.redirect("/mybooks");
});
app.post("/delete", async (req, res) => {
  const coverId = req.body.coverId;
  const result = db.query(
    `DELETE FROM books
WHERE coverid = $1;`,
    [coverId]
  );
  res.redirect("/mybooks");
});

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * from users WHERE email=$1", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashPassword = user.password;
        bcrypt.compare(password, storedHashPassword, (err, valid) => {
          if (err) {
            console.log("error passwords conpare ", err);
            return cb(err);
          } else {
            if (valid) return cb(null, user);
            else return cb(null, false);
          }
        });
      } else {
        return cb("user not found");
      }
    } catch (error) {
      console.log(error);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/books",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accestoken, refreshtoken, profile, cb) => {
      console.log(profile.displayName);
      try {
        console.log(profile);
        const result = await db.query("SELECT * from users WHERE email=$1", [
          profile.email,
        ]);
        if (result.rows.length > 0) return cb(null, result.rows[0]);
        else {
          const newUser = await db.query(
            "INSERT INTO users (email, name, password) VALUES ($1, $2,$3)",
            [profile.email, profile.displayName, "google"]
          );
          return cb(null, newUser.rows[0]);
        }
      } catch (error) {
        return cb(error);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
