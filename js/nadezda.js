dbQuery.use('riksdagsval-neo4j');


let electionResultsForWork = await dbQuery('MATCH (n:Partiresultat) RETURN n');



// Группируем по kommun
let grupperadElectionResultsForWork = {};

for (let item of electionResultsForWork) {
  const { kommun, parti, roster2018, roster2022 } = item;
  if (!grupperadElectionResultsForWork[kommun]) {
    grupperadElectionResultsForWork[kommun] = [];
  }
  grupperadElectionResultsForWork[kommun].push({ parti, roster2018, roster2022 });
}

// Определим победителя + флаг смены
let sammanstallning = Object.entries(grupperadElectionResultsForWork).map(([kommun, list]) => {
  let vinnare2018 = list.reduce((max, curr) => curr.roster2018 > max.roster2018 ? curr : max);
  let vinnare2022 = list.reduce((max, curr) => curr.roster2022 > max.roster2022 ? curr : max);

  const byttParti = vinnare2018.parti !== vinnare2022.parti;

  return {
    kommun,
    vinnare2018: vinnare2018.parti,
    roster2018: vinnare2018.roster2018,
    vinnare2022: vinnare2022.parti,
    roster2022: vinnare2022.roster2022,
    byte: byttParti ? "!!! Ja!!!" : "-"
  };
});

// Kommuner där vinnande parti har ändrats (2018 → 2022)
let kommunerMedByte = sammanstallning
  .filter(r => r.byte === "!!! Ja!!!")
  .map(r => r.kommun);

// Kommuner där samma parti vann både 2018 och 2022
let stabilaKommuner = sammanstallning
  .filter(r => r.byte === "-")
  .map(r => r.kommun);





addMdToPage("### Vinnande parti per kommun - med byte mellan 2018 och 2022");

addToPage(`
  <h3>Antal kommuner med partibyte (2018–2022):</h3>
  <p style="font-size: 1.2em; font-weight: bold; color: darkred;">
    ${kommunerMedByte.length} kommuner
  </p>
`);



tableFromData({
  data: sammanstallning.map(row => {
    const highlight = row.byte === " Ja";
    return {
      kommun: row.kommun,
      vinnare2018: row.vinnare2018,
      roster2018: row.roster2018,
      vinnare2022: row.vinnare2022,
      roster2022: row.roster2022,
      byte: row.byte
    };
  })
});




// Достаем уникальные значения годов и партий
let years = [2018, 2022];
let partier = [...new Set(electionResultsForWork.map(x => x.parti))].sort();

// Создаем два выпадающих меню
let year = addDropdown('Välj år', years, 2022);
let chosenParti = addDropdown('Välj parti', partier);

// 2. Считаем количество коммун, где партия победила в выбранном году
let antalKommunerMedVinst = sammanstallning.filter(row =>
  (year == 2018 && row.vinnare2018 === chosenParti) ||
  (year == 2022 && row.vinnare2022 === chosenParti)
).length;

// Считаем общее число голосов за выбранный год
let totalVotes = s.sum(
  electionResultsForWork.map(x => year === 2018 ? +x.roster2018 : +x.roster2022)
);

// Считаем общее число голосов за выбранную партию
let partyVotes = s.sum(
  electionResultsForWork
    .filter(x => x.parti === chosenParti)
    .map(x => year === 2018 ? +x.roster2018 : +x.roster2022)
);

// Считаем процент
let percent = ((partyVotes / totalVotes) * 100).toFixed(1);

// Показываем
/*
addMdToPage(`### Partiet *${chosenParti}* år ${year} von i ${antalKommunerMedVinst} kommun`);
addMdToPage(`Totalt antal röster: **${partyVotes.toLocaleString('sv-SE')}** i landet för valt år. 
Andel av alla röster: **${percent}%**`);
*/
addToPage(`
  <div style="display: flex; justify-content: space-between; gap: 30px; align-items: flex-start;">
    
    <div style="flex: 1;">
      <h3>${chosenParti}, år ${year}</h3>
      <p>Partiet <strong>${chosenParti}</strong> vann i <strong>${antalKommunerMedVinst}</strong> kommuner.</p>
      <p>Totalt antal röster: <strong>${partyVotes.toLocaleString('sv-SE')}</strong> i landet för valt år.</p>
      <p>Andel av alla röster: <strong>${percent}%</strong></p>
    </div>

    <div id="pieChartContainer" style="flex: 1;"></div>

  </div>
`);
drawGoogleChart({
  type: 'PieChart',
  elementId: 'pieChartContainer',
  data: [
    ['Parti', 'Röster'],
    [chosenParti, partyVotes],
    ['Övriga', totalVotes - partyVotes]
  ],
  options: {
    title: `Andel av röster, år ${year}`,
    height: 300,
    pieHole: 0.4
  }
});





