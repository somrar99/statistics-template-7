// Visa rubrik och instruktion
addMdToPage(`
# Statistik & DataAnalys
## 1. Syfte med analysen
Jag ville undersöka hur röstfördelningen förändrats mellan riksdagsvalen 2018 och 2022, med fokus på:

- Förändringar i antalet röster och andelar per parti i olika kommuner.

- Identifiera om vissa partier växer eller tappar över tid.

- Analysera om dessa förändringar uppvisar statistiska mönster, särskilt normalfördelning.

`);


// Visa rubrik
addMdToPage(`
 ## 2. Datakällor & Databehandling
- Källor:
Valdata från Neo4j: röstantal per parti och kommun för 2018 och 2022.

- Behandling:
> 1. Data extraherades för varje kommun och år.
> 2. Jag sammanställde en tabell med röster 2018, röster 2022 och förändring i antal röster per parti.
> 3. Jag omvandlade dessa till andelar (%) för att jämföra proportionell förändring.
`);

//Hämta valresultat från Neo4j
dbQuery.use('riksdagsval-neo4j');
const rawNeo4j = await dbQuery('MATCH (n:Partiresultat) RETURN n');

// Rensa och strukturera
let partiResultat = [];
for (let i = 0; i < rawNeo4j.length; i++) {
  let item = rawNeo4j[i];
  if (item && item.kommun && item.parti) {
    partiResultat.push({
      kommun: item.kommun,
      parti: item.parti,
      roster2018: parseInt((item.roster2018 + '').replace(/\s/g, '')) || 0,
      roster2022: parseInt((item.roster2022 + '').replace(/\s/g, '')) || 0
    });
  }
}


// Skapa tabell med förändring
let resultatTabell = partiResultat.map(rad => ({
  Kommun: rad.kommun,
  Parti: rad.parti,
  Röster2018: rad.roster2018,
  Röster2022: rad.roster2022,
  Förändring: rad.roster2022 - rad.roster2018
}));

// Sortera efter kommun och parti
resultatTabell.sort((a, b) => {
  if (a.Kommun < b.Kommun) return -1;
  if (a.Kommun > b.Kommun) return 1;
  if (a.Parti < b.Parti) return -1;
  if (a.Parti > b.Parti) return 1;
  return 0;
});

// Förbered tabell för visning
let visningsData = resultatTabell.map(rad => [
  rad.Kommun,
  rad.Parti,
  rad.Röster2018,
  rad.Röster2022,
  rad.Förändring
]);

// Visa upp till 10 rader som exempel
tableFromData({
  data: visningsData.slice(0, 10),
  columnNames: [
    'Kommun', 'Parti', 'Röster 2018', 'Röster 2022', 'Förändring i röster'
  ]
});

let utökadValtabell = [];
for (let i = 0; i < rawNeo4j.length; i++) {
  let item = rawNeo4j[i];
  if (item && item.kommun && item.parti) {
    utökadValtabell.push({
      Kommun: item.kommun,
      Parti: item.parti,
      Röster2018: parseInt((item.roster2018 + '').replace(/\s/g, '')),
      Röster2022: parseInt((item.roster2022 + '').replace(/\s/g, ''))
    });
  }
}



//Summering på nationell nivå
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

let kombineradTabell = resultatTabell;

let grupper = partinamnLista.map(partinamn => {
  const data = kombineradTabell.filter(x =>
    x.Parti && x.Parti.trim().toLowerCase() === partinamn.toLowerCase()
  );

  const totalÖkning = data
    .filter(x => x.Förändring > 0)
    .reduce((acc, x) => acc + x.Förändring, 0);

  const totalMinskning = data
    .filter(x => x.Förändring < 0)
    .reduce((acc, x) => acc + x.Förändring, 0);

  return {
    Parti: partinamn,
    Ökat: totalÖkning,
    Minskat: Math.abs(totalMinskning)
  };
});


