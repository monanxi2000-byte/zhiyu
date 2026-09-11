/* ============================================================
   知遇 ZhiYu · 创新交互效果 v1
   3D粒子背景 / 卡片3D倾斜 / 滚动触发动画 / 鼠标视差
   ============================================================ */

(function () {
  'use strict';

  /* ========== 1. 3D粒子背景 ========== */
  function initParticleBackground() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 创建粒子
    const particleCount = 150;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const colorPalette = [
      new THREE.Color(0x0084ff),
      new THREE.Color(0x9b59ff),
      new THREE.Color(0xff6b9d),
      new THREE.Color(0x00d4aa),
      new THREE.Color(0xffaa00),
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = Math.random() * 2 + 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 鼠标位置
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // 滚动视差
    let scrollY = 0;
    window.addEventListener('scroll', () => {
      scrollY = window.scrollY;
    });

    // 动画循环
    function animate() {
      requestAnimationFrame(animate);
      const time = Date.now() * 0.0001;

      // 平滑鼠标跟随
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      // 粒子旋转
      particles.rotation.y = time * 5 + targetX * 0.3;
      particles.rotation.x = time * 3 + targetY * 0.2;

      // 滚动视差
      camera.position.y = -scrollY * 0.02;
      camera.position.x = targetX * 2;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    }
    animate();

    // 响应式
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /* ========== 2. 卡片3D倾斜效果 ========== */
  function initTiltCards() {
    const cards = document.querySelectorAll('.tilt-card');
    if (cards.length === 0) return;

    // 检测是否为触摸设备
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / centerY * -8;
        const rotateY = (x - centerX) / centerX * 8;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      });
    });
  }

  /* ========== 3. 导航栏滚动效果 ========== */
  function initNavScroll() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });
  }

  /* ========== 5. 鼠标视差效果（Hero区域） ========== */
  function initMouseParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const parallaxElements = hero.querySelectorAll('[data-parallax]');
    if (parallaxElements.length === 0) return;

    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      parallaxElements.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 20;
        el.style.transform = `translateX(${x * speed}px) translateY(${y * speed}px)`;
      });
    });

    hero.addEventListener('mouseleave', () => {
      parallaxElements.forEach(el => {
        el.style.transform = 'translateX(0) translateY(0)';
      });
    });
  }

  /* ========== 5.1 全站背景图片鼠标视差效果 ========== */
  function initBgParallax() {
    const bg = document.querySelector('.site-art-bg');
    if (!bg) return;

    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      targetX = x * 15;
      targetY = y * 10;
    });

    function animate() {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;
      bg.style.transform = `translate(${currentX}px, ${currentY}px) scale(1.08)`;
      requestAnimationFrame(animate);
    }
    animate();
  }

  /* ========== 6. 3D翻转卡片（复习卡片增强） ========== */
  function initFlipCards() {
    const flipCards = document.querySelectorAll('.flip-card-3d');
    flipCards.forEach(card => {
      card.addEventListener('click', () => {
        card.classList.toggle('flipped');
      });
    });
  }

  /* ========== 7. 自动添加类名（给现有元素添加创新效果类） ========== */
  function applyInnovationClasses() {
    // 给主要卡片添加玻璃拟态和3D倾斜
    const mainCards = document.querySelectorAll('.stage-card, .concept-card, .scenario-card, .hot-topic-card, .agent-card, .about-tab-content');
    mainCards.forEach(card => {
      card.classList.add('glass-card', 'tilt-card');
    });

    // 给主要按钮添加3D效果
    const primaryBtns = document.querySelectorAll('.btn-primary, #guideBtn, .mode-btn.active');
    primaryBtns.forEach(btn => {
      btn.classList.add('btn-3d');
    });

    // 给标题添加渐变文字
    const titles = document.querySelectorAll('.hero-title, .section-title h2');
    titles.forEach(title => {
      // 只给包含特定文字的标题添加渐变
      if (title.querySelector('.hl') || title.textContent.includes('知遇')) {
        title.classList.add('gradient-text');
      }
    });

    // 给3D模型区域添加浮动效果
    const hero3d = document.querySelector('.hero-3d');
    if (hero3d) hero3d.classList.add('float-3d');

    // 给输入框添加光晕效果
    const inputs = document.querySelectorAll('#topicInput');
    inputs.forEach(input => input.classList.add('glow-effect'));
  }

  /* ========== 6. 滚动进度条 ========== */
  function initScrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress-bar';
    document.body.appendChild(bar);

    function update() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      bar.style.width = progress + '%';
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ========== 7. 波纹点击效果 ========== */
  function initRippleEffect() {
    document.addEventListener('click', function (e) {
      const target = e.target.closest('.btn-primary, .btn-secondary, .mode-btn, .about-tab-btn, .scenario-chip, .stage-card, .concept-card, .flashcard, .tilt-card, button');
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple-anim 0.6s ease-out;
        pointer-events: none;
        z-index: 10;
      `;

      const originalPosition = getComputedStyle(target).position;
      if (originalPosition === 'static') {
        target.style.position = 'relative';
      }
      target.style.overflow = 'hidden';
      target.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    });
  }

  /* ========== 8. 打字机效果 ========== */
  function initTypewriter() {
    const subtitle = document.querySelector('.hero-sub');
    if (!subtitle) return;

    const text = subtitle.textContent;
    subtitle.textContent = '';
    subtitle.style.visibility = 'visible';

    let index = 0;
    const speed = 35;

    function type() {
      if (index < text.length) {
        subtitle.textContent += text.charAt(index);
        index++;
        setTimeout(type, speed);
      }
    }

    // 延迟开始，等页面加载
    setTimeout(type, 800);
  }

  /* ========== 9. 磁力按钮 ========== */
  function initMagneticButton() {
    const btn = document.getElementById('guideBtn');
    if (!btn) return;

    const strength = 0.15;

    btn.addEventListener('mousemove', function (e) {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });

    btn.addEventListener('mouseleave', function () {
      btn.style.transform = '';
    });
  }

  /* ========== 10. 数字计数动画 ========== */
  function initCountUp() {
    // 找到关于我们部分的统计数字
    const stats = document.querySelectorAll('.about-stat-number');
    if (stats.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.target, 10);
          if (isNaN(target)) return;

          let current = 0;
          const duration = 1500;
          const steps = 60;
          const increment = target / steps;
          const stepTime = duration / steps;

          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              current = target;
              clearInterval(timer);
            }
            el.textContent = Math.floor(current) + (el.dataset.suffix || '');
          }, stepTime);

          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    stats.forEach(stat => observer.observe(stat));
  }

  /* ========== 初始化 ========== */
  function init() {
    // 先添加类名
    applyInnovationClasses();

    // 然后初始化各种效果
    initParticleBackground();
    initTiltCards();
    initNavScroll();
    initMouseParallax();
    initBgParallax();
    initFlipCards();
    initScrollProgress();
    initRippleEffect();
    initTypewriter();
    initMagneticButton();
    initCountUp();

    console.log('🎨 知遇创新视觉效果已加载');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
