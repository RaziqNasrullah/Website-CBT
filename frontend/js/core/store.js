/**
 * Store
 * Menyimpan sesi login (JWT token + data user) di localStorage,
 * agar tetap login walau halaman di-refresh.
 */
export const Store = {
  get token() {
    return localStorage.getItem('cbt_token');
  },
  set token(v) {
    v ? localStorage.setItem('cbt_token', v) : localStorage.removeItem('cbt_token');
  },
  get user() {
    try {
      return JSON.parse(localStorage.getItem('cbt_user'));
    } catch (e) {
      return null;
    }
  },
  set user(v) {
    v ? localStorage.setItem('cbt_user', JSON.stringify(v)) : localStorage.removeItem('cbt_user');
  },
  clear() {
    this.token = null;
    this.user = null;
  },
};
