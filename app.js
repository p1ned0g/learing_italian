
const categoryFilter = document.getElementById("categoryFilter");
const toggleAnswersButton = document.getElementById("toggleAnswers");
const questionTableBody = document.getElementById("questionTableBody");
const questionCount = document.getElementById("questionCount");
const completionCount = document.getElementById("completionCount");

let questions = [];
let answersVisible = false;

const completedQuestions = new Set();

let activePopup = null;
let activePopupTrigger = null;

// -----------------------------
// 初期化
// -----------------------------

async function init() {
  try {
    const response = await fetch("./questions.json");

    if (!response.ok) {
      throw new Error(`questions.json の読み込みに失敗しました: ${response.status}`);
    }

    const data = await response.json();

    questions = Array.isArray(data.questions) ? data.questions : [];

    createCategoryOptions();
    renderQuestions();
  } catch (error) {
    console.error(error);

    questionTableBody.innerHTML = `
      <tr>
        <td colspan="5">
          問題データを読み込めませんでした。
          questions.json の配置を確認してください。
        </td>
      </tr>
    `;
  }
}

// -----------------------------
// カテゴリ選択肢
// -----------------------------

function createCategoryOptions() {
  const categories = [
    ...new Set(questions.map(question => question.category))
  ];

  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  }
}

// -----------------------------
// 問題一覧の描画
// -----------------------------

function renderQuestions() {
  closePopup();

  const selectedCategory = categoryFilter.value;

  const filteredQuestions = questions.filter(question => {
    return selectedCategory === "all" ||
      question.category === selectedCategory;
  });

  questionTableBody.replaceChildren();

  for (const question of filteredQuestions) {
    const row = createQuestionRow(question);
    questionTableBody.appendChild(row);
  }

  questionCount.textContent = `表示：${filteredQuestions.length}問`;
  updateCompletionCount(filteredQuestions);
}

function createQuestionRow(question) {
  const row = document.createElement("tr");

  // No.
  const idCell = document.createElement("td");
  idCell.textContent = question.id;
  row.appendChild(idCell);

  // 日本語
  const questionCell = document.createElement("td");
  questionCell.textContent = question.question;
  row.appendChild(questionCell);

  // イタリア語 + 解説
  const italianCell = document.createElement("td");
  italianCell.className = "italian-cell";

  if (answersVisible) {
    const answerButton = document.createElement("button");
    answerButton.type = "button";
    answerButton.className = "italian-answer";
    answerButton.textContent = question.answer;
    answerButton.setAttribute(
      "aria-label",
      `問題 ${question.id} の解説を表示`
    );

    answerButton.addEventListener("mouseenter", () => {
      openPopup(question, answerButton);
    });

    answerButton.addEventListener("mouseleave", () => {
      // ポップアップ上に移動する猶予を持たせる
      schedulePopupClose();
    });

    answerButton.addEventListener("focus", () => {
      openPopup(question, answerButton);
    });

    answerButton.addEventListener("blur", () => {
      schedulePopupClose();
    });

    answerButton.addEventListener("click", event => {
      event.stopPropagation();

      if (activePopupTrigger === answerButton && isPopupVisible()) {
        closePopup();
      } else {
        openPopup(question, answerButton);
      }
    });

    italianCell.appendChild(answerButton);
  } else {
    const placeholder = document.createElement("span");
    placeholder.className = "answer-placeholder";
    placeholder.textContent = "解答を非表示";
    italianCell.appendChild(placeholder);
  }

  row.appendChild(italianCell);

  // 音声
  const audioCell = document.createElement("td");
  const audioButton = document.createElement("button");
  audioButton.type = "button";
  audioButton.className = "audio-button";
  audioButton.textContent = "🔊";
  audioButton.title = "イタリア語を読み上げる";
  audioButton.setAttribute("aria-label", "イタリア語を読み上げる");

  audioButton.addEventListener("click", () => {
    speakItalian(question.answer);
  });

  audioCell.appendChild(audioButton);
  row.appendChild(audioCell);

  // 完了チェック
  const doneCell = document.createElement("td");
  const checkbox = document.createElement("input");

  checkbox.type = "checkbox";
  checkbox.className = "done-checkbox";
  checkbox.checked = completedQuestions.has(question.id);
  checkbox.setAttribute("aria-label", `問題 ${question.id} を完了`);

  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      completedQuestions.add(question.id);
    } else {
      completedQuestions.delete(question.id);
    }

    updateCompletionCount(getFilteredQuestions());
  });

  doneCell.appendChild(checkbox);
  row.appendChild(doneCell);

  return row;
}

