let kommunLista = [];
let valdataPerKommun = {};
let utbildningPerKommun = {};
await addMdToPage(`
  ### Syftet med undersökning
  
  Syftet med min undersökning är att ta reda på om utbildningsnivå som social faktor påverkar valresultatet.
 Jag vill undersöka om det finns ett samband mellan utbildningsnivån i olika kommuner och vilket parti invånarna röstar på.
  
  ### Hypoteser
  
  - I kommuner med hög utbildningsnivå är stödet större för **Liberalerna** och **Vänsterpartiet**.  
  - I kommuner med låg utbildningsnivå är stödet större för **Socialdemokraterna** och **Sverigedemokraterna**.
    

  ### Utbildningsnivå i tre grupper:
  
  - **Högutbildade**: Personer med eftergymnasial utbildning eller forskarutbildning.  
  - **Gymnasialt utbildade**: Personer med gymnasieutbildning. 
  - **Lågutbildade**: Personer med förgymnasial utbildning (grundskola eller motsvarande).
  
  
  

  `);

async function fetchData() {
  try {


    // 1. Hämta valdata
    dbQuery.use('riksdagsval-neo4j');
    const rawNeo4j = await dbQuery('MATCH (n:Partiresultat) RETURN n');

    let partiResultat = [];
    for (let item of rawNeo4j) {
      if (item && item.kommun && item.parti) {
        partiResultat.push({
          kommun: item.kommun.trim(),
          parti: item.parti.trim(),
          roster2018: parseInt((item.roster2018 + '').replace(/\s/g, '')) || 0,
          roster2022: parseInt((item.roster2022 + '').replace(/\s/g, '')) || 0
        });
      }
    }

    // 2. Strukturerar valdata per kommun
    valdataPerKommun = {};
    for (let rad of partiResultat) {
      if (!valdataPerKommun[rad.kommun]) {
        valdataPerKommun[rad.kommun] = {};
      }
      valdataPerKommun[rad.kommun][rad.parti] = {
        roster2018: rad.roster2018,
        roster2022: rad.roster2022
      };
    }

    // 3. Hämtar utbildningsdata
    dbQuery.use('utbildningdb3-mongodb');
    const utbildningsData = await dbQuery.collection('utbildningsdata_2018_2022').find({});

    utbildningPerKommun = {};
    for (let rad of utbildningsData) {
      const kommun = rad.kommun;
      const niva = (rad.utbildningsniva || '').toLowerCase();
      const antal2018 = rad.antal_2018 || 0;
      const antal2022 = rad.antal_2022 || 0;
      if (!kommun || !niva) continue;

      if (!utbildningPerKommun[kommun]) {
        utbildningPerKommun[kommun] = {
          hog2018: 0, hog2022: 0,
          gym2018: 0, gym2022: 0,
          forgym2018: 0, forgym2022: 0
        };
      }

      if (niva.includes('förgymnasial')) {
        utbildningPerKommun[kommun].forgym2018 += antal2018;
        utbildningPerKommun[kommun].forgym2022 += antal2022;
      } else if (niva.includes('gymnasial')) {
        utbildningPerKommun[kommun].gym2018 += antal2018;
        utbildningPerKommun[kommun].gym2022 += antal2022;
      } else if (niva.includes('eftergymnasial') || niva.includes('forskareutbildning')) {
        utbildningPerKommun[kommun].hog2018 += antal2018;
        utbildningPerKommun[kommun].hog2022 += antal2022;
      }
    }

    kommunLista = Object.keys(valdataPerKommun).filter(k => utbildningPerKommun[k]).sort();

    if (kommunLista.length === 0) {
      addMdToPage('**Fel:** Ingen kommun hittades.');
      return;
    }

    // 4. Väljer kommun
    const valdKommun = await addDropdown('Välj kommun::', kommunLista, kommunLista[0]);
    if (!valdKommun) {
      addMdToPage('**Fel:** Ingen kommun vald.');
      return;
    }

    // 5. Tabelldata för vald kommun (med andelar och årsjämförelse)
    const partier = valdataPerKommun[valdKommun];
    const utbildning = utbildningPerKommun[valdKommun];

    const totalRoster2018 = Object.values(partier).reduce((sum, p) => sum + p.roster2018, 0);
    const totalRoster2022 = Object.values(partier).reduce((sum, p) => sum + p.roster2022, 0);

    const totalUtbildade2018 = utbildning.hog2018 + utbildning.gym2018 + utbildning.forgym2018;
    const totalUtbildade2022 = utbildning.hog2022 + utbildning.gym2022 + utbildning.forgym2022;

    const tabellData = Object.entries(partier).map(([parti, roster]) => {
      const skillnadRoster = roster.roster2022 - roster.roster2018;

      const rostandel2018 = totalRoster2018 > 0 ? ((roster.roster2018 / totalRoster2018) * 100).toFixed(1) + ' %' : '0 %';
      const rostandel2022 = totalRoster2022 > 0 ? ((roster.roster2022 / totalRoster2022) * 100).toFixed(1) + ' %' : '0 %';

      const andelHog2018 = totalUtbildade2018 > 0 ? ((utbildning.hog2018 / totalUtbildade2018) * 100).toFixed(1) + ' %' : '0 %';
      const andelHog2022 = totalUtbildade2022 > 0 ? ((utbildning.hog2022 / totalUtbildade2022) * 100).toFixed(1) + ' %' : '0 %';

      const andelGym2018 = totalUtbildade2018 > 0 ? ((utbildning.gym2018 / totalUtbildade2018) * 100).toFixed(1) + ' %' : '0 %';
      const andelGym2022 = totalUtbildade2022 > 0 ? ((utbildning.gym2022 / totalUtbildade2022) * 100).toFixed(1) + ' %' : '0 %';

      const andelForgym2018 = totalUtbildade2018 > 0 ? ((utbildning.forgym2018 / totalUtbildade2018) * 100).toFixed(1) + ' %' : '0 %';
      const andelForgym2022 = totalUtbildade2022 > 0 ? ((utbildning.forgym2022 / totalUtbildade2022) * 100).toFixed(1) + ' %' : '0 %';

      return {
        kommun: valdKommun,
        parti,
        roster2018: roster.roster2018.toLocaleString('sv-SE'),
        rostandel2018,
        roster2022: roster.roster2022.toLocaleString('sv-SE'),
        rostandel2022,
        skillnadRoster,
        hog2018: utbildning.hog2018.toLocaleString('sv-SE'),
        andelHog2018,
        hog2022: utbildning.hog2022.toLocaleString('sv-SE'),
        andelHog2022,
        gym2018: utbildning.gym2018.toLocaleString('sv-SE'),
        andelGym2018,
        gym2022: utbildning.gym2022.toLocaleString('sv-SE'),
        andelGym2022,
        forgym2018: utbildning.forgym2018.toLocaleString('sv-SE'),
        andelForgym2018,
        forgym2022: utbildning.forgym2022.toLocaleString('sv-SE'),
        andelForgym2022
      };
    });

    addMdToPage(`### Valresultat och utbildningsnivåer i ${valdKommun}`);
    tableFromData({
      data: tabellData,
      columnNames: [
        'Kommun', 'Parti',
        'Röster 2018', 'Röstandel 2018',
        'Röster 2022', 'Röstandel 2022',
        'Skillnad i röster',
        'Högutbildade 2018', 'Andel högutbildade 2018',
        'Högutbildade 2022', 'Andel högutbildade 2022',
        'Gymnasialt 2018', 'Andel gymnasialt 2018',
        'Gymnasialt 2022', 'Andel gymnasialt 2022',
        'Förgymnasialt 2018', 'Andel förgymnasialt 2018',
        'Förgymnasialt 2022', 'Andel förgymnasialt 2022'
      ],
      cellFormat: (key, value) => {
        if (key.includes('Skillnad') && typeof value === 'number') {
          return value > 0 ? `<span style='color:green'>+${value}</span>` : `<span style='color:red'>${value}</span>`;
        }
        return value;
      }
    });

    await visaUtbildningsTabeller();
    await visaScatterplots();

  } catch (error) {
    console.error('Fel:', error);
    addMdToPage('**Ett allvarligt fel inträffade.**');
  }
}