addMdToPage(`
## 3. Det visar makrotrender i svensk politik mellan två val:
*Total förändring i valresultat per parti (2018–2022)*

**Syfte**
- Undersöka hur antalet röster för varje parti förändrats nationellt mellan riksdagsvalen 2018 och 2022, genom att:
- Räkna hur många röster varje parti har ökat eller minskat i kommuner.
- Identifiera vilka kommuner som står för den största ökningen eller minskningen för respektive parti.
- Analysera fördelningen av röstandelar bland de som ökade respektive minskade.

## Dataset: Ökade och minskade röster per parti
`);

tableFromData({
  data: grupper,
  columnNames: ['Parti', 'Ökat', 'Minskat']
});

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


addMdToPage(`
### Fördelning: Andel av ökade röster:

- Sverigedemokraterna: 45,7%
- Socialdemokraterna: 36,2%
- Miljöpartiet: 10,6%
- Övriga partier tillsammans: ca 7,5%

**Tolkning**: SD och S stod för nästan 82% av de totala röstökningarna i hela landet.
`);

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
### Fördelning: Andel av minskade röster
- Centerpartiet: 28,7%
- Liberalerna: 19,5%
- Vänsterpartiet: 13,6%
- Moderaterna: 14,6%
- Kristdemokraterna: 16%
- Övriga partier: 7.6%

**Tolkning**: Centerpartiet har tappat mest – både i röster och i andel av den totala negativa förändringen.

`);

// Vinnare och förlorare per kommun
let vinnareFörlorarePerParti = [];

for (let parti of partinamnLista) {
  const data = kombineradTabell.filter(x =>
    x.Parti && x.Parti.trim().toLowerCase() === parti.toLowerCase()
  );

  if (data.length > 0) {
    const störstaVinst = data.reduce((prev, current) =>
      (prev.Förändring > current.Förändring) ? prev : current
    );

    const störstaFörlust = data.reduce((prev, current) =>
      (prev.Förändring < current.Förändring) ? prev : current
    );

    vinnareFörlorarePerParti.push({
      Parti: parti,
      StörstVinstKommun: störstaVinst.Kommun,
      VinstAntal: störstaVinst.Förändring,
      StörstFörlustKommun: störstaFörlust.Kommun,
      FörlustAntal: störstaFörlust.Förändring
    });
  }
}

addMdToPage(`## Dataset: Kommun med störst vinst och störst förlust per parti`);
tableFromData({
  data: vinnareFörlorarePerParti,
  columnNames: [
    'Parti', 'StörstVinstKommun', 'VinstAntal', 'StörstFörlustKommun', 'FörlustAntal'
  ]
});


addMdToPage(`
### Tolkning:
- Många partier vann mest i Stockholm, särskilt S, SV och MP.
- Samtidigt förlorade flera partier också mest i Stockholm, särskilt M, L och KD.
- Centerpartiet hade ingen vinst alls – de tappade i nästan hela landet.
`)

// Visualisering per vald kommun
let utökadValtabell1 = partiResultat.map(r => ({
  Kommun: r.kommun,
  Parti: r.parti,
  Röster2018: r.roster2018,
  Röster2022: r.roster2022
}));

let kommunList = [...new Set(utökadValtabell1.map(r => r.Kommun))].sort();
//let chosenKommun = addDropdown('Välj Kommun', kommunList, 'Stockholm');

