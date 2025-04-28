
/*
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
*/

// Introduktion och syfte
addMdToPage(`
# **Syfte med dataanalysen**

Målet med denna analys är att undersöka om det finns mönster eller möjliga kausala samband mellan förändringar i beskattning och valresultat under perioden **2018–2022**.

Analysen genomförs i tre steg:



## 1. Analys av valdata från Neo4j

Vi börjar med att undersöka valresultat som finns lagrade i en **Neo4j-databas**.



## 2. Analys av skattedata från MongoDB

Skattedata kommer från SCB och visar antal personer som betalar **kommunal och statlig skatt** per kommun, för åren **2018** och **2022**.

 **Källa:**  
[SCB – Antal personer som betalar skatt](https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__HE__HE0110__HE0110B/Skatter/table/tableViewLayout1/)

### MongoDB-konfiguration:
\`\`\`json
{
  "name": "test-mongodb",
  "type": "mongodb",
  "credentials": {
    "connectionString": "mongodb+srv://hanadi:xxx@cluster0.ubt9o.mongodb.net/",
    "database": "test"
  }
}
\`\`\`



## 3. Kombination och slutsatser

Slutligen kombineras valdata och skattedata för att identifiera eventuella samband och dra slutsatser kring sambandet mellan beskattning och valresultat.

`);


//Hämta valdata från Neo4j
// addMdToPage(`## Partiresultat per kommun 2018–2022`);
await dbQuery.use('riksdagsval-neo4j');
const rawNeo4j = await dbQuery('MATCH (n:Partiresultat) RETURN n');

// Hantera och formatera valdata med trim
let partiResultat = rawNeo4j
  .filter(item => item && item.kommun && item.parti)
  .map(item => ({
    kommun: item.kommun.trim(),
    parti: item.parti.trim(),
    roster2018: parseInt(item.roster2018 || 0),
    roster2022: parseInt(item.roster2022 || 0)
  }));

let valdataPerKommun = {};
for (let rad of partiResultat) {
  if (!valdataPerKommun[rad.kommun]) valdataPerKommun[rad.kommun] = {};
  valdataPerKommun[rad.kommun][rad.parti] = {
    roster2018: rad.roster2018,
    roster2022: rad.roster2022
  };
}

// Skapa analys av valförändringar
let analysData = [];
for (let kommun in valdataPerKommun) {
  let partier = valdataPerKommun[kommun];
  for (let parti in partier) {
    let val = partier[parti];
    let skillnad = (val.roster2022 - val.roster2018);
    let procent = ((skillnad) / (val.roster2018 || 1) * 100).toFixed(2);
    analysData.push({
      Kommun: kommun,
      Parti: parti,
      Röster2018: val.roster2018,
      Röster2022: val.roster2022,
      FörändringAntal: skillnad,
      FörändringProcent: `${procent}%`
    });
  }
}



// Visa Valdata-tabell
/*tableFromData({
  data: analysData.slice(0, 9),
  columnNames: [
    'Kommun', 'Parti', 'Röster2018', 'Röster2022', 'FörändringAntal', 'FörändringProcent'
  ]
});*/



// Hämta skattedata från MongoDB
// addMdToPage(`## Skattedata från SCB`);
await dbQuery.use('test-mongodb');
const skattData = await dbQuery.collection('skattInfo').find({}) || [];

let tabellSomLista = [];
for (let post of skattData.filter(r => r.region)) {
  let delar = post.region.split(" ");
  let kommunNamn = delar.slice(1).join(" ");
  let statligFörändringAntal = (post.statligSkatt2022 - post.statligSkatt2018);
  let statligFörändringProcent = ((statligFörändringAntal) / (post.statligSkatt2018 || 1) * 100).toFixed(2);

  tabellSomLista.push({
    Kommun: kommunNamn,
    KommunalSkatt2018: post.kommunalSkatt2018,
    StatligSkatt2018: post.statligSkatt2018,
    KommunalSkatt2022: post.kommunalSkatt2022,
    StatligSkatt2022: post.statligSkatt2022,
    StatligFörändringAntal: statligFörändringAntal,
    StatligFörändringProcent: `${statligFörändringProcent}%`
  });
}

