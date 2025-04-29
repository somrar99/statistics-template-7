addMdToPage("# Politisk förändring i Sverige mot bakgrund av överkomliga bostäder (2018-2022)");
addToPage(`Valresultat 2018 och 2022: Hämtade från en Neo4j-baserad databas och omvandlades till JSON-format (neo4j.json). 
  Det har skett lokala förändringar i svensk politik mellan 2018 och 2022, 
  men den övergripande strukturen för partistöd har varit relativt stabil.`)

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

addToPage(`I många kommuner byttes valvinnaren ut, men de tre största partierna förblev desamma:
Socialdemokraterna, Sverigedemokraterna och Moderaterna.`)


/*
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
*/

//console.log(electionResultsForWork.filter(x => x.parti === "Liberalerna "));

// Достаем уникальные значения годов и партий
let years = [2018, 2022];
let partier = [...new Set(electionResultsForWork.map(x => x.parti))].sort();

// Создаем два выпадающих меню
let year = addDropdown('Välj år', years, 2022);

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
    ? "❌ Fördelningen verkar inte vara normalfördelad. Eftersom Shapiro-Wilks test gav ett p-värde på noll kan vi inte använda T-testet. Därför behöver vi istället vänja oss vid att arbeta med korrelationsberäkningar och olika icke-parametriska testmetoder."
    : "✅ Fördelningen verkar vara normalfördelad"}
`);




//Dataset från https:/ / www.statistikdatabasen.scb.se / pxweb / sv / ssd / START__BO__BO0501__BO0501B / FastprisSHRegionAr / sortedtable / tableViewSorted /


addMdToPage(`
  ### Länsinfo, från SQlite
  Info om HusPriser per kommun i tussen kronor
  `);
dbQuery.use('HusPris-sqlite');
let meddelHusPris = await dbQuery('SELECT SUBSTR(Region, 6) AS Kommun,  "2018",  "2022" FROM HusPrisITusenKr; ');
//tableFromData({ data: meddelHusPris });
console.log(meddelHusPris);


dbQuery.use('kommun-info-mongodb');
let income = await dbQuery.collection('incomeByKommun').find({});

// Фильтруем и трансформируем данные
let cleanedIncome = income.map(doc => ({
  kommun: doc.kommun,
  medelInkomst2018: doc.medelInkomst2018,
  medelInkomst2022: doc.medelInkomst2022
}));

//console.table(cleanedIncome.slice(0, 5));

// Преобразуем доход в словарь по названию коммуны
let incomeMap = {};
cleanedIncome.forEach(doc => {
  incomeMap[doc.kommun] = {
    medel2018: doc.medelInkomst2018,
    medel2022: doc.medelInkomst2022
  };
});

// Соединяем с ценами и делим
let priceToIncome = meddelHusPris.map(row => {
  let kommun = row.Kommun;
  let income = incomeMap[kommun];

  let kvot2018 = row["2018"] / income.medel2018;
  let kvot2022 = row["2022"] / income.medel2022;
  let tillväxtInkomst = ((income.medel2022 - income.medel2018) / income.medel2018) * 100;
  let tillväxtKvot = ((kvot2022 - kvot2018) / kvot2018) * 100;

  return {
    kommun,
    'Tillväxt inkomst (%)': +tillväxtInkomst.toFixed(1),
    'Kvot 2018': +kvot2018.toFixed(2),
    'Kvot 2022': +kvot2022.toFixed(2),
    'Tillväxt kvot (%)': +tillväxtKvot.toFixed(1)
  };
});
//tableFromData({ data: priceToIncome });


//2. Сортируем:

let sortablePriceToIncome = [...priceToIncome].sort(
  (a, b) => a['Tillväxt kvot (%)'] - b['Tillväxt kvot (%)']
);




//3. Выбираем лучший и худший результат:

let bästKommun = sortablePriceToIncome[0]; // самое сильное улучшение доступности
let sämstKommun = sortablePriceToIncome[sortablePriceToIncome.length - 1]; // самое сильное ухудшение
//4. Выводим красиво через addMdToPage:

addMdToPage(`
  ### 📈 Tillväxt i boendeaffordabilitet (2018–2022)

