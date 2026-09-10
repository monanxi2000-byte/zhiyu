/* ============================================================
   知遇 ZhiYu · 3D 可拖拽展示区 v2
   立体刘看山3D模型（多几何体组合）+ 随机动作动画
   交互：鼠标拖拽旋转、滚轮缩放、自动随机动作
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('hero3d');
  if (!canvas || typeof THREE === 'undefined') return;

  // ---------- 场景 / 相机 / 渲染器 ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.8, 5.5);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ---------- 光照 ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(5, 8, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0x88aaff, 0.4);
  fillLight.position.set(-5, 3, -5);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xffaa44, 0.3);
  rimLight.position.set(0, -3, -5);
  scene.add(rimLight);

  // ---------- 材质 ----------
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5, metalness: 0.05 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x0084FF, roughness: 0.3, metalness: 0.2 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xFF6B35, roughness: 0.5 });
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.6 });

  // ---------- 创建立体刘看山3D模型 ----------
  const mascot = new THREE.Group();
  scene.add(mascot);

  // 身体（圆角胶囊形状，用圆柱体+球体组合）
  const bodyGroup = new THREE.Group();
  const bodyGeo = new THREE.SphereGeometry(0.7, 16, 16);
  const body = new THREE.Mesh(bodyGeo, whiteMat);
  body.position.y = 0.2;
  body.scale.set(1, 1.4, 1);
  body.castShadow = true;
  bodyGroup.add(body);

  // 肚子（稍大的白色球体，营造圆润感）
  const bellyGeo = new THREE.SphereGeometry(0.55, 16, 16);
  const belly = new THREE.Mesh(bellyGeo, whiteMat);
  belly.position.set(0, 0.1, 0.35);
  belly.scale.set(1, 1.1, 0.6);
  bodyGroup.add(belly);
  mascot.add(bodyGroup);

  // 头（球体，稍大）
  const headGroup = new THREE.Group();
  const headGeo = new THREE.SphereGeometry(0.65, 24, 24);
  const head = new THREE.Mesh(headGeo, whiteMat);
  head.position.y = 1.35;
  head.castShadow = true;
  headGroup.add(head);

  // 耳朵（两个三角形，用圆锥体）
  const earGeo = new THREE.ConeGeometry(0.2, 0.45, 4);
  const leftEar = new THREE.Mesh(earGeo, whiteMat);
  leftEar.position.set(-0.4, 1.85, 0);
  leftEar.rotation.z = 0.3;
  leftEar.rotation.y = -0.2;
  headGroup.add(leftEar);
  const rightEar = new THREE.Mesh(earGeo, whiteMat);
  rightEar.position.set(0.4, 1.85, 0);
  rightEar.rotation.z = -0.3;
  rightEar.rotation.y = 0.2;
  headGroup.add(rightEar);

  // 耳朵内侧（粉色小三角）
  const innerEarGeo = new THREE.ConeGeometry(0.1, 0.25, 4);
  const leftInnerEar = new THREE.Mesh(innerEarGeo, pinkMat);
  leftInnerEar.position.set(-0.4, 1.82, 0.08);
  leftInnerEar.rotation.z = 0.3;
  headGroup.add(leftInnerEar);
  const rightInnerEar = new THREE.Mesh(innerEarGeo, pinkMat);
  rightInnerEar.position.set(0.4, 1.82, 0.08);
  rightInnerEar.rotation.z = -0.3;
  headGroup.add(rightInnerEar);

  // 眼睛（两个黑色球体，带高光）
  const eyeGeo = new THREE.SphereGeometry(0.09, 12, 12);
  const leftEye = new THREE.Mesh(eyeGeo, darkMat);
  leftEye.position.set(-0.22, 1.4, 0.55);
  headGroup.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, darkMat);
  rightEye.position.set(0.22, 1.4, 0.55);
  headGroup.add(rightEye);

  // 眼睛高光（小白点）
  const eyeHighlightGeo = new THREE.SphereGeometry(0.03, 8, 8);
  const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const leftHighlight = new THREE.Mesh(eyeHighlightGeo, eyeHighlightMat);
  leftHighlight.position.set(-0.19, 1.43, 0.62);
  headGroup.add(leftHighlight);
  const rightHighlight = new THREE.Mesh(eyeHighlightGeo, eyeHighlightMat);
  rightHighlight.position.set(0.25, 1.43, 0.62);
  headGroup.add(rightHighlight);

  // 鼻子（黑色大球体，刘看山标志性大鼻子）
  const noseGeo = new THREE.SphereGeometry(0.16, 16, 16);
  const nose = new THREE.Mesh(noseGeo, darkMat);
  nose.position.set(0, 1.22, 0.6);
  headGroup.add(nose);

  // 鼻子高光
  const noseHighlight = new THREE.Mesh(eyeHighlightGeo, eyeHighlightMat);
  noseHighlight.position.set(0.05, 1.27, 0.72);
  noseHighlight.scale.set(1.5, 1.5, 1.5);
  headGroup.add(noseHighlight);

  // 腮红（两个粉色圆片）
  const blushGeo = new THREE.CircleGeometry(0.1, 16);
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xffb6c1, transparent: true, opacity: 0.5 });
  const leftBlush = new THREE.Mesh(blushGeo, blushMat);
  leftBlush.position.set(-0.42, 1.2, 0.5);
  headGroup.add(leftBlush);
  const rightBlush = new THREE.Mesh(blushGeo, blushMat);
  rightBlush.position.set(0.42, 1.2, 0.5);
  headGroup.add(rightBlush);

  mascot.add(headGroup);

  // 手臂（两个小球体缩放，可动）
  const armGroup = new THREE.Group();
  const armGeo = new THREE.SphereGeometry(0.12, 8, 8);
  const leftArm = new THREE.Mesh(armGeo, whiteMat);
  leftArm.position.set(-0.85, 0.4, 0);
  leftArm.rotation.z = 0.5;
  leftArm.scale.set(1, 2.5, 1);
  leftArm.castShadow = true;
  armGroup.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, whiteMat);
  rightArm.position.set(0.85, 0.4, 0);
  rightArm.rotation.z = -0.5;
  rightArm.scale.set(1, 2.5, 1);
  rightArm.castShadow = true;
  armGroup.add(rightArm);
  mascot.add(armGroup);

  // 腿（两个短球体缩放）
  const legGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const leftLeg = new THREE.Mesh(legGeo, whiteMat);
  leftLeg.position.set(-0.3, -0.6, 0);
  leftLeg.scale.set(1, 1.8, 1);
  leftLeg.castShadow = true;
  mascot.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, whiteMat);
  rightLeg.position.set(0.3, -0.6, 0);
  rightLeg.scale.set(1, 1.8, 1);
  rightLeg.castShadow = true;
  mascot.add(rightLeg);

  // 脚（两个黑色小圆片）
  const footGeo = new THREE.SphereGeometry(0.18, 12, 12);
  const leftFoot = new THREE.Mesh(footGeo, darkMat);
  leftFoot.position.set(-0.3, -0.85, 0.1);
  leftFoot.scale.set(1, 0.5, 1.3);
  mascot.add(leftFoot);
  const rightFoot = new THREE.Mesh(footGeo, darkMat);
  rightFoot.position.set(0.3, -0.85, 0.1);
  rightFoot.scale.set(1, 0.5, 1.3);
  mascot.add(rightFoot);

  // 尾巴（小圆锥，刘看山的尾巴）
  const tailGeo = new THREE.ConeGeometry(0.15, 0.4, 8);
  const tail = new THREE.Mesh(tailGeo, whiteMat);
  tail.position.set(0, 0.3, -0.75);
  tail.rotation.x = -Math.PI / 2.5;
  mascot.add(tail);

  // 围巾（蓝色圆环，增加辨识度）
  const scarfGeo = new THREE.TorusGeometry(0.6, 0.08, 8, 24);
  const scarf = new THREE.Mesh(scarfGeo, blueMat);
  scarf.position.set(0, 0.85, 0);
  scarf.rotation.x = Math.PI / 2;
  mascot.add(scarf);

  // 围巾飘带
  const scarfTailGeo = new THREE.BoxGeometry(0.15, 0.4, 0.05);
  const scarfTail = new THREE.Mesh(scarfTailGeo, blueMat);
  scarfTail.position.set(0.35, 0.65, 0.4);
  scarfTail.rotation.z = -0.3;
  mascot.add(scarfTail);

  // 底座（发光圆环）
  const baseGeo = new THREE.TorusGeometry(1.2, 0.05, 8, 32);
  const baseMat = new THREE.MeshBasicMaterial({ color: 0x0084FF, transparent: true, opacity: 0.3 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = -1;
  base.rotation.x = Math.PI / 2;
  scene.add(base);

  // 底座内圈
  const baseInnerGeo = new THREE.TorusGeometry(0.9, 0.03, 8, 32);
  const baseInnerMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.2 });
  const baseInner = new THREE.Mesh(baseInnerGeo, baseInnerMat);
  baseInner.position.y = -0.98;
  baseInner.rotation.x = Math.PI / 2;
  scene.add(baseInner);

  // 漂浮粒子（装饰）
  const particles = new THREE.Group();
  const particleGeo = new THREE.SphereGeometry(0.03, 6, 6);
  const particleMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.6 });
  for (let i = 0; i < 20; i++) {
    const p = new THREE.Mesh(particleGeo, particleMat);
    p.position.set(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 2 - 1
    );
    p.userData.speed = 0.002 + Math.random() * 0.005;
    p.userData.offset = Math.random() * Math.PI * 2;
    particles.add(p);
  }
  scene.add(particles);

  // ---------- 随机动作系统 ----------
  const actions = [
    { name: 'idle', duration: 2000 },
    { name: 'wave', duration: 1500 },
    { name: 'nod', duration: 1200 },
    { name: 'shake', duration: 1000 },
    { name: 'jump', duration: 800 },
    { name: 'tilt', duration: 1500 },
    { name: 'spin', duration: 2000 },
    { name: 'blink', duration: 400 },
  ];

  let currentAction = 'idle';
  let actionStartTime = 0;
  let actionProgress = 0;
  let nextActionTime = Date.now() + 3000;

  function pickRandomAction() {
    const now = Date.now();
    if (now >= nextActionTime) {
      // 70%概率选idle，30%概率选其他动作
      if (Math.random() < 0.3) {
        const otherActions = actions.filter(a => a.name !== 'idle');
        currentAction = otherActions[Math.floor(Math.random() * otherActions.length)].name;
      } else {
        currentAction = 'idle';
      }
      actionStartTime = now;
      const action = actions.find(a => a.name === currentAction);
      nextActionTime = now + action.duration + Math.random() * 2000;
    }
  }

  function updateAction(time) {
    pickRandomAction();
    const action = actions.find(a => a.name === currentAction);
    const elapsed = time - actionStartTime;
    actionProgress = Math.min(elapsed / action.duration, 1);

    // 基础呼吸动画
    const breathe = Math.sin(time * 0.002) * 0.02;
    mascot.scale.set(1 + breathe, 1 - breathe * 0.5, 1 + breathe);

    switch (currentAction) {
      case 'idle':
        // 缓慢左右摇摆
        mascot.rotation.z = Math.sin(time * 0.001) * 0.03;
        mascot.position.y = Math.sin(time * 0.0015) * 0.03;
        headGroup.rotation.y = Math.sin(time * 0.0008) * 0.1;
        break;

      case 'wave':
        // 挥手（右臂上下摆动）
        const waveAngle = Math.sin(actionProgress * Math.PI * 3) * 0.8;
        rightArm.rotation.z = -0.5 - waveAngle;
        rightArm.position.y = 0.4 + Math.sin(actionProgress * Math.PI) * 0.2;
        headGroup.rotation.z = Math.sin(actionProgress * Math.PI) * 0.1;
        if (actionProgress >= 1) {
          rightArm.rotation.z = -0.5;
          rightArm.position.y = 0.4;
        }
        break;

      case 'nod':
        // 点头
        headGroup.rotation.x = Math.sin(actionProgress * Math.PI * 2) * 0.2;
        mascot.position.y = Math.sin(actionProgress * Math.PI) * 0.05;
        if (actionProgress >= 1) headGroup.rotation.x = 0;
        break;

      case 'shake':
        // 摇头
        headGroup.rotation.y = Math.sin(actionProgress * Math.PI * 4) * 0.25;
        if (actionProgress >= 1) headGroup.rotation.y = 0;
        break;

      case 'jump':
        // 跳跃
        const jumpHeight = Math.sin(actionProgress * Math.PI) * 0.4;
        mascot.position.y = jumpHeight;
        leftArm.rotation.z = 0.5 + Math.sin(actionProgress * Math.PI) * 0.5;
        rightArm.rotation.z = -0.5 - Math.sin(actionProgress * Math.PI) * 0.5;
        if (actionProgress >= 1) {
          mascot.position.y = 0;
          leftArm.rotation.z = 0.5;
          rightArm.rotation.z = -0.5;
        }
        break;

      case 'tilt':
        // 歪头+身体倾斜
        mascot.rotation.z = Math.sin(actionProgress * Math.PI) * 0.15;
        headGroup.rotation.z = Math.sin(actionProgress * Math.PI) * 0.2;
        if (actionProgress >= 1) {
          mascot.rotation.z = 0;
          headGroup.rotation.z = 0;
        }
        break;

      case 'spin':
        // 旋转一圈
        mascot.rotation.y = actionProgress * Math.PI * 2;
        if (actionProgress >= 1) mascot.rotation.y = 0;
        break;

      case 'blink':
        // 眨眼
        const blinkScale = actionProgress < 0.5 ?
          1 - Math.sin(actionProgress * Math.PI * 2) * 0.9 :
          0.1 + Math.sin((actionProgress - 0.5) * Math.PI * 2) * 0.9;
        leftEye.scale.y = Math.max(blinkScale, 0.1);
        rightEye.scale.y = Math.max(blinkScale, 0.1);
        if (actionProgress >= 1) {
          leftEye.scale.y = 1;
          rightEye.scale.y = 1;
        }
        break;
    }

    // 围巾飘带动画
    scarfTail.rotation.z = -0.3 + Math.sin(time * 0.003) * 0.15;
    scarfTail.position.x = 0.35 + Math.sin(time * 0.002) * 0.05;

    // 尾巴摇摆
    tail.rotation.x = -Math.PI / 2.5 + Math.sin(time * 0.004) * 0.2;

    // 底座发光脉冲
    baseMat.opacity = 0.2 + Math.sin(time * 0.002) * 0.1;
    baseInnerMat.opacity = 0.15 + Math.sin(time * 0.0025) * 0.1;
    base.scale.set(1 + Math.sin(time * 0.0015) * 0.05, 1, 1 + Math.sin(time * 0.0015) * 0.05);
  }

  // ---------- 轨道控制器 ----------
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 3.5;
  controls.maxDistance = 9;
  controls.minPolarAngle = Math.PI * 0.2;
  controls.maxPolarAngle = Math.PI * 0.8;
  controls.rotateSpeed = 0.7;

  // ---------- 交互时暂停随机动作 ----------
  let userInteracting = false;
  let interactionTimer = null;

  function onInteract() {
    userInteracting = true;
    clearTimeout(interactionTimer);
    interactionTimer = setTimeout(() => { userInteracting = false; }, 4000);
  }
  canvas.addEventListener('pointerdown', onInteract);
  canvas.addEventListener('wheel', onInteract, { passive: true });

  // ---------- 响应式 ----------
  function resize() {
    const wrap = canvas.parentElement;
    if (!wrap) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- 渲染循环 ----------
  function animate() {
    requestAnimationFrame(animate);
    const time = Date.now();

    if (!userInteracting) {
      updateAction(time);
    } else {
      // 交互时保持基础呼吸
      const breathe = Math.sin(time * 0.002) * 0.02;
      mascot.scale.set(1 + breathe, 1 - breathe * 0.5, 1 + breathe);
      scarfTail.rotation.z = -0.3 + Math.sin(time * 0.003) * 0.15;
      tail.rotation.x = -Math.PI / 2.5 + Math.sin(time * 0.004) * 0.2;
    }

    // 粒子漂浮
    particles.children.forEach((p, i) => {
      p.position.y += p.userData.speed;
      p.position.x += Math.sin(time * 0.001 + p.userData.offset) * 0.002;
      if (p.position.y > 2.5) p.position.y = -2.5;
      p.material.opacity = 0.3 + Math.sin(time * 0.003 + p.userData.offset) * 0.3;
    });

    controls.update();
    renderer.render(scene, camera);
  }
  animate();
})();
