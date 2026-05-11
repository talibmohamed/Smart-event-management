import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized",
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token invalid",
    });
  }

  try {
    const user = await User.findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Account suspended",
      });
    }

    req.user = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      status: user.status,
    };
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error during authentication",
    });
  }
};

export default protect;