// Visa Skattetabell
/*tableFromData({
  data: tabellSomLista.slice(0, 4),
  columnNames: [
    'Kommun', 'KommunalSkatt2018', 'StatligSkatt2018',
    'KommunalSkatt2022', 'StatligSkatt2022',
    'StatligFörändringAntal', 'StatligFörändringProcent'
  ]
});*/


//Analys: Val- och skatteförändring per kommun
addMdToPage(`
## **1. Analys av förändringar i valresultat och beskattning per kommun (2018–2022)**

Denna del fokuserar på hur valresultat och antalet skattebetalare har förändrats i varje kommun mellan 2018 och 2022.
`);


// Kombinera valförändring och skatteförändring i en gemensam tabell
let kombineradTabell = [];
for (let rad of analysData) {
  let matchadSkatt = tabellSomLista.find(s => s.Kommun === rad.Kommun);
  if (matchadSkatt) {
    kombineradTabell.push({
      Kommun: rad.Kommun,
      Parti: rad.Parti,
      ValförändringAntal: rad.FörändringAntal,
      ValförändringProcent: rad.FörändringProcent,
      StatligSkattFörändringAntal: matchadSkatt.StatligFörändringAntal,
      StatligSkattFörändringProcent: matchadSkatt.StatligFörändringProcent
    });
  }
}

// Skapa lista av kommuner för dropdown
let kommunSamling = [...new Set(kombineradTabell.map(item => item.Kommun))];
let chosenPlats = addDropdown('Välj kommun', kommunSamling, 'Stockholm');

// Visa filtrerad kombinerad tabell
let filterDataSamling = kombineradTabell.filter(item => item.Kommun === chosenPlats);

tableFromData({
  data: filterDataSamling,
  columnNames: [
    'Kommun', 'Parti',
    'ValförändringAntal', 'ValförändringProcent',
    'StatligSkattFörändringAntal', 'StatligSkattFörändringProcent'
  ]
});

// Skapa linjediagram
let partinameLista = [...new Set(filterDataSamling.map(r => r.Parti))].sort();

// Bygg dataset för varje serie
let linjeDataset = {
  'Valförändring (%)': partinameLista.map(parti => {
    let rad = filterDataSamling.find(r => r.Parti === parti);
    return rad ? rad.ValförändringProcent : 0;
  }),
  'Statlig Skattförändring (%)': partinameLista.map(parti => {
    let rad = filterDataSamling.find(r => r.Parti === parti);
    return rad ? rad.StatligSkattFörändringProcent : 0;
  })
};

// Omvandla till Google Chart-format
let chartDataset = [['Parti', ...Object.keys(linjeDataset)]];
for (let i = 0; i < partinameLista.length; i++) {
  let rad = [partinameLista[i]];
  for (let serie of Object.keys(linjeDataset)) {
    rad.push(linjeDataset[serie][i]);
  }
  chartDataset.push(rad);
}

// Rita linjediagrammet
drawGoogleChart({
  Type: 'LineChart',
  data: chartDataset,
  options: {
    title: `Förändring i % för val och skatt i ${chosenPlats}`,
    width: 1200,
    height: 600,
    curveType: 'function',
    pointSize: 5,
    legend: { position: 'top' },
    hAxis: { title: 'Parti' },
    vAxis: { title: 'Förändring (%)' }
  }
});


// Gruppera partier med .trim() på jämförelse
const partinamnLista = [
  'Moderaterna',
  'Centerpartiet',
  'Liberalerna',
  'Kristdemokraterna',
  'Arbetarepartiet-Socialdemokraterna',
  'Vänsterpartiet',
  'Miljöpartiet de gröna',
  'Sverigedemokraterna',
  'Övriga anmälda partier'
];

let grupper = partinamnLista.map(partinamn => {
  const data = kombineradTabell.filter(x =>
    x.Parti && x.Parti.trim().toLowerCase() === partinamn.toLowerCase()
  );

  const totalÖkning = data
    .filter(x => x.ValförändringAntal > 0)
    .reduce((acc, x) => acc + (parseFloat(x.ValförändringAntal) || 0), 0);

  const totalMinskning = data
    .filter(x => x.ValförändringAntal < 0)
    .reduce((acc, x) => acc + (parseFloat(x.ValförändringAntal) || 0), 0);

  return {
    Parti: partinamn,
    Ökat: totalÖkning,
    Minskat: Math.abs(totalMinskning)
  };
});

