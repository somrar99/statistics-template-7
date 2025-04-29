
let vansterPartier = ['Arbetarepartiet-Socialdemokraterna', 'Vänsterpartiet', 'Miljöpartiet de gröna', 'Centerpartiet'];
let hogerPartier = ['Moderaterna', 'Kristdemokraterna', 'Liberalerna', 'Sverigedemokraterna'];

// Суммируем по блокам

console.log([...new Set(electionResultsForWork.map(x => x.parti))])
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

addToPage(`
  <section style="margin-top: 2em;">

    <h3 style="text-align: center;">Röster per block – hela landet</h3>

    <div style="display: flex; justify-content: space-between; gap: 40px; margin-top: 1.5em;">

      <div style="flex: 1; padding: 1em; background-color: #f9f9f9; border-radius: 0px;">
        <h4 style="text-align: center;">🗳️ År 2018</h4>
        <ul style="list-style-type: none; padding: 0;">
          <li><strong>Vänsterblocket:</strong> ${totalVanster2018.toLocaleString('sv-SE')} röster (${percentVanster2018}%)</li>
          <li><strong>Högerblocket:</strong> ${totalHoger2018.toLocaleString('sv-SE')} röster (${percentHoger2018}%)</li>
        </ul>
      </div>

      <div style="flex: 1; padding: 1em; background-color: #f9f9f9; border-radius: 0px;">
        <h4 style="text-align: center;">🗳️ År 2022</h4>
        <ul style="list-style-type: none; padding: 0;">
          <li><strong>Vänsterblocket:</strong> ${totalVanster2022.toLocaleString('sv-SE')} röster (${percentVanster2022}%)</li>
          <li><strong>Högerblocket:</strong> ${totalHoger2022.toLocaleString('sv-SE')} röster (${percentHoger2022}%)</li>
        </ul>
      </div>

    </div>

  </section>
`);






// Подготавливаем данные для диаграммы
let blockData = [
  { år: '2018', Vänster: totalVanster2018, Höger: totalHoger2018 },
  { år: '2022', Vänster: totalVanster2022, Höger: totalHoger2022 }
];


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
      format: '#',
      minValue: 0 // ← это главное изменение
    },
    chartArea: { left: 80, width: '80%' },
    colors: ['#dc3912', '#3366cc'] // синий и красный, как в легенде
  }
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
    ${kommunerMedByte.length} kommuner har bytt vinnande parti
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


//console.log(electionResultsForWork.filter(x => x.parti === "Liberalerna "));

// Достаем уникальные значения годов и партий
let years = [2018, 2022];
let partier = [...new Set(electionResultsForWork.map(x => x.parti))].sort();

// Создаем два выпадающих меню
let year = addDropdown('Välj år', years, 2022);


/*
// 2. Считаем количество коммун, где партия победила в выбранном году
let antalKommunerMedVinst = sammanstallning.filter(row =>
  (year == 2018 && row.vinnare2018 === chosenParti) ||
  (year == 2022 && row.vinnare2022 === chosenParti)
).length;
*/

// Считаем общее число голосов за выбранный год
let totalVotes = s.sum(
  electionResultsForWork.map(x => year === 2018 ? +x.roster2018 : +x.roster2022)
);

// Теперь считаем проценты для каждой партии
let percentPerParty = partier.map(parti => {
  let partyVotes = s.sum(
    electionResultsForWork
      .filter(x => x.parti === parti)
      .map(x => year == 2018 ? +x.roster2018 : +x.roster2022)
  );

  let percent = ((partyVotes / totalVotes) * 100).toFixed(1);

  return { parti, percent: +percent }; // ✅ плюс делает число
});

// Выведем результат
console.log(percentPerParty);


//DATASET https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__ME__ME0104__ME0104D/ME0104T4/

/* Показываем

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
*/

// Рисуем круговую диаграмму
drawGoogleChart({
  type: 'PieChart',
  data: makeChartFriendly(
    percentPerParty,
    'parti', 'percent'
  ),
  options: {
    title: `Röstfördelning per parti (${year})`,
    height: 500,
    pieHole: 0.4, // для красивой "donut chart", если хочешь
    chartArea: { left: "10%" }
  }
});


