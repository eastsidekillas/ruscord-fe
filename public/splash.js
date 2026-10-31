// Runs before the app starts: no splash on the landing page.
if (window.location.pathname === '/') {
  var s = document.getElementById('app-splash');
  if (s) s.style.display = 'none';
}
