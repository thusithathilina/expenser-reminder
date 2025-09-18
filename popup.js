function getStorage() { return chrome.storage?.local ?? chrome.storage; }

function formatCurrency(amount) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount); }
  catch { return amount.toFixed(2); }
}

function toLocalDateInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}

function computeReminderTime(debitDateStr, hhmm) {
  const [hh, mm] = (hhmm || '09:00').split(':').map(Number);
  const debit = new Date(`${debitDateStr}T00:00:00`);
  const reminder = new Date(debit);
  reminder.setDate(reminder.getDate() - 1);
  reminder.setHours(hh, mm, 0, 0);
  return reminder;
}

async function loadReminders() {
  const storage = getStorage();
  const { reminders = [] } = await storage.get(['reminders']);
  return reminders.sort((a, b) => new Date(a.debitDate) - new Date(b.debitDate));
}

async function saveReminders(reminders) {
  const storage = getStorage();
  await storage.set({ reminders });
}

function renderReminders(reminders) {
  const list = document.getElementById('reminders');
  list.innerHTML = '';
  if (!reminders.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No reminders yet.';
    list.appendChild(li);
    return;
  }
  for (const r of reminders) {
    const li = document.createElement('li');
    li.className = 'reminder';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('div');
    title.textContent = `${formatCurrency(r.amount)} due on ${r.debitDate}`;
    const badge = document.createElement('span');
    badge.className = 'badge';
    const d = new Date(r.reminderAt);
    badge.textContent = `remind: ${d.toLocaleString()}`;
    meta.appendChild(title);
    meta.appendChild(badge);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const del = document.createElement('button');
    del.className = 'secondary';
    del.textContent = 'Delete';
    del.addEventListener('click', async () => {
      const updated = (await loadReminders()).filter(x => x.id !== r.id);
      await saveReminders(updated);
      chrome.runtime.sendMessage({ type: 'cancel-alarm', id: r.id });
      renderReminders(updated);
    });

    actions.appendChild(del);

    li.appendChild(meta);
    li.appendChild(actions);
    list.appendChild(li);
  }
}

async function addReminder(amount, debitDate, timeHHMM) {
  const reminderAt = computeReminderTime(debitDate, timeHHMM);
  const id = `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const reminder = { id, amount, debitDate, reminderAt: reminderAt.toISOString() };
  const reminders = await loadReminders();
  reminders.push(reminder);
  await saveReminders(reminders);
  chrome.runtime.sendMessage({ type: 'schedule-alarm', reminder });
  return reminder;
}

window.addEventListener('DOMContentLoaded', async () => {
  const dateInput = document.getElementById('date');
  if (dateInput && !dateInput.value) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.value = toLocalDateInputValue(tomorrow);
  }

  document.getElementById('reminder-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value || '09:00';
    if (!Number.isFinite(amount) || amount <= 0) { alert('Enter a valid amount'); return; }
    if (!date) { alert('Pick a date'); return; }
    await addReminder(amount, date, time);
    renderReminders(await loadReminders());
    e.target.reset();
    if (dateInput) {
      const t = new Date(); t.setDate(t.getDate() + 1);
      dateInput.value = toLocalDateInputValue(t);
    }
  });

  renderReminders(await loadReminders());
  
});