// 1. Сортируем массив процентов по убыванию
let top3Partier = percentPerParty
  .sort((a, b) => b.percent - a.percent)
  .slice(0, 3) // только 3 лучшие
  .map(x => x.parti); // оставляем только названия партий


//Кратко: не гистограммы, а плотности или линии частот.
//1. Собираем проценты для всех партий:

let procentPerParti = {}; // { 'Partinamn': [procent1, procent2, ...], ... }

for (let kommun in grupperadElectionResultsForWork) {
  let lista = grupperadElectionResultsForWork[kommun];

  let total = s.sum(lista.map(r => +r[`roster${year}`]));

  for (let rad of lista) {
    let parti = rad.parti;
    let partiroster = +rad[`roster${year}`];
    let procent = (partiroster / total) * 100;

    if (!procentPerParti[parti]) procentPerParti[parti] = [];

    procentPerParti[parti].push(+procent.toFixed(2));
  }
}
//2. Группируем проценты в procentBuckets:

let procentBuckets = {}; // { 'Partinamn': {0: 5, 1: 8, 2: 3, ...}, ... }

for (let parti in procentPerParti) {
  let procentLista = procentPerParti[parti];

  let partiBuckets = {};

  for (let p of procentLista) {
    let bucket = Math.floor(p); // округляем вниз до целого процента
    partiBuckets[bucket] = (partiBuckets[bucket] || 0) + 1;
  }

  procentBuckets[parti] = partiBuckets;
}
//3. Подготавливаем данные для графика:

let procentInterval = Array.from({ length: 101 }, (_, i) => i); // 0–100%

let dataForChart = procentInterval.map(p => {
  let row = { 'Procent röster': p };

  for (let parti in procentBuckets) {
    row[parti] = procentBuckets[parti][p] || 0; // если нет данных для процента, ставим 0
  }

  return row;
});
//4. Строим линии на LineChart:

drawGoogleChart({
  type: 'LineChart',
  data: makeChartFriendly(
    dataForChart,
    'Procent röster',
    ...Object.keys(procentBuckets) // все партии автоматически
  ),
  options: {
    title: 'Röstfördelning per parti i kommunerna',
    height: 500,
    //curveType: 'function',
    legend: { position: 'top', maxLines: 3 },
    hAxis: {
      title: 'Procent röster',
      viewWindow: {
        min: 0,
        max: 55
      }
    },
    vAxis: { title: 'Antal kommuner' },
    chartArea: { left: 60, top: 60, width: '80%', height: '70%' },
    tooltip: { isHtml: true },  // включаем красивый HTML tooltip
  }
});




let chosenParti = addDropdown('Välj parti', partier);

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

/*
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
*/





dbQuery.use('geo-mysql');
let geoData = await dbQuery('SELECT * FROM geoData  ORDER BY latitude');

// 1. Создаём словарь kommun → län
let kommunTillLan = {};
for (let row of geoData) {
  kommunTillLan[row.municipality] = row.county;
}

// 2. Строим lanByteRaknare на основе kommunerMedByte
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
/*
// ✅ 3. Теперь можно использовать lanByteRaknare!
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
    hAxis: { slantedText: true, slantedTextAngle: 45, min: 0 }
  }
});
*/


//Dataset från https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__BO__BO0501__BO0501B/FastprisSHRegionAr/sortedtable/tableViewSorted/