// Собираем % голосов за выбранную партию по kommun
let procentData = [];

for (let kommun in grupperadElectionResultsForWork) {
  let lista = grupperadElectionResultsForWork[kommun];

  let total = s.sum(lista.map(r => +r[`roster${year}`]));
  let partiRad = lista.find(r => r.parti === chosenParti);
  if (!partiRad) continue;

  let partiroster = +partiRad[`roster${year}`];
  let procent = (partiroster / total) * 100;

  procentData.push({
    kommun,
    procent: +procent.toFixed(2)
  });
}
addMdToPage(`📊 Totalt antal kommuner i analysen: **${procentData.length}**`);



drawGoogleChart({
  type: 'Histogram',
  data: [
    ['Procent röster'],
    ...procentData.map(x => [x.procent])
  ],
  options: {
    title: `Andel röster för ${chosenParti} i varje kommun (${year})`,
    height: 400,
    histogram: { bucketSize: 2 },
    hAxis: { title: 'Procent röster' },
    vAxis: { title: 'Antal kommuner' }
  }
});

let median = s.median(procentData.map(x => x.procent));
let max = s.max(procentData.map(x => x.procent));
let min = s.min(procentData.map(x => x.procent));

addMdToPage(`
### Statistik: ${chosenParti} (${year})
- 🧮 Medianandel per kommun: **${median.toFixed(1)}%**
- 📈 Högsta andel: **${max.toFixed(1)}%**
- 📉 Lägsta andel: **${min.toFixed(1)}%**
`);


let values = procentData.map(x => x.procent);
let result = stdLib.stats.shapiroWilkTest(values);

addMdToPage(`
### 📐 Shapiro-Wilk normalitetstest
- p-värde: **${result.p.toFixed(4)}**
- ${result.p < 0.05
    ? "❌ Fördelningen verkar inte vara normalfördelad"
    : "✅ Fördelningen verkar vara normalfördelad"}
`);




//объединять с procentData для анализа и корреляций:
dbQuery.use('kommun-info-mongodb');
let income = await dbQuery.collection('incomeByKommun').find({});
console.log('income from mongodb', income);

let incomeDataForTable = income.map(x => ({
  kommun: x.kommun,
  kön: x.kon,
  medelInkomst2018: x.medelInkomst2018,
  medelInkomst2019: x.medelInkomst2019,
  medelInkomst2020: x.medelInkomst2020,
  medelInkomst2021: x.medelInkomst2021,
  medelInkomst2022: x.medelInkomst2022,
  medianInkomst2018: x.medianInkomst2018,
  medianInkomst2019: x.medianInkomst2019,
  medianInkomst2020: x.medianInkomst2020,
  medianInkomst2021: x.medianInkomst2021,
  medianInkomst2022: x.medianInkomst2022
}));


let korrelationData = procentData.map(p => {
  let row = incomeDataForTable.find(i => i.kommun === p.kommun && i.kön === 'totalt');
  return row ? { kommun: p.kommun, procent: p.procent, inkomst: row.medelInkomst2022 } : null;
}).filter(x => x);


let r = s.sampleCorrelation(
  korrelationData.map(x => x.inkomst),
  korrelationData.map(x => x.procent)
);

addMdToPage(`
### 📈 Enkel korrelation mellan inkomst och röstandel för ${chosenParti}
- Pearson r: **${r.toFixed(3)}**
- ${Math.abs(r) > 0.4
    ? "↗️ Det verkar finnas ett samband"
    : "↔️ Svagt eller inget tydligt samband"}
`);







let vansterPartier = ['Socialdemokraterna', 'Vänsterpartiet', 'Miljöpartiet', 'Centerpartiet'];
let hogerPartier = ['Moderaterna', 'Kristdemokraterna', 'Liberalerna', 'Sverigedemokraterna'];