//Visa Tabell
addMdToPage(`
## Total förändring i valresultat per parti (ökning & minskning)

Här visas hur stödet för varje parti har förändrats totalt i landet mellan valen 2018 och 2022 – både ökningar och minskningar.
`);

tableFromData({
  data: grupper,
  columnNames: ['Parti', 'Ökat', 'Minskat']
});

// Rita PieChart – Ökade röster
drawGoogleChart({
  type: 'PieChart',
  data: makeChartFriendly(
    grupper.map(g => ({ name: g.Parti, value: g.Ökat })),
    'Ökade röster'
  ),
  options: {
    title: 'Fördelning av ökade röster per parti',
    height: 500,
    pieHole: 0.4,
    is3D: true
  }
});

//Rita PieChart – Minskade röster
drawGoogleChart({
  type: 'PieChart',
  data: makeChartFriendly(
    grupper.map(g => ({ name: g.Parti, value: g.Minskat })),
    'Minskade röster'
  ),
  options: {
    title: 'Fördelning av minskade röster per parti',
    height: 500,
    pieHole: 0.4,
    is3D: true
  }
});


addMdToPage(`
## **2. Slutsats av valförändringar 2018–2022**

Mellan valen 2018 och 2022 ändrades väljarnas beteende på flera tydliga sätt. Vissa partier vann många nya röster, medan andra tappade kraftigt.

### Vem vann fler röster?
- **Sverigedemokraterna** gick starkast framåt. De fick nästan **196 000 fler röster** jämfört med 2018 och tappade nästan inga väljare. Det visar att många nya väljare valde SD.
- **Socialdemokraterna** ökade också. Trots vissa små förluster fick de över **155 000 fler röster** totalt, vilket betyder att de lyckades stärka sitt stöd.
- **Miljöpartiet** hade ett svagt resultat i förra valet men lyckades vända trenden. De ökade antalet väljare igen, vilket tyder på att de återfick förtroende hos vissa väljare.
- **Småpartierna** (Övriga) höll sig ungefär på samma nivå. De gick upp lite i vissa delar av landet och ner i andra, men inga stora förändringar.

### Vem tappade röster?
- **Centerpartiet** förlorade väljare i **alla kommuner**. Det var det parti som hade det tuffast under den här perioden.
- **Kristdemokraterna** och **Liberalerna** tappade betydligt fler röster än de vann. Det betyder att deras stöd minskade kraftigt totalt sett.
- **Moderaterna** ökade något i vissa kommuner, men när man räknar ihop hela landet tappade de ändå fler röster än de vann.
- **Vänsterpartiet** tappade också mycket – de förlorade fler röster än de lyckades vinna.

### Vad betyder detta?
- **Sverigedemokraterna och Socialdemokraterna** är de stora vinnarna i valet. Båda ökade kraftigt.
- **Miljöpartiet** gjorde en comeback och växte igen efter en tuff period.
- **Centerpartiet** stod för det största tappet – och de förlorade i samtliga kommuner.
- Flera andra partier (KD, L, M, V) förlorade också, men i olika grad.

Det visar att det politiska landskapet förändrades en hel del mellan 2018 och 2022, med tydliga vinnare och förlorare.
`);



let allaPartier = [...new Set(partiResultat.map(p => p.parti))];
console.log("Partinamn i databasen:", allaPartier);
console.log("Alla rader med Centerpartiet:");
console.log(kombineradTabell.filter(x => x.Parti === "Centerpartiet"));


//Hitta kommun med störst vinst och störst förlust per parti

let vinnareFörlorarePerParti = [];

for (let parti of partinamnLista) {
  const data = kombineradTabell.filter(x =>
    x.Parti && x.Parti.trim().toLowerCase() === parti.toLowerCase()
  );

  if (data.length > 0) {
    // Störst vinst
    const störstaVinst = data.reduce((prev, current) =>
      (prev.ValförändringAntal > current.ValförändringAntal) ? prev : current
    );

    // Störst förlust
    const störstaFörlust = data.reduce((prev, current) =>
      (prev.ValförändringAntal < current.ValförändringAntal) ? prev : current
    );

    vinnareFörlorarePerParti.push({
      Parti: parti,
      StörstVinstKommun: störstaVinst.Kommun,
      VinstAntal: störstaVinst.ValförändringAntal,
      StörstFörlustKommun: störstaFörlust.Kommun,
      FörlustAntal: störstaFörlust.ValförändringAntal
    });
  }
}

