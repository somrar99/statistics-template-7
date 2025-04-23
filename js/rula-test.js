// Data med medelålder + M-stöd 2022
const kommunData = [
  { kommun: "Uppsala", medelålder: 39.1, M: 23.1 },
  { kommun: "Lidingö", medelålder: 42.2, M: 39.2 },
  { kommun: "Sigtuna", medelålder: 38.3, M: 21.2 },
  { kommun: "Täby", medelålder: 41.3, M: 43.1 },
  { kommun: "Botkyrka", medelålder: 37.5, M: 17.2 },
];

// Dela i två grupper
const hog = kommunData.filter((k) => k.medelålder >= 40).map((k) => k.M);
const lag = kommunData.filter((k) => k.medelålder < 40).map((k) => k.M);

// Funktioner för statistik
function mean(arr) {
  return arr.reduce((sum, x) => sum + x, 0) / arr.length;
}

function stddev(arr) {
  const avg = mean(arr);
  const sqDiffs = arr.map((x) => Math.pow(x - avg, 2));
  return Math.sqrt(mean(sqDiffs));
}

// T-test (två grupper, oberoende, olika n)
function tTest(group1, group2) {
  const m1 = mean(group1),
    m2 = mean(group2);
  const s1 = stddev(group1),
    s2 = stddev(group2);
  const n1 = group1.length,
    n2 = group2.length;

  const se = Math.sqrt(s1 ** 2 / n1 + s2 ** 2 / n2);
  const t = (m1 - m2) / se;

  return { t: t.toFixed(3), mean1: m1.toFixed(1), mean2: m2.toFixed(1) };
}

// Resultat
const resultat = tTest(hog, lag);

addMdToPage(`
# T-test: Medelålder och stöd för Moderaterna

Vi har delat kommunerna i två grupper:

- **Hög medelålder (>= 40 år)**: ${hog.length} kommuner  
- **Låg medelålder (< 40 år)**: ${lag.length} kommuner  

Genomsnittligt stöd för M:

- Hög ålder: **${resultat.mean1}%**  
- Låg ålder: **${resultat.mean2}%**

**T-värde:** ${resultat.t}

> (Obs! Vi behöver större urval för att bedöma om skillnaden är statistiskt signifikant.)

`);
