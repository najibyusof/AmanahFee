/**
 * Auth screens: splash, login (all roles), forgot password, first-login password set.
 * Login matches 01/02/03 + 07._first_login mockups.
 */
import { t } from '../i18n/index.js';
import { api, ApiError, normalizePhone, formatPhone } from '../api.js';
import { store, login, roleHome } from '../store.js';
import { config } from '../config.js';
import {
  appbar, icon, esc, field, selectField, formValues, showErrors, clearErrors, setLoading, toast,
  errorState, banner, bindPTR, spin as spinner,
} from '../ui.js';
import { go } from '../router.js';

/* ---------------- Splash (01) ---------------- */
export function splashScreen(ctx) {
  ctx.root.innerHTML = `
    <div class="screen">
      <div class="content" style="display:flex;align-items:center;justify-content:center">
        <div class="splash">
          <div class="mark"><img src="img/logo.png" alt="ClassPay"></div>
          <div class="nm">${esc(t('app.name'))}</div>
          <div class="ver">${esc(t('app.tag'))}</div>
          <div style="margin-top:18px;color:var(--primary)">${spinner(26)}</div>
          <div class="ver">${esc(t('splash.loading'))}</div>
        </div>
      </div>
    </div>`;
  const timer = setTimeout(() => {
    if (!store.token) { go('#/login', { replace: true }); return; }
    if (store.mustChangePassword) { go('#/first-login', { replace: true }); return; }
    go(roleHome(store.activeRole || store.currentRole), { replace: true });
  }, 1100);
  return () => clearTimeout(timer);
}

/* ---------------- Login (02 / SA-01) ---------------- */
export function loginScreen(ctx) {
  const demo = config.MOCK
    ? `<div class="banner grey mt3" style="flex-wrap:wrap;gap:8px">
         ${icon('info', 16)}
         <div class="bt">${esc(t('login.demo', { phones: '' }))}</div>
       </div>
       <div class="tag-row mt2">
         ${config.MOCK_ACCOUNTS.map((a) => `<button class="tab" data-demo="${esc(a.phone)}" data-role="${esc(a.role)}">${esc(a.phone)} · ${esc(a.role)}</button>`).join('')}
       </div>`
    : '';

  ctx.root.innerHTML = `
    <div class="screen">
      <div class="content">
        <div class="auth-hero">
          <div class="mark"><img src="img/logo.png" alt=""></div>
          <div class="nm">${esc(t('login.welcome'))}</div>
          <div class="tag">${esc(t('app.tag'))} · ${esc(t('app.system'))}</div>
        </div>
        <div class="pad stack">
          <div class="card" data-form>
            <p class="lead mb0" style="margin-top:0">${esc(t('login.hint'))}</p>
            <form id="login-form" autocomplete="off" novalidate>
              ${field('phone', { label: t('login.phone'), req: true, hint: t('login.phoneHint'), type: 'tel', inputmode: 'tel', placeholder: '012-345 6789', ic: 'phone', autocomplete: 'username' })}
              ${field('password', { label: t('login.password'), req: true, type: 'password', placeholder: '••••••••', ic: 'lock', act: 'toggle-pw', actIcon: 'eye', autocomplete: 'current-password' })}
              <div class="mt4">
                <button type="submit" class="btn btn-primary btn-block" id="login-btn">
                  ${icon('login', 18)} ${esc(t('login.submit'))}
                </button>
              </div>
            </form>
            <button class="center-link" data-go="#/forgot-password">${esc(t('login.forgot'))}</button>
            <button class="center-link" data-go="#/register">${esc(t('login.register'))}</button>
          </div>
          ${demo}
          <div class="note">${esc(t('login.secure'))}</div>
        </div>
      </div>
    </div>`;

  const form = ctx.root.querySelector('#login-form');
  const card = ctx.root.querySelector('[data-form]');

  // demo account chips (MOCK only)
  ctx.root.querySelectorAll('[data-demo]').forEach((b) => {
    b.addEventListener('click', () => {
      form.phone.value = b.dataset.demo;
      form.password.value = 'password123';
      ctx.root.querySelectorAll('[data-demo]').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    });
  });

  // password visibility
  form.querySelector('[data-act2="toggle-pw"]').addEventListener('click', () => {
    const inp = form.password;
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(card);
    const v = formValues(form);
    const errs = {};
    if (!String(v.phone || '').trim()) errs.phone = [t('v.required')];
    if (!v.password) errs.password = [t('v.required')];
    if (Object.keys(errs).length) { showErrors(card, errs); return; }

    const btn = ctx.root.querySelector('#login-btn');
    setLoading(btn, true);
    try {
      await login(v.phone, v.password);
      setLoading(btn, false);
      const dest = store.mustChangePassword ? '#/first-login' : roleHome(store.activeRole || store.currentRole);
      go(dest, { replace: true });
    } catch (err) {
      setLoading(btn, false);
      if (err instanceof ApiError && err.status === 401) {
        showErrors(card, {}, t('login.err'));
      } else if (err instanceof ApiError && err.isValidation) {
        showErrors(card, err.errors, t('err.validation'));
      } else if (err.isOffline) {
        showErrors(card, {}, t('err.network'));
      } else {
        showErrors(card, {}, err.message || t('err.generic'));
      }
    }
  });
}