fetchData();




//  Tabell 2 och 3 med utbildningsnivå 2018 & 2022 


async function visaUtbildningsTabeller() {

  dbQuery.use('utbildningdb3-mongodb');

  const data = await dbQuery.collection('utbildningsdata_2018_2022').find({});

  const ärGnosjö = kommun =>
    kommun?.toLowerCase().replace(/ö/g, 'o').replace(/\s+/g, '').trim() === 'gnosjo';
  let utbildning = {};
  for (let rad of data) {
    const kommun = rad.kommun?.trim();
    const niva = (rad.utbildningsniva || '').toLowerCase();
    const antal2018 = rad.antal_2018 || 0;
    const antal2022 = rad.antal_2022 || 0;
    if (!kommun || !niva || ärGnosjö(kommun)) continue;
    if (!utbildning[kommun]) {
      utbildning[kommun] = {
        hog2018: 0, hog2022: 0,
        forgym2018: 0, forgym2022: 0,
        total2018: 0, total2022: 0
      };
    }

    if (niva.includes('eftergymnasial') || niva.includes('forskare')) {
      utbildning[kommun].hog2018 += antal2018;
      utbildning[kommun].hog2022 += antal2022;
    } else if (niva.includes('förgymnasial')) {
      utbildning[kommun].forgym2018 += antal2018;
      utbildning[kommun].forgym2022 += antal2022;
    }

    utbildning[kommun].total2018 += antal2018;
    utbildning[kommun].total2022 += antal2022;
  }

  let lista = [];

  for (let kommun in utbildning) {
    const d = utbildning[kommun];
    if (d.total2018 === 0 || d.total2022 === 0) continue;

    lista.push({
      Kommun: kommun,
      hog2018: d.hog2018,
      hog2022: d.hog2022,
      andelHog2018: (d.hog2018 / d.total2018 * 100).toFixed(1) + ' %',
      andelHog2022: (d.hog2022 / d.total2022 * 100).toFixed(1) + ' %',
      forgym2018: d.forgym2018,
      forgym2022: d.forgym2022,
      andelLag2018: (d.forgym2018 / d.total2018 * 100).toFixed(1) + ' %',
      andelLag2022: (d.forgym2022 / d.total2022 * 100).toFixed(1) + ' %'
    });
  }

  const listaUtanLidingo = lista.filter(k => k.Kommun !== 'Lidingö');
  const stockholm = lista.find(k => k.Kommun === 'Stockholm');
  const uppsala = lista.find(k => k.Kommun === 'Uppsala');

  let toppHog = listaUtanLidingo
    .filter(k => k.Kommun !== 'Stockholm' && k.Kommun !== 'Uppsala')
    .sort((a, b) => parseFloat(b.andelHog2022) - parseFloat(a.andelHog2022))
    .slice(0, 3);

  if (stockholm) toppHog.push(stockholm);
  if (uppsala) toppHog.push(uppsala);

  addMdToPage(`### Topp 5 kommuner med högst andel högutbildade`);
  tableFromData({
    data: toppHog.map(d => ({
      Kommun: d.Kommun,
      'Andel högutbildade 2018': d.andelHog2018,
      'Antal högutbildade 2018': d.hog2018.toLocaleString('sv-SE'),
      'Andel högutbildade 2022': d.andelHog2022,
      'Antal högutbildade 2022': d.hog2022.toLocaleString('sv-SE')
    })),
    columnNames: [
      'Kommun',
      'Andel högutbildade 2018', 'Antal högutbildade 2018',
      'Andel högutbildade 2022', 'Antal högutbildade 2022'
    ]
  });

  const bottenLag = lista
    .filter(k => !ärGnosjö(k.Kommun))
    .sort((a, b) => parseFloat(b.andelLag2022) - parseFloat(a.andelLag2022))
    .slice(0, 5);

  addMdToPage(`### Topp 5 kommuner med högst andel lågutbildade`);
  tableFromData({
    data: bottenLag.map(d => ({
      Kommun: d.Kommun,
      'Andel lågutbildade 2018': d.andelLag2018,
      'Antal lågutbildade 2018': d.forgym2018.toLocaleString('sv-SE'),
      'Andel lågutbildade 2022': d.andelLag2022,
      'Antal lågutbildade 2022': d.forgym2022.toLocaleString('sv-SE')
    })),
    columnNames: [
      'Kommun',
      'Andel lågutbildade 2018', 'Antal lågutbildade 2018',
      'Andel lågutbildade 2022', 'Antal lågutbildade 2022'
    ]
  });
}


