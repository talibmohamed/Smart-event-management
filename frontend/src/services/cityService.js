import api from "./api";

const cityService = {
  searchCities(search = "") {
    return api.get("/cities", {
      params: { search },
    });
  },
};

export default cityService;
