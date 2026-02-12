const REAR = "rear";
const FRONT = "front";
const BOTH = "both";

function normalize(text) {
  return String(text || "").trim().toLowerCase();
}

function familyKey(manufacturer, familyName) {
  return `${normalize(manufacturer)}::${normalize(familyName)}`;
}

export const POPULAR_PANEL_FAMILIES = [
  {
    id: "popular-family-chauvet-f4x-ip",
    manufacturer: "Chauvet Professional",
    family_name: "F4X IP",
    pixel_pitch: 4.8,
    outdoor_rated: true,
    service_access: BOTH,
    rigging_notes:
      "IP65-rated rental panel. Product naming can appear as F4XIP; this entry also covers requests for 'IP4X'.",
    notes: "Common outdoor touring/IMAG panel family."
  },
  {
    id: "popular-family-absen-pl39-pro-v2",
    manufacturer: "Absen",
    family_name: "PL3.9 Pro V2",
    pixel_pitch: 3.9,
    outdoor_rated: true,
    service_access: BOTH,
    rigging_notes: "Polaris V2 platform supports hanging and stacking with wind-bracing options.",
    notes: "Mainstream rental family with 500x500 and 500x1000 form factors."
  },
  {
    id: "popular-family-roe-black-pearl-v2",
    manufacturer: "ROE Visual",
    family_name: "Black Pearl V2",
    pixel_pitch: 2.84,
    outdoor_rated: false,
    service_access: FRONT,
    rigging_notes: "Film-centric indoor family, concave-capable and commonly used for VP/event walls.",
    notes: "Includes BP2V2 and BP3V2 seeds."
  },
  {
    id: "popular-family-roe-ruby",
    manufacturer: "ROE Visual",
    family_name: "Ruby",
    pixel_pitch: 2.6,
    outdoor_rated: false,
    service_access: BOTH,
    rigging_notes: "Concave/convex capable touring panel family.",
    notes: "Seeded with RB2.6 and RB2.3 common event pitches."
  },
  {
    id: "popular-family-roe-diamond",
    manufacturer: "ROE Visual",
    family_name: "Diamond",
    pixel_pitch: 2.6,
    outdoor_rated: false,
    service_access: FRONT,
    rigging_notes: "Lightweight touring panel family.",
    notes: "Seeded with DM2.6 and DM3.9."
  }
];

