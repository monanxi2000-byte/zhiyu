/* ============================================================
   知遇 ZhiYu · 沉浸式3D滚动背景 v2 (高交互创新版)
   灵感：东方明珠沉浸滚动 / Galaxy Portfolio / GitHub Planet
   - 滚动驱动电影感镜头路径
   - 知识岛屿 + 连接光束
   - 鼠标视差 + 粒子互动
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
  const islands = [];
  const islandColors = [0x0084ff, 0x9b59ff, 0xff6b9d, 0x00c9a7, 0xffa500, 0xef4444];
  const beams = [];
  function createIsland(x, z, color, scale = 1) {
    const group = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(2.8 * scale, 2.2 * scale, 1.6 * scale, 8);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x7a6a4f });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.8 * scale;
    base.castShadow = true;
    group.add(base);
    const topGeo = new THREE.CylinderGeometry(2.9 * scale, 2.9 * scale, 0.45 * scale, 8);
    const topMat = new THREE.MeshLambertMaterial({ color: 0x6ecf6a });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.2 * scale;
    top.castShadow = true;
    group.add(top);
    const types = ['box', 'cylinder', 'cone', 'sphere'];
    const type = types[Math.floor(Math.random() * types.length)];
    let bGeo;
    if (type === 'box') bGeo = new THREE.BoxGeometry(1.4 * scale, 2.4 * scale, 1.4 * scale);
    else if (type === 'cylinder') bGeo = new THREE.CylinderGeometry(0.7 * scale, 0.7 * scale, 2.8 * scale, 10);
    else if (type === 'cone') bGeo = new THREE.ConeGeometry(1.1 * scale, 2.8 * scale, 6);
    else bGeo = new THREE.SphereGeometry(1.1 * scale, 14, 14);
    const bMat = new THREE.MeshLambertMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.2,
    });
    const building = new THREE.Mesh(bGeo, bMat);
    building.position.y = 1.6 * scale;
    building.castShadow = true;
    group.add(building);
    const ringGeo = new THREE.TorusGeometry(3.1 * scale, 0.07 * scale, 8, 36);
    const ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.55 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.4 * scale;
    group.add(ring);
    for (let i = 0; i < 3; i++) {
      const tree = createSmallTree(scale * 0.55);
      const a = (i / 3) * Math.PI * 2 + Math.random();
      tree.position.set(Math.cos(a) * 1.9 * scale, 0.4 * scale, Math.sin(a) * 1.9 * scale);
      group.add(tree);
    }
    group.position.set(x, Math.random() * 1.5, z);
    group.userData = {
      baseY: group.position.y,
      floatSpeed: 0.25 + Math.random() * 0.35,
      floatOffset: Math.random() * Math.PI * 2,
      ring: ring,
      color: color,
    };
    scene.add(group);
    islands.push(group);
    return group;
  }
  function createSmallTree(scale) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09 * scale, 0.13 * scale, 0.7 * scale, 6),
      new THREE.MeshLambertMaterial({ color: 0x8b4513 })
    );
    trunk.position.y = 0.35 * scale;
    tree.add(trunk);
    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(0.45 * scale, 0.9 * scale, 6),
      new THREE.MeshLambertMaterial({ color: 0x228b22 })
    );
    leaves.position.y = 1.05 * scale;
    tree.add(leaves);
    return tree;
  }
  const islandData = [
    [-14, -8, 0, 1.15],
    [11, -18, 1, 1.0],
    [-9, -28, 2, 1.25],
    [13, -38, 3, 1.05],
    [-6, -48, 4, 1.35],
    [8, -58, 5, 1.1],
    [0, -68, 0, 1.5],
  ];
  islandData.forEach(([x, z, ci, s]) => createIsland(x, z, islandColors[ci], s));
  for (let i = 0; i < islands.length - 1; i++) {
    const a = islands[i].position;
    const b = islands[i + 1].position;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(a.x, a.y + 2, a.z),
      new THREE.Vector3(b.x, b.y + 2, b.z),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: islandColors[i % islandColors.length],
      transparent: true,
      opacity: 0.25,
    });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    beams.push({ line, i });
  }
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220, 24, 24),
    new THREE.MeshLambertMaterial({ color: 0x5eb0ff, transparent: true, opacity: 0.18 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -3.5;
  scene.add(water);
  const particleCount = 120;
  const pGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const palette = islandColors.map((c) => new THREE.Color(c));
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 90;
    positions[i * 3 + 1] = Math.random() * 28;
    positions[i * 3 + 2] = -Math.random() * 90;
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
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  scene.add(particles);
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
    islands.forEach((island) => {
      const { baseY, floatSpeed, floatOffset, ring } = island.userData;
      island.position.y = baseY + Math.sin(time * floatSpeed + floatOffset) * 0.45;
      island.rotation.y = Math.sin(time * 0.18 + floatOffset) * 0.12;
      if (ring) ring.rotation.z = time * 0.35;
    });
    beams.forEach(({ line, i }) => {
      const a = islands[i].position;
      const b = islands[i + 1].position;
      const pos = line.geometry.attributes.position;
      pos.setXYZ(0, a.x, a.y + 2, a.z);
      pos.setXYZ(1, b.x, b.y + 2, b.z);
      pos.needsUpdate = true;
    });
    particles.rotation.y = time * 0.025;
    water.position.y = -3.5 + Math.sin(time * 0.4) * 0.12;
    p1.intensity = 0.7 + Math.sin(time * 1.2) * 0.15;
    p2.intensity = 0.6 + Math.sin(time * 0.9 + 1) * 0.15;
    renderer.render(scene, camera);
  }
  animate();
  onScroll();
  console.log('🌊 知遇沉浸式3D滚动背景 v2 已加载（高交互版）');
})();
