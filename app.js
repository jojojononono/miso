const BIRTHDAY = new Date(MISO_CONFIG.birthday + "T00:00:00");

function plural(n, word) {
  return n === 1 ? word : word + "s";
}

function formatAge(from, to) {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(to.getFullYear(), to.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} ${plural(years, "year")}`);
  if (months > 0) parts.push(`${months} ${plural(months, "month")}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ${plural(days, "day")}`);

  return parts.join(", ");
}

function formatAgeDetail(from, to) {
  const ms = to - from;
  const totalDays = Math.floor(ms / 86400000);
  const weeks = Math.floor(totalDays / 7);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  return `${weeks} weeks · ${hours}h ${minutes}m ${seconds}s since birth`;
}

function updateAge() {
  const now = new Date();
  document.getElementById("age-value").textContent = formatAge(BIRTHDAY, now);
  document.getElementById("age-detail").textContent = formatAgeDetail(BIRTHDAY, now);
}

function monthsOld(date) {
  let months = (date.getFullYear() - BIRTHDAY.getFullYear()) * 12;
  months += date.getMonth() - BIRTHDAY.getMonth();
  if (date.getDate() < BIRTHDAY.getDate()) months -= 1;
  return Math.max(0, months);
}

function getMealTimesForDate(date) {
  const m = monthsOld(date);
  if (m >= MISO_CONFIG.twoMealsFromMonths) {
    return MISO_CONFIG.mealTimes.filter((_, i) => i !== 1);
  }
  return MISO_CONFIG.mealTimes;
}

function ageInMonths(date) {
  let months = (date.getFullYear() - BIRTHDAY.getFullYear()) * 12;
  months += date.getMonth() - BIRTHDAY.getMonth();
  months += (date.getDate() - BIRTHDAY.getDate()) / 30;
  return Math.max(0, months);
}

function getPurinaFeeding(date) {
  const { feedingTable } = MISO_CONFIG.kibble;
  const ageMonths = ageInMonths(date);
  const band =
    feedingTable.find((row) => ageMonths <= row.maxMonths) ||
    feedingTable[feedingTable.length - 1];
  const recommended = Math.round((band.min + band.max) / 2);
  return { ...band, recommended, ageMonths };
}

function dailyGramsForDate(date) {
  return getPurinaFeeding(date).recommended;
}

function gramsPerMeal(mealCount, date) {
  const total = dailyGramsForDate(date);
  const base = Math.floor(total / mealCount);
  const remainder = total % mealCount;
  return { total, portions: Array.from({ length: mealCount }, (_, i) => base + (i < remainder ? 1 : 0)) };
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + "T00:00:00");
}

function daysUntil(dateStr) {
  const target = parseDate(dateStr);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function formatFullDate(dateStr) {
  if (!dateStr) return null;
  return parseDate(dateStr).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getHealthItemStatus(item) {
  if (item.done) return "done";
  if (!item.date) return "done";
  const days = daysUntil(item.date);
  if (days === 0) return "today";
  if (days > 0) return "upcoming";
  return "overdue";
}

function formatCountdown(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1) return `In ${days} days`;
  if (days === -1) return "Yesterday";
  return `${Math.abs(days)} days ago`;
}

function renderHealthGroup(title, items) {
  const rows = items
    .map((item) => {
      const status = getHealthItemStatus(item);
      const dateText = item.date ? formatFullDate(item.date) : item.note || "Completed";
      const countdown = item.date && !item.done ? formatCountdown(item.date) : "";

      return `
        <li class="health-item health-${status}">
          <div class="health-item-main">
            <span class="health-status-icon">${status === "done" ? "✓" : status === "today" ? "●" : "○"}</span>
            <div>
              <strong>${item.label}</strong>
              <span class="health-date">${dateText}</span>
            </div>
          </div>
          ${countdown ? `<span class="health-countdown">${countdown}</span>` : ""}
        </li>
      `;
    })
    .join("");

  return `
    <div class="health-group">
      <h3>${title}</h3>
      <ul class="health-list">${rows}</ul>
    </div>
  `;
}

function renderHealthSchedule() {
  const grid = document.getElementById("health-grid");
  const { vaccinations, deworming } = MISO_CONFIG.health;

  grid.innerHTML =
    renderHealthGroup("Vaccinations", vaccinations) +
    renderHealthGroup("Deworming", deworming);
}

function formatDateLabel(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (d.getTime() === today.getTime()) return "Today";
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow";

  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function renderFeedingSchedule() {
  const scheduleEl = document.getElementById("schedule");
  const metaEl = document.getElementById("feeding-meta");
  const explainEl = document.getElementById("feeding-explanation");
  const subtitleEl = document.getElementById("feeding-subtitle");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysToShow = 7;

  const { brand, product, expectedAdultWeightKg } = MISO_CONFIG.kibble;
  const feeding = getPurinaFeeding(today);
  const mealsToday = getMealTimesForDate(today).length;

  subtitleEl.textContent = `${brand} ${product} · from today onwards`;

  metaEl.innerHTML = `
    <div class="meta-pill"><strong>${feeding.recommended} g</strong> / day</div>
    <div class="meta-pill">${feeding.min}–${feeding.max} g <span class="meta-muted">on bag</span></div>
    <div class="meta-pill"><strong>${mealsToday}</strong> meals / day</div>
    <div class="meta-pill">~<strong>${MISO_CONFIG.weightKg} kg</strong> now · <strong>${expectedAdultWeightKg} kg</strong> adult</div>
  `;

  explainEl.textContent =
    `Amounts from the Purina Pro Plan Puppy Medium feeding table for an expected adult weight of ${expectedAdultWeightKg} kg ` +
    `(Miso is ~${feeding.ageMonths.toFixed(1)} months old → ${feeding.min}–${feeding.max} g/day; using ${feeding.recommended} g as midpoint). ` +
    `Split evenly across meals. Switch to 2 meals from ${MISO_CONFIG.twoMealsFromMonths} months old. Adjust if ribs are hard to feel or waist isn't visible — check the bag and your vet.`;

  scheduleEl.innerHTML = "";

  for (let i = 0; i < daysToShow; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const times = getMealTimesForDate(date);
    const { portions } = gramsPerMeal(times.length, date);

    const day = document.createElement("li");
    day.className = "schedule-day";
    day.innerHTML = `
      <h3 class="schedule-date">${formatDateLabel(date)}</h3>
      <ul class="schedule-meals">
        ${times
          .map(
            (time, idx) =>
              `<li><time>${time}</time><span>${portions[idx]} g Pro Plan</span></li>`
          )
          .join("")}
      </ul>
    `;
    scheduleEl.appendChild(day);
  }
}

