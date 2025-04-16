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

//let year = addDropdown(2018, 2022);


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

