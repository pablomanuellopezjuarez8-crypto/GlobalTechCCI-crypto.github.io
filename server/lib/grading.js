import { CRITERIA, SKILL_KEYS, rubricMean, rubricTotal, levelForScore } from './rubric.js';

export const LEVEL_LABEL = {
  literal: 'Comprensión literal',
  inferencial: 'Comprensión inferencial',
  critica: 'Lectura crítica',
};

const EVIDENCE_MARKERS = [
  'porque',
  'ya que',
  'según el texto',
  'el texto dice',
  'el texto',
  'el relato',
  'los datos',
  'el dato',
  'por ejemplo',
  'evidencia',
  'comprob',
];

const ARGUMENT_MARKERS = [
  'por lo tanto',
  'por eso',
  'entonces',
  'sin embargo',
  'además',
  'primero',
  'segundo',
  'finalmente',
  'concluyo',
  'en cambio',
  'debido a',
  'aunque',
  'por un lado',
  'por otro lado',
  'podría',
  'mejoraría',
  'riesgo',
  'pero',
];

const ALTERNATIVE_MARKERS = [
  'podríamos',
  'se podría',
  'propongo',
  'alternativa',
  'opción',
  'en lugar de',
  'otra idea',
  'también se puede',
];

export const REINFORCE = {
  comprension:
    'Leer un texto breve y anotar la idea principal y dos datos concretos antes de responder.',
  analisis:
    'Clasificar diez frases del día en hechos y opiniones, y explicar por qué cada una pertenece a un grupo.',
  evidencias:
    'Responder una pregunta usando la fórmula «mi respuesta es… porque en el texto dice…».',
  argumentacion:
    'Escribir una opinión con dos razones y una objeción posible, usando conectores como «sin embargo» o «por lo tanto».',
  soluciones:
    'Frente a un problema cotidiano, proponer tres alternativas y anotar un riesgo de cada una.',
};

export function assessText(raw) {
  const text = String(raw ?? '').trim();
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const segments = text
    .split(/\n|;|•|(?:^|\s)\d+[.)]\s|(?:^|\s)-\s/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length >= 3);

  const countMarkers = (list) =>
    list.reduce((total, marker) => total + (lower.split(marker).length - 1), 0);

  const evidenceHits = countMarkers(EVIDENCE_MARKERS) + (/\d/.test(text) ? 1 : 0);
  const argumentHits = countMarkers(ARGUMENT_MARKERS);
  const alternativeHits = Math.max(countMarkers(ALTERNATIVE_MARKERS), segments.length);

  return {
    text,
    words: words.length,
    substantive: words.length >= 8,
    evidenceHits,
    argumentHits,
    alternativeHits,
    hasNumbers: /\d/.test(text),
  };
}

function ratioLevel(ratio) {
  if (ratio >= 0.85) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.3) return 2;
  return 1;
}

function hitsLevel(hits) {
  if (hits <= 0) return 1;
  if (hits === 1) return 2;
  if (hits <= 3) return 3;
  return 4;
}

function maxOf(values) {
  return values.length ? Math.max(...values) : 0;
}

function describe(rubric) {
  const ranked = [...CRITERIA].sort((a, b) => rubric[b.key] - rubric[a.key]);
  const top = ranked[0];
  const low = ranked[ranked.length - 1];
  const weakest = ranked.filter((c) => rubric[c.key] <= 2).slice(0, 2);
  const improvementsList = (weakest.length ? weakest : [low]).map((c) => `${c.label}: ${c.improve}`);
  return {
    strengths: `${top.strong} (${top.label}, nivel ${rubric[top.key]} de 4).`,
    improvements: improvementsList.join(' '),
    recommendations: (weakest.length ? weakest : [low]).map((c) => REINFORCE[c.key]),
  };
}