export const POPULAR_CABINET_VARIANTS = [
  {
    id: "popular-variant-chauvet-f4xip-500x1000",
    panel_family_id: "popular-family-chauvet-f4x-ip",
    variant_name: "500x1000",
    width_mm: 500,
    height_mm: 1000,
    depth_mm: 65,
    pixel_width: 104,
    pixel_height: 208,
    weight_kg: 13.6,
    power_connector: "Seetronic powerKON IP65",
    data_connector: "Seetronic etherKON IP65",
    power_min_w: 70,
    power_typical_w: 165,
    power_max_w: 300,
    power_peak_w: 360,
    peak_factor: 1.2,
    cabinets_per_20a_120v: 6,
    cabinets_per_20a_208v: 10,
    cabinets_per_soco_120v: 6,
    cabinets_per_soco_208v: 10
  },
  {
    id: "popular-variant-chauvet-f4xip-500x500",
    panel_family_id: "popular-family-chauvet-f4x-ip",
    variant_name: "500x500",
    width_mm: 500,
    height_mm: 500,
    depth_mm: 65,
    pixel_width: 104,
    pixel_height: 104,
    weight_kg: 7,
    power_connector: "Seetronic powerKON IP65",
    data_connector: "Seetronic etherKON IP65",
    power_min_w: 35,
    power_typical_w: 83,
    power_max_w: 150,
    power_peak_w: 180,
    peak_factor: 1.2,
    cabinets_per_20a_120v: 10,
    cabinets_per_20a_208v: 16,
    cabinets_per_soco_120v: 10,
    cabinets_per_soco_208v: 16
  },
  {
    id: "popular-variant-absen-pl39v2-500x500",
    panel_family_id: "popular-family-absen-pl39-pro-v2",
    variant_name: "500x500",
    width_mm: 500,
    height_mm: 500,
    depth_mm: 78,
    pixel_width: 128,
    pixel_height: 128,
    weight_kg: 8,
    power_connector: "PowerCON TRUE1",
    data_connector: "EtherCON",
    power_min_w: 40,
    power_typical_w: 67,
    power_max_w: 180,
    power_peak_w: 220,
    peak_factor: 1.2,
    cabinets_per_20a_120v: 8,
    cabinets_per_20a_208v: 13,
    cabinets_per_soco_120v: 8,
    cabinets_per_soco_208v: 13
  },
  {
    id: "popular-variant-absen-pl39v2-500x1000",
    panel_family_id: "popular-family-absen-pl39-pro-v2",
    variant_name: "500x1000",
    width_mm: 500,
    height_mm: 1000,
    depth_mm: 78,
    pixel_width: 128,
    pixel_height: 256,
    weight_kg: 13,
    power_connector: "PowerCON TRUE1",
    data_connector: "EtherCON",
    power_min_w: 70,
    power_typical_w: 134,
    power_max_w: 400,
    power_peak_w: 470,
    peak_factor: 1.2,
    cabinets_per_20a_120v: 4,
    cabinets_per_20a_208v: 7,
    cabinets_per_soco_120v: 4,
    cabinets_per_soco_208v: 7
  },
  {
    id: "popular-variant-roe-bp2v2-500x500",
    panel_family_id: "popular-family-roe-black-pearl-v2",
    variant_name: "BP2V2 500x500",
    width_mm: 500,
    height_mm: 500,
    depth_mm: 90,
    pixel_width: 176,
    pixel_height: 176,
    weight_kg: 9.35,
    power_connector: "Neutrik powerCON",
    data_connector: "EtherCON",
    power_min_w: 45,
    power_typical_w: 95,
    power_max_w: 190,
    power_peak_w: 228,
    peak_factor: 1.2,
    cabinets_per_20a_120v: 8,
    cabinets_per_20a_208v: 13,
    cabinets_per_soco_120v: 8,
    cabinets_per_soco_208v: 13
  },
  {
    id: "popular-variant-roe-bp3v2-500x500",
    panel_family_id: "popular-family-roe-black-pearl-v2",
    variant_name: "BP3V2 500x500",
    width_mm: 500,
    height_mm: 500,
    depth_mm: 90,
    pixel_width: 128,
    pixel_height: 128,
    weight_kg: 9.2,
    power_connector: "Neutrik powerCON",
    data_connector: "EtherCON",
    power_min_w: 40,
    power_typical_w: 85,
    power_max_w: 170,
    power_peak_w: 204,
    peak_factor: 1.2,
    cabinets_per_20a_120v: 8,
    cabinets_per_20a_208v: 13,
    cabinets_per_soco_120v: 8,
    cabinets_per_soco_208v: 13
  },
  {
    id: "popular-variant-roe-ruby-rb26-500x500",
    panel_family_id: "popular-family-roe-ruby",
    variant_name: "RB2.6 500x500",
    width_mm: 500,
    height_mm: 500,
    depth_mm: 73,
    pixel_width: 192,
    pixel_height: 192,
    weight_kg: 8.5,
    power_connector: "Neutrik powerCON",
    data_connector: "EtherCON",
    power_min_w: 40,
    power_typical_w: 80,
    power_max_w: 160,
    power_peak_w: 192,
    peak_factor: 1.2,
    cabinets_per_20a_120v: 9,
    cabinets_per_20a_208v: 14,
    cabinets_per_soco_120v: 9,
    cabinets_per_soco_208v: 14
  },
  {
    id: "popular-variant-roe-ruby-rb23-500x500",
    panel_family_id: "popular-family-roe-ruby",
    variant_name: "RB2.3 500x500",
    width_mm: 500,
    height_mm: 500,
    depth_mm: 73,
    pixel_width: 216,
    pixel_height: 216,
    weight_kg: 8.16,
    power_connector: "Neutrik powerCON",
    data_connector: "EtherCON",
    power_min_w: 45,
    power_typical_w: 90,
    power_max_w: 180,
    power_peak_w: 216,
    peak_factor: 1.2,
    cabinets_per_20a_120v: 8,
    cabinets_per_20a_208v: 13,
    cabinets_per_soco_120v: 8,
    cabinets_per_soco_208v: 13
  },
  {
    id: "popular-variant-roe-diamond-dm26-500x500",
    panel_family_id: "popular-family-roe-diamond",
    variant_name: "DM2.6 500x500",
    width_mm: 500,
    height_mm: 500,
    depth_mm: 80,
    pixel_width: 192,
    pixel_height: 192,
    weight_kg: 5.76,
    power_connector: "Neutrik powerCON",
    data_connector: "EtherCON",
    power_min_w: 45,
    power_typical_w: 90,
    power_max_w: 180,
    power_peak_w: 216,
    peak_factor: 1.2,
    cabinets_per_20a_120v: 8,
    cabinets_per_20a_208v: 13,
    cabinets_per_soco_120v: 8,
    cabinets_per_soco_208v: 13
  },
  {
    id: "popular-variant-roe-diamond-dm39-500x500",
    panel_family_id: "popular-family-roe-diamond",
    variant_name: "DM3.9 500x500",
    width_mm: 500,
    height_mm: 500,
    depth_mm: 80,
    pixel_width: 128,
    pixel_height: 128,
    weight_kg: 5.76,
    power_connector: "Neutrik powerCON",
    data_connector: "EtherCON",
    power_min_w: 40,
    power_typical_w: 80,
    power_max_w: 150,
    power_peak_w: 180,
    peak_factor: 1.2,
    cabinets_per_20a_120v: 9,
    cabinets_per_20a_208v: 14,
    cabinets_per_soco_120v: 9,
    cabinets_per_soco_208v: 14
  }
];