/*
//2. Изменение голосов по партиям: разница между 2022 и 2018

let diffVotes = electionResultsForWork
  .filter(x => x.parti === chosenParti)
  .map(x => +x.roster2022 - +x.roster2018);


/*🔹 Вариант 1: Гистограмма разницы голосов
Ось X — это разбивка по интервалам разницы (например: от −1000 до +1000)

Ось Y — это количество коммун, попавших в каждый интервал

🔁 Это показывает распределение изменений:
Больше коммун прибавили или потеряли голоса? Насколько сильно?
*/
/*
drawGoogleChart({
  type: 'Histogram',
  data: makeChartFriendly(
    diffVotes.map(x => ({ x })), // массив объектов: { x: число }
    'Δ röster'
  ),
  options: {
    title: `Röstförändring för ${chosenParti} per kommun (2022 − 2018)`,
    height: 500,
    histogram: { bucketSize: 250 }
  }
});

/*🔹 Вариант 2: Диаграмма рассеяния (scatterplot)
Если ты хочешь по каждой коммуне:

Ось X — например, исходное число голосов в 2018

Ось Y — разница голосов между 2022 и 2018

Это покажет, связано ли увеличение/уменьшение с изначальным уровнем поддержки.
*/
/*
let scatterData = electionResultsForWork
  .filter(x => x.parti === chosenParti)
  .map(x => ({
    roster2018: +x.roster2018,
    diff: +x.roster2022 - +x.roster2018
  }));

drawGoogleChart({
  type: 'ScatterChart',
  data: makeChartFriendly(scatterData, 'roster2018', 'Δ röster'),
  options: {
    title: `Röstförändring för ${chosenParti} i förhållande till stöd 2018`,
    height: 500,
    hAxis: { title: 'Röster 2018' },
    vAxis: { title: 'Förändring (2022 − 2018)' }
  }
});
*/


// Выбираем данные по выбранной партии и считаем процентное изменение
let percentChanges = electionResultsForWork
  .filter(x => x.parti === chosenParti && +x.roster2018 > 0) // Исключаем коммуны с 0 голосов в 2018
  .map(x => ((+x.roster2022 / +x.roster2018) - 1) * 100);


// 2. Считаем среднее и стандартное отклонение
let mean = s.mean(percentChanges);
let stdDev = s.standardDeviation(percentChanges);

// 3. Подготовим данные для гистограммы
let binWidth = 5;
let bins = {};
for (let change of percentChanges) {
  let bin = Math.floor(change / binWidth) * binWidth;
  bins[bin] = (bins[bin] || 0) + 1;
}

// 4. Превращаем корзины в массив объектов
let histogramData = Object.entries(bins).map(([bin, count]) => ({
  'Förändring (%)': +bin,
  'Antal kommuner': count,
  'Teoretisk normalfördelning': null
}));

// 5. Генерируем теоретическую нормальную кривую
let minX = Math.min(...percentChanges) - 10;
let maxX = Math.max(...percentChanges) + 10;
let stepSize = 0.5; // шаг по оси X

for (let x = minX; x <= maxX; x += stepSize) {
  let yDensity = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - mean) ** 2) / (2 * stdDev ** 2));
  // Масштабируем плотность, чтобы высота соответствовала реальному количеству коммун
  let scaledY = yDensity * percentChanges.length * binWidth;

  histogramData.push({
    'Förändring (%)': x,
    'Antal kommuner': null,
    'Teoretisk normalfördelning': scaledY
  });
}

// 6. Рисуем график
drawGoogleChart({
  type: 'ComboChart',
  data: makeChartFriendly(
    histogramData,
    'Förändring (%)', 'Antal kommuner', 'Teoretisk normalfördelning'
  ),
  options: {
    title: `Procentuell förändring i röster för ${chosenParti} mellan 2018 och 2022`,
    height: 500,
    seriesType: 'bars', // базовая серия - столбики
    series: {
      1: { type: 'line', color: 'red', lineWidth: 3 } // вторая серия - линия
    },
    vAxis: { title: 'Antal kommuner' },
    hAxis: { title: 'Förändring (%)' },
    legend: { position: 'top', alignment: 'center' },
    chartArea: { left: 50, top: 60, width: '80%', height: '70%' }
  }
});

//Полный код для проверки Shapiro-Wilk
// 1. Проверяем нормальность распределения процентных изменений голосов
let result = stdLib.stats.shapiroWilkTest(percentChanges);

// 2. Выводим красиво на страницу
addMdToPage(`
### 📐 Shapiro-Wilk normalitetstest för procentuell förändring

- **p-värde**: ${result.p.toFixed(4)}
- ${result.p < 0.05
    ? "❌ Fördelningen verkar inte vara normalfördelad"
    : "✅ Fördelningen verkar vara normalfördelad"}
`);



