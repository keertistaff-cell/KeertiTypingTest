const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxh1vxscGAfuQ32aWryle0aR1T2U3PGpoPPSkLjliWp6Qw_WFGTbb-ImYg5wB7EYF1b/exec";

// 🔗 Replace this URL with your deployed Apps Script Web App URL
// const APPS_SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

// 📚 Categorized Passages Tiered by Difficulty Level
const passageBank = {
  Easy: [
    "The quick brown fox jumps over the lazy dog while searching for shade under the old oak tree.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts in the end.",
    "In the middle of difficulty lies opportunity, waiting for those who are brave enough to seek it.",
    "Technology is best when it brings people together and allows them to communicate seamlessly across distances.",
    "A journey of a thousand miles begins with a single step into the unknown path ahead.",
    "Simplicity is the soul of efficiency, making complex problems easier to solve with minimal effort.",
    "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.",
    "Happiness is not something ready made. It comes from your own actions and how you perceive life."
  ],
  Medium: [
    "Consistency and perseverance are fundamental qualities that unlock human potential, turning short-term focus into permanent lifelong success. Every obstacle encountered along the way serves as a valuable lesson, sharpening our perspective and deepening our understanding of complex systems.",
    "Digital transformations in modern enterprise management demand swift adaptability, continuous learning, and robust communication strategies. Teams that prioritize collaborative problem-solving often outperform competitors by delivering innovative solutions within tight schedules.",
    "Patience, persistence, and dedicated effort make an unbeatable combination for achieving long-term personal goals. When faced with unprecedented challenges, maintaining a clear mindset allows professionals to analyze risks efficiently and make decisive adjustments.",
    "Quality work requires meticulous attention to detail even when immediate recognition is absent. Small daily improvements compounded over time produce extraordinary results that set industry standards and inspire confidence across multi-disciplinary teams."
  ],
  Hard: [
    "Cybersecurity protocols in 2026 require multi-factor authentication (MFA), end-to-end encryption (E2EE), and automated threat detection algorithms like RSA-4096 & SHA-256. Failure to implement strict zero-trust network access (ZTNA) policies exposes corporate databases to unauthorized SQL injections, ransomware payloads, and severe data breaches resulting in massive financial liabilities ($10M+).",
    "According to financial analysts, quarterly EBITDA margins fluctuated by 14.75% across global IT sectors due to volatile foreign exchange rates (USD/EUR = 0.92, GBP/INR = 105.40). Portfolio managers must diversify risk via algorithmic trading strategies, high-yield municipal bonds, and hedge fund options to maintain sustainable ROI above 18.5% per annum.",
    "Modern full-stack web architectures utilize asynchronous JavaScript (async/await), GraphQL queries, and RESTful APIs connecting to distributed MongoDB clusters via WebSockets (wss://api.v2.domain.com:8080/live). Optimizing DOM rendering performance requires rigorous memory management, efficient garbage collection, and minimal layout reflows under high concurrent user loads.",
    "In advanced quantum computing frameworks, qubit coherence times depend heavily on superconducting circuit temperatures maintained below 15 millikelvin (-273.135°C). Error correction schemes such as surface codes utilize topological braiding techniques to mitigate decoherence noise, enabling fault-tolerant quantum algorithms for complex molecular simulations."
  ]
};

// Global State Variables
let allStudentsData = [];
let selectedBatch = "";
let selectedUser = "";
let selectedDifficulty = "Easy";
let testDuration = 120; // Default 2 minutes
let timeLeft = 120;
let timerInterval = null;
let isTestRunning = false;
let currentPassage = "";
let totalTypedChars = 0;
let correctTypedChars = 0;

// DOM Elements
const batchSelect = document.getElementById("batch-select");
const nameSelect = document.getElementById("name-select");
const levelSelect = document.getElementById("level-select");
const startBtn = document.getElementById("start-btn");
const loginStatus = document.getElementById("login-status");
const loginModal = document.getElementById("login-modal");
const contestContainer = document.getElementById("contest-container");
const userBadge = document.getElementById("user-badge");
const textDisplay = document.getElementById("text-display");
const typingInput = document.getElementById("typing-input");
const timerEl = document.getElementById("timer");
const wpmEl = document.getElementById("wpm");
const accuracyEl = document.getElementById("accuracy");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status-message");

// Load Student Data on Page Load
window.onload = fetchStudentData;

async function fetchStudentData() {
  loginStatus.style.color = "#2563eb";
  loginStatus.innerText = "⏳ Fetching student list...";

  try {
    const res = await fetch(APPS_SCRIPT_URL);
    const data = await res.json();

    if (data.status === "success") {
      allStudentsData = data.students;
      populateBatchDropdown();
      loginStatus.innerText = "";
    } else {
      loginStatus.style.color = "#dc2626";
      loginStatus.innerText = "❌ Failed to load student records.";
    }
  } catch (err) {
    console.error(err);
    loginStatus.style.color = "#dc2626";
    loginStatus.innerText = "❌ Connection error with Google Apps Script API.";
  }
}

