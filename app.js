const BIRTHDAY = new Date(MISO_CONFIG.birthday + "T00:00:00");
const TIMELINE_MAX_MONTHS = 18;
const TIMELINE_SNAPS = [0, 4, 6, 12, 18];
const LIVE_TOLERANCE = 0.35;
const HEALTH_RECENT_DAYS = 42;

let timelineAgeMonths = null;
let ageTickInterval = null;

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
  const pad = (n) => String(n).padStart(2, "0");

  return `${weeks} weeks · ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s since birth`;
}

function formatAgeDetailStatic(from, to) {
  const totalDays = Math.floor((to - from) / 86400000);
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  return `${weeks} weeks · ${days} ${plural(days, "day")} since birth`;
}

function nearestSnap(value) {
  return TIMELINE_SNAPS.reduce((best, snap) =>
    Math.abs(snap - value) < Math.abs(best - value) ? snap : best
  );
}

function getCurrentAgeMonths() {
  return ageInMonths(new Date());
}

function getTimelineAgeMonths() {
  return timelineAgeMonths ?? getCurrentAgeMonths();
}

function isTimelineLive() {
  if (timelineAgeMonths === null) return true;
  return Math.abs(timelineAgeMonths - getCurrentAgeMonths()) < LIVE_TOLERANCE;
}

function dateAtAgeMonths(months) {
  return new Date(BIRTHDAY.getTime() + months * (365.25 / 12) * 86400000);
}

