const path = require("path");
const fs = require("fs/promises");
const createError = require("http-errors");
const util = require("util");

// these paths are ignored because other routes are suppose to handle them
const ignore_url_prefix = ["api"];
const ignored_files = ["/index.html"];

// these paths gets redirected
const redirects = {
  "/": "/home.html",
  "/index.html": "/home.html",
};

// inject favicon, jquery and font-awesome in head section of all pages.
let head_inject = `<link rel="icon" href="/assets/icons/favicon.ico" />
                   <script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>
                   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==" crossorigin="anonymous" referrerpolicy="no-referrer" />
                   `;
if (process.env.NODE_ENV === "development") {
  // in development environment inject livereload script in head too.
  head_inject += `<script src="http://localhost:35729/livereload.js?snipver=1"></script>`;
}

// load pages from views/pages directory
// our primary router.
// behavior:
//     - it takes the request checks if there's corresponding ejs file for the path given in request. renders it to html and sends it to client
// special:
//     - redirects paths in redirects dictionary
//     - ignores paths that start with items in ignore_url_prefix array
//     - ignores paths listed in ignored_files array
//     - ignores files and folders starting with . and _ .
//     - looks for ejs files for .html and .htm file requests
//     - after building the html file from ejs it puts contents of head_inject in <head> </head> section.
const pageLoader = async (req, res, next) => {
  let url = req._parsedUrl.pathname;
  // apply redirects
  if (redirects[url]) {
    res.redirect(301, redirects[url]);
    return;
  }

  // only handle GET and HEAD requests
  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }

  // ignore paths form ignore list
  for (let i = 0; i < ignored_files.length; i++) {
    if (url.startsWith(ignored_files[i])) {
      next();
      return;
    }
  }

  let url_split = url.split("/");
  url_split = url_split.filter((item) => item !== "");

  if (ignore_url_prefix.includes(url_split[0])) {
    // these are handled by other routers
    next();
    return;
  }

  for (let i = 0; i < url_split.length; i++) {
    // hidden files & directories and files & folders starting with underscore are ignored
    if (url_split[i].startsWith(".") || url_split[i].startsWith("_")) {
      next();
      return;
    }
  }

  // directory path is empty, load home page
  if (url_split.length === 0) url_split.push("index.html");

  let fname = url_split[url_split.length - 1];
  url_split.pop();

  // set file extension to .ejs
  if (fname.endsWith(".html") || fname.endsWith(".htm")) {
    let fname_split = fname.split(".");
    fname_split.pop();
    fname = fname_split.join(".");
  }

  const file_path = path.join(
    __dirname,
    "..",
    "views",
    "pages",
    ...url_split,
    fname + ".ejs"
  );
  try {
    if (await fs.stat(file_path)) {
      res.render = util.promisify(res.render);
      let html = await res.render(`pages/${url_split.join("/")}/${fname}`, {
        title: fname.charAt(0).toUpperCase() + fname.slice(1),
        req: req,
        //user: res.user,
      });
      // inject favicon and livereload script
      html = html.replace("<head>", `<head> ${head_inject} `);
      res.status(200).send(html);
    }
  } catch (err) {
    console.error(err);
    if (err.code === "ENOENT") {
      next(createError(404));
    } else {
      if (process.env.NODE_ENV === "development") {
        err.message = `Error rendering ${fname}: ${err.message}`;
        console.error(err);
        next(err);
      } else {
        next(createError(404));
      }
    }
  }
};

module.exports = pageLoader;
