// Shared M20 logo lockup for the video backgrounds: mark + stacked
// "M20 / TECHNOLOGY" wordmark, per design.md "Logo & lockup".
// lockup({ x, y, mark, ink, muted, markFilter, textShadow }) appends it to <body>.
function lockup({ x, y, mark = 104, ink = "#14171C", muted = "#5A6270",
  markFilter = "drop-shadow(0 2px 3px rgba(20,23,28,.18))",
  textShadow = "0 2px 3px rgba(20,23,28,.18)" }) {
  const el = document.createElement("div");
  el.style.cssText = `position:absolute;left:${x}px;top:${y}px;display:flex;
    align-items:center;gap:${Math.round(mark * 0.2)}px;`;
  el.innerHTML = `
    <img src="../../assets/logo.png" width="${mark}" height="${mark}"
      style="display:block;filter:${markFilter}">
    <div style="display:flex;flex-direction:column;gap:${Math.round(mark * 0.06)}px;
      font-family:'Source Sans 3',system-ui,sans-serif;text-shadow:${textShadow}">
      <div style="font-weight:700;font-size:${Math.round(mark * 0.52)}px;line-height:1;
        color:${ink};letter-spacing:.01em">M20</div>
      <div style="font-weight:600;font-size:${Math.round(mark * 0.16)}px;line-height:1;
        color:${muted};letter-spacing:.24em">TECHNOLOGY</div>
    </div>`;
  document.body.appendChild(el);
}