/* ---------------- Public user registration ---------------- */
export function registerScreen(ctx) {
  ctx.root.innerHTML = `
    <div class="screen">
      ${appbar({ title: t('register.title'), back: true, avatar: false })}
      <div class="content pad">
        <div class="card mt4" data-form>
          <p class="lead" style="margin-top:0">${esc(t('register.sub'))}</p>
          <form id="register-form" novalidate>
            ${field('name', { label: t('register.name'), req: true, maxlength: 150, autocomplete: 'name' })}
            ${field('phone', { label: t('register.phone'), req: true, type: 'tel', inputmode: 'tel', placeholder: '012-345 6789', autocomplete: 'tel' })}
            ${field('email', { label: t('register.email'), type: 'email', inputmode: 'email', autocomplete: 'email' })}
            ${selectField('user_type', {
              label: t('register.type'),
              req: true,
              value: 'student',
              options: [
                { value: 'student', label: t('register.student') },
                { value: 'sponsor', label: t('register.sponsor') },
              ],
            })}
            ${field('password', { label: t('register.password'), req: true, type: 'password', autocomplete: 'new-password' })}
            ${field('password_confirmation', { label: t('register.confirmPassword'), req: true, type: 'password', autocomplete: 'new-password' })}
            <button type="submit" class="btn btn-primary btn-block mt3" id="register-btn">${icon('userPlus', 17)} ${esc(t('register.submit'))}</button>
          </form>
        </div>
      </div>
    </div>`;

  const form = ctx.root.querySelector('#register-form');
  const card = ctx.root.querySelector('[data-form]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(card);
    const values = formValues(form);
    const errors = {};
    if (!String(values.name || '').trim()) errors.name = [t('v.required')];
    if (!String(values.phone || '').trim()) errors.phone = [t('v.required')];
    if (!values.password || values.password.length < 8)
      errors.password = [t('register.passwordLength')];
    if (values.password !== values.password_confirmation)
      errors.password_confirmation = [t('register.passwordMismatch')];
    if (Object.keys(errors).length) {
      showErrors(card, errors);
      return;
    }

    const button = ctx.root.querySelector('#register-btn');
    setLoading(button, true);
    try {
      await api.post(`/auth/register/${values.user_type}`, {
        name: values.name.trim(),
        phone: normalizePhone(values.phone),
        email: values.email.trim() || null,
        password: values.password,
        password_confirmation: values.password_confirmation,
        device_name: config.DEVICE_NAME,
      });
      setLoading(button, false);
      toast(t('register.success'), 'ok');
      go('#/login', { replace: true });
    } catch (error) {
      setLoading(button, false);
      showErrors(card, error.errors || {}, error.message || t('err.generic'));
    }
  });
}

