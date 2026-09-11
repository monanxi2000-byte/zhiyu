/* ============================================================
   知遇 ZhiYu · 知识星球系统 v2 (高交互创新版)
   灵感来源：GitHub Planet / Repo Planets / Isometria / Galaxy Portfolio
   - 中央知识核心 + 轨道行星（学习阶段）
   - 悬停放大/高亮、点击聚焦相机、进度发光
   - 鼠标交互粒子、能量连接线、自动/手动轨道
   ============================================================ */
(function () {
  'use strict';
  let scene, camera, renderer, controls;
  let core, planets = [], orbitLines = [], energyLines = [];
  let particles, particlePositions, particleVelocities;
  let raycaster, mouse;
  let isInitialized = false;
  let currentStages = [];
  let onPlanetClick = null;
  let focusedPlanet = null;
  let clock = typeof THREE !== 'undefined' ? new THREE.Clock() : null;
  let hoverPlanet = null;
  const COLORS = [0x0084ff, 0x9b59ff, 0xff6b9d, 0x00c9a7, 0xffa500, 0xef4444, 0x06b6d4];
  function init(containerId, stages, clickCallback) {
    const container = document.getElementById(containerId);
    if (!container || typeof THREE === 'undefined') return;
    destroy();
    currentStages = stages || [];
    onPlanetClick = clickCallback;
    focusedPlanet = null;
    hoverPlanet = null;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.012);
    window._zhiyuPlanetScene = scene;
    const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 500);
    camera.position.set(0, 18, 32);
    camera.lookAt(0, 0, 0);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    if (typeof THREE.OrbitControls !== 'undefined' || typeof OrbitControls !== 'undefined') {
      const OC = THREE.OrbitControls || OrbitControls;
      controls = new OC(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.minDistance = 12;
      controls.maxDistance = 60;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enablePan = false;
    }
    const ambient = new THREE.AmbientLight(0x334466, 0.45);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(15, 25, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);
    const fill = new THREE.PointLight(0x0084ff, 1.2, 80);
    fill.position.set(-18, 8, -10);
    scene.add(fill);
    const rim = new THREE.PointLight(0x9b59ff, 0.9, 60);
    rim.position.set(12, 6, -15);
    scene.add(rim);
    const coreLight = new THREE.PointLight(0xffffff, 1.8, 25);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    createCore();
    createPlanets();
    createOrbitRings();
    createParticles();
    createStarfield();
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('pointerleave', () => {
      if (hoverPlanet) {
        hoverPlanet.userData.targetScale = 1;
        hoverPlanet = null;
      }
      if (controls) controls.autoRotate = !focusedPlanet;
    });
    window.addEventListener('resize', onResize);
    isInitialized = true;
    animate();
  }
  function createCore() {
    const group = new THREE.Group();
    const coreGeo = new THREE.IcosahedronGeometry(2.2, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x4488ff,
      emissiveIntensity: 0.9,
      metalness: 0.3,
      roughness: 0.2,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.castShadow = true;
    group.add(coreMesh);
    const shellGeo = new THREE.IcosahedronGeometry(2.8, 1);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0x66aaff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    group.add(new THREE.Mesh(shellGeo, shellMat));
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(3.4 + i * 0.35, 0.04, 8, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x0084ff : i === 1 ? 0x9b59ff : 0x00c9a7,
        transparent: true,
        opacity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + (i - 1) * 0.4;
      ring.rotation.y = i * 0.6;
      group.add(ring);
      group.userData['ring' + i] = ring;
    }
    const label = makeTextSprite('知识核心', '#ffffff', 160);
    label.position.set(0, 4.2, 0);
    label.scale.set(6, 1.8, 1);
    group.add(label);
    scene.add(group);
    core = group;
  }
  function createPlanets() {
    planets = [];
    const count = Math.max(currentStages.length, 3);
    for (let i = 0; i < count; i++) {
      const stage = currentStages[i] || { title: `阶段 ${i + 1}`, description: '' };
      const color = COLORS[i % COLORS.length];
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const radius = 11 + (i % 3) * 1.8;
      const size = 1.3 + Math.min(1, (stage.title || '').length / 20) * 0.4;
      const planet = createPlanet(i, color, size, stage);
      planet.userData.orbitRadius = radius;
      planet.userData.orbitSpeed = 0.08 + i * 0.015;
      planet.userData.orbitAngle = angle;
      planet.userData.baseY = (i % 2 === 0 ? 1 : -1) * (0.8 + Math.random() * 1.2);
      planet.userData.targetScale = 1;
      planet.userData.currentScale = 1;
      planet.userData.index = i;
      planet.userData.stage = stage;
      planet.userData.color = color;
      planet.position.set(
        Math.cos(angle) * radius,
        planet.userData.baseY,
        Math.sin(angle) * radius
      );
      scene.add(planet);
      planets.push(planet);
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        planet.position.clone(),
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.35,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.userData.planetIndex = i;
      scene.add(line);
      energyLines.push(line);
    }
  }
  function createPlanet(index, color, size, stage) {
    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(size, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.35,
      metalness: 0.4,
      roughness: 0.35,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    group.userData.mesh = mesh;
    const atmoGeo = new THREE.SphereGeometry(size * 1.18, 24, 24);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    });
    group.add(new THREE.Mesh(atmoGeo, atmoMat));
    if (index % 2 === 0) {
      const ringGeo = new THREE.TorusGeometry(size * 1.55, 0.08, 8, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.55,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2.3;
      group.add(ring);
      group.userData.ring = ring;
    }
    const numSprite = makeTextSprite(String(index + 1), '#ffffff', 90);
    numSprite.position.set(0, size + 1.1, 0);
    numSprite.scale.set(1.6, 1.6, 1);
    group.add(numSprite);
    const title = (stage.title || `阶段${index + 1}`).slice(0, 8);
    const titleSprite = makeTextSprite(title, '#' + color.toString(16).padStart(6, '0'), 140);
    titleSprite.position.set(0, size + 2.3, 0);
    titleSprite.scale.set(5.5, 1.5, 1);
    group.add(titleSprite);
    return group;
  }
  function makeTextSprite(text, color, fontSize) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = `bold ${fontSize / 2}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    return new THREE.Sprite(mat);
  }
  function createOrbitRings() {
    orbitLines = [];
    const uniqueRadii = [...new Set(planets.map((p) => p.userData.orbitRadius))];
    uniqueRadii.forEach((r) => {
      const curve = new THREE.EllipseCurve(0, 0, r, r, 0, Math.PI * 2, false, 0);
      const points = curve.getPoints(80);
      const geo = new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(p.x, 0, p.y))
      );
      const mat = new THREE.LineBasicMaterial({
        color: 0x335577,
        transparent: true,
        opacity: 0.25,
      });
      scene.add(new THREE.LineLoop(geo, mat));
    });
  }
  /* ========== 粒子系统（鼠标可交互） ========== */
  function createParticles() {
    const count = 280;
    const geo = new THREE.BufferGeometry();
    particlePositions = new Float32Array(count * 3);
    particleVelocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = COLORS.map((c) => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      const r = 8 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.6;
      particlePositions[i * 3] = r * Math.cos(theta) * Math.cos(phi);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) + (Math.random() - 0.5) * 8;
      particlePositions[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
      particleVelocities[i * 3] = (Math.random() - 0.5) * 0.02;
      particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.015;
      particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    particles = new THREE.Points(geo, mat);
    scene.add(particles);
  }
  function createStarfield() {
    const count = 400;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 120;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.15,
      color: 0xaaccff,
      transparent: true,
      opacity: 0.7,
    });
    scene.add(new THREE.Points(geo, mat));
  }
  /* ========== 交互 ========== */
  function onPointerMove(event) {
    if (!renderer || !camera) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(
      planets.map((p) => p.userData.mesh).filter(Boolean),
      false
    );
    if (hoverPlanet && (!hits.length || hits[0].object.parent !== hoverPlanet)) {
      hoverPlanet.userData.targetScale = 1;
      if (hoverPlanet.userData.mesh) {
        hoverPlanet.userData.mesh.material.emissiveIntensity = 0.35;
      }
      hoverPlanet = null;
      renderer.domElement.style.cursor = 'grab';
    }
    if (hits.length) {
      const p = hits[0].object.parent;
      if (p !== hoverPlanet) {
        hoverPlanet = p;
        p.userData.targetScale = 1.35;
        if (p.userData.mesh) p.userData.mesh.material.emissiveIntensity = 0.85;
        renderer.domElement.style.cursor = 'pointer';
        if (controls) controls.autoRotate = false;
      }
    } else if (!focusedPlanet && controls) {
      controls.autoRotate = true;
    }
  }
  function onClick(event) {
    if (!renderer || !camera) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(
      planets.map((p) => p.userData.mesh).filter(Boolean),
      false
    );
    if (hits.length) {
      const planet = hits[0].object.parent;
      focusOnPlanet(planet);
      if (onPlanetClick) {
        onPlanetClick(planet.userData.stage, planet.userData.index);
      }
    } else {
      unfocus();
    }
  }
  function focusOnPlanet(planet) {
    focusedPlanet = planet;
    if (controls) {
      controls.autoRotate = false;
      controls.target.copy(planet.position);
    }
    planets.forEach((p) => {
      p.userData.targetScale = p === planet ? 1.5 : 0.75;
    });
  }
  function unfocus() {
    focusedPlanet = null;
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.autoRotate = true;
    }
    planets.forEach((p) => {
      p.userData.targetScale = 1;
    });
  }
  function onResize() {
    if (!renderer || !camera) return;
    const container = renderer.domElement.parentElement;
    if (!container) return;
    camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  /* ========== 动画循环 ========== */
  function animate() {
    if (!isInitialized) return;
    requestAnimationFrame(animate);
    const t = clock ? clock.getElapsedTime() : Date.now() * 0.001;
    const dt = clock ? clock.getDelta() : 0.016;
    if (core) {
      core.rotation.y = t * 0.15;
      for (let i = 0; i < 3; i++) {
        const ring = core.userData['ring' + i];
        if (ring) {
          ring.rotation.z = t * (0.3 + i * 0.12) * (i % 2 === 0 ? 1 : -1);
        }
      }
    }
    planets.forEach((planet, i) => {
      const ud = planet.userData;
      if (!focusedPlanet) {
        ud.orbitAngle += ud.orbitSpeed * dt;
      }
      const x = Math.cos(ud.orbitAngle) * ud.orbitRadius;
      const z = Math.sin(ud.orbitAngle) * ud.orbitRadius;
      const y = ud.baseY + Math.sin(t * 0.7 + i) * 0.35;
      if (focusedPlanet !== planet) {
        planet.position.x += (x - planet.position.x) * 0.08;
        planet.position.z += (z - planet.position.z) * 0.08;
        planet.position.y += (y - planet.position.y) * 0.08;
      }
      planet.rotation.y = t * 0.4;
      ud.currentScale += (ud.targetScale - ud.currentScale) * 0.12;
      planet.scale.setScalar(ud.currentScale);
      if (ud.ring) ud.ring.rotation.z = t * 0.6;
      if (energyLines[i]) {
        const positions = energyLines[i].geometry.attributes.position;
        positions.setXYZ(0, 0, 0, 0);
        positions.setXYZ(1, planet.position.x, planet.position.y, planet.position.z);
        positions.needsUpdate = true;
        energyLines[i].material.opacity = focusedPlanet === planet ? 0.7 : 0.3;
      }
    });
    if (particles && particlePositions) {
      for (let i = 0; i < particlePositions.length; i += 3) {
        particlePositions[i] += particleVelocities[i];
        particlePositions[i + 1] += particleVelocities[i + 1];
        particlePositions[i + 2] += particleVelocities[i + 2];
        const dist = Math.sqrt(
          particlePositions[i] ** 2 +
            particlePositions[i + 1] ** 2 +
            particlePositions[i + 2] ** 2
        );
        if (dist > 45) {
          particlePositions[i] *= 0.3;
          particlePositions[i + 1] *= 0.3;
          particlePositions[i + 2] *= 0.3;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;
      particles.rotation.y = t * 0.02;
    }
    if (focusedPlanet && controls) {
      controls.target.lerp(focusedPlanet.position, 0.05);
    }
    if (controls) controls.update();
    renderer.render(scene, camera);
  }
  /* ========== 销毁 ========== */
  function destroy() {
    if (!isInitialized && !renderer) return;
    isInitialized = false;
    if (renderer) {
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    }
    window.removeEventListener('resize', onResize);
    planets = [];
    orbitLines = [];
    energyLines = [];
    core = null;
    particles = null;
    scene = null;
    camera = null;
    renderer = null;
    controls = null;
    focusedPlanet = null;
    hoverPlanet = null;
  }
  /* ========== 对外 API ========== */
  window.IsometricMap = {
    init: init,
    destroy: destroy,
    focusStage: function (index) {
      if (planets[index]) focusOnPlanet(planets[index]);
    },
    unfocus: unfocus,
  };
})();
/* 主题切换监听（注意：scene 在 IIFE 内，这里用 window 上的引用更稳） */
window.addEventListener('zhiyu-theme-change', function (e) {
  // 若需要主题联动，可在 init 里把 scene 挂到 window._zhiyuPlanetScene
  const s = window._zhiyuPlanetScene;
  if (!s) return;
  const isDark = e.detail && e.detail.isDark;
  if (isDark) {
    s.background = new THREE.Color(0x0a0e1a);
    if (s.fog) s.fog.color.set(0x0a0e1a);
  } else {
    s.background = new THREE.Color(0x0f172a);
    if (s.fog) s.fog.color.set(0x0f172a);
  }
});