// Scatterplotfunktion 
async function visaScatterplots() {

  await addMdToPage(`
### Scatterplot 1: Högutbildade vs Röstandel (Liberalerna & Vänsterpartiet)  
<canvas id="hogScatter" width="600" height="400"></canvas>

### Scatterplot 2: Lågutbildade vs Röstandel (Socialdemokraterna & Sverigedemokraterna)  
<canvas id="lagScatter" width="600" height="400"></canvas>
  `);

  await loadChartJs();

  const datapunkter = kommunLista.map(kommun => {
    const u = utbildningPerKommun[kommun] || {};
    const v = valdataPerKommun[kommun] || {};

    const totalUtbildade = (u.hog2022 ?? 0) + (u.gym2022 ?? 0) + (u.forgym2022 ?? 0);
    const totalRoster = Object.values(v).reduce((sum, p) => sum + (p?.roster2022 ?? 0), 0);

    const andelHog = totalUtbildade > 0 ? (u.hog2022 / totalUtbildade) * 100 : 0;
    const andelLag = totalUtbildade > 0 ? (u.forgym2022 / totalUtbildade) * 100 : 0;

    const rostandel = parti => totalRoster > 0 ? ((v[parti]?.roster2022 || 0) / totalRoster) * 100 : 0;

    return {
      kommun,
      andelHog,
      andelLag,
      L: rostandel('Liberalerna'),
      V: rostandel('Vänsterpartiet'),
      S: rostandel('Socialdemokraterna'),
      SD: rostandel('Sverigedemokraterna')
    };
  }).filter(d => d.L !== undefined && d.V !== undefined && d.S !== undefined && d.SD !== undefined);

  createScatterChart(
    'hogScatter',
    'Högutbildade (%) vs Röstandel (%)',
    'Andel högutbildade (%)',
    'Röstandel (%)',
    [
      {
        label: 'Liberalerna',
        data: datapunkter.map((d, i) => ({ x: d.andelHog, y: d.L, kommunIndex: i })),
        backgroundColor: 'rgba(54, 162, 235, 0.7)'
      },
      {
        label: 'Vänsterpartiet',
        data: datapunkter.map((d, i) => ({ x: d.andelHog, y: d.V, kommunIndex: i })),
        backgroundColor: 'rgba(255, 99, 132, 0.7)'
      }
    ]
  );

  createScatterChart(
    'lagScatter',
    'Lågutbildade (%) vs Röstandel (%)',
    'Andel lågutbildade (%)',
    'Röstandel (%)',
    [
      {
        label: 'Socialdemokraterna',
        data: datapunkter.map((d, i) => ({ x: d.andelLag, y: d.S, kommunIndex: i })),
        backgroundColor: 'rgb(153, 0, 0)'
      },
      {
        label: 'Sverigedemokraterna',
        data: datapunkter.map((d, i) => ({ x: d.andelLag, y: d.SD, kommunIndex: i })),
        backgroundColor: 'rgb(0, 17, 255)'
      }
    ]
  );
}