function openFeedbackEntry({ id, label, prompt, answer, assess }) {
  return {
    id,
    label,
    prompt,
    type: 'open',
    answerText: assess.text,
    wordCount: assess.words,
    guidance: answer.guidance,
    note: assess.substantive
      ? 'Tu respuesta está desarrollada. Compara tus ideas con la respuesta orientativa.'
      : 'Tu respuesta es muy breve. Intenta escribir al menos dos oraciones y explicar por qué.',
  };
}

function finish({ objectiveScore, rubric, feedback }) {
  const suggestedScore = Math.round(0.4 * objectiveScore + 0.6 * rubricTotal(rubric));
  return {
    objectiveScore: Math.round(objectiveScore),
    suggestedRubric: rubric,
    suggestedScore,
    level: levelForScore(suggestedScore),
    feedback,
    ...describe(rubric),
  };
}

export function gradeReading(reading, questions, answers) {
  const feedback = [];
  const mc = { literal: { total: 0, correct: 0 }, inferencial: { total: 0, correct: 0 }, critica: { total: 0, correct: 0 } };
  const openByLevel = { literal: [], inferencial: [], critica: [] };
  let mcTotal = 0;
  let mcCorrect = 0;

  questions.forEach((q, index) => {
    const label = `Pregunta ${index + 1} · ${LEVEL_LABEL[q.level] || 'Comprensión'}`;
    if (q.type === 'multiple') {
      const given = answers[String(q.id)];
      const givenIndex = given === undefined || given === null || given === '' ? null : Number(given);
      const correct = givenIndex === q.correct_index;
      mc[q.level].total += 1;
      mcTotal += 1;
      if (correct) {
        mc[q.level].correct += 1;
        mcCorrect += 1;
      }
      feedback.push({
        id: q.id,
        label,
        prompt: q.prompt,
        type: 'multiple',
        correct,
        selectedText: givenIndex === null ? null : q.options[givenIndex] ?? null,
        answerText: q.options[q.correct_index],
        guidance: q.guidance,
      });
    } else {
      const assess = assessText(answers[String(q.id)]);
      openByLevel[q.level].push(assess);
      feedback.push(openFeedbackEntry({ id: q.id, label, prompt: q.prompt, answer: q, assess }));
    }
  });

  const realLife = assessText(answers.real_life);
  feedback.push(
    openFeedbackEntry({
      id: 'real_life',
      label: 'Conexión con la vida cotidiana',
      prompt: reading.real_life_prompt,
      answer: {
        guidance:
          'Se valora que relacione la lectura con una situación de su vida diaria y que proponga acciones concretas y observables.',
      },
      assess: realLife,
    }),
  );

  const rubric = {};
  rubric.comprension = Math.max(
    mc.literal.total ? ratioLevel(mc.literal.correct / mc.literal.total) : 1,
    Math.min(4, openByLevel.literal.filter((o) => o.substantive).length + 1),
  );
  rubric.analisis = Math.max(
    mc.inferencial.total ? ratioLevel(mc.inferencial.correct / mc.inferencial.total) : 1,
    Math.min(4, openByLevel.inferencial.filter((o) => o.substantive).length + 1),
  );
  const allOpen = [...openByLevel.literal, ...openByLevel.inferencial, ...openByLevel.critica, realLife];
  rubric.evidencias = hitsLevel(maxOf(allOpen.map((o) => o.evidenceHits)));
  const critical = [...openByLevel.critica];
  rubric.argumentacion = hitsLevel(maxOf(critical.map((o) => o.argumentHits)));
  if (critical.length && maxOf(critical.map((o) => o.words)) < 10) {
    rubric.argumentacion = Math.min(rubric.argumentacion, 2);
  }
  rubric.soluciones = hitsLevel(realLife.alternativeHits);

  const objectiveScore = mcTotal ? (mcCorrect / mcTotal) * 100 : 0;
  return finish({ objectiveScore, rubric, feedback });
}

