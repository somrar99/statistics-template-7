// Eftersom mallen numera "i hemlighet" wrappar all filer som anges i menu
// så här:
// function husPris(){..från din fil...}
// så fungerar inte exporter i javascript-filer som anges i menyn
// men:
// vi kan skapa separata filer med exporter (som sammanstallning.js)
// importera dessa längst upp i _menu.js
// och sedan göra de var importerat globalt (dvs. kan användas i alla filer)
// så här:


import sammanstallning, { electionResultsForWork, grupperadElectionResultsForWork } from "./sammanstallning.js";
globalThis.electionResultsForWork = electionResultsForWork;
globalThis.sammanstallning = sammanstallning;
globalThis.grupperadElectionResultsForWork = grupperadElectionResultsForWork;

createMenu('Riksdagensval med olika faktorer:', [
  //{ name: 'Nytt i version 7', script: 'new-in-v7.js' },
  //{ name: 'Visa ett år', script: 'one-year.js' },
  //{ name: 'Jämför två år', script: 'compare-two-years.js' },
  //{ name: 'Hitta trender', script: 'trends.js' },
  { name: 'Meddelålder', script: 'rula.js' },
  {
    name: 'Skatt',
    sub: [
      { name: 'Statistik & DataAnalys & Shapiro-Wilk Test', script: 'dataAnalys.js' },
      { name: 'Trend: Valresultat & Skattbetalning', script: 'trend.js' }
    ]
  },
  { name: 'Boendeaffordabilitet', script: 'nadezda.js' },
  { name: 'Utbildning', script: 'HumaR1.js' },
  {
    name: "Inkomst", sub: [
      { name: 'Kummun Inkomst', script: 'income/kommun-income.js' },
      //{ name: 'Län Inkomst', script: 'income/lan-income.js' },
      { name: 'Inkomst Vs Vinnande Parti', script: 'income/income-parti.js' }
    ]
  }]);
