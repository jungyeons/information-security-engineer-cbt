const STORAGE_KEY = "information-security-engineer-cbt-state-v1";
const IMPORT_KEY = "information-security-engineer-cbt-imports-v1";

const els = {
  examSelect: document.querySelector("#examSelect"),
  subjectSelect: document.querySelector("#subjectSelect"),
  fileInput: document.querySelector("#fileInput"),
  importButton: document.querySelector("#importButton"),
  shuffleToggle: document.querySelector("#shuffleToggle"),
  bookmarkedToggle: document.querySelector("#bookmarkedToggle"),
  datasetLabel: document.querySelector("#datasetLabel"),
  examTitle: document.querySelector("#examTitle"),
  questionCount: document.querySelector("#questionCount"),
  answeredCount: document.querySelector("#answeredCount"),
  accuracyRate: document.querySelector("#accuracyRate"),
  lastResult: document.querySelector("#lastResult"),
  notice: document.querySelector("#notice"),
  questionMap: document.querySelector("#questionMap"),
  questionMeta: document.querySelector("#questionMeta"),
  questionText: document.querySelector("#questionText"),
  bookmarkButton: document.querySelector("#bookmarkButton"),
  choiceList: document.querySelector("#choiceList"),
  prevButton: document.querySelector("#prevButton"),
  nextButton: document.querySelector("#nextButton"),
  explainButton: document.querySelector("#explainButton"),
  explanationBox: document.querySelector("#explanationBox"),
  gradeButton: document.querySelector("#gradeButton"),
  resetButton: document.querySelector("#resetButton"),
  showAllButton: document.querySelector("#showAllButton"),
  resultDialog: document.querySelector("#resultDialog"),
  resultSummary: document.querySelector("#resultSummary"),
  subjectBreakdown: document.querySelector("#subjectBreakdown"),
  sourceCount: document.querySelector("#sourceCount"),
  sourceName: document.querySelector("#sourceName"),
  sourceHomeLink: document.querySelector("#sourceHomeLink"),
  sourceNote: document.querySelector("#sourceNote"),
  sourceList: document.querySelector("#sourceList"),
};

const state = {
  datasets: [],
  mode: "study",
  currentExamId: "",
  subject: "all",
  currentIndex: 0,
  visibleQuestions: [],
  answers: {},
  wrong: {},
  bookmarks: {},
  lastScores: {},
  sources: null,
};

init();

async function init() {
  hydrateState();
  const sample = await fetch("./data/questions.sample.json").then((res) => res.json());
  state.sources = await fetch("./data/source-links.comcbt.json").then((res) => res.json());
  state.datasets = [normalizeDataset(sample), ...readImports()];
  state.currentExamId ||= state.datasets[0]?.exams[0]?.id ?? "";
  bindEvents();
  renderDatasetOptions();
  renderSources();
  render();
}

function bindEvents() {
  els.examSelect.addEventListener("change", () => {
    state.currentExamId = els.examSelect.value;
    state.subject = "all";
    state.currentIndex = 0;
    persistState();
    render();
  });

  els.subjectSelect.addEventListener("change", () => {
    state.subject = els.subjectSelect.value;
    state.currentIndex = 0;
    persistState();
    render();
  });

  els.shuffleToggle.addEventListener("change", render);
  els.bookmarkedToggle.addEventListener("change", () => {
    state.currentIndex = 0;
    render();
  });

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      state.currentIndex = 0;
      persistState();
      render();
    });
  });

  els.prevButton.addEventListener("click", () => moveQuestion(-1));
  els.nextButton.addEventListener("click", () => moveQuestion(1));
  els.explainButton.addEventListener("click", () => {
    els.explanationBox.hidden = !els.explanationBox.hidden;
  });
  els.bookmarkButton.addEventListener("click", toggleBookmark);
  els.gradeButton.addEventListener("click", gradeCurrentExam);
  els.resetButton.addEventListener("click", resetCurrentExam);
  els.showAllButton.addEventListener("click", () => {
    state.subject = "all";
    els.bookmarkedToggle.checked = false;
    state.currentIndex = 0;
    render();
  });
  els.importButton.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", handleImport);
}

function hydrateState() {
  const saved = safeJson(localStorage.getItem(STORAGE_KEY), {});
  Object.assign(state, {
    mode: saved.mode ?? state.mode,
    currentExamId: saved.currentExamId ?? "",
    subject: saved.subject ?? "all",
    answers: saved.answers ?? {},
    wrong: saved.wrong ?? {},
    bookmarks: saved.bookmarks ?? {},
    lastScores: saved.lastScores ?? {},
  });
}

