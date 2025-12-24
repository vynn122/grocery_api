const jwt = require("jsonwebtoken");

exports.validate_token = () => {
  return (req, res, next) => {
    var token_from_client = null;
    // web(cookie)
    if (req.cookies && req.cookies.token) {
      token_from_client = req.cookies.token;
    }

    // mobile
    var authorization = req.headers.authorization; // token from client
    if (!token_from_client && authorization != null && authorization != "") {
      token_from_client = authorization.split(" "); // authorization : "Bearer <token>"
      token_from_client = token_from_client[1]; // get only access_token
    }

    if (token_from_client == null) {
      res.status(401).send({
        message: "Unauthorized",
      });
    } else {
      jwt.verify(
        token_from_client,
        process.env.JWT_SECRET,
        (error, payload) => {
          if (error) {
            res.status(401).send({
              message: "Unauthorized",
              error: error,
            });
          } else {
            req.user = payload;
            next();
          }
        }
      );
    }
  };
};

exports.validate_tokens = () => {
  return (req, res, next) => {
    // 👇 get token from cookies (e.g. auth_token)
    const token_from_client = req.cookies?.auth_token;

    if (!token_from_client) {
      return res.status(401).send({
        message: "Unauthorized",
      });
    }

    jwt.verify(token_from_client, process.env.JWT_SECRET, (error, result) => {
      if (error) {
        return res.status(401).send({
          message: "Unauthorized",
          error: error,
        });
      } else {
        req.user = result;
        next();
      }
    });
  };
};
exports.generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};
exports.generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
};
