const chaiHttp = require("chai-http");
const chai = require("chai");
const assert = chai.assert;
const server = require("../server");

chai.use(chaiHttp);

suite("Functional Tests", function () {
  let likedStockLikes;

  test("Viewing one stock: GET request to /api/stock-prices/", function (done) {
    chai
      .request(server)
      .get("/api/stock-prices")
      .query({ stock: "GOOG" })
      .end(function (err, res) {
        if (err) return done(err);

        assert.equal(res.status, 200);
        assert.property(res.body, "stockData");
        assert.isString(res.body.stockData.stock);
        assert.isNumber(res.body.stockData.price);
        assert.isNumber(res.body.stockData.likes);

        done();
      });
  });

  test("Viewing one stock and liking it: GET request to /api/stock-prices/", function (done) {
    chai
      .request(server)
      .get("/api/stock-prices")
      .query({
        stock: "MSFT",
        like: "true"
      })
      .end(function (err, res) {
        if (err) return done(err);

        assert.equal(res.status, 200);
        assert.property(res.body, "stockData");
        assert.equal(res.body.stockData.stock, "MSFT");
        assert.isNumber(res.body.stockData.price);
        assert.isNumber(res.body.stockData.likes);

        likedStockLikes = res.body.stockData.likes;

        done();
      });
  });

  test("Viewing the same stock and liking it again: GET request to /api/stock-prices/", function (done) {
    chai
      .request(server)
      .get("/api/stock-prices")
      .query({
        stock: "MSFT",
        like: "true"
      })
      .end(function (err, res) {
        if (err) return done(err);

        assert.equal(res.status, 200);
        assert.equal(res.body.stockData.stock, "MSFT");
        assert.equal(res.body.stockData.likes, likedStockLikes);

        done();
      });
  });

  test("Viewing two stocks: GET request to /api/stock-prices/", function (done) {
    chai
      .request(server)
      .get("/api/stock-prices")
      .query({
        stock: ["MSFT", "GOOG"]
      })
      .end(function (err, res) {
        if (err) return done(err);

        assert.equal(res.status, 200);
        assert.property(res.body, "stockData");
        assert.isArray(res.body.stockData);
        assert.lengthOf(res.body.stockData, 2);

        assert.isString(res.body.stockData[0].stock);
        assert.isNumber(res.body.stockData[0].price);
        assert.isNumber(res.body.stockData[0].rel_likes);

        assert.isString(res.body.stockData[1].stock);
        assert.isNumber(res.body.stockData[1].price);
        assert.isNumber(res.body.stockData[1].rel_likes);

        assert.equal(
          res.body.stockData[0].rel_likes,
          -res.body.stockData[1].rel_likes
        );

        done();
      });
  });

  test("Viewing two stocks and liking them: GET request to /api/stock-prices/", function (done) {
    chai
      .request(server)
      .get("/api/stock-prices")
      .query({
        stock: ["AAPL", "TSLA"],
        like: "true"
      })
      .end(function (err, res) {
        if (err) return done(err);

        assert.equal(res.status, 200);
        assert.property(res.body, "stockData");
        assert.isArray(res.body.stockData);
        assert.lengthOf(res.body.stockData, 2);

        assert.isNumber(res.body.stockData[0].rel_likes);
        assert.isNumber(res.body.stockData[1].rel_likes);

        assert.equal(
          res.body.stockData[0].rel_likes,
          -res.body.stockData[1].rel_likes
        );

        done();
      });
  });
});