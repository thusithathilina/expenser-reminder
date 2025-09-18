const storage = chrome.storage?.local ?? chrome.storage;

function safeBroadcast(message) {
  try {
    chrome.runtime.sendMessage(message, () => {
      // Swallow error when no receiver (popup not open)
      void chrome.runtime.lastError;
    });
  } catch (e) {
    // ignore
  }
}

function openReminderWindow(reminder) {
  try {
    const params = new URLSearchParams({
      id: reminder.id || '',
      amount: String(reminder.amount ?? ''),
      debitDate: String(reminder.debitDate ?? ''),
    }).toString();
    const url = chrome.runtime.getURL(`reminder.html?${params}`);
    chrome.windows.create({ url, type: 'popup', width: 420, height: 260, focused: true });
  } catch {}
}

function scheduleAlarm(reminder) {
  const when = new Date(reminder.reminderAt).getTime();
  const now = Date.now();
  if (when <= now) return;
  const name = `reminder-alarm-${reminder.id}`;
  chrome.alarms.create(name, { when });
}

async function restoreAlarms() {
  const { reminders = [] } = await storage.get(['reminders']);
  for (const r of reminders) scheduleAlarm(r);
}

chrome.runtime.onInstalled.addListener(() => {
  restoreAlarms();
});

chrome.runtime.onStartup?.addListener(() => {
  restoreAlarms();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'schedule-alarm' && msg.reminder) {
    scheduleAlarm(msg.reminder);
    sendResponse({ ok: true });
    return;
  }
  if (msg?.type === 'cancel-alarm' && msg.id) {
    chrome.alarms.clear(`reminder-alarm-${msg.id}`);
    sendResponse({ ok: true });
    return;
  }
  if (msg?.type === 'test-notification') {
    const id = `test-${Date.now()}`;
    chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Test notification',
      message: 'If you can see this, notifications are working.',
      priority: 2,
      requireInteraction: true
    }, (createdId) => {
      // createdId should equal id
      safeBroadcast({ type: 'notif-event', event: 'created', id: createdId || id });
      sendResponse({ ok: true, id: createdId || id });
      // Fallback window disabled per user preference
    });
    return true; // async response
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm?.name?.startsWith('reminder-alarm-')) return;
  const id = alarm.name.replace('reminder-alarm-', '');
  const { reminders = [] } = await storage.get(['reminders']);
  const reminder = reminders.find(r => r.id === id);
  if (!reminder) return;

  const amount = reminder.amount;
  const title = 'Top up your transaction account';
  const message = `Transfer at least ${amount} for debit on ${reminder.debitDate}.`;

  chrome.notifications.create(`notif-${id}`, {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title,
    message,
    priority: 2,
    requireInteraction: true
  });

});

// Diagnostics: surface notification lifecycle events back to the UI
if (chrome.notifications?.onClicked) {
  chrome.notifications.onClicked.addListener((notifId) => {
    safeBroadcast({ type: 'notif-event', event: 'clicked', id: notifId });
  });
}
if (chrome.notifications?.onClosed) {
  chrome.notifications.onClosed.addListener((notifId, byUser) => {
    safeBroadcast({ type: 'notif-event', event: 'closed', id: notifId, byUser: !!byUser });
  });
}

// Provide list of active notifications for diagnostics
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'list-notifications') {
    if (!chrome.notifications || !chrome.notifications.getAll) {
      sendResponse({ ok: false, error: 'notifications.getAll unavailable' });
      return;
    }
    chrome.notifications.getAll((items) => {
      sendResponse({ ok: true, ids: Object.keys(items || {}) });
    });
    return true;
  }
  if (msg?.type === 'clear-notifications') {
    if (!chrome.notifications || !chrome.notifications.getAll) {
      sendResponse({ ok: false, error: 'notifications API unavailable' });
      return;
    }
    chrome.notifications.getAll((items) => {
      const ids = Object.keys(items || {});
      let remaining = ids.length;
      if (!remaining) { sendResponse({ ok: true, cleared: 0 }); return; }
      let cleared = 0;
      ids.forEach((id) => {
        chrome.notifications.clear(id, (wasCleared) => {
          if (wasCleared) cleared += 1;
          remaining -= 1;
          if (remaining === 0) sendResponse({ ok: true, cleared });
        });
      });
    });
    return true;
  }
});
