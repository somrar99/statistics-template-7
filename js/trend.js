// Introduktion och syfte
addMdToPage(`

# **DataAnalys**: Samband mellan beskattning och valresultat (2018–2022)

*Syftet med denna analys är att undersöka om det finns mönster eller möjliga kausala samband mellan förändringar i beskattning och förändringar i valresultat på länsnivå i Sverige under perioden 2018–2022.*

## Analysen genomfördes i tre steg:

1. Analys av valdata från Neo4j
> Vi extraherade röster per parti och kommun.

2. Analys av skattedata från MongoDB
- Skattedata från Statistiska centralbyrån (SCB) importerades via MongoDB.
*Skattedata kommer från SCB och visar antal personer som betalar **kommunal och statlig skatt** per kommun, för åren **2018** och **2022**.*

 **Källa:**  
[SCB – Antal personer som betalar skatt](https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__HE__HE0110__HE0110B/Skatter/table/tableViewLayout1/)

- Vi analyserade antalet personer som betalade kommunal och statlig inkomstskatt per kommun 2018 och 2022.

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

3. Fokuserad analys: Länsnivå (Data hämtades av geoData-mysql)
- Användaren kunde välja ett län (exempel: Stockholm) och få:
- En tabell med förändringar i antal röster, procentuell förändring, samt skatteförändringar.
- Ett linjediagram som visar relationen mellan röstandel och skatteunderlag.


4. Förväntat resultat - **Pearsons korrelationskoefficient**
- Tydlig visning av hur stödet för varje parti har förändrats.
- Möjlighet att upptäcka om det finns något **samband** mellan skatteförändringar och valförändringar.


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

/*

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
*/

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
# **Att identifiera mönster mellan beskattning och valresultat (2018–2022)**

## *Analys per län i Sverige*
Användaren kan välja ett **län** via en dropdown och få följande information:

- En **tabell** som visar Antalet röster per parti (förändring 2018–2022), samt Kommunal och statlig skatteförändring för länet
- Ett **linjediagram** som visualiserar förändringen i valresultat och beskattning över tid.
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
  let kommunalSkattProcent = (skatteData.kommunalSkatt2022 - skatteData.kommunalSkatt2018) ;
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
  let chartData = [['Parti', 'Valförändring (Antal röster)', 'Kommunal Skattändring (Antal betalare)', 'Statlig Skattändring (Antal betalare)']];

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
      width: 1400,
      height: 600,
      curveType: 'function',
      pointSize: 5,
      legend: { position: 'top' },
      hAxis: { title: 'Parti', slantedText: true, slantedTextAngle: 45  },
      vAxis: { title: 'Förändring (Antal)' },
       isStacked: false,
      legend: { position: 'top', maxLines: 2 },
      colors: ['#3366CC', '#109618', '#DC3912']
    }
  });
}



// Pearson-korrelation
//https://www.analyticsvidhya.com/blog/2021/03/comparison-of-pearson-and-spearman-correlation-coefficients/
function pearsonKorrelation(x, y) {
  let n = x.length;
  if (n === 0 || y.length !== n) return null;

  let sum_x = x.reduce((a, b) => a + b, 0);
  let sum_y = y.reduce((a, b) => a + b, 0);
  let sum_x2 = x.reduce((a, b) => a + b * b, 0);
  let sum_y2 = y.reduce((a, b) => a + b * b, 0);
  let sum_xy = x.reduce((sum, xi, i) => sum + xi * y[i], 0);

  let numerator = (n * sum_xy) - (sum_x * sum_y);
  let denominator = Math.sqrt((n * sum_x2 - sum_x ** 2) * (n * sum_y2 - sum_y ** 2));

  return denominator === 0 ? null : numerator / denominator;
}

// Bearbeta data per län och parti
let korrelationsDataLan = utökadValtabell.map(rad => ({
  Län: rad.Län,
  Parti: rad.Parti,
  Röstförändring: rad.FörändringAntal,
  FörändringStatligSkatt: rad.StatligSkattFörändring
})).filter(r => r.Röstförändring !== undefined && r.FörändringStatligSkatt !== undefined);


// Beräkna korrelation per parti
let korrelationPerParti = {};
let partier = [...new Set(korrelationsDataLan.map(r => r.Parti))];

partier.forEach(parti => {
  let data = korrelationsDataLan.filter(r => r.Parti === parti);
  let skatt = data.map(r => r.FörändringStatligSkatt);
  let röster = data.map(r => r.Röstförändring);
  let r = pearsonKorrelation(skatt, röster);
  korrelationPerParti[parti] = { r, data };
});

// Funktion för att tolka korrelationsvärden
function tolkning(r) {
  if (r > 0.7) return "stark positiv korrelation";
  if (r < -0.7) return "stark negativ korrelation";
  if (r >= -0.3 && r <= 0.3) return "svag eller ingen korrelation";
  return "måttlig korrelation";
}

// Visa korrelationer i markdown-format
let korrelationsMarkdown = `## Korrelationer per parti (statlig skattbetalare & röster)\n`;
partier.forEach(p => {
  let r = korrelationPerParti[p].r;
  korrelationsMarkdown += `- **${p}**: r = \`${r.toFixed(3)}\` (${tolkning(r)})\n`;
});
addMdToPage(korrelationsMarkdown); // <-- din funktion för att lägga in markdown

// Rita scatterplot för ett visst parti
function drawPartiScatterLan(parti) {
  let data = korrelationPerParti[parti]?.data || [];
  let chartData = [['Län', 'Statlig Skattförändring', 'Förändring i Röster']];
  data.forEach(row => {
    chartData.push([row.Län, row.FörändringStatligSkatt, row.Röstförändring]);
  });

  drawGoogleChart({
    type: 'ScatterChart',
    data: chartData,
    options: {
      title: `Statlig skattbetalare vs röster (${parti})`,
      width: 1600,
      height: 600,
      hAxis: { title: 'Statlig skattförändring' },
      vAxis: { title: 'Förändring i röster (Antal)' },
      pointSize: 5,
      colors: ['#3366cc', '#cc3833'],
      legend: 'Top'
    }
  });
}

addMdToPage (`
## **Tolkning**
- Positiva korrelationer: Partier som Moderaterna, Centerpartiet och Liberalerna har en stark positiv korrelation med antalet statliga skattebetalare, vilket innebär att deras stöd ökade i län med fler statliga skattebetalare.
- Negativa korrelationer: Partier som Sverigedemokraterna och Socialdemokraterna har en stark negativ korrelation, vilket innebär att deras stöd minskade i län med fler statliga skattebetalare.
- Måttlig korrelation: Övriga anmälda partier har en måttlig negativ korrelation, vilket tyder på ett svagare samband.
`);

if (chosenLan) drawLanData(chosenLan);
onDropdownChange('Välj Län', drawLanData);


// Koppla val av dropdown till ritfunktion
//let chosenParti = addDropdown('Välj parti (länvis analys)', partier, partier[0]);
onDropdownChange('Välj parti (länvis analys)', drawPartiScatterLan);





