/* ============================================================
   知遇 ZhiYu · 沉浸式3D滚动背景 v3 (无岛屿版)
   - 滚动驱动电影感镜头路径
   - 粒子互动 + 水面波动 + 灯光呼吸
   - 与全站艺术背景图融合
   ============================================================ */
(function () {
  'use strict';
  const canvas = document.getElementById('immersiveBg');
  if (!canvas || typeof THREE === 'undefined') return;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf0f4ff, 0.012);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 6, 35);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(12, 22, 10);
  dirLight.castShadow = true;
  scene.add(dirLight);
  const p1 = new THREE.PointLight(0x0084ff, 0.8, 60);
  p1.position.set(-18, 10, -12);
  scene.add(p1);
  const p2 = new THREE.PointLight(0x9b59ff, 0.7, 50);
  p2.position.set(16, 8, -28);
  scene.add(p2);
  const p3 = new THREE.PointLight(0x00c9a7, 0.5, 40);
  p3.position.set(0, 12, -50);
  scene.add(p3);
  // 粒子系统
  const particleCount = 150;
  const pGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const islandColors = [0x0084ff, 0x9b59ff, 0xff6b9d, 0x00c9a7, 0xffa500, 0xef4444];
  const palette = islandColors.map((c) => new THREE.Color(c));
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 120;
    positions[i * 3 + 1] = Math.random() * 35;
    positions[i * 3 + 2] = -Math.random() * 100;
    const col = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      size: 0.32,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  scene.add(particles);
  // 水面
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(250, 250, 32, 32),
    new THREE.MeshLambertMaterial({ color: 0x5eb0ff, transparent: true, opacity: 0.15 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -3.5;
  scene.add(water);
  // 漂浮光球（增加氛围感）
  const floatOrbs = [];
  for (let i = 0; i < 8; i++) {
    const orbGeo = new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 12, 12);
    const orbMat = new THREE.MeshBasicMaterial({
      color: islandColors[i % islandColors.length],
      transparent: true,
      opacity: 0.4,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(
      (Math.random() - 0.5) * 60,
      2 + Math.random() * 15,
      -10 - Math.random() * 60
    );
    orb.userData = {
      baseY: orb.position.y,
      floatSpeed: 0.3 + Math.random() * 0.4,
      floatOffset: Math.random() * Math.PI * 2,
      driftSpeed: 0.005 + Math.random() * 0.01,
    };
    scene.add(orb);
    floatOrbs.push(orb);
  }
  let scrollProgress = 0;
  let targetScroll = 0;
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;
  function onScroll() {
    const top = window.scrollY || document.documentElement.scrollTop;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    targetScroll = h > 0 ? Math.min(Math.max(top / h, 0), 1) : 0;
  }
  function onMouseMove(e) {
    targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    scrollProgress += (targetScroll - scrollProgress) * 0.06;
    mouseX += (targetMouseX - mouseX) * 0.04;
    mouseY += (targetMouseY - mouseY) * 0.04;
    const targetZ = 35 - scrollProgress * 95;
    const targetY = 6 + Math.sin(time * 0.25) * 0.4 + scrollProgress * 5 + mouseY * -1.5;
    const targetX = Math.sin(time * 0.18) * 1.8 + scrollProgress * 6 + mouseX * 3.5;
    camera.position.z += (targetZ - camera.position.z) * 0.06;
    camera.position.y += (targetY - camera.position.y) * 0.06;
    camera.position.x += (targetX - camera.position.x) * 0.06;
    camera.lookAt(mouseX * 2, 4 + scrollProgress * 2, targetZ - 14);
    // 粒子旋转
    particles.rotation.y = time * 0.025;
    // 水面波动
    water.position.y = -3.5 + Math.sin(time * 0.4) * 0.12;
    // 灯光呼吸
    p1.intensity = 0.7 + Math.sin(time * 1.2) * 0.15;
    p2.intensity = 0.6 + Math.sin(time * 0.9 + 1) * 0.15;
    p3.intensity = 0.5 + Math.sin(time * 0.7 + 2) * 0.12;
    // 漂浮光球
    floatOrbs.forEach((orb, i) => {
      const ud = orb.userData;
      orb.position.y = ud.baseY + Math.sin(time * ud.floatSpeed + ud.floatOffset) * 1.2;
      orb.position.x += Math.sin(time * 0.15 + ud.floatOffset) * ud.driftSpeed;
      orb.material.opacity = 0.3 + Math.sin(time * 0.8 + ud.floatOffset) * 0.15;
    });
    renderer.render(scene, camera);
  }
  animate();
  onScroll();
  console.log('🌊 知遇沉浸式3D背景 v3 已加载（无岛屿版，粒子+光球+水面+灯光）');
})();
