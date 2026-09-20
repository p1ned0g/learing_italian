
const categorySelect = document.getElementById("category");
const toggleAnswersButton = document.getElementById("toggle-answers");
const questionList = document.getElementById("question-list");
const countElement = document.getElementById("count");
const completionElement = document.getElementById("completion");

let allQuestions = [];
let filteredQuestions = [];
let answersVisible = false;
const completedIds = new Set();

// JSONを読み込む
async function init() {
  try {
    const response = await fetch("./questions.json");

    if (!response.ok) {
      throw new Error("questions.json を読み込めませんでした");
    }

    const data = await response.json();
    allQuestions = data.questions;

    createCategoryOptions();
    applyFilter();
  } catch (error) {
    console.error(error);
    questionList.innerHTML = `
      <tr>
        <td colspan="5">
          問題を読み込めませんでした。
          Live Serverなどのローカルサーバーで開いてください。
        </td>
      </tr>
    `;
    countElement.textContent = "読み込みエラー";
  }
}

// カテゴリ選択肢を生成
function createCategoryOptions() {
  const categories = [
    ...new Set(allQuestions.map(q => q.category))
  ];

  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

// カテゴリで絞り込む
function applyFilter() {
  const selected = categorySelect.value;

  filteredQuestions = selected === "all"
    ? allQuestions
    : allQuestions.filter(q => q.category === selected);

  renderQuestions();
}

// 表を描画
function renderQuestions() {
  questionList.replaceChildren();

  filteredQuestions.forEach(question => {
    const row = document.createElement("tr");

    // 問題番号
    const numberCell = document.createElement("td");
    numberCell.className = "number";
    numberCell.textContent = question.id;

    // 日本語
    const japaneseCell = document.createElement("td");
    japaneseCell.textContent = question.question;

    // イタリア語の解答
    const answerCell = document.createElement("td");
    answerCell.className = "answer-cell";

    if (answersVisible) {
      answerCell.textContent = question.answer;
    } else {
      answerCell.textContent = "••••••••";
      answerCell.classList.add("answer-hidden");
    }

    // 音声ボタン
    const audioCell = document.createElement("td");
    audioCell.className = "audio-column";

    const audioButton = document.createElement("button");
    audioButton.className = "audio-button";
    audioButton.textContent = "🔊";
    audioButton.title = "イタリア語を聞く";
    audioButton.setAttribute("aria-label", "イタリア語を聞く");

    audioButton.addEventListener("click", () => {
      speakItalian(question.answer);
    });

    audioCell.appendChild(audioButton);

    // 完了チェック
    const checkCell = document.createElement("td");
    checkCell.className = "check-column";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "complete-checkbox";
    checkbox.checked = completedIds.has(question.id);
    checkbox.setAttribute("aria-label", `${question.id}番を完了`);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        completedIds.add(question.id);
      } else {
        completedIds.delete(question.id);
      }

      updateSummary();
    });

    checkCell.appendChild(checkbox);

    row.append(
      numberCell,
      japaneseCell,
      answerCell,
      audioCell,
      checkCell
    );

    questionList.appendChild(row);
  });

  toggleAnswersButton.textContent = answersVisible
    ? "解答を隠す"
    : "解答を表示";

  updateSummary();
}

// 進捗表示
function updateSummary() {
  countElement.textContent =
    `${filteredQuestions.length} 問`;

  completionElement.textContent =
    `完了 ${completedIds.size} 問`;
}

// 解答を一括表示・非表示
toggleAnswersButton.addEventListener("click", () => {
  answersVisible = !answersVisible;
  renderQuestions();
});

// カテゴリ変更
categorySelect.addEventListener("change", applyFilter);

// イタリア語を音声で読み上げる
function speakItalian(text) {
  if (!("speechSynthesis" in window)) {
    alert("このブラウザは音声読み上げに対応していません。");
    return;
  }

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  utterance.rate = 0.8;
  utterance.pitch = 1;

  const voices = speechSynthesis.getVoices();

  const italianVoice =
    voices.find(v => v.lang.toLowerCase() === "it-it") ||
    voices.find(v => v.lang.toLowerCase().startsWith("it-"));

  if (italianVoice) {
    utterance.voice = italianVoice;
  }

  speechSynthesis.speak(utterance);
}

// 音声一覧が後から読み込まれる環境に対応
if ("speechSynthesis" in window) {
  speechSynthesis.addEventListener("voiceschanged", () => {
    speechSynthesis.getVoices();
  });
}

init();