function persistState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      mode: state.mode,
      currentExamId: state.currentExamId,
      subject: state.subject,
      answers: state.answers,
      wrong: state.wrong,
      bookmarks: state.bookmarks,
      lastScores: state.lastScores,
    }),
  );
}

function readImports() {
  return safeJson(localStorage.getItem(IMPORT_KEY), []).map(normalizeDataset);
}

function saveImport(dataset) {
  const imports = readImports().filter((item) => item.id !== dataset.id);
  imports.unshift(dataset);
  localStorage.setItem(IMPORT_KEY, JSON.stringify(imports));
}

function renderDatasetOptions() {
  const options = state.datasets.flatMap((dataset) =>
    dataset.exams.map((exam) => ({ dataset, exam })),
  );
  els.examSelect.innerHTML = options
    .map(({ dataset, exam }) => {
      const label = `${exam.name} · ${dataset.meta.title}`;
      return `<option value="${escapeHtml(exam.id)}">${escapeHtml(label)}</option>`;
    })
    .join("");
  els.examSelect.value = state.currentExamId;
}

function render() {
  const exam = getCurrentExam();
  if (!exam) {
    renderEmpty("불러온 회차가 없습니다.");
    return;
  }

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.mode);
  });

  renderSubjects(exam);
  state.visibleQuestions = filterQuestions(exam);
  if (state.currentIndex >= state.visibleQuestions.length) state.currentIndex = 0;

  const dataset = getCurrentDataset();
  els.datasetLabel.textContent = dataset?.meta.title ?? "데이터셋";
  els.examTitle.textContent = exam.name;
  renderNotice(dataset, exam);
  renderStats(exam);
  renderMap();
  renderQuestion();
  persistState();
}

function renderSubjects(exam) {
  const subjects = ["all", ...new Set(exam.questions.map((question) => question.subject))];
  els.subjectSelect.innerHTML = subjects
    .map((subject) => {
      const label = subject === "all" ? "전체 과목" : subject;
      return `<option value="${escapeHtml(subject)}">${escapeHtml(label)}</option>`;
    })
    .join("");
  if (!subjects.includes(state.subject)) state.subject = "all";
  els.subjectSelect.value = state.subject;
}

function renderNotice(dataset, exam) {
  const messages = [];
  if (!exam.isRealPastExam) {
    messages.push("현재 회차는 실제 기출 원문이 아니라 사이트 동작 확인용 샘플/연습 데이터입니다.");
  }
  if (dataset?.meta.licenseNote) messages.push(dataset.meta.licenseNote);
  els.notice.hidden = messages.length === 0;
  els.notice.textContent = messages.join(" ");
}

function renderStats(exam) {
  const examAnswers = state.answers[exam.id] ?? {};
  const answered = exam.questions.filter((question) => examAnswers[question.id]).length;
  const correct = exam.questions.filter((question) => examAnswers[question.id] === question.answer).length;
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  const lastScore = state.lastScores[exam.id];

  els.questionCount.textContent = state.visibleQuestions.length.toString();
  els.answeredCount.textContent = `${answered}/${exam.questions.length}`;
  els.accuracyRate.textContent = `${accuracy}%`;
  els.lastResult.textContent = lastScore ? `${lastScore.total}점 ${lastScore.passed ? "합격" : "불합격"}` : "-";
}

