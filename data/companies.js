/*
 * Company locations shown on the map.
 *
 * To add a company: copy one block, change the fields, and drop a square
 * logo (any size, ~128px is plenty) into /img.
 *
 * Coordinates: right-click the building in Google Maps and click the
 * numbers at the top of the menu to copy them (first = lat, second = lng).
 * Or open the site with ?edit on the end of the URL and click the map.
 *
 * Addresses are kept as comments for reference only (not shown on the map).
 * To show one, remove the // in front of it.
 *
 * careers: link shown as "View jobs" for companies whose open roles can't be
 *          counted automatically (counted companies get their link from jobs.js).
 *
 * verify: true  -> location is a best guess and should be checked.
 */
window.COMPANIES = [
  // ---------- Banking ----------
  {
    name: "ANZ",
    category: "Banking",
    // address: "25 Albert Street, Auckland CBD, Auckland 1010",
    lat: -36.84558535844488, lng: 174.7644960581696,
    logo: "img/anz_logo.jpg",
    website: "https://www.anz.co.nz",
    description: "New Zealand's largest bank by assets."
  },
  {
    name: "ASB",
    category: "Banking",
    // address: "12 Jellicoe Street, Auckland CBD, Auckland 1010",
    lat: -36.841318759375866, lng: 174.75749700029922,
    logo: "img/asb_bank_logo.jpg",
    website: "https://www.asb.co.nz",
    careers: "https://careers.asbgroup.co.nz/search?search=",
    description: "Major NZ bank with its head office in Wynyard Quarter."
  },
  {
    name: "BNZ",
    category: "Banking",
    // address: "80 Queen Street, Auckland CBD, Auckland 1010",
    lat: -36.84613602692266, lng: 174.76628596124814,
    logo: "img/bnz_logo.jpg",
    website: "https://www.bnz.co.nz",
    description: "Bank of New Zealand."
  },
  {
    name: "Kiwibank",
    category: "Banking",
    // address: "Level 3/155-167 Fanshawe Street, Auckland CBD",
    lat: -36.84488145001219, lng: 174.75485225992654,
    logo: "img/kiwibank_logo.jpg",
    website: "https://www.kiwibank.co.nz",
    careers: "https://kiwibankpeople.csod.com/ux/ats/careersite/1/home?c=kiwibankpeople",
    description: "New Zealand-owned bank."
  },
  {
    name: "Westpac",
    category: "Banking",
    // address: "16 Takutai Square, Auckland",
    lat: -36.844868506419076, lng: 174.77023866089482,
    logo: "img/westpac_logo.jpg",
    website: "https://www.westpac.co.nz",
    description: "Westpac New Zealand head office in the Britomart precinct."
  },

  // ---------- Telecommunications ----------
  {
    name: "Kordia",
    category: "Telecommunications",
    // address: "162 Victoria Street West, Auckland CBD, Auckland 1010",
    lat: -36.847942615486275, lng: 174.75869388216384,
    logo: "img/kordia_logo.jpg",
    website: "https://www.kordia.co.nz",
    description: "Network infrastructure, cybersecurity and broadcast services."
  },
  {
    name: "One NZ",
    category: "Telecommunications",
    // address: "30 Daldy Street, Freemans Bay, Auckland 1010",
    lat: -36.84367080106811, lng: 174.75487220987523,
    logo: "img/onenz_logo.jpg",
    website: "https://one.nz",
    description: "Mobile and broadband provider (formerly Vodafone NZ)."
  },
  {
    name: "Spark",
    category: "Telecommunications",
    // address: "Spark City Level 1/50 Albert Street, Auckland CBD",
    lat: -36.84652257879712, lng: 174.76489537964113,
    logo: "img/spark_new_zealand_logo.jpg",
    website: "https://www.spark.co.nz",
    description: "New Zealand's largest telecommunications and digital services company."
  },

  // ---------- Energy ----------
  {
    name: "Contact Energy",
    category: "Energy",
    // address: "188 Quay Street, Auckland",
    lat: -36.84314314077949, lng: 174.76512364866923,
    logo: "img/contactenergy_logo.jpg",
    website: "https://contact.co.nz",
    careers: "https://contact.co.nz/about-us/careers#vacancies",
    description: "Electricity generator and retailer."
  },
  {
    name: "Mercury",
    category: "Energy",
    // address: "The Mercury Building, 33 Broadway, Newmarket, Auckland",
    lat: -36.86465601551404, lng: 174.77914410959184,
    logo: "img/mercury_logo.jpg",
    website: "https://www.mercury.co.nz",
    careers: "https://careers.mercury.co.nz/",
    description: "Renewable electricity generator and retailer."
  },

  // ---------- Transport & Logistics ----------
  {
    name: "Air New Zealand",
    category: "Transport",
    // address: "185 Fanshawe Street, Auckland CBD, Auckland 1010",
    lat: -36.84495228248709, lng: 174.75354183569274,
    logo: "img/air_new_zealand_logo.jpg",
    website: "https://www.airnewzealand.co.nz",
    description: "New Zealand's national airline, headquartered beside Victoria Park."
  },
  // {
  //   name: "NZ Post",
  //   category: "Logistics",
  //   // address: "Auckland",
  //   lat: -36.8470, lng: 174.7605,
  //   logo: "img/nzpost_logo.jpg",
  //   website: "https://www.nzpost.co.nz",
  //   description: "National postal and parcel service.",
  //   verify: true
  // },

  // ---------- Government ----------
  {
    name: "Auckland Council",
    category: "Government",
    // address: "135 Albert Street, Auckland CBD, Auckland 1010",
    lat: -36.84974563562469, lng: 174.76295048387158,
    logo: "img/auckland_council_logo.jpg",
    website: "https://www.aucklandcouncil.govt.nz",
    description: "Local government for the Auckland region."
  },

  // ---------- Technology ----------
  {
    name: "ClearPoint",
    category: "Technology",
    // address: "ClearPoint House, Level 3, 7/9 Fanshawe Street, Auckland CBD",
    lat: -36.84519466961833, lng: 174.76089048631107,
    logo: "img/clearpoint_ltd_logo.jpg",
    website: "https://www.clearpoint.co.nz",
    description: "Digital engineering and software consultancy."
  },
  {
    name: "Datacom",
    category: "Technology",
    // address: "58 Gaunt Street, Auckland CBD, Auckland 1010",
    lat: -36.84442553962736, lng: 174.75531672493494,
    logo: "img/datacom_logo.jpg",
    website: "https://datacom.com",
    careers: "https://datacom.com/nz/en/careers/search?search=&page=1&sortBy=&category=&searchCity=Auckland&searchCountry=",
    description: "One of New Zealand's largest IT services companies."
  },
  {
    name: "DXC Technology",
    category: "Technology",
    // address: "Level 4/22 Viaduct Harbour Avenue, Auckland CBD",
    lat: -36.84513266638752, lng: 174.75789221714535,
    logo: "img/dxctechnology_logo.jpg",
    website: "https://dxc.com",
    description: "IT services and consulting."
  },
  {
    name: "Fiserv",
    category: "Technology",
    // address: "Level 6/8 Tangihua Street, Auckland CBD, Auckland 1010",
    lat: -36.84572499969819, lng: 174.7739243500674,
    logo: "img/fiserv_logo.jpg",
    website: "https://www.fiserv.com",
    description: "Payments and financial services technology."
  },
  {
    name: "Fujifilm NZ",
    category: "Technology",
    // address: "5/12 Normanby Road, Mount Eden, Auckland 1024",
    lat: -36.87092067967779, lng: 174.76421395866822,
    logo: "img/fujifilm_new_zealand_logo.jpg",
    website: "https://www.fujifilm.com/nz/en",
    description: "Imaging, printing and business technology."
  },
  {
    name: "Fujitsu NZ",
    category: "Technology",
    // address: "44 Sale Street, Auckland CBD, Auckland 1010",
    lat: -36.84980478703813, lng: 174.75611892300293,
    logo: "img/fujitsu_logo.jpg",
    website: "https://www.fujitsu.com/nz/",
    careers: "https://www.jobs.global.fujitsu.com/search?searchResultView=LIST&locationsearch=auckland&pageNumber=0&facetFilters=%7B%7D&sortBy=&markerViewed=&carouselIndex=",
    description: "IT services and consulting."
  },
  {
    name: "Orion Health",
    category: "Technology",
    // address: "181 Grafton Road, Grafton, Auckland 1010",
    lat: -36.863917616111685, lng: 174.76443128075584,
    logo: "img/orion_health_logo.jpg",
    website: "https://orionhealth.com",
    careers: "https://orionhealth.com/nz/job-search/",
    description: "Health information technology company."
  },
  // {
  //   name: "Plexure",
  //   category: "Technology",
  //   // address: "Level 2, 2 Graham Street, Auckland CBD, Auckland 1010",
  //   lat: -36.847267853012205, lng: 174.75906626089485,
  //   logo: "img/plexuregroup_logo.jpg",
  //   website: "https://www.plexure.com",
  //   description: "Mobile engagement and personalisation software."
  // },
  {
    name: "Ricoh NZ",
    category: "Technology",
    // address: "34 Sale Street, Auckland CBD, Auckland 1010",
    lat: -36.84949136395121, lng: 174.75728523016946,
    logo: "img/ricoh_new_zealand_limited_logo.jpg",
    website: "https://www.ricoh.co.nz",
    careers: "https://nz.seek.com/Ricoh-jobs/at-this-company", // no own careers page; jobs are on Seek
    description: "Printing, imaging and workplace technology."
  },
  {
    name: "Serato",
    category: "Technology",
    // address: "Level 2/8 Brown Street, Ponsonby, Auckland 1021",
    lat: -36.85600231816159, lng: 174.74634918075566,
    logo: "img/serato_ltd_logo.jpg",
    website: "https://serato.com",
    description: "DJ and music production software."
  },
  {
    name: "Serko",
    category: "Technology",
    // address: "Serko House, 125 The Strand, Parnell, Auckland 1010",
    lat: -36.85002408100586, lng: 174.78190564027906,
    logo: "img/serko_ltd_logo.jpg",
    website: "https://www.serko.com",
    description: "Travel booking and expense management software."
  },
  {
    name: "The Instillery",
    category: "Technology",
    // address: "Level 4/24 Balfour Road, Parnell, Auckland 1052",
    lat: -36.849707880260034, lng: 174.78425174821564,
    logo: "img/the_instillery_logo.jpg",
    website: "https://www.theinstillery.com",
    careers: "https://nz.seek.com/The-Instillery-jobs?advertiserid=32818242", // jobs are on Seek
    description: "Cloud, security and managed IT services."
  },
  {
    name: "Theta",
    category: "Technology",
    // address: "8-10 Beresford Square, Auckland CBD",
    lat: -36.85706986660162, lng: 174.75871874451204,
    logo: "img/theta_nz_logo.jpg",
    website: "https://www.theta.co.nz",
    careers: "https://www.theta.co.nz/careers#opportunities",
    description: "Digital and technology consultancy."
  },
  {
    name: "Trade Me",
    category: "Technology",
    // address: "Level 4/155 Fanshawe Street, Auckland CBD",
    lat: -36.84514299865213, lng: 174.75549031514691,
    logo: "img/trade_me_logo.jpg",
    website: "https://www.trademe.co.nz",
    careers: "https://trademe.csod.com/ux/ats/careersite/1/home?c=trademe",
    description: "New Zealand's largest online marketplace."
  },
  {
    name: "Vista Group",
    category: "Technology",
    // address: "City Works Depot Shed 12/90 Wellesley Street West, Auckland CBD",
    lat: -36.849630950084176, lng: 174.75840131242524,
    logo: "img/vista_entertainment_solutions_logo.jpg",
    website: "https://www.vista.co",
    description: "Software for the global cinema industry."
  }
];
