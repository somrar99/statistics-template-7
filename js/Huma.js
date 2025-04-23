addMdToPage(`
  ## Utbildningsnivå per kommun under år 2018 - 2022 
  Välj vilken kommun du vill för att se detaljerad statistik.
`);

// 1. Ladda Neo4j-data från JSON för Live Server
const rawNeo4j = await fetch('./neo4j.json').then(res => res.json());

// 2. Processa valdata (utan map)
const partiResultat = [];
for (const item of rawNeo4j) {
  const props = item.n.properties;
  if (props.kommun && props.parti) {
    partiResultat.push({
      kommun: props.kommun,
      parti: props.parti,
      roster2018: parseInt(props.roster2018.toString().replace(/\s/g, '')),
      roster2022: parseInt(props.roster2022.toString().replace(/\s/g, ''))
    });
  }
}

const valdataPerKommun = {};
for (const { kommun, parti, roster2018, roster2022 } of partiResultat) {
  if (!valdataPerKommun[kommun]) valdataPerKommun[kommun] = {};
  valdataPerKommun[kommun][parti] = { roster2018, roster2022 };
}

// 3. Ladda utbildningsdata från JSON för Live Server
const utbildning2018 = await fetch('./utbildning2018.json').then(res => res.json());
const utbildning2022 = await fetch('./utbildning2022.json').then(res => res.json());

// 4. Skapa utbildnings-kartor (utan map)
function utbildningMap(data) {
  const map = {};
  for (const d of data.data) {
    const [region, alder, niva, kon, ar] = d.key;
    const nyckel = `${region}-${kon}`;
    if (!map[nyckel]) map[nyckel] = [];
    map[nyckel].push({
      alder,
      utbildningsniva: niva,
      ar,
      befolkning: d.values[0]
    });
  }
  return map;
}

const utbildning2018Map = utbildningMap(utbildning2018);
const utbildning2022Map = utbildningMap(utbildning2022);

// 5. Kombinera valdata med utbildningsdata
const slutdata = [];
for (const kommun in valdataPerKommun) {
  for (const parti in valdataPerKommun[kommun]) {
    const r = valdataPerKommun[kommun][parti];
    slutdata.push({
      kommun,
      parti,
      roster2018: r.roster2018 ?? 'NAN',
      roster2022: r.roster2022 ?? 'NAN',
      utbildning2018: utbildning2018Map[`${kommun}-1`] ?? [],
      utbildning2022: utbildning2022Map[`${kommun}-1`] ?? []
    });
  }
}

// 6. Skapa UI för att välja kommun
const tableContainer = document.createElement('div');
document.body.appendChild(tableContainer);

const unikaKommuner = [];
for (const data of slutdata) {
  if (!unikaKommuner.includes(data.kommun)) {
    unikaKommuner.push(data.kommun);
  }
}
unikaKommuner.sort();

function createDropdown(kommuner) {
  const dropdown = document.createElement('select');
  const defaultOption = document.createElement('option');
  defaultOption.text = 'Välj en kommun';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  dropdown.appendChild(defaultOption);

  for (const kommun of kommuner) {
    const option = document.createElement('option');
    option.value = kommun;
    option.textContent = kommun;
    dropdown.appendChild(option);
  }

  dropdown.addEventListener('change', (event) => {
    const selectedKommun = event.target.value;
    const filtreradData = slutdata.filter(row => row.kommun === selectedKommun);
    const md = createMarkdownTable(filtreradData, selectedKommun);
    tableContainer.innerHTML = '';
    addMdToContainer(md, tableContainer);
  });

  return dropdown;
}

// 7. Skapa Markdown-tabell
function createMarkdownTable(data, selectedKommun) {
  const headers = ['Kommun', 'Parti', 'Röster 2018', 'Röster 2022', 'Utbildning 2018 (antal)', 'Utbildning 2022 (antal)'];
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `|${headers.map(() => '---').join('|')}|`;

  const dataRows = [];
  for (const row of data) {
    dataRows.push(`| ${row.kommun} | ${row.parti} | ${row.roster2018} | ${row.roster2022} | ${row.utbildning2018.length} poster | ${row.utbildning2022.length} poster |`);
  }

  return `### Resultat för ${selectedKommun}\n` + [headerRow, separatorRow, ...dataRows].join('\n');
}

// 8. Lägg till dropdown i sidan
function addMdToContainer(md, container) {
  const el = document.createElement('div');
  el.innerHTML = marked.parse(md);
  container.appendChild(el);
}

const dropdown = createDropdown(unikaKommuner);
document.body.appendChild(dropdown);

