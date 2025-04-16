dbQuery.use('riksdagsval-neo4j');

// Группируем по kommun
let electionResultsForWork = await dbQuery('MATCH (n:Partiresultat) RETURN n');



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

let antalByten = sammanstallning.filter(r => r.byte === "!!! Ja!!!").length;


addMdToPage("### Vinnande parti per kommun - med byte mellan 2018 och 2022");



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