// Email reveal: rot13 decode on click, never in HTML source
(function () {
  function rot13(s) {
    return s.replace(/[a-zA-Z]/g, function (c) {
      var base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    });
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.email-btn');
    if (!btn) return;
    var email = rot13(btn.dataset.e);
    var link = document.createElement('a');
    link.href = 'mailto:' + email;
    link.textContent = email;
    btn.replaceWith(link);
  });
}());

// Mobile navigation toggle
document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', links.classList.contains('open').toString());
    });
  }

  // Close nav when a link is clicked (mobile UX)
  if (links) {
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
      });
    });
  }
});
