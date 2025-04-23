// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
// Visa rubrik och instruktion
addMdToPage(`
  ## Valresultat per kommun under år 2018 - 2022 
  Välj vilken kommun du vill för att se detaljerad valstatistik, medelinkomst och medelålder.
`);

// === Steg 1: Hämta valresultat från Neo4j ===
dbQuery.use('riksdagsval-neo4j');
const rawNeo4j = await dbQuery('MATCH (n:Partiresultat) RETURN n');

// Rensa och Filtrerar bort poster som saknar kommun eller parti.
let partiResultat = [];
for (let i = 0; i < rawNeo4j.length; i++) {
  let item = rawNeo4j[i];
  if (item && item.kommun && item.parti) {
    partiResultat.push({
      kommun: item.kommun,
      parti: item.parti,
      //Omvandlar antalet röster från sträng till int genom att ta bort alla vita tecken: mellanslag, radbrytningar, tabbar (ex. "1 234" → 1234).
      roster2018: parseInt((item.roster2018 + '').replace(/\s/g, '')), // s är ett reguljärt uttryck , vilket vitt tecken som helst
      roster2022: parseInt((item.roster2022 + '').replace(/\s/g, '')) // g flaggan är global
    });
  }
}

//Gruppera data per kommun
let valdataPerKommun = {};

for (let i = 0; i < partiResultat.length; i++) {
  let rad = partiResultat[i];
  if (!valdataPerKommun[rad.kommun]) {
    valdataPerKommun[rad.kommun] = {};
  }
  valdataPerKommun[rad.kommun][rad.parti] = {
    roster2018: rad.roster2018,
    roster2022: rad.roster2022
  };
}

// Hämta inkomst och ålder från MongoDB
// Växlar över till databasen kommun-info-mongodb
//Hämtar både inkomst- och åldersdata där kön är "totalt" (både kvinnor och män)
dbQuery.use('kommun-info-mongodb');
const incomeData = await dbQuery.collection('incomeByKommun').find({ kon: 'totalt' });
const ageData = await dbQuery.collection('ageByKommun').find({ kon: 'totalt' });

// Gör om inkomstdata till ett enkelt uppslagsobjekt
let incomeMap = {};
for (let i = 0; i < incomeData.length; i++) {
  let x = incomeData[i];
  incomeMap[x.kommun] = {
    medelInkomst2018: x.medelInkomst2018,
    medelInkomst2022: x.medelInkomst2022
  };
}

// Gör om åldersdata till ett enkelt uppslagsobjekt
let ageMap = {};
for (let i = 0; i < ageData.length; i++) {
  let x = ageData[i];
  ageMap[x.kommun] = {
    medelalderAr2018: x.medelalderAr2018,
    medelalderAr2022: x.medelalderAr2022
  };
}

// Kombinerar all data i en stor lista
let slutdata = [];

for (let kommun in valdataPerKommun) {
  let partier = valdataPerKommun[kommun];

  for (let parti in partier) {
    let val = partier[parti];
    let inkomst = incomeMap[kommun] || {};
    let alder = ageMap[kommun] || {};

    slutdata.push({
      kommun: kommun,
      parti: parti,
      roster2018: val.roster2018 || 'NAN',
      roster2022: val.roster2022 || 'NAN',
      medelalder2018: alder.medelalderAr2018 || 'NAN',
      medelalder2022: alder.medelalderAr2022 || 'NAN',
      inkomst2018: inkomst.medelInkomst2018 || 'NAN',
      inkomst2022: inkomst.medelInkomst2022 || 'NAN'
    });
  }
}

//Visa max 10 rader i tabellen
slutdata = slutdata.slice(0, 9);

//Visa resultat i tabell
tableFromData({
  data: slutdata,
  columnNames: [
    'Kommun', 'Parti', 'Röster 2018', 'Röster 2022',
    'Ålder 2018', 'Ålder 2022', 'Inkomst 2018 (TSEK)', 'Inkomst 2022 (TSEK)'
  ]
});
