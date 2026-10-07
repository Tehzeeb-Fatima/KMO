/** Dropdown list for admin/vendor delivery-fee screens. "Other" is a
 *  catch-all sentinel: a rate or cap saved against it applies to every city
 *  that doesn't have its own row. */
export const OTHER_CITY = "Other";

export const PAKISTAN_CITIES: string[] = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
  "Hyderabad",
  "Sukkur",
  "Bahawalpur",
  "Sargodha",
  "Sahiwal",
  "Abbottabad",
  "Mardan",
  "Gujrat",
  "Rahim Yar Khan",
  "Larkana",
];

/** City select options for delivery-fee forms: the city list, then the "Other" fallback last. */
export const DELIVERY_CITY_OPTIONS: string[] = [...PAKISTAN_CITIES, OTHER_CITY];