function populateBatchDropdown() {
  const batches = [...new Set(allStudentsData.map(s => s.batch))];
  batchSelect.innerHTML = '<option value="">-- Choose Batch --</option>';

  batches.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    batchSelect.appendChild(opt);
  });
}

function onBatchChange() {
  selectedBatch = batchSelect.value;
  nameSelect.innerHTML = '<option value="">-- Choose Student Name --</option>';

  if (!selectedBatch) {
    nameSelect.disabled = true;
    startBtn.disabled = true;
    return;
  }

  const filteredNames = allStudentsData.filter(s => s.batch === selectedBatch);
  filteredNames.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = s.name;
    nameSelect.appendChild(opt);
  });

  nameSelect.disabled = false;
  nameSelect.onchange = () => {
    selectedUser = nameSelect.value;
    startBtn.disabled = !selectedUser;
  };
}

function confirmLogin() {
  const selectedOption = levelSelect.options[levelSelect.selectedIndex];
  selectedDifficulty = selectedOption.value;
  testDuration = parseInt(selectedOption.getAttribute("data-time"));

  // Update Badge in Main UI Header
  userBadge.innerHTML = `
    <span>Participant: <strong>${selectedUser}</strong></span>
    <span>Batch: <strong>${selectedBatch}</strong></span>
    <span>Level: <strong>${selectedDifficulty}</strong></span>
  `;

  loginModal.style.display = "none";
  contestContainer.classList.remove("blurred");

  initTest();
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function initTest() {
  clearInterval(timerInterval);
  timeLeft = testDuration;
  isTestRunning = false;
  totalTypedChars = 0;
  correctTypedChars = 0;

  timerEl.innerText = formatTime(timeLeft);
  wpmEl.innerText = "0";
  accuracyEl.innerText = "100%";
  statusEl.innerText = "";
  submitBtn.disabled = true;

  typingInput.disabled = false;
  typingInput.value = "";

  // Dynamic passage selection based on user's chosen difficulty level
  const levelPassages = passageBank[selectedDifficulty] || passageBank["Easy"];
  const randomIndex = Math.floor(Math.random() * levelPassages.length);
  currentPassage = levelPassages[randomIndex];

  textDisplay.innerHTML = "";
  currentPassage.split("").forEach((char, index) => {
    const span = document.createElement("span");
    span.innerText = char;
    if (index === 0) span.classList.add("char-current");
    textDisplay.appendChild(span);
  });
}

// Typing Real-time Handler
typingInput.addEventListener("input", () => {
  const typedVal = typingInput.value;

  if (!isTestRunning && typedVal.length > 0) {
    startTimer();
  }

  const charSpans = textDisplay.querySelectorAll("span");
  let correctCount = 0;

  charSpans.forEach((span, idx) => {
    const typedChar = typedVal[idx];
    span.classList.remove("char-correct", "char-incorrect", "char-current");

    if (typedChar == null) {
      if (idx === typedVal.length) span.classList.add("char-current");
    } else if (typedChar === span.innerText) {
      span.classList.add("char-correct");
      correctCount++;
    } else {
      span.classList.add("char-incorrect");
    }
  });

  correctTypedChars = correctCount;
  totalTypedChars = typedVal.length;

  calculateLiveMetrics();

  if (typedVal.length >= currentPassage.length) {
    endTest();
  }
});

function startTimer() {
  isTestRunning = true;
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.innerText = formatTime(timeLeft);
    calculateLiveMetrics();

    if (timeLeft <= 0) {
      endTest();
    }
  }, 1000);
}

function calculateLiveMetrics() {
  const timeElapsedInMinutes = (testDuration - timeLeft) / 60 || (1 / 60);
  const wpm = Math.round((correctTypedChars / 5) / timeElapsedInMinutes);
  const accuracy = totalTypedChars > 0 ? Math.round((correctTypedChars / totalTypedChars) * 100) : 100;

  wpmEl.innerText = wpm >= 0 ? wpm : 0;
  accuracyEl.innerText = `${accuracy}%`;
}

function endTest() {
  clearInterval(timerInterval);
  isTestRunning = false;
  typingInput.disabled = true;
  submitBtn.disabled = false;
  statusEl.style.color = "#2563eb";
  statusEl.innerText = "🎉 Test completed! Click 'Submit Official Score' to save your score.";
}

// Post Submission to Google Apps Script Backend
async function submitScore() {
  submitBtn.disabled = true;
  statusEl.style.color = "#64748b";
  statusEl.innerText = "⏳ Submitting official score to Google Sheet...";

  const payload = {
    batch: selectedBatch,
    username: selectedUser,
    difficulty: selectedDifficulty,
    wpm: parseInt(wpmEl.innerText),
    accuracy: parseInt(accuracyEl.innerText),
    timeTaken: testDuration - timeLeft
  };

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    statusEl.style.color = "#16a34a";
    statusEl.innerText = "✅ Score saved successfully in Google Sheet!";
  } catch (err) {
    statusEl.style.color = "#dc2626";
    statusEl.innerText = "❌ Failed to submit score. Check console details.";
    console.error("Submission Error:", err);
    submitBtn.disabled = false;
  }
}