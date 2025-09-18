window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const amount = params.get('amount');
  const debitDate = params.get('debitDate');
  const msg = document.getElementById('msg');
  if (msg) {
    const amountText = amount && amount !== '—' ? amount : 'your required amount';
    const dateText = debitDate && debitDate !== '—' ? debitDate : 'the debit date';
    msg.textContent = `Transfer at least ${amountText} to your transaction account before ${dateText}.`;
  }
  const dismiss = document.getElementById('dismiss');
  dismiss?.addEventListener('click', () => window.close());
  const openPopup = document.getElementById('open-popup');
  openPopup?.addEventListener('click', () => {
    chrome.action?.openPopup?.();
  });
});