/* ---------------- Forgot password (03) ---------------- */
export function forgotScreen(ctx) {
  let sent = false;
  const render = () => {
    ctx.root.innerHTML = `
      <div class="screen">
        ${appbar({ title: t('forgot.title'), back: true, avatar: false })}
        <div class="content pad">
          ${sent ? `
            <div class="card mt4 center" data-form>
              <div class="success-ico" style="background:var(--primary)">${icon('mail', 40)}<span class="mini">${icon('check', 15)}</span></div>
              <div class="h2">${esc(t('forgot.sent.title'))}</div>
              <p class="lead">${esc(t('forgot.sent.sub'))}</p>
              <button class="btn btn-primary btn-block mt3" data-go="#/login">${esc(t('forgot.sent.back'))}</button>
            </div>` : `
            <div class="card mt4" data-form>
              <p class="lead" style="margin-top:0">${esc(t('forgot.sub'))}</p>
              <form id="forgot-form" novalidate>
                ${field('email', { label: t('forgot.email'), req: true, type: 'email', inputmode: 'email', placeholder: 'nama@contoh.com', ic: 'mail', autocomplete: 'email' })}
                <div class="mt4">
                  <button type="submit" class="btn btn-primary btn-block" id="forgot-btn">${icon('send', 17)} ${esc(t('forgot.submit'))}</button>
                </div>
              </form>
            </div>`}
        </div>
      </div>`;
    if (!sent) bind();
  };
  const bind = () => {
    const form = ctx.root.querySelector('#forgot-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const card = ctx.root.querySelector('[data-form]');
      clearErrors(card);
      const v = formValues(form);
      if (!v.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) { showErrors(card, { email: [t('v.email')] }); return; }
      const btn = ctx.root.querySelector('#forgot-btn');
      setLoading(btn, true);
      try {
        await api.post('/auth/forgot-password', { email: v.email });
        setLoading(btn, false);
        sent = true;
        render();
      } catch (err) {
        setLoading(btn, false);
        const message =
          err instanceof ApiError && err.status >= 500
            ? t('forgot.unavailable')
            : err.message || t('err.generic');
        showErrors(card, err.errors || {}, message);
      }
    });
  };
  render();
}

