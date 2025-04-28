addMdToPage(`
  ## Medelinkomst per län, år 2022
`);

/*
  * Vi vet medelinkomsterna *per kommun* år 2022 (från MongoDB, **incomeByKommun**), men kan vi ta reda på medelinkomsten *per län*?
  * För att kunna göra detta behöver vi veta vilka kommuner som ingår i ett län. Denna info har vi (från MySQL, **geoInfo**).
  * Men vi behöver även veta hur många som bor i varje kommun... eller?
  * Vid en första anblick ser det svårt ut at lösa detta, med den data vi har tillgång till! Men *om vi utgår ifrån att de som är berättigade att rösta i varje kommun är ungefär lika många procent i alla kommuner inom ett län*, så kan vi räkna ut hur många procent av befolkningen i ett län som bor i en viss stad. Och vet vi detta kan vi sedan räkna ut en medelinkomst för varje län!
  * Vi behöver kombinera data från 3 datakällor! (Se källkoden i **mean-income-by-county-2022.js** för hur vi gör detta.)
  * *Data matchar inte alltid perfekt mellan olika datakällor:* När vi håller på att kombinera datakällorna märker vi att kommunerna Järfälla, Salem, Solna, Sundbyberg och Tyresö saknas i **geoInfo** (vår källa för vilka kommuner som ingår i respektive län) men vi kan enkelt lägga till dessa i Stockholms län manuellt!
  * Hade vi inte kunnat hitta den här datan - medelinkomst per län - enklare? Jo, sannolikt kan vi be SCB:s webbgränssnitt att summera datan från deras undersökningen som vi hämtat datan på kommunnivå från på länsnivå istället! (Och hämtat den därifrån för att lägga in en egen databas.)
  * MEN: Vad vi övar på är att kunna kombinera data från olika källor, se vilka problem som kan uppkomma och hur man genom att använda datan på ett smart sätt kan transformera den och få åt ut uppgifter som kräver att vi arbetar aktivt med problemlösning kring att omvandla datan! */

// Note:
// When you are done with a script/page - remove your console.logs/console.table-logs etc
// We have kept those here so that you can see what happens during our data transformations
// in the web browser console!

// Get  eligible to vote per municipality ("kommun")
dbQuery.use('riksdagsval-neo4j');
let municipalities =
  (await dbQuery('MATCH (n:EligibleToVote) RETURN n'))
    // Only keep the municipality names and count of people eligible to vote
    .map(x => ({ name: x.kommun, count: x.roster2022 }));

//tableFromData({data:municipalities});

// Get municipalities by county
dbQuery.use('geo-mysql');
let counties = (await dbQuery(`
  SELECT county, GROUP_CONCAT(DISTINCT municipality) AS municipalities
  FROM geoData GROUP BY county
`))
  // MySQL returns a GROUP_CONCAT as a string -> split that value to an array
  .map(x => ({ ...x, municipalities: x.municipalities.split(',') }));

//tableFromData({data:counties});

// Get the mean income per municipality
dbQuery.use('kommun-info-mongodb');
let meanIncomes = (await dbQuery.collection('incomeByKommun').find({ kon: 'totalt' }))
  // Only keep the municipality name and the mean income for 2022
  .map(x => ({ municipality: x.kommun, meanIncome: x.medelInkomst2022 }));

// Since the data comes from 3 different sources/datsets we want to check that
// we have the same set of municipalities in all of them
let fromNeo4j = municipalities.map(x => x.name); // length 290
let fromMySQL = counties.flatMap(x => x.municipalities); // length 285!
let fromMongo = meanIncomes.map(x => x.municipality); // length 290
console.log({ fromNeo4j, fromMySQL, fromMongo });

// Which municipalities are missing in the data in counties (from MySQL)?
let notInMySQL = fromNeo4j.filter(x => !fromMySQL.includes(x));
console.log('The following municipalities are not in MySQL', notInMySQL);

// This is a strange anomaly, but quite easy to fix, for our purposes here,
// even if we don't have read access to the database:
// All these municipalities are part of the county of Stockholm.
// We'll simply add them to the variable municipalitiesByCounty!
counties.find(x => x.county == 'Stockholm').municipalities.push(...notInMySQL);
console.log('Fixed! Added the municipalities in our data!');

// Let us replace the name of municipalities with the full info about them from municipalities,
// a type of join similar to "sub selects" in SQL, and called "population" in MongoDB
// + directly after this we add the total count (people eligble to vote) to each county!
counties = counties.map(c => ({
  ...c,
  municipalities: c.municipalities.map(cm => municipalities.find(m => m.name == cm))
})).map(c => ({ ...c, count: s.sum(c.municipalities.map(m => m.count)) }));
console.table(counties);

// Now we can calculate the percentage of the population within a county that
// that live in each municipality and also join in the mean income for each municipality

// IMPORTANT: We use forEach rather than map here since a map would
// have created new objects but forEach just modifies them (adds properties)
// The advantage is that we already have these objects in the arrays of municipalities
// for each county, in the counties array. These are references to the same objects that exist
// in the municipalities array. So when we update the objects they are updated
// within the counties variable as well!
// See: https://wesbos.com/javascript/08-data-types/object-references-vs-values

municipalities.forEach(m => {
  m.percentage = m.count * 100 / counties.find(c => c.municipalities.includes(m)).count;
  m.meanIncome = meanIncomes.find(mi => mi.municipality == m.name).meanIncome;
});
console.table(municipalities);

// Now we can finally calculate the mean income per county
// by summing the percentage of county population x municipality mean income
// for all municipalities within a county
counties = counties.map(c => ({
  ...c,
  meanIncome: s.sum(c.municipalities.map(m => m.meanIncome * m.percentage)) / 100
}));

// Let us create a new variable with only the county name and the mean income
// and sort it with the highest mean income first (descending)
let meanIncomeByCounty = counties
  .map(({ county, meanIncome }) => ({ county, meanIncome }))
  .toSorted((a, b) => a.meanIncome > b.meanIncome ? -1 : 1);

// and keep a version sorted ascending for the diagram
let meanIncomeForChart = meanIncomeByCounty
  .toSorted(((a, b) => a.meanIncome < b.meanIncome ? -1 : 1));

// Display the final data as a a column chart
drawGoogleChart({
  type: 'ColumnChart',
  data: makeChartFriendly(meanIncomeForChart.toSorted(), 'Län', 'TSEK'),
  options: {
    height: 500,
    vAxis: {
      minValue: 0
    },
    hAxis: {
      slantedText: true, 
      slantedTextAngle: 45
    },
    chartArea: { left: 50, right: 0 },
    title: `Medelårsinkomst i Sverige 2022 (TSEK) per län`
  }
});

addMdToPage(`
  `)

// Display the final data as a table!
tableFromData({ data: meanIncomeByCounty, columnNames: ['Län', 'Medelårsinkomst 2022 (TSEK)'] });