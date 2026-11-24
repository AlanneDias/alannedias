(() => {
  const switchLink = document.querySelector('[data-studio-language]');
  if (!switchLink) return;

  const counterpart = switchLink.getAttribute('href');
  function syncDestination() {
    switchLink.setAttribute('href', counterpart + window.location.hash);
  }

  syncDestination();
  window.addEventListener('hashchange', syncDestination);
  switchLink.addEventListener('click', syncDestination);
  switchLink.addEventListener('contextmenu', syncDestination);
})();