function drawKommunData(kommun) {
  let filtreradKommun = utökadValtabell1.filter(r => r.Kommun === kommun);

  const totalRöster2018 = filtreradKommun.reduce((sum, item) => sum + item.Röster2018, 0);
  const totalRöster2022 = filtreradKommun.reduce((sum, item) => sum + item.Röster2022, 0);

  const changeData = filtreradKommun.map(item => {
    const andel2018 = item.Röster2018 / totalRöster2018 * 100;
    const andel2022 = item.Röster2022 / totalRöster2022 * 100;
    return {
      Parti: item.Parti,
      Andel2018: andel2018.toFixed(2),
      Andel2022: andel2022.toFixed(2),
      FörändringProcentenheter: (andel2022 - andel2018).toFixed(2)
    };
  });

  const votesData = filtreradKommun.map(item => ({
    Parti: item.Parti,
    Röster2018: item.Röster2018,
    Röster2022: item.Röster2022
  }));

  const tabellData = changeData.map(item => [
    kommun,
    item.Parti,
    item.Andel2018 + ' %',
    item.Andel2022 + ' %',
    item.FörändringProcentenheter + ' %',
    votesData.find(v => v.Parti === item.Parti).Röster2018,
    votesData.find(v => v.Parti === item.Parti).Röster2022
  ]);

  tableFromData({
    data: tabellData,
    columnNames: [
      'Kommun', 'Parti', 'Andel 2018', 'Andel 2022',
      'Förändring (%)', 'Röster 2018', 'Röster 2022'
    ]
  });

  drawGoogleChart({
    type: 'ColumnChart',
    data: [
      ['Parti', 'Röster 2018', 'Röster 2022'],
      ...votesData.map(item => [item.Parti, item.Röster2018, item.Röster2022])
    ],
    options: {
      title: 'Röster per parti i ' + kommun + ' (2018 vs 2022)',
      height: 600,
      width: 1200,
      hAxis: {
        title: 'Parti',
        slantedText: true,
        slantedTextAngle: 45
      },
      vAxis: { title: 'Antal röster' },
      legend: { position: 'top' }
    }
  });

  drawGoogleChart({
    type: 'BarChart',
    data: [
      ['Parti', 'Förändring i Procentenheter'],
      ...changeData.map(item => [item.Parti, parseFloat(item.FörändringProcentenheter)])
    ],
    options: {
      title: 'Förändring i procentenheter per parti i ' + kommun + ' (2018-2022)',
      height: 600,
      width: 1200,
      hAxis: { title: 'Förändring (%)' },
      vAxis: { title: 'Parti' },
      colors: ['rgba(31,180,180,0.81)']
    }
  });
}

//Visualisering: Förändring per kommun och parti
addMdToPage(`
## **4. Visualiseringar: Förändring per kommun och parti**
- Röster per parti i varje kommun 2018 vs 2022.
- Procentuell förändring i röstfördelning.


 *Visualiseringar*
> 1. Stapeldiagram: Visar totala röster per parti för 2018 och 2022.
> 2. Barchart över förändring i procentenheter. (Tydliggör vilka partier som ökat/minskat i popularitet)
> 3. Tabeller per vald kommun.

`);


// Skapa en lista med kommuner och dropdown
let kommunLista = [...new Set(utökadValtabell.map(r => r.Kommun))].sort();
let chosenKommun = addDropdown('Välj Kommun', kommunLista, 'Stockholm');

