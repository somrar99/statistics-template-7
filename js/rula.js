addMdToPage(`
  ## Hur hänger ålder och valresultat ihop?

  Statistik handlar inte bara om siffror. Det handlar om människor, samhällen – och ibland, om hur vår ålder kan speglas i hur vi röstar. I det här projektet använder vi riktig data från två källor för att utforska ett möjligt samband mellan medelåldern i en kommun och hur invånarna röstar i riksdagsvalet.

  ### 🔢 1. Data – grunden till berättelsen

  Vi har samlat data från två olika databaser:
  - Medelålder per kommun från MongoDB (2018–2022), där vi fokuserat på kön = "totalt".
  - Valresultat från riksdagsvalet 2022 via en Neo4j-databas, där vi kan se hur många röster varje parti fått i varje kommun.

  Dessa två datakällor har vi kopplat ihop, så att varje rad i vår gemensamma datamängd innehåller:
  - Kommunens namn
  - Det aktuella partiet
  - Antal röster 2022
  - Kommunens medelålder 2022

  ### 🧭 2. Narrativ – vad vill vi berätta?

  Vi ställer frågan: *Finns det ett samband mellan en kommuns medelålder och hur många röster ett visst parti får?*

  Det är ett beskrivande berättarsätt:
  > Vad ser vi i datan, och kan vi ana några mönster?

  Genom en interaktiv dropdown kan användaren välja ett parti. Därefter visas ett scatterplot där varje punkt representerar en kommun. På x-axeln ser vi medelåldern, och på y-axeln antalet röster för det valda partiet.

  Exempel på mönster vi kan se:
  - Miljöpartiet verkar ha fler röster i kommuner med lägre medelålder.
  - Moderaterna visar starkt stöd i kommuner med något högre ålder.
  - Kristdemokraterna får relativt höga toppar i vissa äldre kommuner.

  ###  3. Visualisering – vi ser mönstren tydligt

  Diagrammet du ser är en scatterplot – en visuell karta av sambandet. Genom att välja olika partier kan du själv utforska:
  - Om det finns något tydligt mönster
  - Om stödet är jämnt över alla kommuner
  - Eller om vissa partier är mer beroende av demografi

  Denna visualisering gör det lätt att upptäcka sådant som annars skulle gömma sig i tusentals siffror.

  ###  Slutsats – vad betyder detta?

  Statistiken visar inte exakta orsaker, men den ger oss möjligheter att förstå samhället bättre. I detta fall har vi kunnat se att ålder kan ha viss påverkan på hur olika kommuner röstar – men det är bara början.

  Nästa steg skulle kunna vara att inkludera fler variabler: utbildning, inkomst, urbanisering, eller region – och se hur dessa samverkar.

  Det här är statistikens kraft: att omvandla siffror till förståelse.
`);

addMdToPage(`
  ### Medelålder, per kommun, från MongoDB  
  (Endast de 10 första posterna med kön = "totalt".)  
`);

dbQuery.use("kommun-info-mongodb");

//vi ska göra en väriabel vilken innehåller hela databas
let kommonmedelålder = await dbQuery
  .collection("ageByKommun")
  .find({ kon: "totalt" });
// Hämta endast poster där kon är "totalt"
let ages = await dbQuery
  .collection("ageByKommun")
  .find({ kon: "totalt" })
  .limit(10);

// Ta bort kolumnen _id
let filtreradeAldrar = ages.map(({ _id, ...resten }) => resten);

// Visa tabellen utan _id och bara med "totalt"
tableFromData({ data: filtreradeAldrar });

dbQuery.use("riksdagsval-neo4j");
let electionResults = await dbQuery("MATCH (n:Partiresultat) RETURN n LIMIT 5");
tableFromData({
  data: electionResults
    // egenskaper/kolumner kommer i lite konstig ordning från Neo - mappa i trevligare ordning
    .map(({ ids, kommun, roster2018, roster2022, parti, labels }) => ({
      ids: ids.identity,
      kommun,
      roster2018,
      roster2022,
      parti,
      labels,
    })),
});
//console.log("electionResults from neo4j", electionResults);

//Skapa en väriabel som innhåller obegränsat databas från neo4j
let partirresultat = await dbQuery("MATCH (n:Partiresultat) RETURN n");

partirresultat.forEach((x) => (x.parti = x.parti.trim())); // eftersom mellanslag från databas efter Liberalerna, trimma (ta bort mellanslag i början och slutet av partinamn)

// Skapa en lookup-tabell per kommun från MongoDB
let medelAlderPerKommun = {};
kommonmedelålder.forEach((row) => {
  if (row.kommun && row.medelalderAr2022) {
    medelAlderPerKommun[row.kommun] = row.medelalderAr2022;
  }
});

// Skapa ny lista där vi kopplar ihop varje partirresultat med medelålder
let valMedAlder = partirresultat.map(
  ({ ids, kommun, roster2018, roster2022, parti, labels }) => {
    return {
      kommun,
      parti,
      roster2022,
      medelalder: medelAlderPerKommun[kommun] || null,
    };
  }
);

// Filtrera bort kommuner där medelålder saknas (null)
let valMedAlderFiltrerad = valMedAlder.filter(
  (item) => item.medelalder !== null
);

// Visa tabell
//tableFromData({ data: valMedAlderFiltrerad });

// För felsökning i konsolen (frivilligt)
//console.log("Sammanfogad data:", valMedAlderFiltrerad);

// Steg 1: Ladda data
dbQuery.use("kommun-info-mongodb");
let medelAlderRader = await dbQuery
  .collection("ageByKommun").-
  .find({ kon: "totalt" });

addMdToPage(`
  ### Samband mellan medelålder och antal röster  
  Välj ett parti för att se sambandet mellan medelålder och valresultat i kommuner.
  <div id="chart-container" style="width: 100%; height: 500px;"></div>
`);
// Skapa plats för diagrammet – måste finnas i DOM

let allaPartier = [...new Set(partirresultat.map((p) => p.parti))].sort();
//console.log("Alla partier (options till dropdown):", allaPartier);
console.log(
  "Typ av allaPartier:",
  typeof allaPartier,
  Array.isArray(allaPartier)
);

// Dropdown för att välja parti
let valtParti = addDropdown("Parti-val:", allaPartier);

// Filtrera på valt parti
let filtrerat = partirresultat
  .filter((p) => p.parti === valtParti)
  .map((p) => ({
    kommun: p.kommun,
    medelalder: medelAlderPerKommun[p.kommun],
    roster: p.roster2022,
  }));

console.log(filtrerat);

// Rita scatterplot
//console.log("Filtrerat data:", filtrerat);

drawGoogleChart({
  type: "ScatterChart",
  data: makeChartFriendly(filtrerat),
  options: {
    height: 500,
    chartArea: { left: 50, right: 0 },
    curveType: "function",
    pointSize: 5,
    pointShape: "circle",
    title: ``,
  },
});