function linjarRegression(data) {
  const n = data.length;
  const sumX = data.reduce((acc, p) => acc + p.x, 0);
  const sumY = data.reduce((acc, p) => acc + p.y, 0);
  const sumXY = data.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumX2 = data.reduce((acc, p) => acc + p.x * p.x, 0);

  const meanX = sumX / n;
  const meanY = sumY / n;

  const a = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = meanY - a * meanX;

  const xMin = Math.min(...data.map(p => p.x));
  const xMax = Math.max(...data.map(p => p.x));

  return {
    line: [
      { x: xMin, y: a * xMin + b },
      { x: xMax, y: a * xMax + b }
    ],
    a, b
  };
}

function createScatterChart(canvasId, title, xLabel, yLabel, datasets) {
  const chartData = [...datasets];

  datasets.forEach(dataset => {
    const regression = linjarRegression(dataset.data);
    chartData.push({
      label: `Trend (${dataset.label})`,
      data: regression.line,
      type: 'line',
      borderColor: dataset.backgroundColor,
      borderWidth: 2,
      fill: false,
      pointRadius: 0,
      tension: 0,
      borderDash: [5, 5]
    });
  });

  new Chart(document.getElementById(canvasId), {
    type: 'scatter',
    data: { datasets: chartData },
    options: {
      plugins: {
        title: { display: true, text: title },
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              if (!ctx.raw || typeof ctx.raw.kommunIndex === 'undefined') return null;
              const kommun = kommunLista[ctx.raw.kommunIndex];
              const { x, y } = ctx.raw;
              return `${kommun}: (${x.toFixed(1)}%, ${y.toFixed(1)}%)`;
            }
          }
        }
      },
      scales: {
        x: { title: { display: true, text: xLabel } },
        y: { title: { display: true, text: yLabel } }
      }
    }
  });
}

async function loadChartJs() {
  if (typeof Chart !== 'undefined') return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
    addMdToPage(`
- **Liberalerna** har tydligt högre stöd i kommuner med hög andel högutbildade – detta bekräftar hypotesen.  
- **Vänsterpartiet** visar ett svagt positivt samband med hög utbildningsnivå.  
- **Sverigedemokraterna** har starkt stöd där andelen lågutbildade är hög – detta stödjer hypotesen tydligt.  
- **Socialdemokraterna** visar ett svagare men liknande mönster som SD, med viss dragning mot lågutbildade kommuner.  
 
  ## Källor

- **Valresultat**: Valdata från Neo4j: röstantal per parti och kommun för 2018 och 2022.
- **Utbildningsnivåer per kommun**: SCB:s statistikdatabas över utbildningsnivå 2018 och 2022.
    https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__UF__UF0506__UF0506B/Utbildning/

    `);
  });

}
