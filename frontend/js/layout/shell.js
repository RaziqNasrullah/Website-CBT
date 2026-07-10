import { Store } from '../core/store.js';
import { escapeHtml } from '../core/utils.js';
import { navigate } from '../core/router.js';

/**
 * shell(roleLabel, activeLabel, contentHtml)
 * Bungkus konten dashboard dengan header (nama app, role, tombol keluar) dan footer.
 */
export function shell(roleLabel, activeLabel, contentHtml) {
  const user = Store.user;
  return `
    <div class="min-h-screen flex flex-col">
      <header class="border-b border-slate-200 bg-white">
        <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p class="text-lg font-bold tracking-tight">CBT App</p>
            <p class="text-xs text-slate-500">${escapeHtml(roleLabel)} — ${escapeHtml(user?.name || '')}</p>
          </div>
          <button id="btn-logout" class="btn btn-outline">Keluar</button>
        </div>
      </header>
      <main class="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        ${contentHtml}
      </main>
      <footer class="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        CBT App — Local Computer Based Test System
      </footer>
    </div>
  `;
}

/**
 * attachLogout()
 * Pasang event listener tombol "Keluar". Dipanggil setelah shell() di-render ke DOM.
 */
export function attachLogout() {
  const btn = document.getElementById('btn-logout');
  if (btn) {
    btn.addEventListener('click', () => {
      Store.clear();
      navigate('#login');
    });
  }
}
