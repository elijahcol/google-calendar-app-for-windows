// Generates the calendar app icon as an SVG string for a given day number
// (1-31). Used both by the Electron app at runtime (to render the taskbar/
// window icon for "today") and by scripts/build-icons.js at build time (to
// produce the static icon.ico / Store tile assets).
//
// Design: a calendar page with a blue-to-purple gradient outline and two
// hanger rings at the top, with the day number rendered across the
// gradient-filled header and the white body below it.

function renderIconSVG(day) {
  const label = String(day);
  // Slightly narrower glyph spacing for two-digit numbers so "31" style
  // labels stay comfortably inside the card.
  const fontSize = label.length > 1 ? 350 : 430;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <defs>
    <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#A855F7"/>
    </linearGradient>
    <linearGradient id="fillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#7DC4FA"/>
      <stop offset="100%" stop-color="#E9D5FF"/>
    </linearGradient>
    <linearGradient id="numberGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3B5BFD"/>
      <stop offset="100%" stop-color="#9333EA"/>
    </linearGradient>
    <clipPath id="cardClip">
      <path d="M179 238 L761 238 L706 807 L229 807 Z"/>
    </clipPath>
  </defs>

  <!-- card fill: colored header down to the midline, white below -->
  <g clip-path="url(#cardClip)">
    <rect x="150" y="200" width="700" height="330" fill="url(#fillGrad)"/>
    <rect x="150" y="523" width="700" height="330" fill="#FFFFFF"/>
  </g>

  <!-- bracket bar (drawn first so the rings appear threaded through it) -->
  <rect x="210" y="128" width="515" height="120" rx="60"
        fill="#FFFFFF" stroke="url(#strokeGrad)" stroke-width="30"/>

  <!-- hanger rings -->
  <rect x="275" y="82" width="83" height="147" rx="41" fill="#2563EB"/>
  <rect x="590" y="82" width="85" height="147" rx="41" fill="#2563EB"/>

  <!-- rivet dots -->
  <circle cx="316" cy="188" r="19" fill="#2563EB"/>
  <circle cx="619" cy="188" r="19" fill="#2563EB"/>

  <!-- card outline -->
  <path d="M179 238 L761 238 L706 807 L229 807 Z"
        fill="none" stroke="url(#strokeGrad)" stroke-width="34"
        stroke-linejoin="round" stroke-linecap="round"/>

  <!-- day number -->
  <text x="470" y="600" font-family="Arial, Helvetica, sans-serif"
        font-weight="900" font-size="${fontSize}" fill="url(#numberGrad)"
        text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;
}

module.exports = { renderIconSVG };
