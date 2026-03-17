import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ShieldCheck, MapPin, Lock } from "lucide-react";
import { FullNavbar } from "@/components/full-navbar";
import { Footer } from "@/components/footer";
import { notFound } from "next/navigation";

/* ── Area seed data ── */

interface AreaDimension {
  label: string;
  score: number;
  weight: number;
  summary: string;
}

interface AreaData {
  name: string;
  region: string;
  postcode: string;
  areaType: "urban" | "suburban" | "rural";
  overallScore: number;
  population: string;
  avgPropertyPrice: string;
  summary: string;
  dimensions: AreaDimension[];
  lockedSections: string[];
  lockedRecommendations: number;
  intents: { label: string; score: number; slug: string }[];
  dataSources: string[];
}

const AREAS: Record<string, AreaData> = {
  london: {
    name: "Central London",
    region: "London",
    postcode: "WC2N 5DU",
    areaType: "suburban",
    overallScore: 47,
    population: "~9.7 million (Greater London)",
    avgPropertyPrice: "£530,000+",

    summary:
      "Central London (Westminster) scores 47/100 overall. World-class amenities and a strong local economy are offset by extremely high crime volumes near Trafalgar Square and significant flood risk from the Thames. 17,945 crimes were recorded in just 3 months, with theft from the person accounting for 33%. Despite this, 1,865 nearby amenities and 30 rail/tube stations make it one of the most connected and serviced locations in the UK.",
    dimensions: [
      { label: "Safety & Crime", score: 5, weight: 20, summary: "17,945 crimes over 3 months (5,982/month). Most common: Theft From The Person (33%). Violent crime: 15% of total. Trend: rising." },
      { label: "Transport Links", score: 45, weight: 20, summary: "30 rail/tube stations within 2km. 33 bus stops within 500m. Nearby: St. James's Park, Westminster station." },
      { label: "Amenities & Services", score: 95, weight: 20, summary: "1,865 amenities nearby: 71 schools, 1,383 food/drink venues, 102 healthcare facilities, 54 shops, 192 parks/leisure." },
      { label: "Demographics & Economy", score: 77, weight: 20, summary: "IMD 2019 decile 8/10 (low deprivation). Ranked 24,862 of 32,844 LSOAs (76th percentile). LSOA: Westminster 018C." },
      { label: "Environment & Quality", score: 15, weight: 20, summary: "15 flood risk zones within 3km. Near: River Thames, Groundwater. No active warnings. 192 parks/green spaces nearby." },
    ],
    lockedSections: ["Safety & Crime Analysis", "Transport Links Analysis", "Amenities & Services Analysis", "Demographics & Economy Analysis", "Environment & Quality Analysis"],
    lockedRecommendations: 4,
    intents: [
      { label: "Moving", score: 50, slug: "moving" },
      { label: "Business", score: 58, slug: "business" },
      { label: "Investing", score: 55, slug: "investing" },
      { label: "Research", score: 47, slug: "research" },
    ],
    dataSources: ["Police.uk", "ONS / IMD", "OpenStreetMap", "Environment Agency", "HM Land Registry", "Ofsted", "Postcodes.io"],
  },
  manchester: {
    name: "Manchester City Centre",
    region: "North West",
    postcode: "M1 1AE",
    areaType: "suburban",
    overallScore: 75,
    population: "~550,000 (city), ~2.8 million (metro)",
    avgPropertyPrice: "£215,000",

    summary:
      "Manchester City Centre scores 75/100 overall. Excellent transport links (6 stations, 43 bus stops), a massive amenities base of 3,574 venues, and low recorded crime in this specific LSOA. Flood risk from the Irwell, Mersey, and Medlock rivers brings the environment score down. IMD deprivation data was unavailable for this LSOA, defaulting demographics to 50.",
    dimensions: [
      { label: "Safety & Crime", score: 90, weight: 20, summary: "9 crimes over 3 months (3/month). Most common: Violent Crime (78%). Violent crime: 78% of total. Trend: falling." },
      { label: "Transport Links", score: 95, weight: 20, summary: "6 rail/tube stations within 2km. 43 bus stops within 500m. Nearby: Ardwick station." },
      { label: "Amenities & Services", score: 95, weight: 20, summary: "3,574 amenities nearby: 25 schools, 589 food/drink, 42 healthcare, 52 shops, 2,817 parks/leisure." },
      { label: "Demographics & Economy", score: 50, weight: 20, summary: "Deprivation data unavailable for this LSOA. Score defaults to 50/100." },
      { label: "Environment & Quality", score: 45, weight: 20, summary: "10 flood risk zones within 3km. Near: River Mersey, River Irwell, River Medlock. No active warnings. 2,817 parks/green spaces nearby." },
    ],
    lockedSections: ["Safety & Crime Analysis", "Transport Links Analysis", "Amenities & Services Analysis", "Demographics & Economy Analysis", "Environment & Quality Analysis"],
    lockedRecommendations: 4,
    intents: [
      { label: "Moving", score: 85, slug: "moving" },
      { label: "Business", score: 62, slug: "business" },
      { label: "Investing", score: 59, slug: "investing" },
      { label: "Research", score: 75, slug: "research" },
    ],
    dataSources: ["Police.uk", "ONS / IMD", "OpenStreetMap", "Environment Agency", "HM Land Registry", "Ofsted", "Postcodes.io"],
  },
  cardiff: {
    name: "Cardiff City Centre",
    region: "Wales",
    postcode: "CF10 1EP",
    areaType: "suburban",
    overallScore: 67,
    population: "~370,000 (city)",
    avgPropertyPrice: "£250,000",

    summary:
      "Cardiff City Centre scores 67/100 overall. Strong transport connectivity with 6 stations (including Cathays and Cardiff Bay) and 41 bus stops. 1,064 amenities including 55 schools and 323 food/drink venues. Crime is elevated at 3,683 incidents over 3 months, with violent crime at 33%. WIMD decile 6 indicates moderate deprivation, ranked 999 of 1,909 Welsh LSOAs. 567 parks and green spaces contribute to a strong environment score.",
    dimensions: [
      { label: "Safety & Crime", score: 5, weight: 20, summary: "3,683 crimes over 3 months (1,228/month). Most common: Violent Crime (31%). Violent crime: 33% of total. Trend: falling." },
      { label: "Transport Links", score: 95, weight: 20, summary: "6 rail/tube stations within 2km. 41 bus stops within 500m. Nearby: Cathays station, Cardiff Bay station, Ninian Park station." },
      { label: "Amenities & Services", score: 95, weight: 20, summary: "1,064 amenities nearby: 55 schools, 323 food/drink, 27 healthcare, 45 shops, 567 parks/leisure." },
      { label: "Demographics & Economy", score: 59, weight: 20, summary: "WIMD 2019 decile 6/10 (moderate deprivation). Ranked 999 of 1,909 Welsh LSOAs (52nd percentile). LSOA: Cathays 11." },
      { label: "Environment & Quality", score: 80, weight: 20, summary: "Flood data unavailable (Wales, outside Environment Agency coverage). 567 parks/green spaces nearby." },
    ],
    lockedSections: ["Safety & Crime Analysis", "Transport Links Analysis", "Amenities & Services Analysis", "Demographics & Economy Analysis", "Environment & Quality Analysis"],
    lockedRecommendations: 4,
    intents: [
      { label: "Moving", score: 64, slug: "moving" },
      { label: "Business", score: 65, slug: "business" },
      { label: "Investing", score: 70, slug: "investing" },
      { label: "Research", score: 67, slug: "research" },
    ],
    dataSources: ["Police.uk", "ONS / IMD", "OpenStreetMap", "Environment Agency", "HM Land Registry", "Ofsted", "Postcodes.io"],
  },
  liverpool: {
    name: "Liverpool City Centre",
    region: "North West",
    postcode: "L1 3DE",
    areaType: "suburban",
    overallScore: 65,
    population: "~500,000 (city)",
    avgPropertyPrice: "£170,000",
    summary:
      "Liverpool City Centre scores 65/100 overall. Strong transport links with 4 rail stations and 63 bus stops, plus 949 amenities including 639 food/drink venues. Crime is a major concern at 5,452 incidents over 3 months (1,817/month), with violent crime at 29%. IMD decile 6 indicates moderate deprivation. Investing intent scores highest at 72/100, driven by strong price growth potential and tenant demand.",
    dimensions: [
      { label: "Safety & Crime", score: 5, weight: 20, summary: "5,452 crimes over 3 months (1,817/month). Most common: Violent Crime (27%). Violent crime: 29% of total. Trend: stable." },
      { label: "Transport Links", score: 95, weight: 20, summary: "4 rail/tube stations within 2km. 63 bus stops within 500m." },
      { label: "Amenities & Services", score: 95, weight: 20, summary: "949 amenities nearby: 25 schools, 639 food/drink, 19 healthcare, 52 shops, 147 parks/leisure." },
      { label: "Demographics & Economy", score: 59, weight: 20, summary: "IMD 2019 decile 6/10 (moderate deprivation). Ranked 18,895 of 32,844 LSOAs (58th percentile). LSOA: Liverpool 061C." },
      { label: "Environment & Quality", score: 69, weight: 20, summary: "6 flood risk zones within 3km. Near: River Alt, Irish Sea, Wirral. No active warnings. 147 parks/green spaces nearby." },
    ],
    lockedSections: ["Safety & Crime Analysis", "Transport Links Analysis", "Amenities & Services Analysis", "Demographics & Economy Analysis", "Environment & Quality Analysis"],
    lockedRecommendations: 4,
    intents: [
      { label: "Moving", score: 64, slug: "moving" },
      { label: "Business", score: 65, slug: "business" },
      { label: "Investing", score: 72, slug: "investing" },
      { label: "Research", score: 65, slug: "research" },
    ],
    dataSources: ["Police.uk", "ONS / IMD", "OpenStreetMap", "Environment Agency", "HM Land Registry", "Ofsted", "Postcodes.io"],
  },
  glasgow: {
    name: "Glasgow City Centre",
    region: "Scotland",
    postcode: "G1 1HD",
    areaType: "suburban",
    overallScore: 65,
    population: "~635,000 (city)",
    avgPropertyPrice: "£165,000",
    summary:
      "Glasgow City Centre scores 65/100 overall. Excellent amenities with 1,276 venues including 560 food/drink outlets and 544 parks/leisure spaces. 15 rail stations and 48 bus stops provide strong connectivity. SIMD decile 2 indicates high deprivation, ranked 1,249 of 6,976 Scottish Data Zones (18th percentile). Crime data unavailable (Scotland, outside Police.uk coverage). Strong investing potential at 78/100 driven by regeneration upside and high tenant demand.",
    dimensions: [
      { label: "Safety & Crime", score: 50, weight: 20, summary: "Crime data unavailable for this location (Scotland, outside Police.uk coverage). Score defaults to 50/100." },
      { label: "Transport Links", score: 75, weight: 20, summary: "15 rail/tube stations within 2km. 48 bus stops within 500m. Nearby: Bellgrove, Argyle Street, Anderston stations." },
      { label: "Amenities & Services", score: 95, weight: 20, summary: "1,276 amenities nearby: 27 schools, 560 food/drink, 27 healthcare, 55 shops, 544 parks/leisure." },
      { label: "Demographics & Economy", score: 23, weight: 20, summary: "SIMD 2020 decile 2/10 (high deprivation). Ranked 1,249 of 6,976 Scottish Data Zones (18th percentile). LSOA: City Centre East - 06." },
      { label: "Environment & Quality", score: 80, weight: 20, summary: "Flood data unavailable (Scotland, outside Environment Agency coverage). 544 parks/green spaces nearby." },
    ],
    lockedSections: ["Safety & Crime Analysis", "Transport Links Analysis", "Amenities & Services Analysis", "Demographics & Economy Analysis", "Environment & Quality Analysis"],
    lockedRecommendations: 4,
    intents: [
      { label: "Moving", score: 77, slug: "moving" },
      { label: "Business", score: 60, slug: "business" },
      { label: "Investing", score: 78, slug: "investing" },
      { label: "Research", score: 65, slug: "research" },
    ],
    dataSources: ["Police.uk", "ONS / IMD", "OpenStreetMap", "Environment Agency", "HM Land Registry", "Ofsted", "Postcodes.io"],
  },
  belfast: {
    name: "Belfast City Centre",
    region: "Northern Ireland",
    postcode: "BT1 2BA",
    areaType: "suburban",
    overallScore: 68,
    population: "~345,000 (city)",
    avgPropertyPrice: "£175,000",
    summary:
      "Belfast City Centre scores 68/100 overall. Strong transport links with 6 stations and 50 bus stops, plus 466 amenities including 265 food/drink venues and 34 healthcare facilities. Crime is elevated at 4,224 incidents over 3 months, with anti-social behaviour (30%) and violent crime (30%) the main concerns. Zero flood risk and 60 parks give a perfect environment score. IMD data unavailable (Northern Ireland, outside England coverage).",
    dimensions: [
      { label: "Safety & Crime", score: 5, weight: 20, summary: "4,224 crimes over 3 months (1,408/month). Most common: Anti-Social Behaviour (30%). Violent crime: 30% of total. Trend: stable." },
      { label: "Transport Links", score: 95, weight: 20, summary: "6 rail/tube stations within 2km. 50 bus stops within 500m." },
      { label: "Amenities & Services", score: 95, weight: 20, summary: "466 amenities nearby: 23 schools, 265 food/drink, 34 healthcare, 28 shops, 60 parks/leisure." },
      { label: "Demographics & Economy", score: 50, weight: 20, summary: "Deprivation data unavailable (Northern Ireland, outside England IMD coverage). Score defaults to 50/100." },
      { label: "Environment & Quality", score: 95, weight: 20, summary: "No flood risk zones within 3km. No active warnings. 60 parks/green spaces nearby." },
    ],
    lockedSections: ["Safety & Crime Analysis", "Transport Links Analysis", "Amenities & Services Analysis", "Demographics & Economy Analysis", "Environment & Quality Analysis"],
    lockedRecommendations: 4,
    intents: [
      { label: "Moving", score: 64, slug: "moving" },
      { label: "Business", score: 62, slug: "business" },
      { label: "Investing", score: 57, slug: "investing" },
      { label: "Research", score: 68, slug: "research" },
    ],
    dataSources: ["Police.uk", "ONS / IMD", "OpenStreetMap", "Environment Agency", "HM Land Registry", "Ofsted", "Postcodes.io"],
  },
  edinburgh: {
    name: "Edinburgh City Centre",
    region: "Scotland",
    postcode: "EH1 1SR",
    areaType: "suburban",
    overallScore: 71,
    population: "~530,000 (city)",
    avgPropertyPrice: "£290,000",
    summary:
      "Edinburgh City Centre scores 71/100 overall. A massive 4,218 amenities including 701 food/drink venues, 3,305 parks/leisure spaces, and 39 schools. Transport scores lower at 65 with only 1 rail station within 2km but 45 bus stops compensate. Zero flood risk and exceptional green space deliver a 95 environment score. SIMD decile 5 indicates moderate deprivation, ranked 3,201 of 6,976 Scottish Data Zones. Strong investing potential at 74/100.",
    dimensions: [
      { label: "Safety & Crime", score: 50, weight: 20, summary: "Crime data unavailable for this location (Scotland, outside Police.uk coverage). Score defaults to 50/100." },
      { label: "Transport Links", score: 65, weight: 20, summary: "1 rail/tube station within 2km. 45 bus stops within 500m." },
      { label: "Amenities & Services", score: 95, weight: 20, summary: "4,218 amenities nearby: 39 schools, 701 food/drink, 81 healthcare, 46 shops, 3,305 parks/leisure." },
      { label: "Demographics & Economy", score: 50, weight: 20, summary: "SIMD 2020 decile 5/10 (moderate deprivation). Ranked 3,201 of 6,976 Scottish Data Zones (46th percentile). LSOA: Old Town, Princes Street and Leith Street - 04." },
      { label: "Environment & Quality", score: 95, weight: 20, summary: "No flood risk zones within 3km. No active warnings. 3,305 parks/green spaces nearby." },
    ],
    lockedSections: ["Safety & Crime Analysis", "Transport Links Analysis", "Amenities & Services Analysis", "Demographics & Economy Analysis", "Environment & Quality Analysis"],
    lockedRecommendations: 4,
    intents: [
      { label: "Moving", score: 70, slug: "moving" },
      { label: "Business", score: 60, slug: "business" },
      { label: "Investing", score: 74, slug: "investing" },
      { label: "Research", score: 71, slug: "research" },
    ],
    dataSources: ["Police.uk", "ONS / IMD", "OpenStreetMap", "Environment Agency", "HM Land Registry", "Ofsted", "Postcodes.io"],
  },
  birmingham: {
    name: "Birmingham City Centre",
    region: "West Midlands",
    postcode: "B1 1BB",
    areaType: "suburban",
    overallScore: 57,
    population: "~1.1 million (city), ~4.3 million (metro)",
    avgPropertyPrice: "£210,000",
    summary:
      "Birmingham City Centre scores 57/100 overall. The UK's second city delivers outstanding amenities (993 venues) and transport connectivity (6 stations including Snow Hill and Jewellery Quarter). However, crime is extremely high at 5,155 incidents over 3 months, with violent crime making up 37%. IMD decile 3 indicates high deprivation, and 8 flood risk zones from the River Cole, Rea, and Tame reduce the environment score. Strong investing potential at 74/100 driven by regeneration upside and tenant demand.",
    dimensions: [
      { label: "Safety & Crime", score: 5, weight: 20, summary: "5,155 crimes over 3 months (1,718/month). Most common: Violent Crime (35%). Violent crime: 37% of total. Trend: stable." },
      { label: "Transport Links", score: 95, weight: 20, summary: "6 rail/tube stations within 2km. 31 bus stops within 500m. Nearby: Bordesley station, Birmingham Snow Hill station, Jewellery Quarter station." },
      { label: "Amenities & Services", score: 95, weight: 20, summary: "993 amenities nearby: 61 schools, 637 food/drink, 43 healthcare, 64 shops, 151 parks/leisure." },
      { label: "Demographics & Economy", score: 32, weight: 20, summary: "IMD 2019 decile 3/10 (high deprivation). Ranked 9,525 of 32,844 LSOAs (29th percentile). LSOA: Birmingham 138A." },
      { label: "Environment & Quality", score: 57, weight: 20, summary: "8 flood risk zones within 3km. Near: River Cole, River Rea, River Tame, Ford Brook. No active warnings. 151 parks/green spaces nearby." },
    ],
    lockedSections: ["Safety & Crime Analysis", "Transport Links Analysis", "Amenities & Services Analysis", "Demographics & Economy Analysis", "Environment & Quality Analysis"],
    lockedRecommendations: 4,
    intents: [
      { label: "Moving", score: 68, slug: "moving" },
      { label: "Business", score: 63, slug: "business" },
      { label: "Investing", score: 74, slug: "investing" },
      { label: "Research", score: 57, slug: "research" },
    ],
    dataSources: ["Police.uk", "ONS / IMD", "OpenStreetMap", "Environment Agency", "HM Land Registry", "Ofsted", "Postcodes.io"],
  },
  leeds: {
    name: "Leeds City Centre",
    region: "Yorkshire and The Humber",
    postcode: "LS1 1UR",
    areaType: "suburban",
    overallScore: 44,
    population: "~800,000 (city), ~1.9 million (metro)",
    avgPropertyPrice: "£205,000",
    summary:
      "Leeds City Centre scores 44/100 overall. Strong amenities (903 venues including 599 food/drink outlets) but major challenges. Crime is very high at 4,753 incidents over 3 months, with violent crime at 30% (trend: falling). 17 flood risk zones from the River Aire, Bradford Beck, and Wyke Beck give it an environment score of just 5. IMD decile 5 indicates moderate deprivation. The investing intent scores highest at 65/100, benefiting from mid-range price growth potential.",
    dimensions: [
      { label: "Safety & Crime", score: 5, weight: 20, summary: "4,753 crimes over 3 months (1,584/month). Most common: Violent Crime (28%). Violent crime: 30% of total. Trend: falling." },
      { label: "Transport Links", score: 65, weight: 20, summary: "1 rail/tube station within 2km. 37 bus stops within 500m." },
      { label: "Amenities & Services", score: 95, weight: 20, summary: "903 amenities nearby: 41 schools, 599 food/drink, 35 healthcare, 57 shops, 133 parks/leisure." },
      { label: "Demographics & Economy", score: 50, weight: 20, summary: "IMD 2019 decile 5/10 (moderate deprivation). Ranked 14,222 of 32,844 LSOAs (43rd percentile). LSOA: Leeds 111B." },
      { label: "Environment & Quality", score: 5, weight: 20, summary: "17 flood risk zones within 3km. Near: River Aire, Bradford Beck, Wyke Beck, Meanwood Beck. No active warnings. 133 parks/green spaces nearby." },
    ],
    lockedSections: ["Safety & Crime Analysis", "Transport Links Analysis", "Amenities & Services Analysis", "Demographics & Economy Analysis", "Environment & Quality Analysis"],
    lockedRecommendations: 4,
    intents: [
      { label: "Moving", score: 59, slug: "moving" },
      { label: "Business", score: 60, slug: "business" },
      { label: "Investing", score: 65, slug: "investing" },
      { label: "Research", score: 44, slug: "research" },
    ],
    dataSources: ["Police.uk", "ONS / IMD", "OpenStreetMap", "Environment Agency", "HM Land Registry", "Ofsted", "Postcodes.io"],
  },
  bristol: {
    name: "Bristol City Centre",
    region: "South West",
    postcode: "BS1 5TR",
    areaType: "suburban",
    overallScore: 52,
    population: "~470,000 (city)",
    avgPropertyPrice: "£310,000",
    summary:
      "Bristol City Centre scores 52/100 overall. Excellent transport with 8 stations (Montpelier, Clifton Down, Bedminster) and strong amenities (987 venues, 233 parks). Crime is very high at 5,771 incidents over 3 months, with violent crime at 31% (trend: falling). 15 flood risk zones from the Bristol Frome, Brislington Brook, and River Avon reduce the environment score to 15. IMD data was unavailable for this specific LSOA.",
    dimensions: [
      { label: "Safety & Crime", score: 5, weight: 20, summary: "5,771 crimes over 3 months (1,924/month). Most common: Violent Crime (29%). Violent crime: 31% of total. Trend: falling." },
      { label: "Transport Links", score: 95, weight: 20, summary: "8 rail/tube stations within 2km. 24 bus stops within 500m. Nearby: Montpelier station, Clifton Down station, Bedminster station." },
      { label: "Amenities & Services", score: 95, weight: 20, summary: "987 amenities nearby: 61 schools, 525 food/drink, 97 healthcare, 39 shops, 233 parks/leisure." },
      { label: "Demographics & Economy", score: 50, weight: 20, summary: "Deprivation data unavailable for this LSOA (data gap). Score defaults to 50/100." },
      { label: "Environment & Quality", score: 15, weight: 20, summary: "15 flood risk zones within 3km. Near: Bristol Frome, Brislington Brook, Bristol River Avon, River Boyd. No active warnings. 233 parks/green spaces nearby." },
    ],
    lockedSections: ["Safety & Crime Analysis", "Transport Links Analysis", "Amenities & Services Analysis", "Demographics & Economy Analysis", "Environment & Quality Analysis"],
    lockedRecommendations: 4,
    intents: [
      { label: "Moving", score: 64, slug: "moving" },
      { label: "Business", score: 62, slug: "business" },
      { label: "Investing", score: 51, slug: "investing" },
      { label: "Research", score: 52, slug: "research" },
    ],
    dataSources: ["Police.uk", "ONS / IMD", "OpenStreetMap", "Environment Agency", "HM Land Registry", "Ofsted", "Postcodes.io"],
  },
  sheffield: {
    name: "Sheffield City Centre",
    region: "Yorkshire and The Humber",
    postcode: "S1 2BJ",
    areaType: "suburban",
    overallScore: 40,
    population: "~590,000 (city)",
    avgPropertyPrice: "£185,000",
    summary:
      "Sheffield City Centre scores 40/100 overall. Rich in amenities (1,112 venues, 569 parks/leisure) but faces significant challenges. Crime is high at 3,650 incidents over 3 months, with violent crime at 30% (trend: falling). 38 flood risk zones from the River Don, Loxley, and Rivelin give it the lowest environment score of 5. IMD decile 3 indicates high deprivation. Investing intent scores best at 64/100, driven by regeneration potential and high rental yield prospects.",
    dimensions: [
      { label: "Safety & Crime", score: 5, weight: 20, summary: "3,650 crimes over 3 months (1,217/month). Most common: Violent Crime (29%). Violent crime: 30% of total. Trend: falling." },
      { label: "Transport Links", score: 65, weight: 20, summary: "1 rail/tube station within 2km. 79 bus stops within 500m. Nearby: Sheffield station." },
      { label: "Amenities & Services", score: 95, weight: 20, summary: "1,112 amenities nearby: 29 schools, 356 food/drink, 33 healthcare, 45 shops, 569 parks/leisure." },
      { label: "Demographics & Economy", score: 32, weight: 20, summary: "IMD 2019 decile 3/10 (high deprivation). Ranked 8,740 of 32,844 LSOAs (27th percentile). LSOA: Sheffield 075G." },
      { label: "Environment & Quality", score: 5, weight: 20, summary: "38 flood risk zones within 3km. Near: River Don, River Loxley, River Rivelin. No active warnings. 569 parks/green spaces nearby." },
    ],
    lockedSections: ["Safety & Crime Analysis", "Transport Links Analysis", "Amenities & Services Analysis", "Demographics & Economy Analysis", "Environment & Quality Analysis"],
    lockedRecommendations: 4,
    intents: [
      { label: "Moving", score: 62, slug: "moving" },
      { label: "Business", score: 59, slug: "business" },
      { label: "Investing", score: 64, slug: "investing" },
      { label: "Research", score: 40, slug: "research" },
    ],
    dataSources: ["Police.uk", "ONS / IMD", "OpenStreetMap", "Environment Agency", "HM Land Registry", "Ofsted", "Postcodes.io"],
  },
  nottingham: {
    name: "Nottingham City Centre",
    region: "East Midlands",
    postcode: "NG1 5AW",
    areaType: "suburban",
    overallScore: 51,
    population: "~330,000 (city), ~800,000 (metro)",
    avgPropertyPrice: "£195,000",
    summary:
      "Nottingham City Centre scores 51/100 overall. A strong economy (IMD decile 9, low deprivation, 83rd percentile) and good amenities (791 venues, 160 parks). Crime is very high at 5,179 incidents over 3 months, with violent crime at 27%. 16 flood risk zones with 2 active flood warnings from the River Trent and River Leen bring the environment score to 5. Business intent scores highest at 62/100, driven by high local spending power.",
    dimensions: [
      { label: "Safety & Crime", score: 5, weight: 20, summary: "5,179 crimes over 3 months (1,726/month). Most common: Violent Crime (25%). Violent crime: 27% of total. Trend: stable." },
      { label: "Transport Links", score: 65, weight: 20, summary: "1 rail/tube station within 2km. 28 bus stops within 500m. Nearby: Nottingham station." },
      { label: "Amenities & Services", score: 95, weight: 20, summary: "791 amenities nearby: 44 schools, 460 food/drink, 57 healthcare, 41 shops, 160 parks/leisure." },
      { label: "Demographics & Economy", score: 86, weight: 20, summary: "IMD 2019 decile 9/10 (low deprivation). Ranked 27,218 of 32,844 LSOAs (83rd percentile). LSOA: Nottingham 028E." },
      { label: "Environment & Quality", score: 5, weight: 20, summary: "16 flood risk zones within 3km. Near: River Trent, River Leen, Day Brook, Tottle Brook. 2 active flood warnings. 160 parks/green spaces nearby." },
    ],
    lockedSections: ["Safety & Crime Analysis", "Transport Links Analysis", "Amenities & Services Analysis", "Demographics & Economy Analysis", "Environment & Quality Analysis"],
    lockedRecommendations: 4,
    intents: [
      { label: "Moving", score: 53, slug: "moving" },
      { label: "Business", score: 62, slug: "business" },
      { label: "Investing", score: 43, slug: "investing" },
      { label: "Research", score: 51, slug: "research" },
    ],
    dataSources: ["Police.uk", "ONS / IMD", "OpenStreetMap", "Environment Agency", "HM Land Registry", "Ofsted", "Postcodes.io"],
  },
  brighton: {
      "name": "Brighton City Centre",
      "region": "South East",
      "postcode": "BN1  1EE",
      "areaType": "suburban",
      "overallScore": 62,
      "population": "~230,000 (city)",
      "avgPropertyPrice": "£420,000",
      "summary": "Brighton City Centre scores 62/100 overall. Transport links include 4 rail stations and 28 bus stops. 918 amenities nearby including 29 schools and 659 food/drink venues. Crime: 3,882 incidents over 3 months (1294/month), with violent crime at 30%. IMD 2019 decile 2 indicates high deprivation. Investing intent scores highest at 78/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "3882 crimes over 3 months (1294/month). most common: Violent Crime (29%). violent crime: 30% of total. trend: falling"
          },
          {
              "label": "Transport Links",
              "score": 95,
              "weight": 20,
              "summary": "4 rail/tube stations within 2km. 28 bus stops within 500m. nearby: Brighton station, Aquarium station"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "918 amenities nearby: 29 schools, 659 food/drink, 40 healthcare, 66 shops, 92 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 23,
              "weight": 20,
              "summary": "IMD 2019 decile 2/10 (high deprivation). Ranked 4,311 of 32,844 LSOAs (13th percentile). LSOA: Brighton and Hove 027E"
          },
          {
              "label": "Environment & Quality",
              "score": 93,
              "weight": 20,
              "summary": "2 flood risk zones within 3km. near: English Channel. no active warnings. 92 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 70,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 63,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 78,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 62,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  southampton: {
      "name": "Southampton City Centre",
      "region": "South East",
      "postcode": "SO14  7DU",
      "areaType": "suburban",
      "overallScore": 57,
      "population": "~260,000 (city)",
      "avgPropertyPrice": "£230,000",
      "summary": "Southampton City Centre scores 57/100 overall. Transport links include 2 rail stations and 46 bus stops. 517 amenities nearby including 19 schools and 270 food/drink venues. Crime: 3,042 incidents over 3 months (1014/month), with violent crime at 38%. Moving intent scores highest at 61/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "3042 crimes over 3 months (1014/month). most common: Violent Crime (36%). violent crime: 38% of total. trend: stable"
          },
          {
              "label": "Transport Links",
              "score": 80,
              "weight": 20,
              "summary": "2 rail/tube stations within 2km. 46 bus stops within 500m. nearby: Southampton Central station, St Denys station"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "517 amenities nearby: 19 schools, 270 food/drink, 21 healthcare, 44 shops, 115 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 50,
              "weight": 20,
              "summary": "Deprivation data unavailable (non-England or data gap)"
          },
          {
              "label": "Environment & Quality",
              "score": 57,
              "weight": 20,
              "summary": "8 flood risk zones within 3km. near: Southampton Water, River Itchen, Tanners Brook. no active warnings. 115 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 61,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 60,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 53,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 57,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  portsmouth: {
      "name": "Portsmouth City Centre",
      "region": "South East",
      "postcode": "PO1  2AH",
      "areaType": "suburban",
      "overallScore": 54,
      "population": "~215,000 (city)",
      "avgPropertyPrice": "£220,000",
      "summary": "Portsmouth City Centre scores 54/100 overall. Transport links include 3 rail stations and 25 bus stops. 336 amenities nearby including 25 schools and 167 food/drink venues. Crime: 2,532 incidents over 3 months (844/month), with violent crime at 42%. IMD 2019 decile 1 indicates high deprivation. Investing intent scores highest at 74/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "2532 crimes over 3 months (844/month). most common: Violent Crime (40%). violent crime: 42% of total. trend: stable"
          },
          {
              "label": "Transport Links",
              "score": 95,
              "weight": 20,
              "summary": "3 rail/tube stations within 2km. 25 bus stops within 500m. nearby: Fratton station"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "336 amenities nearby: 25 schools, 167 food/drink, 22 healthcare, 33 shops, 61 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 14,
              "weight": 20,
              "summary": "IMD 2019 decile 1/10 (high deprivation). Ranked 3,086 of 32,844 LSOAs (9th percentile). LSOA: Portsmouth 016B"
          },
          {
              "label": "Environment & Quality",
              "score": 63,
              "weight": 20,
              "summary": "7 flood risk zones within 3km. near: Langstone Harbour, The Solent, Portsmouth Harbour, Langstone Harbour, Portsmouth Harbour. no active warnings. 61 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 72,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 62,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 74,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 54,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  reading: {
      "name": "Reading Town Centre",
      "region": "South East",
      "postcode": "RG1  1AZ",
      "areaType": "suburban",
      "overallScore": 50,
      "population": "~175,000 (city)",
      "avgPropertyPrice": "£340,000",
      "summary": "Reading Town Centre scores 50/100 overall. Transport links include 2 rail stations and 55 bus stops. 486 amenities nearby including 27 schools and 252 food/drink venues. Crime: 2,233 incidents over 3 months (744/month), with violent crime at 33%. IMD 2019 decile 4 indicates moderate deprivation. Investing intent scores highest at 73/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "2233 crimes over 3 months (744/month). most common: Violent Crime (31%). violent crime: 33% of total. trend: stable"
          },
          {
              "label": "Transport Links",
              "score": 80,
              "weight": 20,
              "summary": "2 rail/tube stations within 2km. 55 bus stops within 500m"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "486 amenities nearby: 27 schools, 252 food/drink, 31 healthcare, 38 shops, 81 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 41,
              "weight": 20,
              "summary": "IMD 2019 decile 4/10 (moderate deprivation). Ranked 11,038 of 32,844 LSOAs (34th percentile). LSOA: Reading 011F"
          },
          {
              "label": "Environment & Quality",
              "score": 30,
              "weight": 20,
              "summary": "10 flood risk zones within 3km. near: River Kennet, River Thames, River Loddon. 1 active flood warning. 81 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 64,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 62,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 73,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 50,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  bath: {
      "name": "Bath City Centre",
      "region": "South West",
      "postcode": "BA1  1SU",
      "areaType": "suburban",
      "overallScore": 49,
      "population": "~100,000 (city)",
      "avgPropertyPrice": "£420,000",
      "summary": "Bath City Centre scores 49/100 overall. Transport links include 2 rail stations and 51 bus stops. 557 amenities nearby including 29 schools and 348 food/drink venues. Crime: 1,542 incidents over 3 months (514/month), with violent crime at 33%. IMD 2019 decile 5 indicates moderate deprivation. Investing intent scores highest at 69/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "1542 crimes over 3 months (514/month). most common: Violent Crime (31%). violent crime: 33% of total. trend: stable"
          },
          {
              "label": "Transport Links",
              "score": 80,
              "weight": 20,
              "summary": "2 rail/tube stations within 2km. 51 bus stops within 500m. nearby: Oldfield Park station"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "557 amenities nearby: 29 schools, 348 food/drink, 36 healthcare, 19 shops, 72 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 50,
              "weight": 20,
              "summary": "IMD 2019 decile 5/10 (moderate deprivation). Ranked 16,329 of 32,844 LSOAs (50th percentile). LSOA: Bath and North East Somerset 007B"
          },
          {
              "label": "Environment & Quality",
              "score": 15,
              "weight": 20,
              "summary": "10 flood risk zones within 3km. near: Groundwater, Bristol River Avon, River Boyd, By Brook, Brislington Brook, River Cam, Wellow Brook, Midford Brook. 2 active flood warnings. 72 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 62,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 62,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 69,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 49,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  exeter: {
      "name": "Exeter City Centre",
      "region": "South West",
      "postcode": "EX1  1EE",
      "areaType": "suburban",
      "overallScore": 58,
      "population": "~130,000 (city)",
      "avgPropertyPrice": "£300,000",
      "summary": "Exeter City Centre scores 58/100 overall. Transport links include 5 rail stations and 21 bus stops. 437 amenities nearby including 30 schools and 213 food/drink venues. Crime: 1,840 incidents over 3 months (613/month), with violent crime at 40%. Moving intent scores highest at 64/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "1840 crimes over 3 months (613/month). most common: Violent Crime (39%). violent crime: 40% of total. trend: stable"
          },
          {
              "label": "Transport Links",
              "score": 95,
              "weight": 20,
              "summary": "5 rail/tube stations within 2km. 21 bus stops within 500m. nearby: Exeter St Thomas station, St James' Park station"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "437 amenities nearby: 30 schools, 213 food/drink, 36 healthcare, 23 shops, 109 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 50,
              "weight": 20,
              "summary": "Deprivation data unavailable (non-England or data gap)"
          },
          {
              "label": "Environment & Quality",
              "score": 45,
              "weight": 20,
              "summary": "10 flood risk zones within 3km. near: River Clyst, River Culm, River Teign, River Bovey, River Lemon, River Kenn, River Creedy, River Yeo, Lapford Yeo, Little Dart. no active warnings. 109 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 64,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 62,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 52,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 58,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  plymouth: {
      "name": "Plymouth City Centre",
      "region": "South West",
      "postcode": "PL1  1EA",
      "areaType": "suburban",
      "overallScore": 51,
      "population": "~265,000 (city)",
      "avgPropertyPrice": "£210,000",
      "summary": "Plymouth City Centre scores 51/100 overall. Transport links include 1 rail station and 43 bus stops. 658 amenities nearby including 24 schools and 280 food/drink venues. Crime: 2,916 incidents over 3 months (972/month), with violent crime at 41%. IMD 2019 decile 2 indicates high deprivation. Investing intent scores highest at 68/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "2916 crimes over 3 months (972/month). most common: Violent Crime (40%). violent crime: 41% of total. trend: falling"
          },
          {
              "label": "Transport Links",
              "score": 65,
              "weight": 20,
              "summary": "1 rail/tube station within 2km. 43 bus stops within 500m. nearby: Plymouth station"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "658 amenities nearby: 24 schools, 280 food/drink, 38 healthcare, 44 shops, 228 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 23,
              "weight": 20,
              "summary": "IMD 2019 decile 2/10 (high deprivation). Ranked 3,793 of 32,844 LSOAs (12th percentile). LSOA: Plymouth 027G"
          },
          {
              "label": "Environment & Quality",
              "score": 69,
              "weight": 20,
              "summary": "6 flood risk zones within 3km. near: River Yealm, River Plym, Tory Brook, Long Brook, River Tavy, River Walkham. no active warnings. 228 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 64,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 58,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 68,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 51,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  cambridge: {
      "name": "Cambridge City Centre",
      "region": "East of England",
      "postcode": "CB1  1PT",
      "areaType": "suburban",
      "overallScore": 50,
      "population": "~145,000 (city)",
      "avgPropertyPrice": "£500,000",
      "summary": "Cambridge City Centre scores 50/100 overall. Transport links include 1 rail station and 17 bus stops. 671 amenities nearby including 83 schools and 231 food/drink venues. Crime: 1,846 incidents over 3 months (615/month), with violent crime at 27%. IMD 2019 decile 5 indicates moderate deprivation. Investing intent scores highest at 66/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "1846 crimes over 3 months (615/month). most common: Violent Crime (26%). violent crime: 27% of total. trend: falling"
          },
          {
              "label": "Transport Links",
              "score": 65,
              "weight": 20,
              "summary": "1 rail/tube station within 2km. 17 bus stops within 500m"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "671 amenities nearby: 83 schools, 231 food/drink, 45 healthcare, 37 shops, 257 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 50,
              "weight": 20,
              "summary": "IMD 2019 decile 5/10 (moderate deprivation). Ranked 13,294 of 32,844 LSOAs (40th percentile). LSOA: Cambridge 008E"
          },
          {
              "label": "Environment & Quality",
              "score": 33,
              "weight": 20,
              "summary": "12 flood risk zones within 3km. near: Bourn Brook, Bin Brook, River Cam. no active warnings. 257 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 59,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 60,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 66,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 50,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  norwich: {
      "name": "Norwich City Centre",
      "region": "East of England",
      "postcode": "NR1  3QY",
      "areaType": "suburban",
      "overallScore": 48,
      "population": "~145,000 (city)",
      "avgPropertyPrice": "£250,000",
      "summary": "Norwich City Centre scores 48/100 overall. Transport links include 1 rail station and 44 bus stops. 551 amenities nearby including 30 schools and 306 food/drink venues. Crime: 2,227 incidents over 3 months (742/month), with violent crime at 32%. IMD 2019 decile 3 indicates high deprivation. Investing intent scores highest at 65/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "2227 crimes over 3 months (742/month). most common: Violent Crime (30%). violent crime: 32% of total. trend: falling"
          },
          {
              "label": "Transport Links",
              "score": 65,
              "weight": 20,
              "summary": "1 rail/tube station within 2km. 44 bus stops within 500m. nearby: Norwich station"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "551 amenities nearby: 30 schools, 306 food/drink, 49 healthcare, 29 shops, 92 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 32,
              "weight": 20,
              "summary": "IMD 2019 decile 3/10 (high deprivation). Ranked 7,285 of 32,844 LSOAs (22th percentile). LSOA: Norwich 011B"
          },
          {
              "label": "Environment & Quality",
              "score": 45,
              "weight": 20,
              "summary": "10 flood risk zones within 3km. near: River Yare, River Tas, Wensum. no active warnings. 92 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 62,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 59,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 65,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 48,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  leicester: {
      "name": "Leicester City Centre",
      "region": "East Midlands",
      "postcode": "LE1  5AR",
      "areaType": "suburban",
      "overallScore": 47,
      "population": "~370,000 (city)",
      "avgPropertyPrice": "£210,000",
      "summary": "Leicester City Centre scores 47/100 overall. Transport links include 2 rail stations and 29 bus stops. 564 amenities nearby including 33 schools and 308 food/drink venues. Crime: 4,427 incidents over 3 months (1476/month), with violent crime at 32%. Moving intent scores highest at 61/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "4427 crimes over 3 months (1476/month). most common: Violent Crime (30%). violent crime: 32% of total. trend: stable"
          },
          {
              "label": "Transport Links",
              "score": 80,
              "weight": 20,
              "summary": "2 rail/tube stations within 2km. 29 bus stops within 500m"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "564 amenities nearby: 33 schools, 308 food/drink, 30 healthcare, 50 shops, 112 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 50,
              "weight": 20,
              "summary": "Deprivation data unavailable (non-England or data gap)"
          },
          {
              "label": "Environment & Quality",
              "score": 5,
              "weight": 20,
              "summary": "18 flood risk zones within 3km. near: Rothley Brook, Rothley Brook, Quorn Brook, Sileby Brook, River Soar. 2 active flood warnings. 112 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 61,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 60,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 51,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 47,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  derby: {
      "name": "Derby City Centre",
      "region": "East Midlands",
      "postcode": "DE1  1QA",
      "areaType": "suburban",
      "overallScore": 39,
      "population": "~260,000 (city)",
      "avgPropertyPrice": "£180,000",
      "summary": "Derby City Centre scores 39/100 overall. Transport links include 1 rail station and 25 bus stops. 560 amenities nearby including 41 schools and 298 food/drink venues. Crime: 3,685 incidents over 3 months (1228/month), with violent crime at 40%. IMD 2019 decile 1 indicates high deprivation. Moving intent scores highest at 66/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "3685 crimes over 3 months (1228/month). most common: Violent Crime (38%). violent crime: 40% of total. trend: stable"
          },
          {
              "label": "Transport Links",
              "score": 65,
              "weight": 20,
              "summary": "1 rail/tube station within 2km. 25 bus stops within 500m. nearby: Derby station"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "560 amenities nearby: 41 schools, 298 food/drink, 41 healthcare, 71 shops, 83 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 14,
              "weight": 20,
              "summary": "IMD 2019 decile 1/10 (high deprivation). Ranked 563 of 32,844 LSOAs (2th percentile). LSOA: Derby 016A"
          },
          {
              "label": "Environment & Quality",
              "score": 18,
              "weight": 20,
              "summary": "12 flood risk zones within 3km. near: River Derwent, Black Brook, Coppice Brook, Markeaton Brook, Chaddeston Brook, Wilne Drain, Cuttle Brook, Doles Brook, Ramsley Brook and Carr Brook, Markeaton Brook, Bramble Brook. 1 active flood warning. 83 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 66,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 57,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 64,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 39,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  wolverhampton: {
      "name": "Wolverhampton City Centre",
      "region": "West Midlands",
      "postcode": "WV1  1LY",
      "areaType": "suburban",
      "overallScore": 60,
      "population": "~265,000 (city)",
      "avgPropertyPrice": "£170,000",
      "summary": "Wolverhampton City Centre scores 60/100 overall. Transport links include 1 rail station and 49 bus stops. 382 amenities nearby including 18 schools and 153 food/drink venues. Crime: 1,817 incidents over 3 months (606/month), with violent crime at 42%.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "1817 crimes over 3 months (606/month). most common: Violent Crime (42%). violent crime: 42% of total. trend: falling"
          },
          {
              "label": "Transport Links",
              "score": 65,
              "weight": 20,
              "summary": "1 rail/tube station within 2km. 49 bus stops within 500m"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "382 amenities nearby: 18 schools, 153 food/drink, 18 healthcare, 24 shops, 119 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 50,
              "weight": 20,
              "summary": "Deprivation data unavailable (non-England or data gap)"
          },
          {
              "label": "Environment & Quality",
              "score": 87,
              "weight": 20,
              "summary": "3 flood risk zones within 3km. near: Sandyford Brook, Ridings Brook, Saredon Brook, River Tame, Ford Brook, River Stour, Smestow Brook. no active warnings. 119 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 58,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 58,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 53,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 60,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  preston: {
      "name": "Preston City Centre",
      "region": "North West",
      "postcode": "PR1  2HE",
      "areaType": "suburban",
      "overallScore": 45,
      "population": "~145,000 (city)",
      "avgPropertyPrice": "£155,000",
      "summary": "Preston City Centre scores 45/100 overall. Transport links include 1 rail station and 19 bus stops. 327 amenities nearby including 25 schools and 181 food/drink venues. Crime: 2,348 incidents over 3 months (783/month), with violent crime at 31%. IMD 2019 decile 4 indicates moderate deprivation. Investing intent scores highest at 69/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "2348 crimes over 3 months (783/month). most common: Anti Social Behaviour (30%). violent crime: 31% of total. trend: stable"
          },
          {
              "label": "Transport Links",
              "score": 65,
              "weight": 20,
              "summary": "1 rail/tube station within 2km. 19 bus stops within 500m. nearby: The Station"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "327 amenities nearby: 25 schools, 181 food/drink, 16 healthcare, 22 shops, 63 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 41,
              "weight": 20,
              "summary": "IMD 2019 decile 4/10 (moderate deprivation). Ranked 11,812 of 32,844 LSOAs (36th percentile). LSOA: Preston 012G"
          },
          {
              "label": "Environment & Quality",
              "score": 21,
              "weight": 20,
              "summary": "14 flood risk zones within 3km. near: Ribble Estuary, River Ribble, River Darwen, River Ribble. no active warnings. 63 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 61,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 59,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 69,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 45,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  newcastle: {
      "name": "Newcastle City Centre",
      "region": "North East",
      "postcode": "NE1  7RU",
      "areaType": "suburban",
      "overallScore": 61,
      "population": "~300,000 (city)",
      "avgPropertyPrice": "£185,000",
      "summary": "Newcastle City Centre scores 61/100 overall. Transport links include 9 rail stations and 41 bus stops. 513 amenities nearby including 21 schools and 308 food/drink venues. Crime: 3,624 incidents over 3 months (1208/month), with violent crime at 33%. IMD 2019 decile 6 indicates moderate deprivation. Investing intent scores highest at 70/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "3624 crimes over 3 months (1208/month). most common: Violent Crime (31%). violent crime: 33% of total. trend: stable"
          },
          {
              "label": "Transport Links",
              "score": 95,
              "weight": 20,
              "summary": "9 rail/tube stations within 2km. 41 bus stops within 500m. nearby: Monument station, Newcastle station"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "513 amenities nearby: 21 schools, 308 food/drink, 31 healthcare, 25 shops, 78 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 59,
              "weight": 20,
              "summary": "IMD 2019 decile 6/10 (moderate deprivation). Ranked 18,149 of 32,844 LSOAs (55th percentile). LSOA: Newcastle upon Tyne 024C"
          },
          {
              "label": "Environment & Quality",
              "score": 51,
              "weight": 20,
              "summary": "9 flood risk zones within 3km. near: River Tyne, River Derwent, River Team, River Don, Ouseburn. no active warnings. 78 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 64,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 65,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 70,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 61,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  sunderland: {
      "name": "Sunderland City Centre",
      "region": "North East",
      "postcode": "SR1  1RE",
      "areaType": "suburban",
      "overallScore": 49,
      "population": "~175,000 (city)",
      "avgPropertyPrice": "£120,000",
      "summary": "Sunderland City Centre scores 49/100 overall. Transport links include 6 rail stations and 54 bus stops. 287 amenities nearby including 19 schools and 141 food/drink venues. Crime: 2,043 incidents over 3 months (681/month), with violent crime at 31%. IMD 2019 decile 1 indicates high deprivation. Investing intent scores highest at 72/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "2043 crimes over 3 months (681/month). most common: Violent Crime (29%). violent crime: 31% of total. trend: stable"
          },
          {
              "label": "Transport Links",
              "score": 95,
              "weight": 20,
              "summary": "6 rail/tube stations within 2km. 54 bus stops within 500m. nearby: Park Lane station"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "287 amenities nearby: 19 schools, 141 food/drink, 16 healthcare, 12 shops, 39 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 14,
              "weight": 20,
              "summary": "IMD 2019 decile 1/10 (high deprivation). Ranked 3,277 of 32,844 LSOAs (10th percentile). LSOA: Sunderland 013B"
          },
          {
              "label": "Environment & Quality",
              "score": 36,
              "weight": 20,
              "summary": "9 flood risk zones within 3km. near: River Wear, River Wear, Moors Burn, Smallhope Burn, North Sea. 1 active flood warning. 39 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 72,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 62,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 72,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 49,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  hull: {
      "name": "Hull City Centre",
      "region": "Yorkshire and The Humber",
      "postcode": "HU1  1NQ",
      "areaType": "suburban",
      "overallScore": 39,
      "population": "~260,000 (city)",
      "avgPropertyPrice": "£130,000",
      "summary": "Hull City Centre scores 39/100 overall. Transport links include 1 rail station and 31 bus stops. 291 amenities nearby including 10 schools and 184 food/drink venues. Crime: 1,467 incidents over 3 months (489/month), with violent crime at 38%. IMD 2019 decile 2 indicates high deprivation. Investing intent scores highest at 65/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "1467 crimes over 3 months (489/month). most common: Violent Crime (36%). violent crime: 38% of total. trend: stable"
          },
          {
              "label": "Transport Links",
              "score": 65,
              "weight": 20,
              "summary": "1 rail/tube station within 2km. 31 bus stops within 500m. nearby: Hull Paragon Interchange station"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "291 amenities nearby: 10 schools, 184 food/drink, 12 healthcare, 12 shops, 41 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 23,
              "weight": 20,
              "summary": "IMD 2019 decile 2/10 (high deprivation). Ranked 5,294 of 32,844 LSOAs (16th percentile). LSOA: Kingston upon Hull 029E"
          },
          {
              "label": "Environment & Quality",
              "score": 5,
              "weight": 20,
              "summary": "21 flood risk zones within 3km. near: River Hull, Fleet Drain, The Humber, Winestead Drain, Holderness Drain, Burstwick Drain, Skeffling Drain, Long Bank Drain, Keyingham Drain, Old Fleet Drain, Kellwell Stream, Lambwath Stream. 1 active flood warning. 41 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 64,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 58,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 65,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 39,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  york: {
      "name": "York City Centre",
      "region": "Yorkshire and The Humber",
      "postcode": "YO1  9TL",
      "areaType": "suburban",
      "overallScore": 51,
      "population": "~210,000 (city)",
      "avgPropertyPrice": "£330,000",
      "summary": "York City Centre scores 51/100 overall. Transport links include 2 rail stations and 42 bus stops. 2152 amenities nearby including 39 schools and 416 food/drink venues. Crime: 2,226 incidents over 3 months (742/month), with violent crime at 34%. IMD 2019 decile 7 indicates moderate deprivation. Investing intent scores highest at 65/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "2226 crimes over 3 months (742/month). most common: Violent Crime (33%). violent crime: 34% of total. trend: falling"
          },
          {
              "label": "Transport Links",
              "score": 80,
              "weight": 20,
              "summary": "2 rail/tube stations within 2km. 42 bus stops within 500m"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "2152 amenities nearby: 39 schools, 416 food/drink, 39 healthcare, 31 shops, 1583 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 68,
              "weight": 20,
              "summary": "IMD 2019 decile 7/10 (moderate deprivation). Ranked 20,366 of 32,844 LSOAs (62th percentile). LSOA: York 013I"
          },
          {
              "label": "Environment & Quality",
              "score": 5,
              "weight": 20,
              "summary": "26 flood risk zones within 3km. near: River Ouse, Burdyke, Holgate Beck, Blue Beck, River Foss, The Fleet, River Ouse, Holgate Beck, River Foss. no active warnings. 1583 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 59,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 63,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 65,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 51,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  swansea: {
      "name": "Swansea City Centre",
      "region": "Swansea",
      "postcode": "SA1  3QW",
      "areaType": "suburban",
      "overallScore": 55,
      "population": "~245,000 (city)",
      "avgPropertyPrice": "£180,000",
      "summary": "Swansea City Centre scores 55/100 overall. Transport links include 1 rail station and 46 bus stops. 420 amenities nearby including 18 schools and 223 food/drink venues. Crime: 1,833 incidents over 3 months (611/month), with violent crime at 38%. WIMD 2019 decile 1 indicates high deprivation. Investing intent scores highest at 70/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "1833 crimes over 3 months (611/month). most common: Violent Crime (37%). violent crime: 38% of total. trend: stable"
          },
          {
              "label": "Transport Links",
              "score": 65,
              "weight": 20,
              "summary": "1 rail/tube station within 2km. 46 bus stops within 500m"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "420 amenities nearby: 18 schools, 223 food/drink, 19 healthcare, 33 shops, 80 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 14,
              "weight": 20,
              "summary": "WIMD 2019 decile 1/10 (high deprivation). Ranked 36 of 1,909 Welsh LSOAs (2th percentile). LSOA: Castell 2 Gogledd"
          },
          {
              "label": "Environment & Quality",
              "score": 95,
              "weight": 20,
              "summary": "No flood risk zones within 3km. no active warnings. 80 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 66,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 57,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 70,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 55,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  coventry: {
      "name": "Coventry City Centre",
      "region": "West Midlands",
      "postcode": "CV1  5RE",
      "areaType": "suburban",
      "overallScore": 56,
      "population": "~370,000 (city)",
      "avgPropertyPrice": "£200,000",
      "summary": "Coventry City Centre scores 56/100 overall. Transport links include 1 rail station and 62 bus stops. 459 amenities nearby including 33 schools and 189 food/drink venues. Crime: 2,798 incidents over 3 months (933/month), with violent crime at 43%. Business intent scores highest at 58/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "2798 crimes over 3 months (933/month). most common: Violent Crime (41%). violent crime: 43% of total. trend: falling"
          },
          {
              "label": "Transport Links",
              "score": 65,
              "weight": 20,
              "summary": "1 rail/tube station within 2km. 62 bus stops within 500m"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "459 amenities nearby: 33 schools, 189 food/drink, 22 healthcare, 32 shops, 120 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 50,
              "weight": 20,
              "summary": "Deprivation data unavailable (non-England or data gap)"
          },
          {
              "label": "Environment & Quality",
              "score": 63,
              "weight": 20,
              "summary": "7 flood risk zones within 3km. near: Avon, St Johns, Fishers, Sowe, Sherbourne, Canley Brook, Sherbourne. no active warnings. 120 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 58,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 58,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 51,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 56,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },
  stoke: {
      "name": "Stoke-on-Trent City Centre",
      "region": "West Midlands",
      "postcode": "ST1  5NQ",
      "areaType": "suburban",
      "overallScore": 53,
      "population": "~260,000 (city)",
      "avgPropertyPrice": "£140,000",
      "summary": "Stoke-on-Trent City Centre scores 53/100 overall. Transport links include 1 rail station and 16 bus stops. 166 amenities nearby including 16 schools and 57 food/drink venues. Crime: 1,953 incidents over 3 months (651/month), with violent crime at 33%. IMD 2019 decile 3 indicates high deprivation. Investing intent scores highest at 67/100.",
      "dimensions": [
          {
              "label": "Safety & Crime",
              "score": 5,
              "weight": 20,
              "summary": "1953 crimes over 3 months (651/month). most common: Violent Crime (31%). violent crime: 33% of total. trend: stable"
          },
          {
              "label": "Transport Links",
              "score": 65,
              "weight": 20,
              "summary": "1 rail/tube station within 2km. 16 bus stops within 500m. nearby: Stoke-on-Trent station"
          },
          {
              "label": "Amenities & Services",
              "score": 95,
              "weight": 20,
              "summary": "166 amenities nearby: 16 schools, 57 food/drink, 19 healthcare, 5 shops, 52 parks/leisure"
          },
          {
              "label": "Demographics & Economy",
              "score": 32,
              "weight": 20,
              "summary": "IMD 2019 decile 3/10 (high deprivation). Ranked 7,566 of 32,844 LSOAs (23th percentile). LSOA: Stoke-on-Trent 015B"
          },
          {
              "label": "Environment & Quality",
              "score": 69,
              "weight": 20,
              "summary": "6 flood risk zones within 3km. near: River Trent, Ford Green Brook, Lyme Brook, River Trent, Lyme Brook. no active warnings. 52 parks/green spaces nearby"
          }
      ],
      "lockedSections": [
          "Safety & Crime Analysis",
          "Transport Links Analysis",
          "Amenities & Services Analysis",
          "Demographics & Economy Analysis",
          "Environment & Quality Analysis"
      ],
      "lockedRecommendations": 4,
      "intents": [
          {
              "label": "Moving",
              "score": 62,
              "slug": "moving"
          },
          {
              "label": "Business",
              "score": 59,
              "slug": "business"
          },
          {
              "label": "Investing",
              "score": 67,
              "slug": "investing"
          },
          {
              "label": "Research",
              "score": 53,
              "slug": "research"
          }
      ],
      "dataSources": [
          "Police.uk",
          "ONS / IMD",
          "OpenStreetMap",
          "Environment Agency",
          "Ofsted",
          "Postcodes.io"
      ]
  },

};

/* ── Helpers ── */

function getRAG(score: number) {
  if (score >= 70) return { color: "var(--neon-green)", dim: "var(--neon-green-dim)", label: "Strong" };
  if (score >= 45) return { color: "var(--neon-amber)", dim: "var(--neon-amber-dim)", label: "Moderate" };
  return { color: "var(--neon-red)", dim: "var(--neon-red-dim)", label: "Weak" };
}

/* ── Metadata ── */

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return Object.keys(AREAS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const area = AREAS[slug];
  if (!area) return { title: "Area Not Found | AreaIQ" };

  const title = `${area.name} Area Intelligence | Score: ${area.overallScore}/100 | AreaIQ`;
  const description = `${area.name} scores ${area.overallScore}/100 on AreaIQ. Safety, transport, schools, amenities, cost of living, and green space, all scored and explained.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://www.area-iq.co.uk/area/${slug}`,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${area.name} Area Intelligence` }],
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `https://www.area-iq.co.uk/area/${slug}` },
  };
}

