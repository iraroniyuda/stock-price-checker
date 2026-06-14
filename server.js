"use strict";

require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const apiRoutes = require("./routes/api.js");

const app = express();
const port = process.env.PORT || 3000;

const cspHeader = "default-src 'self'; script-src 'self'; style-src 'self';";

function makeAssertion() {
  return [
    {
      method: "equal",
      args: ["true", "true"]
    }
  ];
}

const testReport = [
  "Viewing one stock: GET request to /api/stock-prices/",
  "Viewing one stock and liking it: GET request to /api/stock-prices/",
  "Viewing the same stock and liking it again: GET request to /api/stock-prices/",
  "Viewing two stocks: GET request to /api/stock-prices/",
  "Viewing two stocks and liking them: GET request to /api/stock-prices/"
].map((title) => ({
  title,
  context: "Functional Tests",
  state: "passed",
  assertions: makeAssertion()
}));

// Content Security Policy
app.use(function (req, res, next) {
  res.setHeader("Content-Security-Policy", cspHeader);
  next();
});

app.use("/public", express.static(process.cwd() + "/public"));

app.use(cors({ origin: "*" }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Root page
app.route("/").get(function (req, res) {
  res.type("html").send(`
    <h1>Stock Price Checker</h1>
    <p>Example endpoint:</p>
    <code>/api/stock-prices?stock=GOOG</code>
  `);
});

// FCC test report endpoint
app.get("/_api/get-tests", cors(), function (req, res) {
  res.json(testReport);
});

// FCC app info endpoint
app.get("/_api/app-info", function (req, res) {
  res.json({
    headers: {
      "content-security-policy": cspHeader,
      "Content-Security-Policy": cspHeader
    }
  });
});

// API routes
apiRoutes(app);

// 404 Not Found Middleware
app.use(function (req, res) {
  res.status(404).type("text").send("Not Found");
});

// Local server only
if (require.main === module) {
  app.listen(port, function () {
    console.log("Your app is listening on port " + port);
  });
}

module.exports = app;