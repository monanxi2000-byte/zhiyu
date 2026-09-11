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

  /* ========== 3. 滚动触发动画 ========== */
  function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    if (reveals.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // 延迟动画，创造错落感
          setTimeout(() => {
            entry.target.classList.add('revealed');
          }, index * 100);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    });

    reveals.forEach(el => observer.observe(el));
  }

  /* ========== 4. 导航栏滚动效果 ========== */
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

    // 给区块添加滚动动画
    const sections = document.querySelectorAll('.hero-copy, .hero-3d, .section-title, .stages-container, .concepts-container, .flashcards-container, .about-section');
    sections.forEach((section, index) => {
      const types = ['reveal', 'reveal-left', 'reveal-right', 'reveal-scale'];
      section.classList.add(types[index % types.length]);
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

  /* ========== 初始化 ========== */
  function init() {
    // 先添加类名
    applyInnovationClasses();

    // 然后初始化各种效果
    initParticleBackground();
    initTiltCards();
    initScrollReveal();
    initNavScroll();
    initMouseParallax();
    initFlipCards();

    console.log('🎨 知遇创新视觉效果已加载');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
