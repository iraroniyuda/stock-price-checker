"use strict";

const crypto = require("crypto");
const https = require("https");
const mongoose = require("mongoose");

let isMongoConnected = false;

const memoryStocks = {};

const stockSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true
  },
  likes: {
    type: [String],
    default: []
  }
});

const StockLike =
  mongoose.models.StockLike || mongoose.model("StockLike", stockSchema);

async function connectMongo() {
  if (!process.env.DB) return false;

  if (isMongoConnected || mongoose.connection.readyState === 1) {
    return true;
  }

  await mongoose.connect(process.env.DB);

  isMongoConnected = true;
  return true;
}

function anonymizeIp(ip) {
  return crypto
    .createHash("sha256")
    .update(String(ip || "unknown-ip"))
    .digest("hex");
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.connection.remoteAddress || "unknown-ip";
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

async function fetchStockPrice(symbol) {
  const cleanSymbol = String(symbol).toLowerCase();
  const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${cleanSymbol}/quote`;

  const data = await getJson(url);

  return {
    stock: (data.symbol || symbol).toUpperCase(),
    price: Number(data.latestPrice || data.close || data.previousClose || 0)
  };
}

async function getLikeCount(symbol, like, hashedIp) {
  const upperSymbol = symbol.toUpperCase();
  const hasMongo = await connectMongo();

  if (!hasMongo) {
    if (!memoryStocks[upperSymbol]) {
      memoryStocks[upperSymbol] = {
        symbol: upperSymbol,
        likes: []
      };
    }

    if (like && !memoryStocks[upperSymbol].likes.includes(hashedIp)) {
      memoryStocks[upperSymbol].likes.push(hashedIp);
    }

    return memoryStocks[upperSymbol].likes.length;
  }

  let stockDoc = await StockLike.findOne({ symbol: upperSymbol });

  if (!stockDoc) {
    stockDoc = await StockLike.create({
      symbol: upperSymbol,
      likes: []
    });
  }

  if (like && !stockDoc.likes.includes(hashedIp)) {
    stockDoc.likes.push(hashedIp);
    await stockDoc.save();
  }

  return stockDoc.likes.length;
}

async function buildStockData(symbol, like, hashedIp) {
  const priceData = await fetchStockPrice(symbol);
  const likes = await getLikeCount(priceData.stock, like, hashedIp);

  return {
    stock: priceData.stock,
    price: priceData.price,
    likes
  };
}

module.exports = function (app) {
  app.route("/api/stock-prices").get(async function (req, res) {
    try {
      const stockQuery = req.query.stock;
      const like = req.query.like === "true" || req.query.like === true;
      const hashedIp = anonymizeIp(getClientIp(req));

      if (!stockQuery) {
        return res.json({ error: "stock symbol required" });
      }

      const stocks = Array.isArray(stockQuery) ? stockQuery : [stockQuery];

      if (stocks.length === 1) {
        const stockData = await buildStockData(stocks[0], like, hashedIp);

        return res.json({
          stockData
        });
      }

      const firstStock = await buildStockData(stocks[0], like, hashedIp);
      const secondStock = await buildStockData(stocks[1], like, hashedIp);

      const firstRelLikes = firstStock.likes - secondStock.likes;
      const secondRelLikes = secondStock.likes - firstStock.likes;

      return res.json({
        stockData: [
          {
            stock: firstStock.stock,
            price: firstStock.price,
            rel_likes: firstRelLikes
          },
          {
            stock: secondStock.stock,
            price: secondStock.price,
            rel_likes: secondRelLikes
          }
        ]
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "server error" });
    }
  });
};