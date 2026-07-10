import { app } from '../core/dom.js';
import { Store } from '../core/store.js';
import { api } from '../core/api.js';
import { toast, escapeHtml } from '../core/utils.js';
import { shell, attachLogout } from '../layout/shell.js';

export function statusBadge(status) {
  const map = {
    pending:  'border-amber-300 text-amber-700 bg-amber-50',
    approved: 'border-emerald-300 text-emerald-700 bg-emerald-50',
    rejected: 'border-red-300 text-red-700 bg-red-50',
  };
  const labelMap = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
  return `<span class="badge ${map[status] || 'border-slate-300 text-slate-700'}">${labelMap[status] || status}</span>`;
}

export async function renderAdminDashboard() {
  app.innerHTML = shell('Admin', 'dashboard', `<div id="admin-content" class="text-sm text-slate-500">Memuat data...</div>`);
  attachLogout();

  let pending = [], allUsers = [], subjects = [], teachers = [], profileRequests = [];
  try {
    [pending, allUsers, subjects, teachers, profileRequests] = await Promise.all([
      api('/users/pending'),
      api('/users'),
      api('/subjects'),
      api('/users/teachers'),
      api('/profile/requests'),
    ]);
  } catch (err) {
    document.getElementById('admin-content').innerHTML = `<p class="text-red-600 text-sm">${escapeHtml(err.message)}</p>`;
    return;
  }

  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <div class="space-y-10">

      <!-- PERSETUJUAN AKUN -->
      <section>
        <h2 class="text-lg font-bold mb-1">Persetujuan Akun Baru</h2>
        <p class="text-sm text-slate-500 mb-3">Guru dan Siswa yang mendaftar mandiri menunggu di sini.</p>
        <div class="card overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-100 text-left">
              <tr>
                <th class="table-cell">Nama</th>
                <th class="table-cell">Username</th>
                <th class="table-cell">Role</th>
                <th class="table-cell">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${pending.length === 0
                ? `<tr><td class="table-cell text-slate-400" colspan="4">Tidak ada akun yang menunggu persetujuan.</td></tr>`
                : pending.map(u => `
                  <tr>
                    <td class="table-cell">${escapeHtml(u.name)}</td>
                    <td class="table-cell">${escapeHtml(u.username)}</td>
                    <td class="table-cell"><span class="badge border-slate-300 text-slate-700">${escapeHtml(u.role_name)}</span></td>
                    <td class="table-cell space-x-2">
                      <button class="btn btn-primary !py-1 !px-2.5 !text-xs" data-approve="${u.id}">Setujui</button>
                      <button class="btn btn-danger !py-1 !px-2.5 !text-xs" data-reject="${u.id}">Tolak</button>
                    </td>
                  </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- PERMINTAAN PENGISIAN PROFIL GURU -->
      <section>
        <h2 class="text-lg font-bold mb-1">
          Permintaan Pengisian Profil Guru
          ${profileRequests.length > 0 ? `<span class="ml-2 badge border-red-300 text-red-700 bg-red-50">${profileRequests.length} menunggu</span>` : ''}
        </h2>
        <p class="text-sm text-slate-500 mb-3">Guru yang meminta Admin untuk mengisi profil mereka.</p>
        <div class="card overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-100 text-left">
              <tr>
                <th class="table-cell">Nama Guru</th>
                <th class="table-cell">Username</th>
                <th class="table-cell">Pesan</th>
                <th class="table-cell">Diminta Sejak</th>
                <th class="table-cell">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${profileRequests.length === 0
                ? `<tr><td class="table-cell text-slate-400" colspan="5">Tidak ada permintaan saat ini.</td></tr>`
                : profileRequests.map(r => `
                  <tr>
                    <td class="table-cell font-medium">${escapeHtml(r.name)}</td>
                    <td class="table-cell">${escapeHtml(r.username)}</td>
                    <td class="table-cell text-slate-500 max-w-xs truncate">${r.message ? escapeHtml(r.message) : '<span class="text-slate-300">—</span>'}</td>
                    <td class="table-cell text-slate-500">${r.created_at}</td>
                    <td class="table-cell">
                      <button class="btn btn-primary !py-1 !px-2.5 !text-xs" data-fill-profile="${r.user_id}" data-fill-name="${escapeHtml(r.name)}">Isi Profil</button>
                    </td>
                  </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- FORM ISI PROFIL (tersembunyi, muncul saat klik "Isi Profil") -->
      <div id="fill-profile-wrap" class="hidden card p-5 border-l-4 border-l-slate-800">
        <h2 class="font-bold mb-1">Isi Profil Guru: <span id="fill-profile-name" class="font-normal"></span></h2>
        <p class="text-xs text-slate-500 mb-4">Data ini akan disimpan atas nama guru yang bersangkutan.</p>
        <form id="fill-profile-form" class="space-y-4">
          <input type="hidden" name="target_user_id">
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label class="label">Nama Lengkap + Gelar</label>
              <input class="input" type="text" name="full_name" placeholder="Dr. Budi Santoso, M.Kom." required>
            </div>
            <div>
              <label class="label">Nomor Induk (NIP / NIDN / ID Kepegawaian)</label>
              <input class="input" type="text" name="nomor_induk" required>
            </div>
          </div>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label class="label">Nomor Telepon</label>
              <input class="input" type="tel" name="phone" required>
            </div>
            <div>
              <label class="label">Alamat</label>
              <input class="input" type="text" name="address" required>
            </div>
          </div>
          <div>
            <label class="label">Mata Kuliah yang Diajar</label>
            <div class="border border-slate-200 divide-y divide-slate-100 max-h-40 overflow-y-auto">
              ${subjects.length === 0
                ? `<p class="px-3 py-2 text-xs text-slate-400">Belum ada mata kuliah.</p>`
                : subjects.map(s => `
                  <label class="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" name="subject_ids" value="${s.id}" class="shrink-0">
                    ${escapeHtml(s.subject_name)}
                  </label>`).join('')}
            </div>
          </div>
          <div class="flex gap-2 justify-end">
            <button type="button" id="btn-cancel-fill" class="btn btn-outline">Batal</button>
            <button type="submit" class="btn btn-primary">Simpan Profil Guru</button>
          </div>
        </form>
      </div>

      <!-- MANAJEMEN SISWA-GURU -->
      <section>
        <h2 class="text-lg font-bold mb-1">Manajemen Siswa per Guru</h2>
        <p class="text-sm text-slate-500 mb-3">Tentukan siswa mana yang berada di bawah tanggung jawab setiap guru.</p>
        ${teachers.length === 0
          ? `<div class="card p-4 text-sm text-slate-400">Belum ada Guru yang terdaftar dan disetujui.</div>`
          : `<div class="space-y-3">
              ${teachers.map(t => `
                <div class="card" id="teacher-block-${t.id}">
                  <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div>
                      <p class="font-semibold text-sm">${escapeHtml(t.name)}</p>
                      <p class="text-xs text-slate-400">${escapeHtml(t.username)}</p>
                    </div>
                    <button class="btn btn-outline !py-1 !px-2.5 !text-xs" data-toggle-teacher="${t.id}">Kelola Siswa</button>
                  </div>
                  <div class="hidden p-4 space-y-3" id="teacher-panel-${t.id}">
                    <div id="teacher-student-table-${t.id}" class="text-sm text-slate-400">Memuat...</div>
                    <div class="border-t border-slate-100 pt-3">
                      <p class="label mb-2">Tambah Siswa ke Guru Ini</p>
                      <div class="flex gap-2">
                        <select class="input" id="select-student-${t.id}">
                          <option value="">Memuat daftar siswa...</option>
                        </select>
                        <button class="btn btn-primary whitespace-nowrap" data-assign-student="${t.id}">Tambah</button>
                      </div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>`}
      </section>

      <!-- SEMUA PENGGUNA -->
      <section>
        <h2 class="text-lg font-bold mb-1">Seluruh Pengguna</h2>
        <div class="card overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-100 text-left">
              <tr>
                <th class="table-cell">Nama</th>
                <th class="table-cell">Username</th>
                <th class="table-cell">Role</th>
                <th class="table-cell">Status</th>
                <th class="table-cell">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${allUsers.map(u => `
                <tr>
                  <td class="table-cell">${escapeHtml(u.name)}</td>
                  <td class="table-cell">${escapeHtml(u.username)}</td>
                  <td class="table-cell">${escapeHtml(u.role_name)}</td>
                  <td class="table-cell">${statusBadge(u.status)}</td>
                  <td class="table-cell">
                    ${u.id === Store.user.id
                      ? '<span class="text-xs text-slate-400">Akun Anda</span>'
                      : `<button class="btn btn-danger !py-1 !px-2.5 !text-xs" data-delete="${u.id}">Hapus</button>`}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- BUAT AKUN & MATA PELAJARAN -->
      <section class="grid md:grid-cols-2 gap-6">
        <div class="card p-5">
          <h2 class="text-lg font-bold mb-3">Buat Akun Langsung</h2>
          <p class="text-xs text-slate-500 mb-3">Akun yang dibuat di sini langsung berstatus disetujui.</p>
          <form id="create-user-form" class="space-y-3">
            <input class="input" type="text" name="name" placeholder="Nama Lengkap" required>
            <input class="input" type="text" name="username" placeholder="Username" required>
            <input class="input" type="password" name="password" placeholder="Password" required minlength="6">
            <select class="input" name="roleName" required>
              <option value="Siswa">Siswa</option>
              <option value="Guru">Guru</option>
              <option value="Admin">Admin</option>
            </select>
            <button type="submit" class="btn btn-primary w-full">Buat Akun</button>
          </form>
        </div>
        <div class="card p-5">
          <h2 class="text-lg font-bold mb-3">Mata Pelajaran / Mata Kuliah</h2>
          <ul class="text-sm divide-y divide-slate-200 mb-3 max-h-40 overflow-y-auto">
            ${subjects.length === 0
              ? '<li class="py-1.5 text-slate-400">Belum ada mata pelajaran.</li>'
              : subjects.map(s => `<li class="py-1.5">${escapeHtml(s.subject_name)}</li>`).join('')}
          </ul>
          <form id="create-subject-form" class="flex gap-2">
            <input class="input" type="text" name="subject_name" placeholder="Nama mata pelajaran baru" required>
            <button type="submit" class="btn btn-outline whitespace-nowrap">Tambah</button>
          </form>
        </div>
      </section>
    </div>
  `;

  // --- Events: approval ---
  content.querySelectorAll('[data-approve]').forEach(btn => btn.addEventListener('click', async () => {
    try { await api(`/users/${btn.dataset.approve}/approve`, { method: 'PATCH' }); toast('Akun disetujui.', 'success'); renderAdminDashboard(); }
    catch (err) { toast(err.message, 'error'); }
  }));
  content.querySelectorAll('[data-reject]').forEach(btn => btn.addEventListener('click', async () => {
    try { await api(`/users/${btn.dataset.reject}/reject`, { method: 'PATCH' }); toast('Akun ditolak.', 'success'); renderAdminDashboard(); }
    catch (err) { toast(err.message, 'error'); }
  }));

  // --- Events: isi profil guru ---
  content.querySelectorAll('[data-fill-profile]').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = document.getElementById('fill-profile-wrap');
      wrap.classList.remove('hidden');
      document.getElementById('fill-profile-name').textContent = btn.dataset.fillName;
      wrap.querySelector('[name="target_user_id"]').value = btn.dataset.fillProfile;
      wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  document.getElementById('btn-cancel-fill')?.addEventListener('click', () => {
    document.getElementById('fill-profile-wrap').classList.add('hidden');
  });
  document.getElementById('fill-profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const targetUserId = fd.get('target_user_id');
    const subject_ids = [...fd.getAll('subject_ids')].map(Number);
    try {
      await api(`/profile/teacher/${targetUserId}`, {
        method: 'POST',
        body: {
          full_name:   fd.get('full_name'),
          nomor_induk: fd.get('nomor_induk'),
          address:     fd.get('address'),
          phone:       fd.get('phone'),
          subject_ids,
        },
      });
      toast('Profil guru berhasil disimpan.', 'success');
      renderAdminDashboard();
    } catch (err) { toast(err.message, 'error'); }
  });

  // --- Events: delete user ---
  content.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Hapus user ini secara permanen?')) return;
    try { await api(`/users/${btn.dataset.delete}`, { method: 'DELETE' }); toast('User dihapus.', 'success'); renderAdminDashboard(); }
    catch (err) { toast(err.message, 'error'); }
  }));

  // --- Events: toggle panel guru ---
  content.querySelectorAll('[data-toggle-teacher]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const teacherId = btn.dataset.toggleTeacher;
      const panel = document.getElementById(`teacher-panel-${teacherId}`);
      panel.classList.toggle('hidden');
      if (!panel.classList.contains('hidden')) {
        await loadTeacherPanel(teacherId);
      }
    });
  });

  // --- Events: buat akun ---
  content.querySelector('#create-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/users', { method: 'POST', body: { name: fd.get('name'), username: fd.get('username'), password: fd.get('password'), roleName: fd.get('roleName') } });
      toast('Akun berhasil dibuat.', 'success');
      renderAdminDashboard();
    } catch (err) { toast(err.message, 'error'); }
  });

  // --- Events: mata pelajaran ---
  content.querySelector('#create-subject-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/subjects', { method: 'POST', body: { subject_name: fd.get('subject_name') } });
      toast('Mata pelajaran ditambahkan.', 'success');
      renderAdminDashboard();
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ---- Panel siswa per guru ---- */
async function loadTeacherPanel(teacherId) {
  const tableEl  = document.getElementById(`teacher-student-table-${teacherId}`);
  const selectEl = document.getElementById(`select-student-${teacherId}`);

  try {
    const [students, unassigned] = await Promise.all([
      api(`/teachers/${teacherId}/students`),
      api(`/teachers/${teacherId}/students/unassigned`),
    ]);

    tableEl.innerHTML = students.length === 0
      ? '<p class="text-slate-400 text-xs">Belum ada siswa yang di-assign ke guru ini.</p>'
      : `<table class="w-full text-xs border border-slate-200">
           <thead class="bg-slate-50 text-left">
             <tr>
               <th class="table-cell">Nama Siswa</th>
               <th class="table-cell">Username</th>
               <th class="table-cell">Aksi</th>
             </tr>
           </thead>
           <tbody>
             ${students.map(s => `
               <tr>
                 <td class="table-cell">${escapeHtml(s.name)}</td>
                 <td class="table-cell text-slate-500">${escapeHtml(s.username)}</td>
                 <td class="table-cell">
                   <button class="btn btn-danger !py-0.5 !px-2 !text-xs" data-unassign-student="${s.id}" data-from-teacher="${teacherId}">Hapus</button>
                 </td>
               </tr>`).join('')}
           </tbody>
         </table>`;

    tableEl.querySelectorAll('[data-unassign-student]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Hapus siswa ini dari daftar guru?')) return;
        try {
          await api(`/teachers/${btn.dataset.fromTeacher}/students/${btn.dataset.unassignStudent}`, { method: 'DELETE' });
          toast('Siswa dihapus dari guru.', 'success');
          await loadTeacherPanel(teacherId);
        } catch (err) { toast(err.message, 'error'); }
      });
    });

    selectEl.innerHTML = unassigned.length === 0
      ? '<option value="">— semua siswa sudah di-assign —</option>'
      : '<option value="">— pilih siswa —</option>' +
        unassigned.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.username)})</option>`).join('');

  } catch (err) {
    tableEl.innerHTML = `<p class="text-red-600 text-xs">${escapeHtml(err.message)}</p>`;
  }

  const assignBtn = document.querySelector(`[data-assign-student="${teacherId}"]`);
  if (assignBtn && !assignBtn.dataset.bound) {
    assignBtn.dataset.bound = '1';
    assignBtn.addEventListener('click', async () => {
      const studentId = document.getElementById(`select-student-${teacherId}`).value;
      if (!studentId) { toast('Pilih siswa terlebih dahulu.', 'error'); return; }
      try {
        await api(`/teachers/${teacherId}/students`, { method: 'POST', body: { studentIds: [Number(studentId)] } });
        toast('Siswa berhasil di-assign.', 'success');
        await loadTeacherPanel(teacherId);
      } catch (err) { toast(err.message, 'error'); }
    });
  }
}