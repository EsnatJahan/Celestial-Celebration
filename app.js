// special: insert current folder in NODE_PATH so we can require() with relative path from project root
process.env.NODE_PATH = __dirname;
require("module").Module._initPaths();

// import everything we need
const express = require("express");
const cors = require("cors");
const ejs = require("ejs");
const createError = require("http-errors");
const path = require("path");
const cookieParser = require("cookie-parser");
const mysql = require("mysql2/promise");

// our modules
const pageLoader = require("./middlewares/pageLoader");
const apiRouter = require("./routes/apiRouter");
const { resolve6 } = require("dns/promises");

// constant configs
const PORT = 8000;
const DB_CONFIG = {
  host: "localhost",
  user: "root",
  database: "CelestialCelebration",
  password: "",
};

// initialize our backend app
const app = express();

// setup view engine (ejs) to render pages
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.engine("ejs", async (path, data, cb) => {
  try {
    let html = await ejs.renderFile(path, data, {
      async: true,
      cache: true,
    });
    cb(null, html);
  } catch (e) {
    cb(e, "");
  }
});

// setup middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// setup routes
app.use("/api", apiRouter);
app.use(pageLoader);

// didn't match till now. means the page doesn't exist. throw a 404 error so not found error can be shown to user
app.use(function (req, res, next) {
  next(createError(404));
});

// show error page
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

async function main() {
  try {
    // setup db connection
    console.log("Connecting to database...");
    const db = await mysql.createConnection(DB_CONFIG);
    console.log("Connected to database");

    // inject require and db  in locals so ejs files can access them
    app.locals = {
      ...app.locals,
      require,
      db,
    };

    // setup live reload on development server
    if (process.env.NODE_ENV === "development") {
      //Livereload code
      const livereload = require("livereload");
      const connectLiveReload = require("connect-livereload");

      const liveReloadServer = livereload.createServer();
      liveReloadServer.watch(path.join(__dirname, "public"));
      liveReloadServer.server.once("connection", () => {
        setTimeout(() => {
          liveReloadServer.refresh("/");
        }, 100);
      });
      app.use(connectLiveReload());
    }

    // start the server
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error connecting to database: ", error);
  }
}


  



// run the main function to start everything
main().catch(console.error);
