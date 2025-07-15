require("dotenv").config();
const startApi = require("./api");
const startBot = require("./bot");

startApi();
startBot();
