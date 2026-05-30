/* ─────────────────────────────────────────────────────────────
   intro_welcome.js — гейт "новичок vs возвращающийся" на экране загрузки.

   Контракт: после прелоада scene_boot.js зовёт IntroWelcome.gate(onContinue):
   - старый игрок (есть флаг localStorage.da_welcome_seen) → onContinue() сразу,
     loading-screen плавно гаснет (старое поведение).
   - новый игрок → показываем кнопку «ВОЙТИ В АРЕНУ», прогресс-бар скрыт.
     Клик → ставим флаг → onContinue().

   Сброс флага (отладка):  localStorage.removeItem('da_welcome_seen')
   ───────────────────────────────────────────────────────────── */
(function(){
  const KEY = 'da_welcome_seen';

  function _seen(){
    try { return localStorage.getItem(KEY) === '1'; }
    catch(_) { return false; } // private-mode/quota — считаем «не видел», но не падаем
  }
  function _markSeen(){
    try { localStorage.setItem(KEY, '1'); } catch(_) {}
  }

  function _fadeAndContinue(onContinue){
    const ls = document.getElementById('loading-screen');
    if (ls){
      ls.style.opacity = '0';
      setTimeout(() => { try { ls.remove(); } catch(_){} }, 500);
    }
    try { onContinue && onContinue(); } catch(e){ console.error('[IntroWelcome] onContinue error:', e); }
  }

  function gate(onContinue){
    // Возвращающийся — сразу как раньше
    if (_seen()){ _fadeAndContinue(onContinue); return; }

    // Новичок — показываем кнопку
    const ls = document.getElementById('loading-screen');
    if (!ls){ _fadeAndContinue(onContinue); return; } // защита от рассинхрона

    ls.classList.add('il-ready'); // CSS: бар скрыт, кнопка видна
    const cta = document.getElementById('loading-cta');
    if (!cta){ _fadeAndContinue(onContinue); return; }

    let used = false;
    const onTap = () => {
      if (used) return; used = true;
      cta.removeEventListener('click', onTap);
      _markSeen();
      _fadeAndContinue(onContinue);
    };
    cta.addEventListener('click', onTap);
  }

  window.IntroWelcome = { gate, _markSeen, _seen };
})();