// Funktion för att visa data per kommun
function drawKommunData(kommun) {
  let filtreradKommun = utökadValtabell.filter(r => r.Kommun === kommun);

  // Beräkna totalt antal röster i kommunen för 2018 och 2022
  const totalRöster2018 = filtreradKommun.reduce((sum, item) => sum + item.Röster2018, 0);
  const totalRöster2022 = filtreradKommun.reduce((sum, item) => sum + item.Röster2022, 0);

  // Förbered tabell- och diagramdata
  const changeData = filtreradKommun.map(item => {
    const andel2018 = item.Röster2018 / totalRöster2018 * 100;
    const andel2022 = item.Röster2022 / totalRöster2022 * 100;
    return {
      Parti: item.Parti,
      Andel2018: andel2018.toFixed(2),
      Andel2022: andel2022.toFixed(2),
      FörändringProcentenheter: (andel2022 - andel2018).toFixed(2)
    };
  });

  const votesData = filtreradKommun.map(item => ({
    Parti: item.Parti,
    Röster2018: item.Röster2018,
    Röster2022: item.Röster2022
  }));

  // Skapa tabell
  const tabellData = changeData.map(item => [
    kommun,
    item.Parti,
    item.Andel2018 + ' %',
    item.Andel2022 + ' %',
    item.FörändringProcentenheter + ' %',
    votesData.find(v => v.Parti === item.Parti).Röster2018,
    votesData.find(v => v.Parti === item.Parti).Röster2022
  ]);

  tableFromData({
    data: tabellData,
    columnNames: [
      'Kommun', 'Parti', 'Andel 2018', 'Andel 2022',
      'Förändring (%)', 'Röster 2018', 'Röster 2022'
    ]
  });

  // Skapa diagram för röster 2018 vs 2022
  const chartData = [
    ['Parti', 'Röster 2018', 'Röster 2022']
  ];
  votesData.forEach(item => {
    chartData.push([item.Parti, item.Röster2018, item.Röster2022]);
  });

  drawGoogleChart({
    type: 'ColumnChart',
    data: chartData,
    options: {
      title: 'Röster per parti i ' + kommun + ' (2018 vs 2022)',
      height: 600,
      width: 1200,
      hAxis: {
        title: 'Parti',
        slantedText: true,
        slantedTextAngle: 45
      },
      vAxis: { title: 'Antal röster' },
      legend: { position: 'top' }
    }
  });

  // Skapa diagram för förändring i procentenheter
  const barChartData = [
    ['Parti', 'Förändring i Procentenheter']
  ];
  changeData.forEach(item => {
    barChartData.push([item.Parti, parseFloat(item.FörändringProcentenheter)]);
  });

  drawGoogleChart({
    type: 'BarChart',
    data: barChartData,
    options:  {
      title: 'Förändring i procentenheter per parti i ' + kommun + ' (2018-2022)',
      height: 600,
      width: 1200,
      hAxis: { title: 'Förändring (%)', slantedText: true, slantedTextAngle: 45  },
      vAxis: { title: 'Parti' },
      isStacked: false,
      legend: { position: 'top', maxLines: 2 },
     colors: ['#29b41f']
    }
  });
}


// Initial visning
if (chosenKommun) drawKommunData(chosenKommun);



//Statistisk analys: Shapiro-Wilk-test
addMdToPage(`
## 5. Statistisk analys – **Shapiro-Wilk-test**
- *Syfte*:
Vi testade om förändringarna i partiers röstandelar (2018–2022) per kommun är normalfördelade.

- *Metod*:
> 1. Vi beräknade förändring i procentenheter per parti i varje kommun.
> 2. Vi använde Shapiro-Wilk-test för att testa normalfördelning.
> 3. Vi används n - 1  varians från ett urval (sample), s.k. **Bessels korrektion**.

- *Tolkning*:
p-värde ≥ 0.05 → förändringarna är **troligen normalfördelade**  
p-värde < 0.05 → förändringarna är **inte normalfördelade**

`);



//  Skapar ett tomt objekt där vi ska lagra det totala antalet röster per kommun, uppdelat på åren 2018 och 2022.
let totalRösterPerKommun = {};

// Samla röster per kommun
for (let i = 0; i < utökadValtabell.length; i++) {
  let r = utökadValtabell[i];

  if (!totalRösterPerKommun[r.Kommun]) {
    totalRösterPerKommun[r.Kommun] = { '2018': 0, '2022': 0 };
  }

  totalRösterPerKommun[r.Kommun]['2018'] += r.Röster2018;
  totalRösterPerKommun[r.Kommun]['2022'] += r.Röster2022;
}

// Samla förändringar i procentenheter per parti
let förändringarPerParti = {};

// Samla förändringarna per parti
for (let i = 0; i < utökadValtabell.length; i++) {
  let r = utökadValtabell[i];
  let kommun = r.Kommun;
  let parti = r.Parti;

  let total2018 = totalRösterPerKommun[kommun]['2018'];
  let total2022 = totalRösterPerKommun[kommun]['2022'];

  if (total2018 > 0 && total2022 > 0) {
    let andel2018 = (r.Röster2018 / total2018) * 100;
    let andel2022 = (r.Röster2022 / total2022) * 100;
    let förändring = andel2022 - andel2018;

    if (!isNaN(förändring)) {
      if (!förändringarPerParti[parti]) {
        förändringarPerParti[parti] = [];
      }
      förändringarPerParti[parti].push(förändring);
    }
  }
}