function renderMap() {
  els.questionMap.innerHTML = state.visibleQuestions
    .map((question, index) => {
      const answer = getAnswer(question);
      const wrong = state.wrong[question.examId]?.[question.id];
      const classes = [
        "map-button",
        index === state.currentIndex ? "is-current" : "",
        answer ? "is-answered" : "",
        wrong ? "is-wrong" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<button class="${classes}" data-index="${index}">${index + 1}</button>`;
    })
    .join("");

  els.questionMap.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentIndex = Number(button.dataset.index);
      renderQuestion();
      renderMap();
    });
  });
}

function renderQuestion() {
  const question = state.visibleQuestions[state.currentIndex];
  if (!question) {
    renderEmpty("조건에 맞는 문제가 없습니다.");
    return;
  }

  const answer = getAnswer(question);
  const showResult = state.mode !== "exam" && Boolean(answer);
  els.questionMeta.textContent = `${question.subject} · ${state.currentIndex + 1}/${state.visibleQuestions.length}`;
  els.questionText.textContent = question.text;
  els.bookmarkButton.textContent = isBookmarked(question) ? "★" : "☆";
  els.choiceList.innerHTML = question.choices
    .map((choice, index) => {
      const number = index + 1;
      const selected = answer === number;
      const correct = showResult && question.answer === number;
      const incorrect = showResult && selected && question.answer !== number;
      const classes = [
        "choice-button",
        selected ? "is-selected" : "",
        correct ? "is-correct" : "",
        incorrect ? "is-incorrect" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `
        <button class="${classes}" data-choice="${number}">
          <span class="choice-index">${number}</span>
          <span>${escapeHtml(choice)}</span>
        </button>
      `;
    })
    .join("");

  els.choiceList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => selectChoice(question, Number(button.dataset.choice)));
  });

  els.explanationBox.hidden = true;
  els.explanationBox.textContent = question.explanation || "등록된 해설이 없습니다.";
  els.prevButton.disabled = state.currentIndex === 0;
  els.nextButton.disabled = state.currentIndex >= state.visibleQuestions.length - 1;
}

function renderEmpty(message) {
  els.questionMeta.textContent = "문항";
  els.questionText.textContent = message;
  els.choiceList.innerHTML = "";
  els.explanationBox.hidden = true;
}

function renderSources() {
  if (!state.sources) return;
  els.sourceCount.textContent = `${state.sources.exams.length}회차`;
  els.sourceName.textContent = state.sources.source.name;
  els.sourceHomeLink.href = state.sources.source.url;
  els.sourceNote.textContent = state.sources.source.note;
  els.sourceList.innerHTML = state.sources.exams
    .map((exam) => {
      const files = exam.files
        .map((file) => `<span class="file-chip">${escapeHtml(file.replace("정보보안기사", ""))}</span>`)
        .join("");
      return `
        <article class="source-card">
          <div class="source-meta">
            <span>${exam.date}</span>
            <span>${exam.round}회</span>
          </div>
          <h3>${escapeHtml(exam.title)}</h3>
          <div class="file-chips">${files}</div>
          <a href="${escapeHtml(exam.articleUrl)}" target="_blank" rel="noreferrer">원본 페이지 열기</a>
        </article>
      `;
    })
    .join("");
}

function filterQuestions(exam) {
  let questions = exam.questions.map((question) => ({ ...question, examId: exam.id }));
  if (state.subject !== "all") {
    questions = questions.filter((question) => question.subject === state.subject);
  }
  if (state.mode === "wrong") {
    questions = questions.filter((question) => state.wrong[exam.id]?.[question.id]);
  }
  if (els.bookmarkedToggle.checked) {
    questions = questions.filter(isBookmarked);
  }
  if (els.shuffleToggle.checked) {
    questions = stableShuffle(questions, `${exam.id}:${state.subject}:${state.mode}`);
  }
  return questions;
}

function selectChoice(question, choice) {
  state.answers[question.examId] ||= {};
  state.answers[question.examId][question.id] = choice;

  if (choice === question.answer) {
    delete state.wrong[question.examId]?.[question.id];
  } else {
    state.wrong[question.examId] ||= {};
    state.wrong[question.examId][question.id] = true;
  }

  persistState();
  renderStats(getCurrentExam());
  renderQuestion();
  renderMap();
}

function moveQuestion(delta) {
  const next = state.currentIndex + delta;
  if (next < 0 || next >= state.visibleQuestions.length) return;
  state.currentIndex = next;
  renderQuestion();
  renderMap();
}

function toggleBookmark() {
  const question = state.visibleQuestions[state.currentIndex];
  if (!question) return;
  state.bookmarks[question.examId] ||= {};
  if (isBookmarked(question)) {
    delete state.bookmarks[question.examId][question.id];
  } else {
    state.bookmarks[question.examId][question.id] = true;
  }
  persistState();
  renderQuestion();
}

function gradeCurrentExam() {
  const exam = getCurrentExam();
  const answers = state.answers[exam.id] ?? {};
  const subjects = [...new Set(exam.questions.map((question) => question.subject))];
  const rows = subjects.map((subject) => {
    const questions = exam.questions.filter((question) => question.subject === subject);
    const correct = questions.filter((question) => answers[question.id] === question.answer).length;
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    return { subject, correct, total: questions.length, score };
  });

  const correctTotal = rows.reduce((sum, row) => sum + row.correct, 0);
  const scoreTotal = exam.questions.length ? Math.round((correctTotal / exam.questions.length) * 100) : 0;
  const passed = scoreTotal >= 60 && rows.every((row) => row.score >= 40);
  state.lastScores[exam.id] = { total: scoreTotal, passed, at: new Date().toISOString() };
  persistState();

  els.resultSummary.innerHTML = `
    <strong>${scoreTotal}점 · ${passed ? "합격 기준 충족" : "합격 기준 미달"}</strong>
    <span>전체 ${exam.questions.length}문항 중 ${correctTotal}문항 정답</span>
    <span>기준: 평균 60점 이상, 과목별 40점 이상</span>
  `;
  els.subjectBreakdown.innerHTML = rows
    .map(
      (row) => `
        <div class="breakdown-row">
          <strong>${escapeHtml(row.subject)}</strong>
          <span>${row.correct}/${row.total}</span>
          <span>${row.score}점</span>
        </div>
      `,
    )
    .join("");
  els.resultDialog.showModal();
  renderStats(exam);
  renderMap();
}

function resetCurrentExam() {
  const exam = getCurrentExam();
  if (!confirm(`${exam.name} 풀이 기록을 초기화할까요?`)) return;
  delete state.answers[exam.id];
  delete state.wrong[exam.id];
  delete state.lastScores[exam.id];
  persistState();
  render();
}

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  const dataset = file.name.endsWith(".csv") ? csvToDataset(text, file.name) : JSON.parse(text);
  const normalized = normalizeDataset(dataset);
  saveImport(normalized);
  state.datasets = [state.datasets[0], ...readImports()];
  state.currentExamId = normalized.exams[0]?.id ?? state.currentExamId;
  renderDatasetOptions();
  render();
  event.target.value = "";
}

function csvToDataset(csvText, filename) {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines.shift()).map((item) => item.trim());
  const rows = lines.map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
  const examId = slugify(filename.replace(/\.[^.]+$/, ""));
  return {
    id: `import-${examId}`,
    meta: {
      title: filename,
      licenseNote: "사용자가 가져온 데이터입니다. 원문 사용 권한은 업로드한 사람이 확인해야 합니다.",
    },
    exams: [
      {
        id: `import-${examId}`,
        year: rows[0]?.year ?? "",
        round: rows[0]?.round ?? "",
        name: rows[0]?.examName || filename,
        isRealPastExam: rows[0]?.isRealPastExam === "true",
        questions: rows.map((row, index) => ({
          id: row.id || `q-${index + 1}`,
          subject: row.subject || "기타",
          text: row.text,
          choices: [row.choice1, row.choice2, row.choice3, row.choice4].filter(Boolean),
          answer: Number(row.answer),
          explanation: row.explanation || "",
          tags: row.tags ? row.tags.split("|") : [],
        })),
      },
    ],
  };
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function getCurrentDataset() {
  return state.datasets.find((dataset) => dataset.exams.some((exam) => exam.id === state.currentExamId));
}

function getCurrentExam() {
  return getCurrentDataset()?.exams.find((exam) => exam.id === state.currentExamId);
}

function getAnswer(question) {
  return state.answers[question.examId]?.[question.id];
}

function isBookmarked(question) {
  return Boolean(state.bookmarks[question.examId]?.[question.id]);
}

function normalizeDataset(dataset) {
  const id = dataset.id || slugify(dataset.meta?.title || "dataset");
  return {
    id,
    meta: {
      title: dataset.meta?.title || "사용자 데이터",
      version: dataset.meta?.version || "1.0.0",
      licenseNote: dataset.meta?.licenseNote || "",
    },
    exams: (dataset.exams || []).map((exam, examIndex) => ({
      id: exam.id || `${id}-${exam.year || "exam"}-${exam.round || examIndex + 1}`,
      year: exam.year || "",
      round: exam.round || "",
      name: exam.name || `${exam.year || ""} ${exam.round || examIndex + 1}회`,
      isRealPastExam: Boolean(exam.isRealPastExam),
      questions: (exam.questions || []).map((question, questionIndex) => ({
        id: question.id || `q-${questionIndex + 1}`,
        subject: question.subject || "기타",
        text: question.text || "",
        choices: question.choices || [],
        answer: Number(question.answer),
        explanation: question.explanation || "",
        tags: question.tags || [],
      })),
    })),
  };
}

function stableShuffle(items, seed) {
  const copy = [...items];
  let value = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  for (let i = copy.length - 1; i > 0; i -= 1) {
    value = (value * 9301 + 49297) % 233280;
    const j = Math.floor((value / 233280) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "");
}

function safeJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
