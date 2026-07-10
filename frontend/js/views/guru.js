import { app } from '../core/dom.js';
import { api } from '../core/api.js';
import { toast, escapeHtml, fmtScore } from '../core/utils.js';
import { shell, attachLogout } from '../layout/shell.js';
import { navigate } from '../core/router.js';

/* ---- Dashboard utama ---- */
export async function renderGuruDashboard() {
  app.innerHTML = shell('Guru', 'dashboard', `<div id="guru-content" class="text-sm text-slate-500">Memuat data...</div>`);
  attachLogout();

  let exams = [], subjects = [], profile = null;
  try {
    [exams, subjects, profile] = await Promise.all([
      api('/exams/mine'),
      api('/subjects'),
      api('/profile/me'),
    ]);
  } catch (err) {
    document.getElementById('guru-content').innerHTML = `<p class="text-red-600 text-sm">${escapeHtml(err.message)}</p>`;
    return;
  }

  const content = document.getElementById('guru-content');
  content.innerHTML = `
    <div class="space-y-8">

      <!-- INFO PROFIL -->
      <section class="card p-5">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div class="space-y-1">
            <p class="text-xs text-slate-400 uppercase tracking-wide">Profil Anda</p>
            <p class="text-lg font-bold">${escapeHtml(profile?.full_name || '—')}</p>
            <p class="text-sm text-slate-500">
              Nomor Induk: <span class="font-medium">${escapeHtml(profile?.nomor_induk || '—')}</span>
            </p>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              <span>📞 ${escapeHtml(profile?.phone || '—')}</span>
              <span>📍 ${escapeHtml(profile?.address || '—')}</span>
            </div>
            ${profile?.subjects?.length
              ? `<div class="flex flex-wrap gap-1 mt-1">
                  ${profile.subjects.map(s => `<span class="badge border-slate-300 text-slate-600">${escapeHtml(s.subject_name)}</span>`).join('')}
                </div>`
              : '<p class="text-xs text-slate-400 mt-1">Belum ada mata kuliah yang ditetapkan.</p>'}
          </div>
          <button id="btn-edit-profile" class="btn btn-outline shrink-0">Edit Profil</button>
        </div>

        <!-- Form edit profil (tersembunyi) -->
        <div id="edit-profile-wrap" class="hidden mt-5 pt-5 border-t border-slate-100">
          <h3 class="font-bold mb-3">Edit Profil</h3>
          <form id="edit-profile-form" class="space-y-4">
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label class="label">Nama Lengkap + Gelar</label>
                <input class="input" type="text" name="full_name" value="${escapeHtml(profile?.full_name || '')}" required>
              </div>
              <div>
                <label class="label">Nomor Induk (NIP / NIDN / ID Kepegawaian)</label>
                <input class="input" type="text" name="nomor_induk" value="${escapeHtml(profile?.nomor_induk || '')}" required>
              </div>
            </div>
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label class="label">Nomor Telepon</label>
                <input class="input" type="tel" name="phone" value="${escapeHtml(profile?.phone || '')}" required>
              </div>
              <div>
                <label class="label">Alamat</label>
                <input class="input" type="text" name="address" value="${escapeHtml(profile?.address || '')}" required>
              </div>
            </div>
            <div>
              <label class="label">Mata Kuliah yang Diajar</label>
              <div class="border border-slate-200 divide-y divide-slate-100 max-h-40 overflow-y-auto">
                ${subjects.length === 0
                  ? `<p class="px-3 py-2 text-xs text-slate-400">Belum ada mata kuliah tersedia.</p>`
                  : subjects.map(s => {
                      const checked = profile?.subjects?.some(ps => ps.id === s.id) ? 'checked' : '';
                      return `
                        <label class="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                          <input type="checkbox" name="subject_ids" value="${s.id}" ${checked} class="shrink-0">
                          ${escapeHtml(s.subject_name)}
                        </label>`;
                    }).join('')}
              </div>
            </div>
            <div class="flex gap-2 justify-end">
              <button type="button" id="btn-cancel-edit-profile" class="btn btn-outline">Batal</button>
              <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
            </div>
          </form>
        </div>
      </section>

      <!-- HEADER UJIAN -->
      <section class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold">Ujian Saya</h1>
          <p class="text-sm text-slate-500">Kelola ujian, soal, penugasan siswa, dan pantau hasil di sini.</p>
        </div>
        <button id="btn-new-exam" class="btn btn-primary">+ Buat Ujian</button>
      </section>

      <!-- FORM BUAT UJIAN -->
      <div id="new-exam-form-wrap" class="hidden card p-5">
        <h2 class="font-bold mb-3">Ujian Baru</h2>
        <form id="new-exam-form" class="grid md:grid-cols-2 gap-3">
          <div>
            <label class="label">Judul Ujian</label>
            <input class="input" type="text" name="title" required>
          </div>
          <div>
            <label class="label">Mata Pelajaran</label>
            <select class="input" name="subject_id" required>
              <option value="">— pilih —</option>
              ${subjects.map(s => `<option value="${s.id}">${escapeHtml(s.subject_name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="label">Durasi (menit)</label>
            <input class="input" type="number" name="duration" min="1" value="60" required>
          </div>
          <div>
            <label class="label">Nilai Minimal Lulus (Passing Grade)</label>
            <input class="input" type="number" name="minimum_score" min="0" max="100" step="0.01" value="75" required>
          </div>
          <div class="md:col-span-2 flex gap-2 justify-end">
            <button type="button" id="btn-cancel-new-exam" class="btn btn-outline">Batal</button>
            <button type="submit" class="btn btn-primary">Simpan Ujian</button>
          </div>
        </form>
      </div>

      <!-- TABEL UJIAN -->
      <section class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-100 text-left">
            <tr>
              <th class="table-cell">Judul</th>
              <th class="table-cell">Mapel</th>
              <th class="table-cell">Durasi</th>
              <th class="table-cell">Nilai Minimal</th>
              <th class="table-cell">Status</th>
              <th class="table-cell">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${exams.length === 0
              ? `<tr><td class="table-cell text-slate-400" colspan="6">Belum ada ujian. Buat ujian baru di atas.</td></tr>`
              : exams.map(e => `
                <tr>
                  <td class="table-cell font-medium">${escapeHtml(e.title)}</td>
                  <td class="table-cell">${escapeHtml(e.subject_name)}</td>
                  <td class="table-cell">${e.duration} menit</td>
                  <td class="table-cell">${fmtScore(e.minimum_score)}</td>
                  <td class="table-cell">${e.is_active
                    ? '<span class="badge border-emerald-300 text-emerald-700 bg-emerald-50">Aktif</span>'
                    : '<span class="badge border-slate-300 text-slate-500">Nonaktif</span>'}</td>
                  <td class="table-cell space-x-2 whitespace-nowrap">
                    <a href="#exam-builder/${e.id}" class="btn btn-outline !py-1 !px-2.5 !text-xs">Soal</a>
                    <a href="#exam-assign/${e.id}" class="btn btn-outline !py-1 !px-2.5 !text-xs">Tugaskan</a>
                    <a href="#exam-scores/${e.id}" class="btn btn-outline !py-1 !px-2.5 !text-xs">Nilai</a>
                    <button class="btn btn-danger !py-1 !px-2.5 !text-xs" data-delete-exam="${e.id}">Hapus</button>
                  </td>
                </tr>`).join('')}
          </tbody>
        </table>
      </section>
    </div>
  `;

  // Toggle edit profil
  document.getElementById('btn-edit-profile').addEventListener('click', () => {
    document.getElementById('edit-profile-wrap').classList.toggle('hidden');
  });
  document.getElementById('btn-cancel-edit-profile').addEventListener('click', () => {
    document.getElementById('edit-profile-wrap').classList.add('hidden');
  });

  // Submit edit profil
  document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const subject_ids = [...fd.getAll('subject_ids')].map(Number);
    try {
      await api('/profile/me', {
        method: 'POST',
        body: {
          full_name:   fd.get('full_name'),
          nomor_induk: fd.get('nomor_induk'),
          address:     fd.get('address'),
          phone:       fd.get('phone'),
          subject_ids,
        },
      });
      toast('Profil berhasil diperbarui.', 'success');
      renderGuruDashboard();
    } catch (err) { toast(err.message, 'error'); }
  });

  // Toggle form ujian baru
  document.getElementById('btn-new-exam').addEventListener('click', () => {
    document.getElementById('new-exam-form-wrap').classList.toggle('hidden');
  });
  document.getElementById('btn-cancel-new-exam').addEventListener('click', () => {
    document.getElementById('new-exam-form-wrap').classList.add('hidden');
  });

  document.getElementById('new-exam-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/exams', {
        method: 'POST',
        body: {
          title:         fd.get('title'),
          subject_id:    Number(fd.get('subject_id')),
          duration:      Number(fd.get('duration')),
          minimum_score: Number(fd.get('minimum_score')),
        },
      });
      toast('Ujian berhasil dibuat.', 'success');
      renderGuruDashboard();
    } catch (err) { toast(err.message, 'error'); }
  });

  content.querySelectorAll('[data-delete-exam]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Hapus ujian ini beserta seluruh soal dan riwayat pengerjaannya?')) return;
    try {
      await api(`/exams/${btn.dataset.deleteExam}`, { method: 'DELETE' });
      toast('Ujian dihapus.', 'success');
      renderGuruDashboard();
    } catch (err) { toast(err.message, 'error'); }
  }));
}

/* ---- Exam Assign ---- */
export async function renderExamAssign(examId) {
  app.innerHTML = shell('Guru', 'assign', `<div id="assign-content" class="text-sm text-slate-500">Memuat data...</div>`);
  attachLogout();

  let exam, assigned, assignable;
  try {
    [exam, assigned, assignable] = await Promise.all([
      api(`/exams/${examId}`),
      api(`/exams/${examId}/assignments`),
      api(`/exams/${examId}/assignments/assignable`),
    ]);
  } catch (err) {
    document.getElementById('assign-content').innerHTML = `<p class="text-red-600 text-sm">${escapeHtml(err.message)}</p>`;
    return;
  }

  const content = document.getElementById('assign-content');
  content.innerHTML = `
    <a href="#dashboard-guru" class="text-sm text-slate-500 underline">&larr; Kembali ke Ujian Saya</a>
    <div class="mt-2 mb-6">
      <h1 class="text-xl font-bold">Penugasan Siswa — ${escapeHtml(exam.title)}</h1>
      <p class="text-sm text-slate-500">${escapeHtml(exam.subject_name)} · ${exam.duration} menit · Nilai minimal ${fmtScore(exam.minimum_score)}</p>
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <div class="card p-5">
        <h2 class="font-bold mb-3">Siswa Ditugaskan <span class="text-slate-400 font-normal">(${assigned.length})</span></h2>
        <div id="assigned-list">${renderAssignedTable(assigned, examId)}</div>
      </div>

      <div class="card p-5">
        <h2 class="font-bold mb-3">Tambah Siswa ke Ujian Ini</h2>
        <p class="text-xs text-slate-500 mb-3">
          Hanya siswa di bawah tanggung jawab Anda yang tersedia.
          Minta Admin untuk menambahkan siswa ke daftar Anda terlebih dahulu.
        </p>
        ${assignable.length === 0
          ? `<p class="text-sm text-slate-400">Semua siswa di bawah Anda sudah ditugaskan, atau Anda belum memiliki siswa.</p>`
          : `<div class="space-y-3">
               <div class="border border-slate-200 divide-y divide-slate-100 max-h-64 overflow-y-auto">
                 ${assignable.map(s => `
                   <label class="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                     <input type="checkbox" name="assign_student" value="${s.id}" class="shrink-0">
                     <span>
                       <span class="font-medium">${escapeHtml(s.name)}</span>
                       <span class="text-slate-400 text-xs ml-1">${escapeHtml(s.username)}</span>
                     </span>
                   </label>`).join('')}
               </div>
               <div class="flex items-center gap-3">
                 <label class="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                   <input type="checkbox" id="check-all-students"> Pilih semua
                 </label>
                 <button id="btn-assign-students" class="btn btn-primary ml-auto">Tugaskan yang Dipilih</button>
               </div>
             </div>`}
      </div>
    </div>
  `;

  attachAssignEvents(content, examId);
}

function renderAssignedTable(assigned, examId) {
  if (assigned.length === 0) {
    return `<p class="text-sm text-slate-400">Belum ada siswa yang ditugaskan ke ujian ini.</p>`;
  }
  return `
    <table class="w-full text-xs">
      <thead class="bg-slate-50 text-left">
        <tr>
          <th class="table-cell">Nama</th>
          <th class="table-cell">Ditugaskan Oleh</th>
          <th class="table-cell">Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${assigned.map(s => `
          <tr>
            <td class="table-cell">
              <p class="font-medium">${escapeHtml(s.student_name)}</p>
              <p class="text-slate-400">${escapeHtml(s.username)}</p>
            </td>
            <td class="table-cell text-slate-500">${escapeHtml(s.assigned_by_name)}</td>
            <td class="table-cell">
              <button class="btn btn-danger !py-0.5 !px-2 !text-xs" data-unassign="${s.student_id}" data-exam="${examId}">Hapus</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function attachAssignEvents(content, examId) {
  const checkAll = content.querySelector('#check-all-students');
  if (checkAll) {
    checkAll.addEventListener('change', () => {
      content.querySelectorAll('[name="assign_student"]').forEach(cb => cb.checked = checkAll.checked);
    });
  }

  const btnAssign = content.querySelector('#btn-assign-students');
  if (btnAssign) {
    btnAssign.addEventListener('click', async () => {
      const checked = [...content.querySelectorAll('[name="assign_student"]:checked')];
      if (!checked.length) { toast('Pilih minimal satu siswa.', 'error'); return; }
      const studentIds = checked.map(cb => Number(cb.value));
      try {
        await api(`/exams/${examId}/assignments`, { method: 'POST', body: { studentIds } });
        toast(`${studentIds.length} siswa berhasil ditugaskan.`, 'success');
        renderExamAssign(examId);
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  content.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-unassign]');
    if (!btn) return;
    if (!confirm('Hapus siswa ini dari penugasan ujian?')) return;
    try {
      await api(`/exams/${btn.dataset.exam}/assignments/${btn.dataset.unassign}`, { method: 'DELETE' });
      toast('Siswa dihapus dari penugasan.', 'success');
      renderExamAssign(examId);
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ---- Exam Builder ---- */
export async function renderExamBuilder(examId) {
  app.innerHTML = shell('Guru', 'builder', `<div id="builder-content" class="text-sm text-slate-500">Memuat soal...</div>`);
  attachLogout();

  let exam, questions;
  try {
    [exam, questions] = await Promise.all([api(`/exams/${examId}`), api(`/exams/${examId}/questions`)]);
  } catch (err) {
    document.getElementById('builder-content').innerHTML = `<p class="text-red-600 text-sm">${escapeHtml(err.message)}</p>`;
    return;
  }

  const content = document.getElementById('builder-content');
  content.innerHTML = `
    <a href="#dashboard-guru" class="text-sm text-slate-500 underline">&larr; Kembali ke Ujian Saya</a>
    <div class="mt-2 mb-6">
      <h1 class="text-xl font-bold">${escapeHtml(exam.title)}</h1>
      <p class="text-sm text-slate-500">${escapeHtml(exam.subject_name)} · ${exam.duration} menit · Nilai minimal ${fmtScore(exam.minimum_score)}</p>
    </div>

    <div class="card p-5 mb-6">
      <h2 class="font-bold mb-3">Tambah Soal Baru</h2>
      <form id="add-question-form" class="space-y-3">
        <div>
          <label class="label">Teks Pertanyaan</label>
          <textarea class="input" name="question_text" rows="2" required></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Bobot Nilai Soal</label>
            <input class="input" type="number" name="score_weight" value="1" min="0.1" step="0.1" required>
          </div>
        </div>
        <div class="space-y-2">
          ${[0,1,2,3].map(i => `
            <div class="flex items-center gap-2">
              <input type="radio" name="correct_option" value="${i}" ${i===0?'checked':''} class="shrink-0">
              <input class="input" type="text" name="option_${i}" placeholder="Opsi jawaban ${String.fromCharCode(65+i)}" required>
            </div>`).join('')}
        </div>
        <p class="text-xs text-slate-500">Pilih radio button di samping opsi yang merupakan jawaban benar.</p>
        <button type="submit" class="btn btn-primary">Tambah Soal</button>
      </form>
    </div>

    <h2 class="font-bold mb-3">Daftar Soal (${questions.length})</h2>
    <div class="space-y-3">
      ${questions.length === 0
        ? '<p class="text-sm text-slate-400">Belum ada soal.</p>'
        : questions.map((q, idx) => `
          <div class="card p-4">
            <div class="flex justify-between items-start gap-3">
              <p class="font-medium text-sm flex-1">${idx+1}. ${escapeHtml(q.question_text)} <span class="text-xs text-slate-400">(bobot ${q.score_weight})</span></p>
              <button class="btn btn-danger !py-1 !px-2.5 !text-xs shrink-0" data-delete-q="${q.id}">Hapus</button>
            </div>
            <ul class="mt-2 text-sm space-y-1">
              ${q.options.map(o => `
                <li class="flex items-center gap-2 ${o.is_correct ? 'text-emerald-700 font-semibold' : 'text-slate-600'}">
                  <span class="w-4 h-4 border ${o.is_correct ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'} inline-block"></span>
                  ${escapeHtml(o.option_text)}
                </li>`).join('')}
            </ul>
          </div>`).join('')}
    </div>
  `;

  document.getElementById('add-question-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const correctIdx = Number(fd.get('correct_option'));
    const options = [0,1,2,3].map(i => ({ option_text: fd.get(`option_${i}`), is_correct: i===correctIdx }));
    try {
      await api(`/exams/${examId}/questions`, {
        method: 'POST',
        body: { question_text: fd.get('question_text'), score_weight: Number(fd.get('score_weight')), options },
      });
      toast('Soal ditambahkan.', 'success');
      renderExamBuilder(examId);
    } catch (err) { toast(err.message, 'error'); }
  });

  content.querySelectorAll('[data-delete-q]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Hapus soal ini?')) return;
    try {
      await api(`/questions/${btn.dataset.deleteQ}`, { method: 'DELETE' });
      toast('Soal dihapus.', 'success');
      renderExamBuilder(examId);
    } catch (err) { toast(err.message, 'error'); }
  }));
}

/* ---- Pantauan Nilai ---- */
export async function renderExamScores(examId) {
  app.innerHTML = shell('Guru', 'scores', `<div id="scores-content" class="text-sm text-slate-500">Memuat nilai...</div>`);
  attachLogout();

  let exam, summary;
  try {
    [exam, summary] = await Promise.all([api(`/exams/${examId}`), api(`/exams/${examId}/scores`)]);
  } catch (err) {
    document.getElementById('scores-content').innerHTML = `<p class="text-red-600 text-sm">${escapeHtml(err.message)}</p>`;
    return;
  }

  const statusBadge = (status) => {
    const map = {
      'Lulus':            'border-emerald-300 text-emerald-700 bg-emerald-50',
      'Harus Mengulang':  'border-amber-300 text-amber-700 bg-amber-50',
      'Belum Dikerjakan': 'border-slate-200 text-slate-500 bg-slate-50',
    };
    return `<span class="badge ${map[status] || 'border-slate-200 text-slate-500'}">${status}</span>`;
  };

  document.getElementById('scores-content').innerHTML = `
    <a href="#dashboard-guru" class="text-sm text-slate-500 underline">&larr; Kembali ke Ujian Saya</a>
    <div class="mt-2 mb-6">
      <h1 class="text-xl font-bold">Pantauan Nilai — ${escapeHtml(exam.title)}</h1>
      <p class="text-sm text-slate-500">Nilai minimal lulus: <strong>${fmtScore(exam.minimum_score)}</strong> · ${summary.length} siswa ditugaskan</p>
    </div>
    <div class="card overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-100 text-left">
          <tr>
            <th class="table-cell">Nama Siswa</th>
            <th class="table-cell">Nilai Tertinggi</th>
            <th class="table-cell">Status</th>
            <th class="table-cell text-center">Percobaan</th>
          </tr>
        </thead>
        <tbody>
          ${summary.length === 0
            ? `<tr><td class="table-cell text-slate-400" colspan="4">Belum ada siswa yang ditugaskan.</td></tr>`
            : summary.map(row => `
              <tr>
                <td class="table-cell font-medium">${escapeHtml(row.student_name)}</td>
                <td class="table-cell">${fmtScore(row.highest_score)}</td>
                <td class="table-cell">${statusBadge(row.status)}</td>
                <td class="table-cell text-center">${row.attempt_count > 0 ? `${row.attempt_count}x` : '<span class="text-slate-300">—</span>'}</td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}