//  Shapiro-Wilk-test per parti
let resultat = [];

for (let parti in förändringarPerParti) {
  let data = förändringarPerParti[parti];

  // Skapa en Jerzy vector med data per parti
  // Från _legacy.js anävnds det. [function (require, module, exports) {
  // 		globalThis.___jerzy = require('jerzy');
  //https://www.npmjs.com/package/jerzy
  let dataVector = new ___jerzy.Vector(data);

  // Utför Shapiro-Wilk-testet
  // ladda jerzy-biblioteket
  //w: Teststatistik – hur nära en normalfördelning datan är.
  // p: p-värde – om detta ≥ 0.05, så kan datan antas vara normalfördelad.
  let shapiroResult = ___jerzy.Normality.shapiroWilk(dataVector);
  let Wp = shapiroResult.w;
  let pValue = shapiroResult.p;

  // Lägg till resultat för varje parti
  //att använda sample standard deviation - sample (n - 1)
  let medel = data.reduce((sum, val) => sum + val, 0) / data.length;
  let stdDev = Math.sqrt(
  data.reduce((sum, val) => sum + Math.pow(val - medel, 2), 0) / (data.length - 1)
);


  resultat.push({
    Parti: parti,
    Antal: data.length,
    Medel: medel.toFixed(2),
    StdDev: stdDev.toFixed(2),
    W: Wp,
    p: pValue,
    Normalfördelad: pValue >= 0.05 ? 'Ja' : 'Nej'
  });
}

// Visa tabell
tableFromData({
  data: resultat.map(r => [
    r.Parti,
    r.Antal,
    r.Medel,
    r.StdDev,
    r.W,
    r.p,
    r.Normalfördelad
  ]),
  columnNames: [
    'Parti',
    'Antal kommuner',
    'Medel (%)',
    'Standardavvikelse',
    'Shapiro-Wilk W',
    'p-värde',
    'Normalfördelad?'
  ]
});


//Slutsats
addMdToPage(`
### Shapiro-Wilk-test Tolkning:
- SD hade störst genomsnittlig ökning i andel (+4.39 %) över hela landet.
- Centerpartiet tappade mest i genomsnitt (−2.83 %).
- Bara Liberalerna och Socialdemokraterna hade förändringar som var statistiskt normalfördelade.
- De andra partiernas förändringar var skeva eller hade outliers, vilket innebär att de kräver andra analysmetoder än de som bygger på normalfördelning.

`);



addMdToPage(`
# **6. Slutsats av valförändringar 2018–2022**

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

## Var gick det bäst och sämst?

Här ser vi var partierna hade sina största framgångar – och sina största motgångar – under valet 2022 jämfört med 2018.

- **Stockholm** var den mest händelserika staden. Flera partier hade både sina största framgångar och sina värsta tapp här.
- **Moderaterna, Centerpartiet, Liberalerna, Kristdemokraterna och Vänsterpartiet** tappade flest röster just i Stockholm. Det visar att storstadsväljarna valde annorlunda än tidigare.
- Endast **Socialdemokraterna och Miljöpartiet** lyckades få sina största ökningar i Stockholm – de vann alltså flest nya röster där.
- **Sverigedemokraterna** växte kraftigt även i Stockholm, men tappade istället mest röster i **Malmö**, vilket visar på en stor regional skillnad.
- **Centerpartiet** hade det riktigt tungt över hela landet – de vann inte i en enda kommun. Deras "bästa" resultat var fortfarande en **förlust**, bara lite mindre än de andra.

Det här visar hur olika regioner i Sverige röstade på väldigt olika sätt – och att ett parti kan lyckas på ett ställe men tappa stort på ett annat.
`);



