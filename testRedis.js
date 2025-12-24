const redis = require("redis");

(async () => {
  try {
    const client = redis.createClient({
      socket: { host: "127.0.0.1", port: 6379 },
      // password: "yourpassword" // only if set
    });
    client.on("error", (err) => console.error("Redis error:", err));
    await client.connect();
    console.log(await client.ping()); // should print PONG
    await client.quit();
  } catch (err) {
    console.error("Connection failed:", err);
  }
})();