/* ---------------- First-login: set temp password (07) ---------------- */
export function firstLoginScreen(ctx) {
  ctx.root.innerHTML = `
    <div class="screen">
      <div class="content pad">
        <div class="center" style="padding:26px 0 6px">
          <div class="success-ico" style="background:var(--primary-soft);color:var(--primary);box-shadow:none">
            ${icon('shieldCheck', 44)}
          </div>
          <span class="step-chip">${icon('shield', 13)} ${esc(t('first.badge'))}</span>
          <h1 class="h1 mt3">${esc(t('first.title'))}</h1>
          <p class="lead bold" style="color:var(--primary)">${esc(t('first.sub'))}</p>
        </div>
        <div class="card mt3" data-form>
          ${banner('', esc(t('first.block')), 'shield')}
          <form id="first-form" novalidate class="mt4">
            ${field('current_password', { label: t('first.temp'), hint: t('first.tempHint'), type: 'password', placeholder: '••••••••', ic: 'key' })}
            ${field('password', { label: t('first.new'), req: true, type: 'password', placeholder: t('first.newPh'), ic: 'lock', act: 'toggle-pw', actIcon: 'eyeOff' })}
            <div class="strength"><i id="pw-bar"></i></div>
            <div class="field-hint mt2" id="pw-strength">${esc(t('strength'))}: —</div>
            ${field('password_confirmation', { label: t('first.confirm'), req: true, type: 'password', placeholder: t('first.confirmPh'), ic: 'checkCircle', act: 'toggle-pw2', actIcon: 'eyeOff' })}
            <div class="rules mt4" id="pw-rules">
              <div class="rule" data-rule="min8">${icon('checkCircle', 15)} ${esc(t('rule.min8'))}</div>
              <div class="rule" data-rule="alnum">${icon('checkCircle', 15)} ${esc(t('rule.letter'))}</div>
              <div class="rule" data-rule="match">${icon('checkCircle', 15)} ${esc(t('rule.match'))}</div>
            </div>
            <div class="mt4">
              <button type="submit" class="btn btn-primary btn-block" id="first-btn">${icon('lock', 17)} ${esc(t('first.submit'))}</button>
            </div>
          </form>
        </div>
        <div class="note">${icon('shieldCheck', 13)} ${esc(t('pw.encrypted'))}</div>
      </div>
    </div>`;

  const form = ctx.root.querySelector('#first-form');
  const card = ctx.root.querySelector('[data-form]');
  form.querySelector('[data-act2="toggle-pw"]').addEventListener('click', () => { form.password.type = form.password.type === 'password' ? 'text' : 'password'; });
  form.querySelector('[data-act2="toggle-pw2"]').addEventListener('click', () => { form.password_confirmation.type = form.password_confirmation.type === 'password' ? 'text' : 'password'; });

  const evaluate = () => {
    const p = form.password.value;
    const c = form.password_confirmation.value;
    const min8 = p.length >= 8;
    const alnum = /[A-Za-z]/.test(p) && /\d/.test(p);
    const match = p.length > 0 && p === c;
    const score = (min8 ? 1 : 0) + (alnum ? 1 : 0) + (match ? 1 : 0);
    const labels = [t('strength.weak'), t('strength.weak'), t('strength.fair'), t('strength.good')];
    ctx.root.querySelector('#pw-strength').textContent = `${t('strength')}: ${labels[score]}`;
    const bar = ctx.root.querySelector('#pw-bar');
    bar.style.width = `${(score / 3) * 100}%`;
    bar.style.background = score >= 3 ? 'var(--ok)' : score === 2 ? 'var(--warn-dot)' : 'var(--danger)';
    ctx.root.querySelector('[data-rule="min8"]').classList.toggle('ok', min8);
    ctx.root.querySelector('[data-rule="alnum"]').classList.toggle('ok', alnum);
    ctx.root.querySelector('[data-rule="match"]').classList.toggle('ok', match);
    return { min8, alnum, match };
  };
  form.addEventListener('input', evaluate);
  evaluate();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(card);
    const v = formValues(form);
    const st = evaluate();
    const errs = {};
    if (!v.password) errs.password = [t('v.required')];
    else if (!st.min8) errs.password = [t('v.min8')];
    else if (!st.alnum) errs.password = [t('rule.letter')];
    if (v.password !== v.password_confirmation) errs.password_confirmation = [t('v.match')];
    if (Object.keys(errs).length) { showErrors(card, errs); return; }

    const btn = ctx.root.querySelector('#first-btn');
    setLoading(btn, true);
    try {
      try {
        await api.post('/auth/set-password', { password: v.password, password_confirmation: v.password_confirmation });
      } catch (err) {
        // account already has a password → treat screen as change-password with temp as current
        if (err instanceof ApiError && err.status === 422 && /already been set/i.test(err.message || '')) {
          if (!v.current_password) {
            throw new ApiError(422, t('first.already'), { current_password: [t('pw.current')] });
          }
          await api.post('/auth/change-password', {
            current_password: v.current_password,
            password: v.password,
            password_confirmation: v.password_confirmation,
          });
        } else throw err;
      }
      store.mustChangePassword = false;
      store.user = store.user ? { ...store.user, must_change_password: false } : store.user;
      setLoading(btn, false);
      toast(t('first.success'), 'ok');
      go(roleHome(store.activeRole || store.currentRole), { replace: true });
    } catch (err) {
      setLoading(btn, false);
      if (err instanceof ApiError && err.isValidation) showErrors(card, err.errors, err.message || t('err.validation'));
      else showErrors(card, {}, err.message || t('err.generic'));
    }
  });
}
