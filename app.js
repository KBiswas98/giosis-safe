const express = require("express");
const axios = require("axios");
const redis = require("redis");
const responseTime = require("response-time");
const bodyParser = require("body-parser");
const { promisify } = require("util");

const app = express();
app.use(bodyParser.json());
app.use(responseTime());

const client = redis.createClient();

const GET_ASYNC = promisify(client.get).bind(client);
const SET_ASYNC = promisify(client.set).bind(client);

const SAVE_TO_CACHE = async (id, data, ttl) => {
  return await SET_ASYNC(`address#${id}`, JSON.stringify(data), "EX", ttl);
};

app.get("/health-check", (req, res, next) => {
  res.json({ status: "OK" });
});

app.get("/get-single-address/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const cachedAddress = await GET_ASYNC("address#" + id);

    if (cachedAddress) {
      res.send(JSON.parse(cachedAddress));
      return;
    }

    const response = await axios.get(
      `https://safe-transaction.gnosis.io/api/v1/safes/${id}/balances/usd/?trusted=false&exclude_spam=false`
    );

    await SAVE_TO_CACHE(id, response.data, 15);
    res.send(response.data);
  } catch (err) {
    res.send(err.message);
  }
});

const fetchAddressFromCache = async (ids) => {
  const cacheAddress = [];
  const cachedIds = [];

  await Promise.all(ids.map((id) => GET_ASYNC("address#" + id))).then((res) => {
    res.forEach((itm, index) => {
      if (!!itm) {
        cacheAddress.push(JSON.parse(itm));
        cachedIds.push(ids[index]);
      }
    });
  });
  return [cacheAddress, cachedIds];
};

app.post("/get-address", async (req, res, next) => {
  try {
    const ids = req.body.ids;
    const apiResponse = [];

    const [cacheAddress, cachedIds] = await fetchAddressFromCache(ids);

    if (cachedIds.length === ids.length) {
      console.log("\n > Return from cache.");
      res.send(cacheAddress);
      return;
    }

    const needToFetch = ids.filter((_id) => !cachedIds.includes(_id));

    console.log("\n\n\n > fetch address: ", needToFetch);

    Promise.all(
      needToFetch.map((id) =>
        axios.get(
          `https://safe-transaction.gnosis.io/api/v1/safes/${id}/balances/usd/?trusted=false&exclude_spam=false`
        )
      )
    )
      .then((response) => response.map((itm) => itm.data))
      .then(async (data) => {
        await data.forEach(async (itm, index) => {
          const saveResult = await SAVE_TO_CACHE(needToFetch[index], itm, 60);
        });
        console.log("\n > Save to cache: ", needToFetch);
        res.send([...data, ...cacheAddress]);
      });
  } catch (err) {
    res.send(err.message);
  }
});

app.listen(3000, () => console.log("Server start at 30000"));