function renderTopics() {
  const grid = document.getElementById("topics-grid");
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  const sorted = [...MISO_CONFIG.topics].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  grid.innerHTML = sorted
    .map(
      (t) => `
    <article class="topic" data-priority="${t.priority}">
      <div class="topic-head">
        <h3>${t.title}</h3>
        <span class="topic-icon" aria-hidden="true">${t.icon}</span>
      </div>
      <p>${t.summary}</p>
      <ul>${t.items.map((i) => `<li>${i}</li>`).join("")}</ul>
      <span class="priority">${t.priority}</span>
    </article>
  `
    )
    .join("");
}

const CHECKLIST_KEY = "miso-checklist-v1";

function loadChecklist() {
  try {
    const saved = localStorage.getItem(CHECKLIST_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return MISO_CONFIG.defaultChecklist.map((text, id) => ({ id, text, done: false }));
}

function saveChecklist(items) {
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify(items));
}

function renderChecklist() {
  const list = document.getElementById("checklist");
  const items = loadChecklist();

  list.innerHTML = items
    .map(
      (item) => `
    <li class="${item.done ? "done" : ""}" data-id="${item.id}">
      <label>
        <input type="checkbox" ${item.done ? "checked" : ""} />
        <span>${item.text}</span>
      </label>
      <button type="button" class="remove" aria-label="Remove">×</button>
    </li>
  `
    )
    .join("");

  list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const id = Number(e.target.closest("li").dataset.id);
      const updated = loadChecklist().map((item) =>
        item.id === id ? { ...item, done: e.target.checked } : item
      );
      saveChecklist(updated);
      e.target.closest("li").classList.toggle("done", e.target.checked);
    });
  });

  list.querySelectorAll(".remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.closest("li").dataset.id);
      saveChecklist(loadChecklist().filter((item) => item.id !== id));
      renderChecklist();
    });
  });
}

document.getElementById("checklist-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("checklist-input");
  const text = input.value.trim();
  if (!text) return;

  const items = loadChecklist();
  const nextId = items.reduce((max, i) => Math.max(max, i.id), -1) + 1;
  items.push({ id: nextId, text, done: false });
  saveChecklist(items);
  input.value = "";
  renderChecklist();
});

document.getElementById("build-date").textContent = new Date().toLocaleDateString("en-GB");

function initPanels() {
  document.querySelectorAll(".panel-head").forEach((button) => {
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      const body = document.getElementById(button.getAttribute("aria-controls"));
      button.setAttribute("aria-expanded", String(!expanded));
      body.hidden = expanded;
    });
  });
}

function initMobileMenu() {
  const button = document.querySelector(".menu-btn");
  const menu = document.getElementById("mobile-menu");

  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!open));
    menu.hidden = open;
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      button.setAttribute("aria-expanded", "false");
      menu.hidden = true;
    });
  });
}

function initPillNav() {
  const links = [...document.querySelectorAll(".pill-link")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const headerOffset = () =>
    parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-height"), 10) + 80;

  const setActive = () => {
    const offset = window.scrollY + headerOffset();
    let current = sections[0];

    sections.forEach((section) => {
      if (section.offsetTop - 120 <= offset) current = section;
    });

    links.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${current.id}`);
    });
  };

  window.addEventListener("scroll", setActive, { passive: true });
  setActive();
}

updateAge();
setInterval(updateAge, 1000);
renderHealthSchedule();
renderFeedingSchedule();
renderTopics();
renderChecklist();
initPanels();
initMobileMenu();
initPillNav();
