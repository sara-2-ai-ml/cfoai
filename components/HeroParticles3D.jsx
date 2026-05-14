"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const BG = 0x080808;
const VIOLET = 0x8b5cf6;

/**
 * Loads an image and converts its non-transparent pixels into a 3D point cloud.
 */
function loadHandParticles(url, side) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = url;
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Scale down for particle density
      const W = 160;
      const H = Math.floor((img.height / img.width) * W);
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, W, H);
      
      const imgData = ctx.getImageData(0, 0, W, H).data;
      const positions = [];
      const colors = [];
      
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const r = imgData[i];
          const g = imgData[i+1];
          const b = imgData[i+2];
          const a = imgData[i+3];
          
          const brightness = (r + g + b) / 3;
          // Filter out dark/transparent background pixels
          if (a > 20 && brightness > 15) {
            // Drop some particles to get a "cloud" look instead of a solid sheet
            if (Math.random() > 0.55) continue;
            
            const px = (x / W - 0.5) * 5.0;
            const py = -(y / H - 0.5) * 5.0;
            
            // Add Z depth based on brightness and noise
            const zOffset = (Math.random() - 0.5) * (brightness / 255) * 1.2;
            
            const shiftX = side === "left" ? -2.4 : 2.4;
            
            const jx = (Math.random() - 0.5) * 0.04;
            const jy = (Math.random() - 0.5) * 0.04;
            
            positions.push(px + shiftX + jx, py + jy - 0.2, zOffset);
            
            if (side === "left") {
              const gray = brightness / 255;
              colors.push(gray * 0.75, gray * 0.8, gray * 0.9);
            } else {
              const factor = brightness / 255;
              colors.push(factor * 1.0, factor * 0.7, factor * 0.5);
            }
          }
        }
      }
      
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      resolve(geo);
    };
    img.onerror = () => {
      // Empty fallback
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute([0,0,0], 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute([1,1,1], 3));
      resolve(geo);
    };
  });
}

function makeFloorGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(139, 92, 246, 0.55)");
  g.addColorStop(0.35, "rgba(109, 40, 217, 0.22)");
  g.addColorStop(1, "rgba(8, 8, 8, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function HeroParticles3D() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDisposed = false;
    const width = container.clientWidth;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.FogExp2(BG, 0.045);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.08, 50);
    camera.position.set(0, 0.15, 6.2);
    camera.lookAt(0, -0.05, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x1a1a22, 0.35);
    scene.add(ambient);

    // --- Load Hands ---
    let leftGeo, rightGeo;
    let leftMat, rightMat;
    
    Promise.all([
      loadHandParticles("/ai_hand.png", "left"),
      loadHandParticles("/human_hand.png", "right")
    ]).then(([lGeo, rGeo]) => {
      if (isDisposed) {
        lGeo.dispose(); rGeo.dispose(); return;
      }
      leftGeo = lGeo;
      rightGeo = rGeo;
      
      const pointMatBase = {
        size: 0.032,
        vertexColors: true,
        transparent: true,
        opacity: 0.90,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      };
      
      leftMat = new THREE.PointsMaterial(pointMatBase);
      rightMat = new THREE.PointsMaterial({ ...pointMatBase, size: 0.030 });
      
      const leftPoints = new THREE.Points(leftGeo, leftMat);
      const rightPoints = new THREE.Points(rightGeo, rightMat);
      
      // Save original positions for noise animation
      leftGeo.userData.origPositions = new Float32Array(leftGeo.attributes.position.array);
      rightGeo.userData.origPositions = new Float32Array(rightGeo.attributes.position.array);
      
      scene.add(leftPoints);
      scene.add(rightPoints);
    });

    // --- Center: Glowing 3D financial line chart ---
    const chartGroup = new THREE.Group();

    const points = [
      new THREE.Vector3(-0.4, -0.3, 0),
      new THREE.Vector3(-0.2, -0.1, 0.1),
      new THREE.Vector3(-0.05, -0.15, -0.05),
      new THREE.Vector3(0.15, 0.15, 0.15),
      new THREE.Vector3(0.3, 0.05, -0.1),
      new THREE.Vector3(0.5, 0.45, 0)
    ];
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.018, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: VIOLET,
      emissive: VIOLET,
      emissiveIntensity: 1.8,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.95
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    chartGroup.add(tubeMesh);

    const sphereGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xc4b5fd,
      emissive: 0xc4b5fd,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.9
    });
    points.forEach(pt => {
      const sp = new THREE.Mesh(sphereGeo, sphereMat);
      sp.position.copy(pt);
      chartGroup.add(sp);
    });

    chartGroup.position.set(-0.05, 0.1, 0);
    scene.add(chartGroup);

    const pointLight = new THREE.PointLight(VIOLET, 2.8, 8, 1.8);
    pointLight.position.copy(chartGroup.position);
    scene.add(pointLight);

    const spot = new THREE.SpotLight(0xddd6fe, 1.2, 12, 0.55, 0.35, 1);
    spot.position.set(0, 3.5, 0.5);
    spot.target.position.copy(chartGroup.position);
    scene.add(spot);
    scene.add(spot.target);

    // Floor light pool
    const glowTex = makeFloorGlowTexture();
    const floorGeo = new THREE.PlaneGeometry(8, 8);
    const floorMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -1.35, 0.2);
    scene.add(floor);

    // Vertical beam (subtle cone of light)
    const beamGeo = new THREE.CylinderGeometry(0.02, 0.55, 5.5, 32, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, -0.2, 0);
    scene.add(beam);

    let raf = 0;
    const t0 = performance.now();

    function animate(t) {
      const e = (t - t0) * 0.001;
      
      chartGroup.rotation.y = Math.sin(e * 0.4) * 0.4;
      chartGroup.rotation.x = Math.sin(e * 0.5) * 0.1;
      tubeMat.emissiveIntensity = 1.6 + Math.sin(e * 2.2) * 0.4;
      pointLight.intensity = 2.6 + Math.sin(e * 2) * 0.35;
      
      // Animate hand particles slightly
      if (leftGeo && rightGeo) {
        const lPos = leftGeo.attributes.position;
        const rPos = rightGeo.attributes.position;
        const lOrig = leftGeo.userData.origPositions;
        const rOrig = rightGeo.userData.origPositions;
        
        for(let i=0; i<lPos.count; i++) {
           const ox = lOrig[i*3]; const oy = lOrig[i*3+1]; const oz = lOrig[i*3+2];
           lPos.setY(i, oy + Math.sin(e * 1.5 + ox * 2) * 0.03);
           lPos.setZ(i, oz + Math.cos(e * 1.0 + oy * 2) * 0.03);
        }
        for(let i=0; i<rPos.count; i++) {
           const ox = rOrig[i*3]; const oy = rOrig[i*3+1]; const oz = rOrig[i*3+2];
           rPos.setY(i, oy + Math.sin(e * 1.5 + ox * 2) * 0.03);
           rPos.setZ(i, oz + Math.cos(e * 1.0 + oy * 2) * 0.03);
        }
        lPos.needsUpdate = true;
        rPos.needsUpdate = true;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (leftGeo) leftGeo.dispose();
      if (rightGeo) rightGeo.dispose();
      if (leftMat) leftMat.dispose();
      if (rightMat) rightMat.dispose();
      tubeGeo.dispose();
      tubeMat.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      glowTex.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      beamGeo.dispose();
      beamMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto mt-4 h-[min(48vh,440px)] w-full max-w-[1100px] md:mt-6 md:h-[min(52vh,500px)]"
      style={{ touchAction: "none" }}
    />
  );
}
