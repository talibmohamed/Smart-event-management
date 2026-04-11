import { searchFrenchCities } from "../utils/frenchCities.js";

const getCities = (req, res) => {
  const cities = searchFrenchCities(req.query.search);

  return res.status(200).json({
    success: true,
    message: "Cities retrieved successfully",
    data: cities
  });
};

export default {
  getCities
};