//  Vinnare och förlorare per parti
addMdToPage(`## Kommun med störst vinst och störst förlust per parti`);
tableFromData({
  data: vinnareFörlorarePerParti,
  columnNames: [
    'Parti', 'StörstVinstKommun', 'VinstAntal', 'StörstFörlustKommun', 'FörlustAntal'
  ]
});

addMdToPage(`
# Var gick det bäst och sämst?

Här ser vi var partierna hade sina största framgångar – och sina största motgångar – under valet 2022 jämfört med 2018.

- **Stockholm** var den mest händelserika staden. Flera partier hade både sina största framgångar och sina värsta tapp här.
- **Moderaterna, Centerpartiet, Liberalerna, Kristdemokraterna och Vänsterpartiet** tappade flest röster just i Stockholm. Det visar att storstadsväljarna valde annorlunda än tidigare.
- Endast **Socialdemokraterna och Miljöpartiet** lyckades få sina största ökningar i Stockholm – de vann alltså flest nya röster där.
- **Sverigedemokraterna** växte kraftigt även i Stockholm, men tappade istället mest röster i **Malmö**, vilket visar på en stor regional skillnad.
- **Centerpartiet** hade det riktigt tungt över hela landet – de vann inte i en enda kommun. Deras "bästa" resultat var fortfarande en **förlust**, bara lite mindre än de andra.

Det här visar hur olika regioner i Sverige röstade på väldigt olika sätt – och att ett parti kan lyckas på ett ställe men tappa stort på ett annat.
`);



// Hämta kommuner per län från MySQL
await dbQuery.use('geo-mysql');
let counties = (await dbQuery(`
  SELECT county, GROUP_CONCAT(DISTINCT municipality) AS municipalities
  FROM geoData GROUP BY county
`))
  .map(x => ({
    ...x,
    municipalities: x.municipalities.split(',').map(k => k.trim())
  }));

// Lista kommuner från Neo4j (kommunnamn)
let fromNeo4j = [...new Set(partiResultat.map(p => p.kommun.trim()))];

//  Identifiera saknade kommuner
let fromMySQL = counties.flatMap(x => x.municipalities);
let notInMySQL = fromNeo4j.filter(k => !fromMySQL.includes(k));
console.log('Följande kommuner saknas i MySQL:', notInMySQL);

// Lägg till saknade kommuner i Stockholms län
let stockholm = counties.find(x => x.county === 'Stockholm');
if (stockholm) {
  stockholm.municipalities.push(...notInMySQL);
  console.log('Fixat! Lade till saknade kommuner i Stockholms län.');
}

// Bygg kommun → län-mappning
let kommunTillLan = {};
for (let county of counties) {
  for (let kommun of county.municipalities) {
    kommunTillLan[kommun] = county.county;
  }
}

// Summera röster per län
let valResultatPerLan = {};
for (let rad of partiResultat) {
  let kommun = rad.kommun.trim();
  let parti = rad.parti.trim();
  let lan = kommunTillLan[kommun];
  if (!lan) continue;

  if (!valResultatPerLan[lan]) valResultatPerLan[lan] = {};
  if (!valResultatPerLan[lan][parti]) {
    valResultatPerLan[lan][parti] = { roster2018: 0, roster2022: 0 };
  }

  valResultatPerLan[lan][parti].roster2018 += rad.roster2018;
  valResultatPerLan[lan][parti].roster2022 += rad.roster2022;
}


console.log('Röster per län:', valResultatPerLan);


let valtabell = [];

for (let lan in valResultatPerLan) {
  let partier = valResultatPerLan[lan];
  for (let parti in partier) {
    let data = partier[parti];
    let diff = data.roster2022 - data.roster2018;
    let diffProcent = ((diff / (data.roster2018 || 1)) * 100).toFixed(2);

    valtabell.push({
      Län: lan,
      Parti: parti,
      Röster2018: data.roster2018,
      Röster2022: data.roster2022,
      FörändringAntal: diff,
      FörändringProcent: `${diffProcent}%`
    });
  }
}

// Summera skatteförändring per län
let skatteförändringPerLan = {};

