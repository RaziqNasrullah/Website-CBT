/**
 * toast(message, type)
 * Menampilkan notifikasi singkat di pojok kanan atas.
 */
export function toast(message, type = 'info') {
  const root = document.getElementById('toast-root');
  const colors = {
    info: 'bg-slate-900 text-white',
    error: 'bg-red-600 text-white',
    success: 'bg-emerald-600 text-white',
  };
  const el = document.createElement('div');
  el.className = `${colors[type]} px-4 py-2.5 text-sm font-medium shadow-lg max-w-sm`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/**
 * escapeHtml(str)
 * Mencegah XSS saat menyisipkan data user ke dalam template string HTML.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/**
 * fmtScore(score)
 * Format nilai numerik jadi 2 desimal, atau em-dash jika kosong.
 */
export function fmtScore(score) {
  if (score === null || score === undefined) return '—';
  return Number(score).toFixed(2);
}
