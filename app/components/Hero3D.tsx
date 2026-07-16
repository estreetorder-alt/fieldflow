"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Hero3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffe4c4, 1.1);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xea580c, 2.2, 60);
    rimLight.position.set(-8, -4, 4);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xf59e0b, 1.4, 60);
    fillLight.position.set(6, -6, 8);
    scene.add(fillLight);

    // ===== Camera Aperture (iris of blades) =====
    const apertureGroup = new THREE.Group();
    const bladeCount = 9;
    const blades: THREE.Mesh[] = [];

    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.lineTo(1.6, 0.35);
    bladeShape.lineTo(1.9, 1.5);
    bladeShape.lineTo(0.2, 1.15);
    bladeShape.lineTo(0, 0);

    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 };
    const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);

    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xea580c, roughness: 0.35, metalness: 0.55, emissive: 0xc2410c, emissiveIntensity: 0.12,
    });
    const bladeMaterialAlt = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, roughness: 0.3, metalness: 0.6, emissive: 0xb45309, emissiveIntensity: 0.1,
    });

    for (let i = 0; i < bladeCount; i++) {
      const blade = new THREE.Mesh(bladeGeometry, i % 2 === 0 ? bladeMaterial : bladeMaterialAlt);
      const angle = (i / bladeCount) * Math.PI * 2;
      blade.userData.angle = angle;
      apertureGroup.add(blade);
      blades.push(blade);
    }
    scene.add(apertureGroup);

    // ===== Outer lens ring =====
    const ringGeometry = new THREE.TorusGeometry(3.2, 0.18, 24, 80);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xc2410c, roughness: 0.25, metalness: 0.7, emissive: 0xea580c, emissiveIntensity: 0.15,
    });
    const lensRing = new THREE.Mesh(ringGeometry, ringMaterial);
    scene.add(lensRing);

    const ring2Geometry = new THREE.TorusGeometry(3.7, 0.05, 16, 80);
    const ring2Material = new THREE.MeshStandardMaterial({
      color: 0xb45309, roughness: 0.4, metalness: 0.5, transparent: true, opacity: 0.6,
    });
    const lensRing2 = new THREE.Mesh(ring2Geometry, ring2Material);
    scene.add(lensRing2);

    // ===== Floating photo frames =====
    const framesGroup = new THREE.Group();
    const frameCount = 5;
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.5, metalness: 0.1, transparent: true, opacity: 0.85,
    });
    for (let i = 0; i < frameCount; i++) {
      const frameGeo = new THREE.PlaneGeometry(0.7, 0.5);
      const frame = new THREE.Mesh(frameGeo, frameMat);
      const angle = (i / frameCount) * Math.PI * 2;
      const radius = 4.6;
      frame.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.55, (Math.random() - 0.5) * 2);
      frame.rotation.z = Math.random() * 0.5 - 0.25;
      frame.userData.angle = angle;
      frame.userData.radius = radius;
      framesGroup.add(frame);

      const borderGeo = new THREE.EdgesGeometry(frameGeo);
      const borderMat = new THREE.LineBasicMaterial({ color: 0xea580c });
      const border = new THREE.LineSegments(borderGeo, borderMat);
      frame.add(border);
    }
    scene.add(framesGroup);

    // ===== Dust / light particles =====
    const particleCount = 120;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({ color: 0xea580c, size: 0.05, transparent: true, opacity: 0.4 });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.6;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.6;
    };
    window.addEventListener("mousemove", handleMouseMove);

    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      const openAmount = 0.9 + Math.sin(elapsed * 0.6) * 0.55;
      apertureGroup.rotation.z = elapsed * 0.15;
      blades.forEach((blade) => {
        const angle = blade.userData.angle;
        blade.position.set(Math.cos(angle) * openAmount, Math.sin(angle) * openAmount, 0);
        blade.rotation.z = angle + Math.PI / 2;
      });

      lensRing.rotation.z = -elapsed * 0.1;
      lensRing.rotation.x = Math.sin(elapsed * 0.3) * 0.15;
      lensRing2.rotation.z = elapsed * 0.2;
      lensRing2.rotation.x = Math.cos(elapsed * 0.25) * 0.2;

      framesGroup.rotation.z = elapsed * 0.08;
      framesGroup.children.forEach((frame, i) => {
        frame.rotation.z = -framesGroup.rotation.z + Math.sin(elapsed + i) * 0.1;
        frame.position.z = Math.sin(elapsed * 0.5 + i) * 1.2;
      });

      particles.rotation.y = elapsed * 0.03;

      camera.position.x += (mouseX - camera.position.x) * 0.05;
      camera.position.y += (-mouseY - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    if (!prefersReduced) {
      animate();
    } else {
      renderer.render(scene, camera);
    }

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      bladeGeometry.dispose();
      bladeMaterial.dispose();
      bladeMaterialAlt.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      ring2Geometry.dispose();
      ring2Material.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
