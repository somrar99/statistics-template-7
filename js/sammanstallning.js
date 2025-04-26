dbQuery.use('riksdagsval-neo4j');


export let electionResultsForWork = await dbQuery('MATCH (n:Partiresultat) RETURN n');
electionResultsForWork = electionResultsForWork.map(x => ({
  ...x,
  parti: x.parti.trim()
}));



// Группируем по kommun
export let grupperadElectionResultsForWork = {};

for (let item of electionResultsForWork) {
  const { kommun, parti, roster2018, roster2022 } = item;
  if (!grupperadElectionResultsForWork[kommun]) {
    grupperadElectionResultsForWork[kommun] = [];
  }
  grupperadElectionResultsForWork[kommun].push({ parti, roster2018, roster2022 });
}

// Определим победителя + флаг смены
export default Object.entries(grupperadElectionResultsForWork).map(([kommun, list]) => {
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

