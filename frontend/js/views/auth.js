import { app } from '../core/dom.js';
import { Store } from '../core/store.js';
import { api } from '../core/api.js';
import { toast } from '../core/utils.js';
import { navigate } from '../core/router.js';

export function renderLogin() {
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="w-full max-w-sm">
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold tracking-tight">CBT App</h1>
          <p class="text-sm text-slate-500 mt-1">Masuk ke sistem ujian berbasis komputer</p>
        </div>
        <div class="card p-6">
          <form id="login-form" class="space-y-4">
            <div>
              <label class="label">Username</label>
              <input class="input" type="text" name="username" required autocomplete="username">
            </div>
            <div>
              <label class="label">Password</label>
              <input class="input" type="password" name="password" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-primary w-full">Masuk</button>
          </form>
          <p class="text-sm text-slate-500 mt-4 text-center">
            Belum punya akun?
            <a href="#register" class="text-ink font-semibold underline">Daftar di sini</a>
          </p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        auth: false,
        body: { username: fd.get('username'), password: fd.get('password') },
      });
      Store.token = result.token;
      Store.user = result.user;
      toast('Login berhasil.', 'success');
      navigate(`#dashboard-${result.user.role.toLowerCase()}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

export function renderRegister() {
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center px-4 py-8">
      <div class="w-full max-w-sm">
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold tracking-tight">Daftar Akun</h1>
          <p class="text-sm text-slate-500 mt-1">Verifikasi email lalu tunggu persetujuan Admin</p>
        </div>
        <div class="card p-6">
          <form id="register-form" class="space-y-4">
            <div>
              <label class="label">Nama Lengkap</label>
              <input class="input" type="text" name="name" required>
            </div>
            <div>
              <label class="label">Username</label>
              <input class="input" type="text" name="username" required>
            </div>
            <div>
              <label class="label">Email (Gmail)</label>
              <input class="input" type="email" name="email" placeholder="nama@gmail.com"
                     pattern="^[^\\s@]+@gmail\\.com$"
                     title="Gunakan alamat email dengan domain @gmail.com" required>
              <p class="text-xs text-slate-400 mt-1">Kode OTP akan dikirim ke email ini.</p>
            </div>
            <div>
              <label class="label">Password</label>
              <input class="input" type="password" name="password" required minlength="6">
            </div>
            <div>
              <label class="label">Daftar Sebagai</label>
              <select class="input" name="roleName" required>
                <option value="Siswa">Siswa / Mahasiswa</option>
                <option value="Guru">Guru / Dosen</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary w-full">Daftar</button>
          </form>
          <p class="text-sm text-slate-500 mt-4 text-center">
            Sudah punya akun?
            <a href="#login" class="text-ink font-semibold underline">Masuk di sini</a>
          </p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const username = fd.get('username');
    try {
      await api('/auth/register', {
        method: 'POST',
        auth: false,
        body: {
          name: fd.get('name'),
          username,
          email: fd.get('email'),
          password: fd.get('password'),
          roleName: fd.get('roleName'),
        },
      });
      toast('Kode OTP telah dikirim ke email Anda.', 'success');
      navigate(`#verify-otp/${encodeURIComponent(username)}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

export function renderVerifyOtp(username) {
  const OTP_EXPIRY_SECONDS = 10 * 60;
  const RESEND_COOLDOWN_SECONDS = 3 * 60;

  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center px-4 py-8">
      <div class="w-full max-w-sm">
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold tracking-tight">Verifikasi Email</h1>
          <p class="text-sm text-slate-500 mt-1">Masukkan kode OTP yang dikirim ke email Gmail Anda</p>
        </div>
        <div class="card p-6">
          <form id="otp-form" class="space-y-4">
            <div>
              <label class="label">Kode OTP</label>
              <input class="input text-center tracking-[0.5em] text-lg" type="text" name="otp"
                     inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autofocus>
            </div>
            <p class="text-xs text-slate-500 text-center" id="otp-expiry-label"></p>
            <button type="submit" class="btn btn-primary w-full">Verifikasi</button>
          </form>
          <button id="resend-otp-btn" type="button" class="btn w-full mt-3" disabled>Kirim Ulang OTP (3:00)</button>
          <p class="text-sm text-slate-500 mt-4 text-center">
            Salah akun?
            <a href="#register" class="text-ink font-semibold underline">Daftar ulang</a>
          </p>
        </div>
      </div>
    </div>
  `;

  let expirySeconds = OTP_EXPIRY_SECONDS;
  let cooldownSeconds = RESEND_COOLDOWN_SECONDS;

  const expiryLabel = document.getElementById('otp-expiry-label');
  const resendBtn = document.getElementById('resend-otp-btn');
  const form = document.getElementById('otp-form');

  const tick = () => {
    // Hentikan timer kalau halaman ini sudah tidak ditampilkan lagi (navigasi lain).
    if (!document.body.contains(form)) {
      clearInterval(timer);
      return;
    }

    expirySeconds = Math.max(0, expirySeconds - 1);
    cooldownSeconds = Math.max(0, cooldownSeconds - 1);

    const mm = String(Math.floor(expirySeconds / 60)).padStart(2, '0');
    const ss = String(expirySeconds % 60).padStart(2, '0');
    expiryLabel.textContent = expirySeconds > 0
      ? `Kode berlaku hingga ${mm}:${ss}`
      : 'Kode OTP sudah kedaluwarsa. Silakan kirim ulang.';

    if (cooldownSeconds > 0) {
      resendBtn.disabled = true;
      const rmm = String(Math.floor(cooldownSeconds / 60)).padStart(2, '0');
      const rss = String(cooldownSeconds % 60).padStart(2, '0');
      resendBtn.textContent = `Kirim Ulang OTP (${rmm}:${rss})`;
    } else {
      resendBtn.disabled = false;
      resendBtn.textContent = 'Kirim Ulang OTP';
    }
  };

  const timer = setInterval(tick, 1000);
  tick();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/auth/verify-otp', {
        method: 'POST',
        auth: false,
        body: { username, otp: fd.get('otp') },
      });
      clearInterval(timer);
      toast('Email terverifikasi. Akun Anda menunggu persetujuan Admin.', 'success');
      navigate('#login');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  resendBtn.addEventListener('click', async () => {
    if (resendBtn.disabled) return;
    resendBtn.disabled = true;
    try {
      await api('/auth/resend-otp', {
        method: 'POST',
        auth: false,
        body: { username },
      });
      toast('Kode OTP baru telah dikirim ke email Anda.', 'success');
      expirySeconds = OTP_EXPIRY_SECONDS;
      cooldownSeconds = RESEND_COOLDOWN_SECONDS;
    } catch (err) {
      toast(err.message, 'error');
      resendBtn.disabled = false;
    }
  });
}