export function gradeProblem(problem, answers) {
  const feedback = [];
  const identifyGiven =
    answers.identify === undefined || answers.identify === null || answers.identify === ''
      ? null
      : Number(answers.identify);
  // Los retos guardados usan correctIndex; las preguntas de lectura usan correct_index.
  const identifyIndex = problem.identify.correct_index ?? problem.identify.correctIndex;
  const identifyCorrect = identifyGiven === identifyIndex;

  feedback.push({
    id: 'identify',
    label: 'Paso 1 · Identificar el problema',
    prompt: problem.identify.prompt,
    type: 'multiple',
    correct: identifyCorrect,
    selectedText:
      identifyGiven === null ? null : problem.identify.options[identifyGiven] ?? null,
    answerText: problem.identify.options[identifyIndex],
    guidance: problem.identify.guidance,
  });

  const factAnswers = answers.facts && typeof answers.facts === 'object' ? answers.facts : {};
  let factsCorrect = 0;
  problem.fact_opinions.forEach((item, index) => {
    const given = factAnswers[String(index)] || null;
    const isFact = item.is_fact ?? item.isFact;
    const expected = isFact ? 'hecho' : 'opinion';
    const correct = given === expected;
    if (correct) factsCorrect += 1;
    feedback.push({
      id: `fact-${index}`,
      label: `Paso 2 · Hechos y opiniones (${index + 1})`,
      prompt: item.text,
      type: 'classify',
      correct,
      selectedText: given === 'hecho' ? 'Hecho' : given === 'opinion' ? 'Opinión' : null,
      answerText: isFact ? 'Hecho' : 'Opinión',
      guidance: item.explanation,
    });
  });

  const stepAssess = {};
  problem.open_steps.forEach((step) => {
    const assess = assessText(answers[step.key]);
    stepAssess[step.key] = assess;
    feedback.push(
      openFeedbackEntry({
        id: step.key,
        label: `Paso · ${step.label}`,
        prompt: step.prompt,
        answer: { guidance: step.guidance },
        assess,
      }),
    );
  });

  const factsRatio = problem.fact_opinions.length
    ? factsCorrect / problem.fact_opinions.length
    : 1;
  const identifyStep = problem.open_steps.find((s) => s.key === 'alternativas');
  const justifyStep = problem.open_steps.find((s) => s.key === 'justificacion');
  const reflectStep = problem.open_steps.find((s) => s.key === 'reflexion');

  const rubric = {};
  rubric.comprension = identifyCorrect ? (factsRatio >= 0.75 ? 4 : 3) : factsRatio >= 0.5 ? 2 : 1;
  rubric.analisis = Math.max(identifyCorrect ? 3 : 1, ratioLevel(factsRatio));
  rubric.evidencias = hitsLevel(justifyStep ? stepAssess[justifyStep.key].evidenceHits : 0);
  rubric.argumentacion = hitsLevel(reflectStep ? stepAssess[reflectStep.key].argumentHits : 0);
  if (reflectStep && stepAssess[reflectStep.key].words < 8) {
    rubric.argumentacion = Math.min(rubric.argumentacion, 2);
  }
  rubric.soluciones = hitsLevel(identifyStep ? stepAssess[identifyStep.key].alternativeHits : 0);

  const objectiveTotal = 1 + problem.fact_opinions.length;
  const objectiveScore = ((identifyCorrect ? 1 : 0) + factsCorrect) / objectiveTotal * 100;
  return finish({ objectiveScore, rubric, feedback });
}

export function gradeWork({ kind, reading, questions, problem }, answers) {
  if (kind === 'reading') return gradeReading(reading, questions, answers);
  return gradeProblem(problem, answers);
}

export function confirmedScore(objectiveScore, rubric) {
  return Math.round(0.4 * (Number(objectiveScore) || 0) + 0.6 * rubricTotal(rubric));
}

export { SKILL_KEYS, rubricMean, rubricTotal, levelForScore };
