# Transfer Reminder for Direct Debits (Brave/Chromium Extension)

A simple extension to add direct-debit reminders. Enter the amount and debit date; you will get a browser notification one day before to top up your transaction account.

## Install (Brave)
1. Open `brave://extensions`.
2. Enable "Developer mode" (top-right).
3. Click "Load unpacked" and select this folder: `/Users/thusitha/Hobbitual/Expenser/extension`.
4. Pin the extension to your toolbar for quick access.

## Usage
- Click the extension icon.
- Enter the amount, the debit date, and (optional) reminder time for the previous day.
- The extension schedules an alarm and will show a notification a day before the debit.
- You can delete reminders from the list in the popup.

## Notes
- Alarms are restored on browser startup.
- If the reminder time has already passed when you add it, it will not schedule. Just pick a later time or re-add.
- Notifications require permission; the first one will prompt you.

### Troubleshooting notifications (Brave on macOS)
- Ensure Brave notifications are enabled in macOS System Settings → Notifications → Brave → Allow Notifications.
- In Brave, visit `brave://settings/system` and keep "Continue running background apps when Brave is closed" enabled so alarms fire.
- Test from the popup using "Send test notification". If you see it, alarms should also show.
- If you loaded the extension recently, reminders scheduled earlier than now won't trigger. Re-add them or set a later time.
- On laptops with Focus/Do Not Disturb, notifications may be silenced. Disable Focus.

## Files
- `manifest.json`: Extension manifest (MV3)
- `popup.html`, `styles.css`, `popup.js`: UI to add/list reminders
- `background.js`: Schedules alarms and shows notifications
- `icons/`: Placeholder icons