function getViewDate() {
  if (isTimelineLive()) return new Date();
  return dateAtAgeMonths(getTimelineAgeMonths());
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function updateAge() {
  const now = new Date();
  document.getElementById("age-label").textContent = "Currently";
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

function daysUntil(dateStr, fromDate) {
  const target = parseDate(dateStr);
  if (!target) return null;
  const from = startOfDay(fromDate);
  return Math.round((target - from) / 86400000);
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

function getHealthItemStatus(item, referenceDate, live) {
  if (live) {
    if (item.done) return "done";
    if (!item.date) return "done";
    const days = daysUntil(item.date, referenceDate);
    if (days === 0) return "today";
    if (days > 0) return "upcoming";
    return "overdue";
  }

  if (!item.date) return "done";
  const days = daysUntil(item.date, referenceDate);
  if (days > 0) return "upcoming";
  if (days === 0) return "today";
  return "done";
}

function isHealthItemRelevant(item, viewDate, live) {
  if (live) return true;
  if (!item.date) return true;

  const days = daysUntil(item.date, viewDate);
  if (days >= 0) return true;
  return days >= -HEALTH_RECENT_DAYS;
}

function formatCountdown(dateStr, referenceDate) {
  const days = daysUntil(dateStr, referenceDate);
  if (days === null) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1) return `In ${days} days`;
  if (days === -1) return "Yesterday";
  return `${Math.abs(days)} days ago`;
}

function renderHealthGroup(title, items, viewDate, live) {
  const relevant = items.filter((item) => isHealthItemRelevant(item, viewDate, live));
  if (relevant.length === 0) return "";

  const rows = relevant
    .map((item) => {
      const status = getHealthItemStatus(item, viewDate, live);
      const dateText = item.date ? formatFullDate(item.date) : item.note || "Completed";
      const countdown =
        live && item.date && status === "upcoming"
          ? formatCountdown(item.date, new Date())
          : status === "today" && live
            ? "Today"
            : "";

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
  const live = isTimelineLive();
  const viewDate = live ? startOfDay(new Date()) : startOfDay(getViewDate());

  const html =
    renderHealthGroup("Vaccinations", vaccinations, viewDate, live) +
    renderHealthGroup("Deworming", deworming, viewDate, live);

  grid.innerHTML =
    html ||
    `<p class="health-empty">No health items scheduled for this point on the timeline.</p>`;
}

function formatDateLabel(date, referenceDate) {
  const ref = startOfDay(referenceDate);
  const d = startOfDay(date);

  if (d.getTime() === ref.getTime()) return isTimelineLive() ? "Today" : "Day 1";
  const next = new Date(ref);
  next.setDate(next.getDate() + 1);
  if (d.getTime() === next.getTime()) return isTimelineLive() ? "Tomorrow" : "Day 2";

  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function renderFeedingSchedule() {
  const scheduleEl = document.getElementById("schedule");
  const metaEl = document.getElementById("feeding-meta");
  const explainEl = document.getElementById("feeding-explanation");
  const subtitleEl = document.getElementById("feeding-subtitle");

  const referenceDate = startOfDay(getViewDate());
  const daysToShow = 7;

  const { brand, product, expectedAdultWeightKg } = MISO_CONFIG.kibble;
  const feeding = getPurinaFeeding(referenceDate);
  const mealsToday = getMealTimesForDate(referenceDate).length;
  const previewPrefix = isTimelineLive() ? "" : `Preview at ${timelineAgeMonths} mo · `;

  subtitleEl.textContent = `${previewPrefix}${brand} ${product}`;

  metaEl.innerHTML = `
    <div class="meta-pill"><strong>${feeding.recommended} g</strong> / day</div>
    <div class="meta-pill">${feeding.min}–${feeding.max} g <span class="meta-muted">on bag</span></div>
    <div class="meta-pill"><strong>${mealsToday}</strong> meals / day</div>
    <div class="meta-pill">~<strong>${expectedAdultWeightKg} kg</strong> adult target</div>
  `;

  explainEl.textContent =
    `Amounts from the Purina Pro Plan Puppy Medium feeding table for an expected adult weight of ${expectedAdultWeightKg} kg ` +
    `(~${feeding.ageMonths.toFixed(1)} months old → ${feeding.min}–${feeding.max} g/day; using ${feeding.recommended} g as midpoint). ` +
    `Split evenly across meals. Switch to 2 meals from ${MISO_CONFIG.twoMealsFromMonths} months old. Adjust if ribs are hard to feel or waist isn't visible — check the bag and your vet.`;

  scheduleEl.innerHTML = "";

  for (let i = 0; i < daysToShow; i++) {
    const date = new Date(referenceDate);
    date.setDate(date.getDate() + i);
    const times = getMealTimesForDate(date);
    const { portions } = gramsPerMeal(times.length, date);

    const day = document.createElement("li");
    day.className = "schedule-day";
    day.innerHTML = `
      <h3 class="schedule-date">${formatDateLabel(date, referenceDate)}</h3>
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

function getTopicStage(date = getViewDate()) {
  const ageMonths = ageInMonths(date);
  const stages = MISO_CONFIG.topicStages;
  const stage =
    stages.find((s) => ageMonths <= s.maxMonths) || stages[stages.length - 1];
  return { ...stage, ageMonths };
}

function renderTopics() {
  const grid = document.getElementById("topics-grid");
  const leadEl = document.getElementById("topics-lead");
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const stage = getTopicStage();

  leadEl.textContent = isTimelineLive()
    ? `${stage.label} (~${stage.ageMonths.toFixed(1)} mo) — ${stage.lead}`
    : `Preview · ${stage.label} (${timelineAgeMonths} mo) — ${stage.lead}`;

  const sorted = [...stage.topics].sort(
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

function updateTimelineUI() {
  const slider = document.getElementById("timeline-slider");
  const modeEl = document.getElementById("timeline-mode");
  const statusEl = document.getElementById("timeline-status");
  const resetBtn = document.getElementById("timeline-reset");
  const ageMonths = getTimelineAgeMonths();
  const stage = getTopicStage(getViewDate());
  const viewDate = getViewDate();

  if (isTimelineLive()) {
    document.body.classList.remove("is-preview");
    modeEl.textContent = "Current age";
    statusEl.textContent = `${getCurrentAgeMonths().toFixed(1)} mo · ${stage.label}`;
    resetBtn.hidden = true;
    slider.value = String(Math.min(getCurrentAgeMonths(), TIMELINE_MAX_MONTHS));
    slider.setAttribute("aria-valuenow", getCurrentAgeMonths().toFixed(1));
  } else {
    document.body.classList.add("is-preview");
    modeEl.textContent = "Preview";
    statusEl.textContent = `${timelineAgeMonths} mo · ${stage.label} · ${viewDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
    resetBtn.hidden = false;
    slider.value = String(timelineAgeMonths);
    slider.setAttribute("aria-valuenow", String(timelineAgeMonths));
  }
}

function renderAll() {
  updateTimelineUI();
  updateAge();
  renderHealthSchedule();
  renderFeedingSchedule();
  renderTopics();
}

function syncAgeTicker() {
  if (ageTickInterval) clearInterval(ageTickInterval);
  ageTickInterval = setInterval(updateAge, 1000);
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

function monthToSliderLeft(month, slider) {
  const min = Number(slider.min);
  const max = Number(slider.max);
  const thumb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--timeline-thumb")) || 28;
  const ratio = (month - min) / (max - min);
  return ratio * (slider.offsetWidth - thumb) + thumb / 2;
}

function syncTimelineLayout() {
  const slider = document.getElementById("timeline-slider");
  if (!slider.offsetWidth) return;

  document.querySelectorAll("#timeline-rail [data-month]").forEach((el) => {
    const month = Number(el.dataset.month);
    el.style.left = `${monthToSliderLeft(month, slider)}px`;
  });
}

function initTimeline() {
  const slider = document.getElementById("timeline-slider");
  const resetBtn = document.getElementById("timeline-reset");

  slider.addEventListener("input", () => {
    const value = Number(slider.value);
    const current = getCurrentAgeMonths();

    if (Math.abs(value - current) < LIVE_TOLERANCE) {
      timelineAgeMonths = null;
    } else {
      timelineAgeMonths = nearestSnap(value);
    }

    renderAll();
    syncAgeTicker();
  });

  resetBtn.addEventListener("click", () => {
    timelineAgeMonths = null;
    renderAll();
    syncAgeTicker();
  });

  syncTimelineLayout();
  window.addEventListener("resize", syncTimelineLayout);
}

timelineAgeMonths = null;
renderAll();
renderChecklist();
initPanels();
initTimeline();
syncAgeTicker();
syncTimelineLayout();

setInterval(() => {
  updateAge();
  if (!isTimelineLive()) return;
  const current = getCurrentAgeMonths();
  const slider = document.getElementById("timeline-slider");
  if (Math.abs(Number(slider.value) - current) > LIVE_TOLERANCE) {
    slider.value = String(current);
    document.getElementById("timeline-status").textContent =
      `${current.toFixed(1)} mo · ${getTopicStage().label}`;
  }
}, 60000);