Inkomstdata: Medellön per kommun för åren 2018 och 2022 från MongoDB-databas (kommun-info-mongodb).

Huspriser: Medianpris på småhus per kommun från en SQLite-databas (HusPris-sqlite).
[SCB: Fastpris på småhus per region och år](https://www.statistikdatabasen.scb.se/pxweb/sv/ssd/START__BO__BO0501__BO0501B/FastprisSHRegionAr/sortedtable/tableViewSorted)


🏠 Bostadsrättsläget har försämrats nästan överallt.
Studien visar att bostadsrättsläget (kvot pris/inkomst) har försämrats i de flesta kommuner.

Den största försämringen observerades i kommuner som ${sämstKommun.kommun}, där överkomligheten minskade med mer än ${sämstKommun['Tillväxt kvot (%)']} procent.
I några kommuner har situationen tvärtom förbättrats, men de är betydligt färre till antalet.

Beräkningar:

Boendeaffordabilitet:
För varje kommun beräknades ett kvotmått som 

Kvot = (Huspris) / (Inkomst) både för 2018 och 2022.

Hur mycket kvoten förändrats mellan åren:

Tillväxt kvot (%) = ((Kvot2022 - Kvot2018) / Kvot2018) × 100


 **Mest försämrad tillgänglighet:**
  - Kommun: **${sämstKommun.kommun}**
  - Tillväxt kvot: **${sämstKommun['Tillväxt kvot (%)']}%**  
  - Kvot 2018: **${sämstKommun['Kvot 2018']}**
  - Kvot 2022: **${sämstKommun['Kvot 2022']}**

  **Mest förbättrad tillgänglighet:**
  - Kommun: **${bästKommun.kommun}**
  - Tillväxt kvot: **${bästKommun['Tillväxt kvot (%)']}%**  
  - Kvot 2018: **${bästKommun['Kvot 2018']}**
  - Kvot 2022: **${bästKommun['Kvot 2022']}** 
`);


//Как правильно сортировать строки по алфавиту
let sortedByKommun = [...priceToIncome].sort((a, b) =>
  a['kommun'].localeCompare(b['kommun'])
);

//tableFromData({ data: sortedByKommun });



let finalTable = priceToIncome.map(row => {
  let match = sammanstallning.find(s => s.kommun === row.kommun);

  return {
    ...row,
    vinnare2018: match ? match.vinnare2018 : null,
    vinnare2022: match ? match.vinnare2022 : null,
    byte: match ? match.byte : null
  };
});
//export default sammanstallning;
console.table(finalTable);



//1. Считаем потерю голосов по каждой коммуне для каждой партии

let liberalerData = electionResultsForWork
  .filter(r => r.parti === 'Liberalerna')
  .map(r => ({
    kommun: r.kommun,
    diffProcent: ((+r.roster2022 - +r.roster2018) / +r.roster2018) * 100
  }));

let centerpartietData = electionResultsForWork
  .filter(r => r.parti === 'Centerpartiet')
  .map(r => ({
    kommun: r.kommun,
    diffProcent: ((+r.roster2022 - +r.roster2018) / +r.roster2018) * 100
  }));
//2. Превращаем это в словари для быстрого поиска:

let liberalerMap = {};
liberalerData.forEach(r => {
  liberalerMap[r.kommun] = r.diffProcent;
});

let centerpartietMap = {};
centerpartietData.forEach(r => {
  centerpartietMap[r.kommun] = r.diffProcent;
});
//3. Теперь собираем таблицу: Kommun + потери + Tillväxt kvot

let combinedData = priceToIncome.map(row => {
  let kommun = row.kommun;

  return {
    kommun,
    'Liberalerna röster diff (%)': liberalerMap[kommun] ?? null,
    'Centerpartiet röster diff (%)': centerpartietMap[kommun] ?? null,
    'Tillväxt kvot (%)': row['Tillväxt kvot (%)']
  };
});

//tableFromData({ data: combinedData });



//Ось X — Tillväxt kvot(%)(насколько жильё стало доступнее / дороже)
//Ось Y — Liberalerna röster diff(%) или Centerpartiet röster diff(%)
//Разными цветами — для либералов и для центра.
//1. Подготавливаем данные:

let scatterDataLiberalerna = combinedData
  .filter(r => r['Liberalerna röster diff (%)'] !== null)
  .map(r => ({
    tillvaxtKvot: r['Tillväxt kvot (%)'],
    diffProcent: r['Liberalerna röster diff (%)']
  }));

let scatterDataCenterpartiet = combinedData
  .filter(r => r['Centerpartiet röster diff (%)'] !== null)
  .map(r => ({
    tillvaxtKvot: r['Tillväxt kvot (%)'],
    diffProcent: r['Centerpartiet röster diff (%)']
  }));



addMdToPage(`
  ### 📊 Samband mellan bostadspris och förändring i politiskt stöd
  
Ett försök gjordes att identifiera om försämrad bostadspris påverkar förändringen i röster på partier.
* Förändringen i antalet röster beräknas i relation till partiernas resultat från 2018, 
där 2018 års röster sätts till 100 %. 
Detta visar tydligare skillnader och hjälper till att identifiera trender. 
Exempelvis tappade Centerpartiet upp till 60 % i en av kommun, medan vinnande partier ökade sitt stöd med upp till 65 %.

**"Två partier som förlorade flest röster"** syftar på de partier som tappade mest i väljarstöd mellan valen 2018 och 2022.​
`);
//2. Рисуем ScatterChart для обеих партий:

drawGoogleChart({
  type: 'ScatterChart',
  data: [
    ['Tillväxt kvot (%)', 'Liberalerna (%)', 'Centerpartiet (%)'],
    ...scatterDataLiberalerna.map((r, idx) => [
      r.tillvaxtKvot,
      r.diffProcent,
      scatterDataCenterpartiet[idx] ? scatterDataCenterpartiet[idx].diffProcent : null
    ])
  ],
  options: {
    title: 'Samband mellan boendeaffordabilitet och partisupport',
    height: 500,
    hAxis: { title: 'Tillväxt kvot (%)' },
    vAxis: { title: 'Förändring i röster (%)' },
    legend: { position: 'top' },
    pointSize: 5,
    series: {
      0: { color: '#3498db', labelInLegend: 'Liberalerna' },
      1: { color: '#2ecc71', labelInLegend: 'Centerpartiet' }
    },
    chartArea: { left: 60, top: 50, width: '80%', height: '70%' }
  }
});

//1. Считаем процентную разницу по каждому из ТОП - 3 партий:

let socialdemokraternaData = electionResultsForWork
  .filter(r => r.parti === 'Arbetarepartiet-Socialdemokraterna')
  .map(r => ({
    kommun: r.kommun,
    diffProcent: ((+r.roster2022 - +r.roster2018) / +r.roster2018) * 100
  }));

let moderaternaData = electionResultsForWork
  .filter(r => r.parti === 'Moderaterna')
  .map(r => ({
    kommun: r.kommun,
    diffProcent: ((+r.roster2022 - +r.roster2018) / +r.roster2018) * 100
  }));

let sverigedemokraternaData = electionResultsForWork
  .filter(r => r.parti === 'Sverigedemokraterna')
  .map(r => ({
    kommun: r.kommun,
    diffProcent: ((+r.roster2022 - +r.roster2018) / +r.roster2018) * 100
  }));
//2. Создаём словари для быстрого сопоставления:

let sMap = {}, mMap = {}, sdMap = {};

socialdemokraternaData.forEach(r => sMap[r.kommun] = r.diffProcent);
moderaternaData.forEach(r => mMap[r.kommun] = r.diffProcent);
sverigedemokraternaData.forEach(r => sdMap[r.kommun] = r.diffProcent);
//3. Собираем общий массив для графика:

let combinedTop3 = priceToIncome.map(row => {
  let kommun = row.kommun;

  return {
    kommun,
    tillvaxtKvot: row['Tillväxt kvot (%)'],
    socialdemokraterna: sMap[kommun] ?? null,
    moderaterna: mMap[kommun] ?? null,
    sverigedemokraterna: sdMap[kommun] ?? null
  };
});
//4. Готовим данные для scatter plot:

let scatterData = [
  ['Tillväxt kvot (%)', 'Socialdemokraterna (%)', 'Moderaterna (%)', 'Sverigedemokraterna (%)'],
  ...combinedTop3.map(r => [
    r.tillvaxtKvot,
    r.socialdemokraterna,
    r.moderaterna,
    r.sverigedemokraterna
  ])
];

addMdToPage(`
**"De tre kommuner där partierna behöll sina positioner"** 
avser de kommuner där det vinnande partiet från 2018 lyckades behålla eller förstarka sin ledande position även i valet 2022.​
`);
//5. Рисуем красивый график:

drawGoogleChart({
  type: 'ScatterChart',
  data: scatterData,
  options: {
    title: 'Samband mellan boendeaffordabilitet och partisupport (Topp 3)',
    height: 500,
    hAxis: { title: 'Tillväxt kvot (%)' },
    vAxis: { title: 'Förändring i röster (%)' },
    legend: { position: 'top' },
    pointSize: 3,
    series: {
      0: { color: '#FF0000', labelInLegend: 'Socialdemokraterna' }, // 🔴 Красный
      1: { color: '#FFD700', labelInLegend: 'Moderaterna' },        // 🟡 Жёлтый
      2: { color: '#FF00FF', labelInLegend: 'Sverigedemokraterna' }  // 🌸 Яркая фуксия!
    },
    chartArea: { left: 60, top: 50, width: '80%', height: '70%' }
  }
});


//pearson
//1. Готовим данные для корреляции:

let socialData = combinedTop3
  .filter(r => r.socialdemokraterna !== null && r.tillvaxtKvot !== null)
  .map(r => [r.tillvaxtKvot, r.socialdemokraterna]);

let moderatData = combinedTop3
  .filter(r => r.moderaterna !== null && r.tillvaxtKvot !== null)
  .map(r => [r.tillvaxtKvot, r.moderaterna]);

let sdData = combinedTop3
  .filter(r => r.sverigedemokraterna !== null && r.tillvaxtKvot !== null)
  .map(r => [r.tillvaxtKvot, r.sverigedemokraterna]);
//2. Вычисляем корреляцию:

let socialR = s.sampleCorrelation(
  socialData.map(r => r[0]),
  socialData.map(r => r[1])
);

let moderatR = s.sampleCorrelation(
  moderatData.map(r => r[0]),
  moderatData.map(r => r[1])
);

let sdR = s.sampleCorrelation(
  sdData.map(r => r[0]),
  sdData.map(r => r[1])
);
//3. Выводим красиво на страницу:

addMdToPage(`
  ### 📈 Samband mellan boendeaffordabilitet och partisupport (Pearson r)
  Pearsons statistiska test gav korrelationskoefficienterna:

  - **Socialdemokraterna**: r = **${socialR.toFixed(3)}**
  - **Moderaterna**: r = **${moderatR.toFixed(3)}**
  - **Sverigedemokraterna**: r = **${sdR.toFixed(3)}**

  ${Math.abs(socialR) < 0.2 && Math.abs(moderatR) < 0.2 && Math.abs(sdR) < 0.2
    ? "🔴 Detta tyder på att det inte finns någon stark direkt koppling mellan försämrade boendekostnader och förändringar i politiska preferenser på kommunnivå."
    : "🔵 Vissa samband kan finnas!"}
`);


addMdToPage(`
<h3>🎯 Trots försämrad bostadsaffordabilitet i många kommuner mellan 2018 och 2022, 
visar analyserna att väljarnas lojalitet mot toppartierna i Sverige i stort sett förblev stabil. 
Politisk förändring skedde mest på lokal nivå utan tydligt samband till boendeekonomiska faktorer.</h3>
`);

