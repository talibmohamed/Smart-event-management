export const frenchCities = [
  { name: "Paris", postal_code: "75000", department: "Paris" },
  { name: "Marseille", postal_code: "13000", department: "Bouches-du-Rhone" },
  { name: "Lyon", postal_code: "69000", department: "Rhone" },
  { name: "Toulouse", postal_code: "31000", department: "Haute-Garonne" },
  { name: "Nice", postal_code: "06000", department: "Alpes-Maritimes" },
  { name: "Nantes", postal_code: "44000", department: "Loire-Atlantique" },
  { name: "Montpellier", postal_code: "34000", department: "Herault" },
  { name: "Strasbourg", postal_code: "67000", department: "Bas-Rhin" },
  { name: "Bordeaux", postal_code: "33000", department: "Gironde" },
  { name: "Lille", postal_code: "59000", department: "Nord" },
  { name: "Rennes", postal_code: "35000", department: "Ille-et-Vilaine" },
  { name: "Reims", postal_code: "51100", department: "Marne" },
  { name: "Saint-Etienne", postal_code: "42000", department: "Loire" },
  { name: "Toulon", postal_code: "83000", department: "Var" },
  { name: "Grenoble", postal_code: "38000", department: "Isere" },
  { name: "Dijon", postal_code: "21000", department: "Cote-d'Or" },
  { name: "Angers", postal_code: "49000", department: "Maine-et-Loire" },
  { name: "Nimes", postal_code: "30000", department: "Gard" },
  { name: "Villeurbanne", postal_code: "69100", department: "Rhone" },
  { name: "Clermont-Ferrand", postal_code: "63000", department: "Puy-de-Dome" },
  { name: "Le Mans", postal_code: "72000", department: "Sarthe" },
  { name: "Aix-en-Provence", postal_code: "13100", department: "Bouches-du-Rhone" },
  { name: "Brest", postal_code: "29200", department: "Finistere" },
  { name: "Tours", postal_code: "37000", department: "Indre-et-Loire" },
  { name: "Amiens", postal_code: "80000", department: "Somme" },
  { name: "Limoges", postal_code: "87000", department: "Haute-Vienne" },
  { name: "Annecy", postal_code: "74000", department: "Haute-Savoie" },
  { name: "Perpignan", postal_code: "66000", department: "Pyrenees-Orientales" },
  { name: "Boulogne-Billancourt", postal_code: "92100", department: "Hauts-de-Seine" },
  { name: "Metz", postal_code: "57000", department: "Moselle" },
  { name: "Besancon", postal_code: "25000", department: "Doubs" },
  { name: "Orleans", postal_code: "45000", department: "Loiret" },
  { name: "Rouen", postal_code: "76000", department: "Seine-Maritime" },
  { name: "Mulhouse", postal_code: "68100", department: "Haut-Rhin" },
  { name: "Caen", postal_code: "14000", department: "Calvados" },
  { name: "Nancy", postal_code: "54000", department: "Meurthe-et-Moselle" },
  { name: "Argenteuil", postal_code: "95100", department: "Val-d'Oise" },
  { name: "Montreuil", postal_code: "93100", department: "Seine-Saint-Denis" },
  { name: "Roubaix", postal_code: "59100", department: "Nord" },
  { name: "Tourcoing", postal_code: "59200", department: "Nord" },
  { name: "Nanterre", postal_code: "92000", department: "Hauts-de-Seine" },
  { name: "Vitry-sur-Seine", postal_code: "94400", department: "Val-de-Marne" },
  { name: "Creteil", postal_code: "94000", department: "Val-de-Marne" },
  { name: "Avignon", postal_code: "84000", department: "Vaucluse" },
  { name: "Poitiers", postal_code: "86000", department: "Vienne" },
  { name: "Versailles", postal_code: "78000", department: "Yvelines" },
  { name: "Colombes", postal_code: "92700", department: "Hauts-de-Seine" },
  { name: "Courbevoie", postal_code: "92400", department: "Hauts-de-Seine" },
  { name: "Asnieres-sur-Seine", postal_code: "92600", department: "Hauts-de-Seine" },
  { name: "Issy-les-Moulineaux", postal_code: "92130", department: "Hauts-de-Seine" }
];

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function searchFrenchCities(search = "") {
  const normalizedSearch = normalize(search);

  if (!normalizedSearch) {
    return frenchCities.slice(0, 20);
  }

  return frenchCities
    .filter((city) => {
      const normalizedName = normalize(city.name);
      return (
        normalizedName.includes(normalizedSearch) ||
        city.postal_code.includes(normalizedSearch)
      );
    })
    .slice(0, 20);
}

export function isSupportedFrenchCity(cityName) {
  const normalizedCityName = normalize(cityName);

  return frenchCities.some(
    (city) => normalize(city.name) === normalizedCityName
  );
}

export function findSupportedFrenchCity(cityName) {
  const normalizedCityName = normalize(cityName);

  return frenchCities.find(
    (city) => normalize(city.name) === normalizedCityName
  );
}
