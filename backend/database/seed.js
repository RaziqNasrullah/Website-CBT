/**
 * Seed Script (MySQL via XAMPP)
 * Mengisi data awal: 3 role (Admin, Guru, Siswa) dan satu akun Admin pertama.
 * Jalankan dengan: npm run seed
 */
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
require('dotenv').config();

async function seed() {
  console.log('Menjalankan seeding data awal...');

  const roles = ['Admin', 'Guru', 'Siswa'];
  for (const roleName of roles) {
    await pool.execute('INSERT IGNORE INTO roles (role_name) VALUES (?)', [roleName]);
  }
  console.log('Role berhasil di-seed:', roles.join(', '));

  const [adminRoleRows] = await pool.execute(
    "SELECT id FROM roles WHERE role_name = 'Admin'"
  );
  const adminRoleId = adminRoleRows[0].id;

  const [existingAdminRows] = await pool.execute(
    'SELECT id FROM users WHERE role_id = ? LIMIT 1',
    [adminRoleId]
  );

  if (existingAdminRows.length > 0) {
    console.log('Akun Admin sudah ada, lewati pembuatan admin default.');
    await pool.end();
    return;
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const plainPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const name = process.env.DEFAULT_ADMIN_NAME || 'Administrator';

  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

  await pool.execute(
    `INSERT INTO users (username, password, name, role_id, status)
     VALUES (?, ?, ?, ?, 'approved')`,
    [username, hashedPassword, name, adminRoleId]
  );

  console.log(`Akun Admin default berhasil dibuat -> username: "${username}"`);
  console.log('PENTING: segera ganti password default ini setelah login pertama.');

  await pool.end();
}

seed().catch((err) => {
  console.error('Seeding gagal:', err.message);
  process.exit(1);
});
