// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
addMdToPage(`
  ## Valresultat per kommun under år 2018 - 2022 
  Välj vilken kommun du vill för att se detaljerad valstatistik, medelinkomst och medelålder.
`);

// Hämta valdata från Neo4j
// Hämtar alla noder (n) som har etiketten Partiresultat från Neo4j.
dbQuery.use('riksdagsval-neo4j');
const rawNeo4j = await dbQuery(`MATCH (n:Partiresultat) RETURN n`);

// Filtrerar bort poster som saknar kommun eller parti.
const partiResultat = rawNeo4j
  .filter(x => x?.kommun && x?.parti)
  .map(x => ({
    kommun: x.kommun,
    parti: x.parti,
    //Omvandlar antalet röster från sträng till int genom att ta bort alla vita tecken: mellanslag, radbrytningar, tabbar (ex. "1 234" → 1234).
    roster2018: parseInt(x.roster2018.toString().replace(/\s/g, '')), // s är ett reguljärt uttryck , vilket vitt tecken som helst
    roster2022: parseInt(x.roster2022.toString().replace(/\s/g, '')) // g flaggan är global
  }));

// Gruppar resultatet per kommun
// Skapar en struktur där varje kommun får en egen "låda" (objekt) och där partiernas resultat lagras inuti.
// obs! reduce: metod som kör igenom arrayen för att reducera en array till enda värde(objekt)
// reduce fucktion har två parameter : acc (accumulator), curr (current)
const valdataPerKommun = partiResultat.reduce((acc, { kommun, parti, roster2018, roster2022 }) => {
  if (!acc[kommun]) acc[kommun] = {};
  acc[kommun][parti] = { roster2018, roster2022 };
  return acc;
}, {});

// Hämta inkomst och ålder från MongoDB
// Växlar över till databasen kommun-info-mongodb
//Hämtar både inkomst- och åldersdata där kön är "totalt" (både kvinnor och män)
dbQuery.use('kommun-info-mongodb');
const [incomeData, ageData] = await Promise.all([
  dbQuery.collection('incomeByKommun').find({ kon: 'totalt' }),
  dbQuery.collection('ageByKommun').find({ kon: 'totalt' })
]);

// Skapar enklare sökkartor där kommunens namn är nyckel och värdet är inkomst/åldersdata.

const incomeMap = Object.fromEntries(
  incomeData.map(x => [x.kommun, {
    medelInkomst2018: x.medelInkomst2018,
    medelInkomst2022: x.medelInkomst2022
  }])
);

const ageMap = Object.fromEntries(
  ageData.map(x => [x.kommun, {
    medelalderAr2018: x.medelalderAr2018,
    medelalderAr2022: x.medelalderAr2022
  }])
);

// Kombinerar all data i en stor lista
const slutdata = Object.entries(valdataPerKommun).flatMap(([kommun, partier]) =>
  Object.entries(partier).map(([parti, r]) => ({
    kommun,
    parti,
    roster2018: r.roster2018 ?? 'NAN',
    roster2022: r.roster2022 ?? 'NAN',
    medelalder2018: ageMap[kommun]?.medelalderAr2018 ?? 'NAN',
    medelalder2022: ageMap[kommun]?.medelalderAr2022 ?? 'NAN',
    inkomst2018: incomeMap[kommun]?.medelInkomst2018 ?? 'NAN',
    inkomst2022: incomeMap[kommun]?.medelInkomst2022 ?? 'NAN'
  }))
);

// Skapa container för tabell (så vi inte upprepar hela blocket varje gång)
// Skapa och visa dropdown för kommuner
// Skapar en tom plats (div) för att senare visa tabeller.
// Samlar alla unika kommuner och sorterar dem alfabetiskt.
const tableContainer = document.createElement('div');
document.body.appendChild(tableContainer);

// Skapa Dropdown för kommuner När en kommun väljs, skapas en tabell i Markdown-format
const unikaKommuner = [...new Set(slutdata.map(x => x.kommun))].sort();

// createMarkdownTable: Genererar en Markdown-tabell baserat på vald kommun:
function createDropdown(kommuner) {
  const dropdown = document.createElement('select');


  const defaultOption = document.createElement('option');
  defaultOption.text = 'Välj en kommun';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  dropdown.appendChild(defaultOption);

  kommuner.forEach(kommun => {
    const option = document.createElement('option');
    option.value = kommun;
    option.textContent = kommun;
    dropdown.appendChild(option);
  });

  // Här används en parser som t.ex. marked.js för att omvandla Markdown till HTML.
  dropdown.addEventListener('change', (event) => {
    const selectedKommun = event.target.value;
    const filtreradData = slutdata.filter(row => row.kommun === selectedKommun);
    const md = createMarkdownTable(filtreradData, selectedKommun);

    // Töm tidigare resultat och visa det nya
    tableContainer.innerHTML = '';
    addMdToContainer(md, tableContainer);
  });

  return dropdown;
}

// Markdown-tabell som text
function createMarkdownTable(data, selectedKommun) {
  const headers = ['Kommun', 'Parti', 'Röster 2018', 'Röster 2022', 'Ålder 2018', 'Ålder 2022', 'Inkomst 2018 (TSEK)', 'Inkomst 2022 (TSEK)'];
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `|${headers.map(() => '---').join('|')}|`;

  const dataRows = data.map(row =>
    `| ${row.kommun} | ${row.parti} | ${row.roster2018} | ${row.roster2022} | ${row.medelalder2018} | ${row.medelalder2022} | ${row.inkomst2018} | ${row.inkomst2022} |`
  );

  return `### Resultat för ${selectedKommun}\n` + [headerRow, separatorRow, ...dataRows].join('\n');
}

// Hjälpfunktion för att lägga Markdown till en viss container
function addMdToContainer(md, container) {
  const el = document.createElement('div');
  el.innerHTML = marked.parse(md); // Använd `marked` eller annan Markdown-parser
  container.appendChild(el);
}

// Lägg till dropdown en gång
const dropdown = createDropdown(unikaKommuner);
document.body.appendChild(dropdown);