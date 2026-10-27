(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const menu = document.querySelector('.wb-menu');
  const toggle = document.querySelector('.wb-menu-toggle');
  if (menu && toggle) {
    toggle.addEventListener('click', () => { menu.showModal(); toggle.setAttribute('aria-expanded','true'); });
    menu.querySelector('.wb-menu-close').addEventListener('click', () => menu.close());
    menu.addEventListener('click', event => { if (event.target === menu) { const r=menu.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) menu.close(); } });
    menu.addEventListener('close', () => toggle.setAttribute('aria-expanded','false'));
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => menu.close()));
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const id = link.getAttribute('href').slice(1);
      const target = id && document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      history.pushState(null,'',`#${id}`);
      target.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
      if(link.classList.contains('skip-link')) { target.setAttribute('tabindex','-1'); target.focus({preventScroll:true}); }
    });
  });
  if (!reduced.matches && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('wb-motion');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if(entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), {threshold:.08,rootMargin:'0px 0px -24px 0px'});
    document.querySelectorAll('.wb-reveal').forEach(element => observer.observe(element));
  }
  const steps = [...document.querySelectorAll('.wb-step')];
  const images = [...document.querySelectorAll('.wb-process-image')];
  const tabs = [...document.querySelectorAll('[data-process-step]')];
  const status = document.querySelector('[data-process-status]');
  function activateStep(index) {
    images.forEach((image,i) => image.classList.toggle('is-active',i===index));
    tabs.forEach((tab,i) => tab.setAttribute('aria-pressed',String(i===index)));
    if(status) status.textContent=`0${index+1} / 04`;
  }
  if(steps.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const active = entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(active) activateStep(steps.indexOf(active.target));
    },{threshold:[0,.3,.6],rootMargin:'-20% 0px -20% 0px'});
    steps.forEach(step => observer.observe(step));
    tabs.forEach((tab,i)=>tab.addEventListener('click',()=>steps[i].scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'})));
  }
  const reviewTrack = document.querySelector('.wb-review-track');
  if(reviewTrack) {
    const prev = document.querySelector('[data-review-prev]');
    const next = document.querySelector('[data-review-next]');
    const sync = () => {prev.disabled=reviewTrack.scrollLeft<3;next.disabled=reviewTrack.scrollLeft+reviewTrack.clientWidth>=reviewTrack.scrollWidth-3;};
    const move = direction => reviewTrack.scrollBy({left:direction*(reviewTrack.querySelector('.wb-review').offsetWidth+20),behavior:reduced.matches?'instant':'smooth'});
    prev.addEventListener('click',()=>move(-1)); next.addEventListener('click',()=>move(1));
    reviewTrack.addEventListener('scroll',sync,{passive:true}); addEventListener('resize',sync,{passive:true}); sync();
  }
  const parallax = [...document.querySelectorAll('.wb-featured[data-parallax]')];
  let pending = false;
  function updateParallax() {
    pending=false;
    if(reduced.matches) return;
    parallax.forEach(element=>{const r=element.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)element.style.setProperty('--parallax',`${((innerHeight/2-r.top-r.height/2)/(innerHeight+r.height))*80}px`);});
  }
  if(parallax.length) {
    addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(updateParallax);}},{passive:true});
    updateParallax();
  }
})();