// -----------------------------
// フィルター・解答表示
// -----------------------------

categoryFilter.addEventListener("change", renderQuestions);

toggleAnswersButton.addEventListener("click", () => {
  answersVisible = !answersVisible;

  toggleAnswersButton.textContent = answersVisible
    ? "解答を隠す"
    : "解答を表示";

  renderQuestions();
});

function getFilteredQuestions() {
  const selectedCategory = categoryFilter.value;

  return questions.filter(question => {
    return selectedCategory === "all" ||
      question.category === selectedCategory;
  });
}

// -----------------------------
// 完了数
// -----------------------------

function updateCompletionCount(filteredQuestions) {
  const completedCount = filteredQuestions.filter(question => {
    return completedQuestions.has(question.id);
  }).length;

  completionCount.textContent =
    `完了：${completedCount} / ${filteredQuestions.length}問`;
}

// -----------------------------
// 音声読み上げ
// -----------------------------

function speakItalian(text) {
  if (!("speechSynthesis" in window)) {
    alert("このブラウザは音声読み上げに対応していません。");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  utterance.rate = 0.8;

  window.speechSynthesis.speak(utterance);
}

// -----------------------------
// 解説ポップアップ
// -----------------------------

const explanationPopup = document.createElement("div");
explanationPopup.className = "explanation-popup";
explanationPopup.setAttribute("role", "dialog");
explanationPopup.setAttribute("aria-label", "イタリア語の解説");
explanationPopup.setAttribute("aria-live", "polite");

document.body.appendChild(explanationPopup);

let closePopupTimeout = null;

function openPopup(question, trigger) {
  if (!answersVisible) {
    return;
  }

  clearTimeout(closePopupTimeout);

  activePopup = question;
  activePopupTrigger = trigger;

  renderExplanation(question);

  explanationPopup.classList.add("visible");
  positionPopup(trigger);
}

function renderExplanation(question) {
  explanationPopup.replaceChildren();

  // ヘッダー
  const header = document.createElement("div");
  header.className = "popup-header";

  const title = document.createElement("h2");
  title.className = "popup-title";
  title.textContent = question.answer;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "popup-close";
  closeButton.textContent = "閉じる";
  closeButton.addEventListener("click", closePopup);

  header.append(title, closeButton);
  explanationPopup.appendChild(header);

  const explanation = question.explanation || {};

  // 文法
  const grammarSection = createSection("文法");

  const grammarItems = Array.isArray(explanation.grammar)
    ? explanation.grammar
    : [];

  if (grammarItems.length === 0) {
    grammarSection.appendChild(
      createEmptyMessage("文法の解説はありません。")
    );
  } else {
    for (const item of grammarItems) {
      const itemContainer = document.createElement("div");
      itemContainer.className = "grammar-item";

      const grammarTitle = document.createElement("p");
      grammarTitle.className = "grammar-title";
      grammarTitle.textContent = item.title || "文法項目";

      const description = document.createElement("p");
      description.textContent = item.description || "";

      itemContainer.append(grammarTitle, description);
      grammarSection.appendChild(itemContainer);
    }
  }

  explanationPopup.appendChild(grammarSection);

  // 単語
  const wordsSection = createSection("単語");

  const words = Array.isArray(explanation.words)
    ? explanation.words
    : [];

  if (words.length === 0) {
    wordsSection.appendChild(
      createEmptyMessage("単語の解説はありません。")
    );
  } else {
    for (const word of words) {
      const wordContainer = document.createElement("div");
      wordContainer.className = "word-item";

      const heading = document.createElement("p");
      heading.className = "word-heading";
      heading.textContent = word.word || "";

      const base = document.createElement("p");
      base.className = "word-detail";
      base.textContent = `原形：${word.base || "—"}`;

      const meaning = document.createElement("p");
      meaning.className = "word-detail";
      meaning.textContent = `意味：${word.meaning || "—"}`;

      const partOfSpeech = document.createElement("p");
      partOfSpeech.className = "word-detail";
      partOfSpeech.textContent =
        `品詞：${word.partOfSpeech || "—"}`;

      wordContainer.append(
        heading,
        base,
        meaning,
        partOfSpeech
      );

      wordsSection.appendChild(wordContainer);
    }
  }

  explanationPopup.appendChild(wordsSection);

  // 英語との対応
  const englishSection = createSection("英語との対応");

  const englishText = document.createElement("p");
  englishText.className = "english-text";

  if (typeof explanation.english === "string" &&
      explanation.english.trim() !== "") {
    englishText.textContent = explanation.english;
  } else {
    englishText.textContent = "英語との対応はありません。";
    englishText.classList.add("empty-explanation");
  }

  englishSection.appendChild(englishText);
  explanationPopup.appendChild(englishSection);
}

function createSection(titleText) {
  const section = document.createElement("section");
  section.className = "explanation-section";

  const title = document.createElement("h3");
  title.textContent = titleText;

  section.appendChild(title);
  return section;
}

function createEmptyMessage(message) {
  const paragraph = document.createElement("p");
  paragraph.className = "empty-explanation";
  paragraph.textContent = message;
  return paragraph;
}

// -----------------------------
// ポップアップの位置・閉じる処理
// -----------------------------

function positionPopup(trigger) {
  const rect = trigger.getBoundingClientRect();
  const margin = 12;

  // いったん表示してサイズを取得
  const popupRect = explanationPopup.getBoundingClientRect();

  let left = rect.left;
  let top = rect.bottom + 8;

  // 右端からはみ出す場合
  if (left + popupRect.width > window.innerWidth - margin) {
    left = window.innerWidth - popupRect.width - margin;
  }

  // 左端からはみ出す場合
  left = Math.max(margin, left);

  // 下にはみ出す場合は上側に表示
  if (top + popupRect.height > window.innerHeight - margin) {
    top = rect.top - popupRect.height - 8;
  }

  // 上にも収まらない場合
  top = Math.max(
    margin,
    Math.min(top, window.innerHeight - popupRect.height - margin)
  );

  explanationPopup.style.left = `${left}px`;
  explanationPopup.style.top = `${top}px`;
}

function isPopupVisible() {
  return explanationPopup.classList.contains("visible");
}

function schedulePopupClose() {
  clearTimeout(closePopupTimeout);

  closePopupTimeout = setTimeout(() => {
    closePopup();
  }, 250);
}

function closePopup() {
  clearTimeout(closePopupTimeout);

  explanationPopup.classList.remove("visible");
  activePopup = null;
  activePopupTrigger = null;
}

// ポップアップ内にマウスがある間は閉じない
explanationPopup.addEventListener("mouseenter", () => {
  clearTimeout(closePopupTimeout);
});

explanationPopup.addEventListener("mouseleave", () => {
  schedulePopupClose();
});

// ポップアップ内の操作で親へクリックが伝わらないようにする
explanationPopup.addEventListener("click", event => {
  event.stopPropagation();
});

// 外側をクリックしたら閉じる
document.addEventListener("click", event => {
  if (!explanationPopup.contains(event.target) &&
      event.target !== activePopupTrigger) {
    closePopup();
  }
});

// Escキーで閉じる
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closePopup();
  }
});

// スクロールや画面サイズ変更時に閉じる
// ウィンドウのスクロールでは閉じず、位置を再調整する
window.addEventListener("scroll", () => {
  if (activePopup && activePopupTrigger && isPopupVisible()) {
    positionPopup(activePopupTrigger);
  }
}, true);

window.addEventListener("resize", () => {
  if (activePopup && activePopupTrigger && isPopupVisible()) {
    positionPopup(activePopupTrigger);
  }
});

// -----------------------------
// 起動
// -----------------------------

init();