// Суммируем по блокам
let totalVanster2018 = electionResultsForWork
  .filter(x => vansterPartier.includes(x.parti))
  .reduce((sum, x) => sum + (+x.roster2018), 0);

let totalVanster2022 = electionResultsForWork
  .filter(x => vansterPartier.includes(x.parti))
  .reduce((sum, x) => sum + (+x.roster2022), 0);

let totalHoger2018 = electionResultsForWork
  .filter(x => hogerPartier.includes(x.parti))
  .reduce((sum, x) => sum + (+x.roster2018), 0);

let totalHoger2022 = electionResultsForWork
  .filter(x => hogerPartier.includes(x.parti))
  .reduce((sum, x) => sum + (+x.roster2022), 0);

// Общая сумма голосов по стране
let total2018 = totalVanster2018 + totalHoger2018;
let total2022 = totalVanster2022 + totalHoger2022;

// Проценты
let percentVanster2018 = (totalVanster2018 / total2018 * 100).toFixed(1);
let percentVanster2022 = (totalVanster2022 / total2022 * 100).toFixed(1);
let percentHoger2018 = (totalHoger2018 / total2018 * 100).toFixed(1);
let percentHoger2022 = (totalHoger2022 / total2022 * 100).toFixed(1);

addMdToPage(`
### Röster per block – hela landet

#### 🗳️ År 2018
- Vänsterblocket: ${totalVanster2018.toLocaleString('sv-SE')} röster (${percentVanster2018}%)
- Högerblocket: ${totalHoger2018.toLocaleString('sv-SE')} röster (${percentHoger2018}%)

#### 🗳️ År 2022
- Vänsterblocket: ${totalVanster2022.toLocaleString('sv-SE')} röster (${percentVanster2022}%)
- Högerblocket: ${totalHoger2022.toLocaleString('sv-SE')} röster (${percentHoger2022}%)
`);

// Подготавливаем данные для диаграммы
let blockData = [
  { år: '2018', Vänster: totalVanster2018, Höger: totalHoger2018 },
  { år: '2022', Vänster: totalVanster2022, Höger: totalHoger2022 }
];

// Выводим заголовок
addMdToPage(`### Röstfördelning per block (hela landet)`);

// Строим диаграмму
drawGoogleChart({
  type: 'ColumnChart',
  data: makeChartFriendly(blockData, 'år', 'Vänster', 'Höger'),
  options: {
    title: 'Vänster- och högerblockets röster i hela landet (2018 vs 2022)',
    height: 500,
    legend: { position: 'top' },
    hAxis: {
      title: 'År',
      slantedText: true
    },
    vAxis: {
      title: 'Antal röster',
      format: '#'
    },
    chartArea: { left: 80, width: '80%' }
  }
});



//arbete med MySql

dbQuery.use('geo-mysql');
let geoData = await dbQuery('SELECT * FROM geoData');

// Словарь kommun → län
let kommunTillLan = {};
for (let row of geoData) {
  kommunTillLan[row.municipality] = row.county;
}

// Связываем kommuner med län från geoData
let lanByteRaknare = {};

for (let kommun of kommunerMedByte) {
  let geoRad = geoData.find(x => x.municipality === kommun);
  if (!geoRad) continue;

  let lan = geoRad.county;
  if (!lanByteRaknare[lan]) {
    lanByteRaknare[lan] = 0;
  }
  lanByteRaknare[lan]++;
}

// Преобразуем в список для таблицы/диаграммы
let lanByteLista = Object.entries(lanByteRaknare)
  .map(([lan, antal]) => ({ Län: lan, 'Antal byten': antal }))
  .sort((a, b) => b['Antal byten'] - a['Antal byten']);


addMdToPage(`### Län där vinnande parti byttes i kommuner (2018–2022)`);

tableFromData({
  data: lanByteLista
});


drawGoogleChart({
  type: 'ColumnChart',
  data: [['Län', 'Antal byten'], ...lanByteLista.map(x => [x.Län, x['Antal byten']])],
  options: {
    title: 'Kommuner med partibyte per län (2018–2022)',
    height: 600,
    chartArea: { left: 100 },
    legend: { position: 'none' },
    hAxis: { slantedText: true, slantedTextAngle: 45 }
  }
});