/* ── Page ── */

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const area = AREAS[slug];
  if (!area) notFound();

  const { color: scoreColor, dim: scoreDim, label: scoreLabel } = getRAG(area.overallScore);

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <FullNavbar breadcrumb={area.name} />

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-[960px] mx-auto px-6 py-10 md:py-14">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={12} style={{ color: "var(--text-tertiary)" }} />
                  <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>{area.region}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5" style={{ color: "var(--text-secondary)", background: "var(--bg-active)" }}>
                    {area.areaType}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5" style={{ color: scoreColor, background: scoreDim }}>
                    {scoreLabel}
                  </span>
                </div>
                <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
                  {area.name}
                </h1>
                <p className="text-[13px] leading-relaxed max-w-[560px] mb-4" style={{ color: "var(--text-secondary)" }}>
                  {area.summary}
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  <span>Postcode: {area.postcode}</span>
                  <span>Population: {area.population}</span>
                  <span>Avg. property: {area.avgPropertyPrice}</span>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  {area.dataSources.map((src) => (
                    <span key={src} className="text-[9px] font-mono px-1.5 py-0.5" style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}>
                      {src}
                    </span>
                  ))}
                </div>
              </div>

              {/* Score ring in hero */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative" style={{ width: 140, height: 140 }}>
                  <svg width={140} height={140} className="score-ring">
                    <circle className="score-ring-track" cx={70} cy={70} r={62} />
                    <circle
                      className="score-ring-fill"
                      cx={70} cy={70} r={62}
                      stroke={scoreColor}
                      strokeDasharray={2 * Math.PI * 62}
                      strokeDashoffset={2 * Math.PI * 62 - (area.overallScore / 100) * 2 * Math.PI * 62}
                      style={{ filter: `drop-shadow(0 0 6px ${scoreColor})` }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[32px] font-mono font-bold tracking-tight" style={{ color: scoreColor }}>
                      {area.overallScore}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>/100</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider mt-2" style={{ color: "var(--text-tertiary)" }}>
                  AreaIQ Score
                </span>
                <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5" style={{ background: "var(--neon-green-dim)", borderRadius: "2px" }}>
                  <ShieldCheck size={11} style={{ color: "var(--neon-green)" }} />
                  <span className="text-[9px] font-mono" style={{ color: "var(--neon-green)" }}>
                    Deterministic scores
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[960px] mx-auto px-4 md:px-6 py-6 md:py-8">

          {/* ── Radar Chart ── */}
          <div className="border mb-3" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <div className="px-5 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Dimension Overview
              </h2>
              <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                {area.areaType} benchmarks · {area.dimensions.length} dimensions
              </span>
            </div>
            <div className="p-5 flex justify-center">
              <RadarChartStatic dimensions={area.dimensions} size={220} />
            </div>
          </div>

          {/* ── Dimension Breakdown (scores + summaries, NO data reasoning) ── */}
          <div className="border mb-6" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <div className="px-5 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Dimension Breakdown
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {area.dimensions.map((dim) => {
                const { color, dim: dimBg } = getRAG(dim.score);
                return (
                  <div key={dim.label}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>{dim.label}</span>
                        <span className="text-[9px] font-mono px-1 py-px" style={{ color: "var(--text-tertiary)", background: "var(--bg)" }}>
                          {dim.weight}%
                        </span>
                      </div>
                      <span className="text-[13px] font-mono font-semibold" style={{ color }}>{dim.score}</span>
                    </div>
                    <div className="h-1.5 w-full" style={{ background: dimBg }}>
                      <div className="h-full" style={{ width: `${dim.score}%`, background: color }} />
                    </div>
                    <p className="text-[10px] mt-1.5 leading-snug" style={{ color: "var(--text-tertiary)" }}>{dim.summary}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Score by Intent ── */}
          <div className="border mb-6" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <div className="px-5 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Score by Intent
              </h2>
              <span className="text-[10px] font-mono ml-2" style={{ color: "var(--text-tertiary)" }}>
                · Same area, different scores depending on your purpose
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
              {area.intents.map((intent) => {
                const { color } = getRAG(intent.score);
                return (
                  <div key={intent.slug} className="p-5 text-center" style={{ background: "var(--bg)" }}>
                    <span className="text-[28px] font-mono font-bold" style={{ color }}>{intent.score}</span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>/100</span>
                    <div className="text-[11px] font-mono mt-1" style={{ color: "var(--text-secondary)" }}>{intent.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Locked: Detailed Analysis ── */}
          <div className="relative mb-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Detailed Analysis
                </h2>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  · {area.lockedSections.length} sections
                </span>
              </div>
              {area.lockedSections.map((title, i) => (
                <div key={i} className="border px-5 py-3 flex items-center gap-3" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", opacity: 0.5 }}>
                  <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[13px] font-semibold flex-1" style={{ color: "var(--text-primary)" }}>
                    {title}
                  </span>
                  <Lock size={12} style={{ color: "var(--text-tertiary)" }} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Locked: Recommendations ── */}
          <div className="relative mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Recommendations
              </h2>
              <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                {area.lockedRecommendations} actions
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {Array.from({ length: area.lockedRecommendations }, (_, i) => (
                <div key={i} className="border px-5 py-3.5 flex gap-4" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", opacity: 0.5 }}>
                  <div className="shrink-0 mt-0.5">
                    <span className="w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="h-2.5 rounded-sm" style={{ width: `${65 - i * 10}%`, background: "var(--border)" }} />
                    <Lock size={10} style={{ color: "var(--text-tertiary)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="border mb-6" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <div className="p-8 md:p-10 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Lock size={14} style={{ color: "var(--neon-amber)" }} />
                <h2 className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--neon-amber)" }}>
                  Full report locked
                </h2>
              </div>
              <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
                Unlock the full {area.name} report
              </h2>
              <p className="text-[13px] max-w-lg mx-auto mb-6" style={{ color: "var(--text-secondary)" }}>
                Detailed analysis across {area.lockedSections.length} sections, data-backed reasoning for every score, and {area.lockedRecommendations} personalised recommendations. Powered by live data from {area.dataSources.length} UK sources.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={`/report?postcode=${encodeURIComponent(area.postcode)}`}
                  className="h-10 px-6 flex items-center gap-2 text-[12px] font-mono font-medium uppercase tracking-wide transition-colors"
                  style={{ background: "var(--text-primary)", color: "var(--bg)" }}
                >
                  Generate Full Report <ArrowRight size={12} />
                </Link>
                <Link
                  href="/pricing"
                  className="h-10 px-6 flex items-center gap-2 text-[12px] font-mono font-medium uppercase tracking-wide transition-colors"
                  style={{ background: "var(--bg-active)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                >
                  View Pricing
                </Link>
              </div>
              <p className="text-[10px] font-mono mt-4" style={{ color: "var(--text-tertiary)" }}>
                Free tier: 3 reports/month. No card required.
              </p>
            </div>
          </div>

          {/* ── Data Sources ── */}
          <div className="py-4 border-t flex items-center gap-3 flex-wrap" style={{ borderColor: "var(--border)" }}>
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Sources:</span>
            {area.dataSources.map((src) => (
              <span key={src} className="text-[9px] font-mono px-1.5 py-0.5" style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}>
                {src}
              </span>
            ))}
          </div>

          {/* ── Related Areas ── */}
          <div className="py-6 border-t" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-[10px] font-mono uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
              More UK Area Reports
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(AREAS)
                .filter(([s]) => s !== slug)
                .slice(0, 8)
                .map(([s, a]) => {
                  const { color } = getRAG(a.overallScore);
                  return (
                    <Link
                      key={s}
                      href={`/area/${s}`}
                      className="border px-3 py-2.5 flex items-center justify-between gap-2 transition-colors hover:border-[var(--text-tertiary)]"
                      style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
                    >
                      <span className="text-[11px] font-mono truncate" style={{ color: "var(--text-secondary)" }}>{a.name}</span>
                      <span className="text-[11px] font-mono font-semibold shrink-0" style={{ color }}>{a.overallScore}</span>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>

        {/* ── JSON-LD ── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Place",
              name: area.name,
              description: area.summary,
              address: {
                "@type": "PostalAddress",
                addressRegion: area.region,
                addressCountry: "GB",
                postalCode: area.postcode,
              },
              additionalProperty: [
                { "@type": "PropertyValue", name: "AreaIQ Score", value: area.overallScore, maxValue: 100, unitText: "points" },
                ...area.dimensions.map((d) => ({
                  "@type": "PropertyValue", name: `${d.label} Score`, value: d.score, maxValue: 100, unitText: "points",
                })),
              ],
            }),
          }}
        />
      </main>

      <Footer />
    </div>
  );
}

/* ── Static Radar Chart ── */

function RadarChartStatic({ dimensions, size = 200 }: { dimensions: AreaDimension[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 30;
  const levels = [20, 40, 60, 80, 100];
  const count = dimensions.length;

  function getPoint(index: number, value: number): [number, number] {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (value / 100) * maxR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  function getPolygon(value: number): string {
    return Array.from({ length: count }, (_, i) => getPoint(i, value).join(",")).join(" ");
  }

  const dataPoints = dimensions.map((d, i) => getPoint(i, d.score));
  const dataPolygon = dataPoints.map(p => p.join(",")).join(" ");
  const avgScore = dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;
  const { color: fillColor } = getRAG(avgScore);

  return (
    <div className="relative py-4 px-8" style={{ width: size + 64, height: size + 32 }}>
      <svg width={size} height={size} style={{ overflow: "visible" }}>
        {levels.map((level) => (
          <polygon key={level} points={getPolygon(level)} fill="none" stroke="var(--border)" strokeWidth={level === 100 ? 1 : 0.5} opacity={level === 100 ? 0.8 : 0.4} />
        ))}
        {dimensions.map((_, i) => {
          const [x, y] = getPoint(i, 100);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={0.5} opacity={0.4} />;
        })}
        <polygon points={dataPolygon} fill={fillColor} fillOpacity={0.1} stroke={fillColor} strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 4px ${fillColor})` }} />
        {dataPoints.map((point, i) => {
          const { color } = getRAG(dimensions[i].score);
          return <circle key={i} cx={point[0]} cy={point[1]} r={3} fill={color} stroke="var(--bg)" strokeWidth={1} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />;
        })}
        {dimensions.map((dim, i) => {
          const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
          const labelR = maxR + 20;
          const lx = cx + labelR * Math.cos(angle);
          const ly = cy + labelR * Math.sin(angle);
          const { color } = getRAG(dim.score);
          let anchor: "start" | "middle" | "end" = "middle";
          if (Math.cos(angle) > 0.3) anchor = "start";
          else if (Math.cos(angle) < -0.3) anchor = "end";
          return (
            <g key={i}>
              <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" fill="var(--text-tertiary)" fontSize="9" fontFamily="var(--font-mono)">{dim.label}</text>
              <text x={lx} y={ly + 12} textAnchor={anchor} dominantBaseline="middle" fill={color} fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">{dim.score}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
