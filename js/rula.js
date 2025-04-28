addMdToPage(`

# Röd tråd – Vad vi velat undersöka

I vårt projekt har vi undersökt hur valresultaten i riksdagsvalen 2018 och 2022 har förändrats, med fokus på att analysera sambandet mellan socioekonomiska faktorer (som utbildningsnivå och arbetslöshet) och utvecklingen av stödet för olika partier.  
Syftet har varit att se om exempelvis förändringar i utbildning eller arbetslöshet kan kopplas till ökningar eller minskningar i partiers röstandelar.

Samtidigt har vi fördjupat oss i en särskild aspekt: sambandet mellan ålder och valresultat.  
Vi ville utforska hur kommunernas medelålder kan spegla röstmönster i valet 2022, och om ålder kan vara en förklarande faktor bakom partiers framgångar eller motgångar.

---

## Hypoteser

Vi har arbetat utifrån flera hypoteser:

- Ökad arbetslöshet i en kommun leder till ökat stöd för partier som driver en politik för förändring eller opposition mot sittande regering.
- Högre utbildningsnivå korrelerar med ökat stöd för partier som fokuserar på exempelvis miljöfrågor eller globalisering.
- Områden med större ekonomiska utmaningar kan visa starkare stöd för partier som betonar trygghet och ekonomisk politik.
- Medelåldern i en kommun kan påverka vilket parti som får flest röster, där yngre kommuner kan stödja vissa partier och äldre kommuner andra.

---

# Hur hänger ålder och valresultat ihop?

Statistik handlar inte bara om siffror. Det handlar om människor, samhällen – och ibland om hur vår ålder kan speglas i hur vi röstar.

I detta projekt använde vi data från två källor för att undersöka ett möjligt samband mellan medelåldern i en kommun och invånarnas röstande:

**Data – grunden till berättelsen:**

- Medelålder per kommun från MongoDB (2018–2022), där vi fokuserat på kön = "totalt".
- Valresultat från riksdagsvalet 2022 via en Neo4j-databas.

Vi kopplade ihop dessa datakällor så att varje rad i vår analys innehåller:

- Kommunens namn
- Partiets namn
- Antal röster 2022
- Kommunens medelålder 2022

---

# Narrativ – vad vill vi berätta?

Vi ställer frågan: **Finns det ett samband mellan en kommuns medelålder och hur många röster ett parti får?**

Genom en interaktiv dropdown kan användaren välja ett parti och därefter se ett scatterplot där varje punkt motsvarar en kommun:

- **X-axel:** Kommunens medelålder
- **Y-axel:** Antalet röster för det valda partiet

### Exempel på mönster vi observerat:

- Miljöpartiet har fler röster i kommuner med lägre medelålder.
- Moderaterna visar starkt stöd i kommuner med något högre ålder.
- Kristdemokraterna får relativt höga toppar i vissa äldre kommuner.

---

# Visualisering – vi ser mönstren tydligt

Scatterploten hjälper oss att lätt upptäcka mönster som annars skulle gömma sig i tusentals siffror:

- Om stödet för partier är jämnt över kommunerna.
- Om vissa partier är mer beroende av demografiska faktorer.

---

# Slutsats

Statistiken visar inte exakta orsaker, men ger oss möjligheter att förstå samhället bättre.

Vi har kunnat se att både socioekonomiska faktorer och ålder kan påverka hur kommunerna röstar.  
Ålder verkar ha ett visst samband med partistöd, men för en djupare förståelse bör fler faktorer såsom utbildning, inkomst och urbanisering undersökas i framtida analyser.

Det här visar statistikens kraft: att omvandla siffror till förståelse av vårt samhälle.

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
  .collection("ageByKommun")
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