for (let post of tabellSomLista) {
  let kommun = post.Kommun;
  let lan = kommunTillLan[kommun];
  if (!lan) continue;

  if (!skatteförändringPerLan[lan]) {
    skatteförändringPerLan[lan] = {
      kommunalSkatt2018: 0,
      kommunalSkatt2022: 0,
      statligSkatt2018: 0,
      statligSkatt2022: 0
    };
  }

  skatteförändringPerLan[lan].kommunalSkatt2018 += post.KommunalSkatt2018 || 0;
  skatteförändringPerLan[lan].kommunalSkatt2022 += post.KommunalSkatt2022 || 0;
  skatteförändringPerLan[lan].statligSkatt2018 += post.StatligSkatt2018 || 0;
  skatteförändringPerLan[lan].statligSkatt2022 += post.StatligSkatt2022 || 0;
}
// Utökad valtabell med skatteförändring
let utökadValtabell = [];

for (let rad of valtabell) {
  let lan = rad.Län;
  let skatte = skatteförändringPerLan[lan];

  if (skatte) {
    let kommunalFörändring = skatte.kommunalSkatt2022 - skatte.kommunalSkatt2018;
    let statligFörändring = skatte.statligSkatt2022 - skatte.statligSkatt2018;

    utökadValtabell.push({
      ...rad,
      KommunalSkattFörändring: kommunalFörändring,
      StatligSkattFörändring: statligFörändring
    });
  }
}


addMdToPage(`
# **3. Att identifiera mönster mellan beskattning och valresultat (2018–2022)**

Vi undersöker om det finns mönster eller möjliga samband där förändringar i beskattning kan ha påverkat valresultatet mellan 2018 och 2022.

## Analys per län i Sverige

Användaren kan välja ett **län** via en dropdown och få följande information:

- En **tabell** som visar förändringar i partisympatier och skatteunderlag.
- Ett **linjediagram** som visualiserar förändringen i valresultat och beskattning över tid.

### Förväntat resultat
- Tydlig visning av hur stödet för varje parti har förändrats.
- Möjlighet att upptäcka om det finns något **samband** mellan skatteförändringar och valförändringar.

`);


// Dropdown för att välja Län
let lanLista = [...new Set(utökadValtabell.map(r => r.Län))].sort();
let chosenLan = addDropdown('Välj Län', lanLista, 'Stockholm');

// Funktion för att rita tabell och diagram baserat på valt län
function drawLanData(lan) {
  let filtreradLan = utökadValtabell.filter(r => r.Län === lan);

  // Beräkna kommunal och statlig skatteförändring i procent
  // (Nytt värde - Gammalt värde) / Gammalt värde × 100%
  let skatteData = skatteförändringPerLan[lan];
  let kommunalSkattProcent = (skatteData.kommunalSkatt2022 - skatteData.kommunalSkatt2018);
  let statligSkattProcent = (skatteData.statligSkatt2022 - skatteData.statligSkatt2018);

  // Visa tabell
  tableFromData({
    data: filtreradLan,
    columnNames: [
      'Län', 'Parti', 'Röster2018', 'Röster2022',
      'FörändringAntal', 'FörändringProcent',
      'KommunalSkattFörändring', 'StatligSkattFörändring',
    ]
  });

  // Förbered data för Google Chart
  let chartData = [['Parti', 'Valförändring (Antal)', 'Kommunal Skattändring (Antal)', 'Statlig Skattändring (Antal)']];

  for (let row of filtreradLan) {
    chartData.push([
      row.Parti,
      parseFloat(row.FörändringAntal),
      parseFloat(kommunalSkattProcent),
      parseFloat(statligSkattProcent)
    ]);
  }

  // Rita linjediagram
  drawGoogleChart({
    type: 'AreaChart',
    data: chartData,
    options: {
      title: `Förändring av val och skatt i ${lan}`,
      width: 1200,
      height: 600,
      curveType: 'function',
      pointSize: 5,
      legend: { position: 'top' },
      hAxis: { title: 'Parti' },
      vAxis: { title: 'Förändring (Antal)' },
      colors: ['#3366CC', '#109618', '#DC3912']
    }
  });
}


if (chosenLan) drawLanData(chosenLan);

onDropdownChange('Välj Län', drawLanData);