function findFamilyById(families, id) {
  return families.find((family) => family.id === id);
}

export function isPopularId(id) {
  return normalize(id).startsWith("popular-");
}

export function mergeFamiliesWithPopular(remoteFamilies = []) {
  const merged = [...remoteFamilies];
  const existingKeys = new Set(remoteFamilies.map((family) => familyKey(family.manufacturer, family.family_name)));

  for (const popularFamily of POPULAR_PANEL_FAMILIES) {
    const key = familyKey(popularFamily.manufacturer, popularFamily.family_name);
    if (existingKeys.has(key)) {
      continue;
    }
    merged.push(popularFamily);
  }

  return merged;
}

export function mergeVariantsWithPopular(remoteVariants = [], families = []) {
  const merged = [...remoteVariants];

  const variantKeys = new Set();
  for (const variant of remoteVariants) {
    const family = findFamilyById(families, variant.panel_family_id);
    const key = `${familyKey(family?.manufacturer, family?.family_name)}::${normalize(variant.variant_name)}`;
    variantKeys.add(key);
  }

  for (const popularVariant of POPULAR_CABINET_VARIANTS) {
    const popularFamily = findFamilyById(POPULAR_PANEL_FAMILIES, popularVariant.panel_family_id);
    if (!popularFamily) {
      continue;
    }

    const familyRecord =
      families.find(
        (family) => familyKey(family.manufacturer, family.family_name) === familyKey(popularFamily.manufacturer, popularFamily.family_name)
      ) ?? popularFamily;

    const key = `${familyKey(familyRecord.manufacturer, familyRecord.family_name)}::${normalize(popularVariant.variant_name)}`;
    if (variantKeys.has(key)) {
      continue;
    }

    merged.push({
      ...popularVariant,
      panel_family_id: familyRecord.id
    });
    variantKeys.add(key);
  }

  return merged;
}

