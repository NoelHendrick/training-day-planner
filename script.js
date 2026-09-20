const weightInput = document.getElementById('bodyWeight');
const timeInput = document.getElementById('sessionTime');
const intensityInput = document.getElementById('intensity');
const leaveInput = document.getElementById('leaveTime');
const warmupInput = document.getElementById('warmupTime');
const inputPage = document.getElementById('inputPage');
const results = document.getElementById('results');
const timelineList = document.getElementById('timelineList');
const hydrationPage = document.getElementById('hydrationPage');

const HYDRATION_REMINDER = '💧 Make sure you\'re hydrated — <button type="button" class="chart-link" data-open-hydration>check the hydration chart</button>';

// Nutrition targets per session intensity, in g/kg bodyweight unless noted.
// A stage set to null means it isn't needed at that intensity.
const INTENSITY_PLANS = {
  light: {
    meal: { carbsPerKg: 1, proteinPerKg: 0.6 },
    snack: null,
    during: 'Sip water throughout.',
    post: null,
    nextMeal: { carbsPerKg: 1, proteinPerKg: 0.6 }
  },
  medium: {
    meal: { carbsPerKg: 1.5, proteinPerKg: 0.5 },
    snack: 'Banana or cereal bar — about 30g carbs.',
    during: 'Alternate between water and Lucozade.',
    post: { carbsPerKg: 0.6, proteinPerKg: 0.5 },
    nextMeal: { carbsPerKg: 1.5, proteinPerKg: 0.5 }
  },
  hard: {
    meal: { carbsPerKg: 2, proteinPerKg: 0.5 },
    snack: 'Banana or cereal bar — 30-60g carbs.',
    during: 'Sip sports drink throughout, and consider an energy gel or jellies.',
    post: { carbsPerKg: 1.2, proteinPerKg: 0.5 },
    nextMeal: { carbsPerKg: 1.5, proteinPerKg: 0.6 }
  }
};

function grams(perKg, weightKg) {
  return Math.round(perKg * weightKg);
}

function macroLine(target, weightKg) {
  return `${grams(target.carbsPerKg, weightKg)}g carbs, ${grams(target.proteinPerKg, weightKg)}g protein`;
}

function parseTimeToDate(value) {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatClock(date) {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function windowLabel(rangeText, startDate, endDate) {
  return `${rangeText} · ${formatClock(startDate)} - ${formatClock(endDate)}`;
}

function buildTimeline(sessionDate, leaveDate, warmupDate, weightKg, intensity) {
  const plan = INTENSITY_PLANS[intensity];
  const items = [];

  const mealStart = new Date(sessionDate.getTime() - 180 * 60000); // 3h before
  const mealEnd = new Date(sessionDate.getTime() - 120 * 60000); // 2h before
  items.push({
    time: mealStart,
    label: windowLabel('2-3 Hours Before Session', mealStart, mealEnd),
    title: 'Pre-training meal',
    detail: `${macroLine(plan.meal, weightKg)} — focus on getting carbs in to fuel training.`,
    isSession: false,
    type: 'meal'
  });

  if (plan.snack) {
    const warmupAnchor = warmupDate || sessionDate;
    const snackStart = new Date(warmupAnchor.getTime() - 60 * 60000); // 1h before warm-up
    const snackEnd = new Date(warmupAnchor.getTime() - 45 * 60000); // 45min before warm-up
    items.push({
      time: snackStart,
      label: windowLabel('45min-1 Hour Before Warm-up', snackStart, snackEnd),
      title: 'Pre-warmup snack',
      detail: plan.snack,
      isSession: false,
      type: 'snack'
    });
  }

  let leaveItem = null;
  if (leaveDate) {
    leaveItem = {
      time: leaveDate,
      label: formatClock(leaveDate),
      title: 'Leave for training',
      detail: 'Head out the door',
      isSession: false,
      type: 'leave'
    };
    items.push(leaveItem);
  }

  let warmupItem = null;
  if (warmupDate) {
    warmupItem = {
      time: warmupDate,
      label: formatClock(warmupDate),
      title: 'Start warm-up',
      detail: 'Bring water bottle.',
      isSession: false,
      type: 'warmup'
    };
    items.push(warmupItem);
  }

  const sessionItem = {
    time: sessionDate,
    label: formatClock(sessionDate),
    title: 'During training (Incl. Warm-up)',
    detail: plan.during,
    isSession: true,
    type: 'session'
  };
  items.push(sessionItem);

  // Attach the "you've arrived, stay hydrated" reminder to whichever item
  // best represents arriving at training: warm-up, else leave time, else session start.
  const arrivalItem = warmupItem || leaveItem || sessionItem;
  arrivalItem.detail += `<br><span class="hydration-note">${HYDRATION_REMINDER}</span>`;

  items.sort((a, b) => a.time - b.time);

  if (plan.post) {
    items.push({
      time: null,
      label: 'Within 30 min of finishing',
      title: 'Post-training recovery snack',
      detail: `${macroLine(plan.post, weightKg)} — e.g. recovery shake with banana, or chocolate milk with a cereal bar.`,
      isSession: false,
      type: 'recovery-snack'
    });
  }

  items.push({
    time: null,
    label: 'Within 2 hours of finishing',
    title: 'Post-training meal',
    detail: `${macroLine(plan.nextMeal, weightKg)} — full balanced meal to refuel glycogen and repair muscle, e.g. rice & chicken, salmon & potatoes.`,
    isSession: false,
    type: 'recovery-meal'
  });

  return items;
}

function render(items) {
  timelineList.innerHTML = '';
  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'item' + (item.isSession ? ' session' : '');
    el.dataset.type = item.type;
    el.innerHTML = `
      <div class="item-time">${item.label}</div>
      <div class="item-title">${item.title}</div>
      <div class="item-detail">${item.detail}</div>
    `;
    timelineList.appendChild(el);
  });
  results.classList.remove('hidden');
}

document.getElementById('generateBtn').addEventListener('click', () => {
  const weightKg = parseFloat(weightInput.value);
  if (!weightKg || weightKg <= 0) {
    weightInput.focus();
    return;
  }
  if (!timeInput.value) {
    timeInput.focus();
    return;
  }
  const sessionDate = parseTimeToDate(timeInput.value);
  const leaveDate = parseTimeToDate(leaveInput.value);
  const warmupDate = parseTimeToDate(warmupInput.value);
  const intensity = intensityInput.value;

  const items = buildTimeline(sessionDate, leaveDate, warmupDate, weightKg, intensity);
  render(items);
  inputPage.classList.add('hidden');
});

document.getElementById('backBtn').addEventListener('click', () => {
  results.classList.add('hidden');
  inputPage.classList.remove('hidden');
});

let pageBeforeHydration = inputPage;

function openHydrationPage() {
  pageBeforeHydration = results.classList.contains('hidden') ? inputPage : results;
  pageBeforeHydration.classList.add('hidden');
  hydrationPage.classList.remove('hidden');
}

document.getElementById('hydrationTabBtn').addEventListener('click', openHydrationPage);

document.getElementById('hydrationBackBtn').addEventListener('click', () => {
  hydrationPage.classList.add('hidden');
  pageBeforeHydration.classList.remove('hidden');
});

timelineList.addEventListener('click', (e) => {
  if (e.target.closest('[data-open-hydration]')) {
    openHydrationPage();
  }
});
