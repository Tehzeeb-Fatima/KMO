"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_ICONS, cdnImage, type CategoryIconKey } from "@kmo/shared/lib";

export interface Banner3DCategory {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  image_url: string | null;
}

/** Floating 3D category tiles (three.js). Hover or tap lifts a tile; click
 *  opens the category. Tiles cycle a highlight on their own when idle. */
export function CategoryBanner3D({ categories }: { categories: Banner3DCategory[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState(categories[0]?.name ?? "");
  const router = useRouter();

  useEffect(() => {
    const wrap = wrapRef.current;
    // phones keep the plain slider; the banner is hidden there, so skip WebGL
    if (!wrap || categories.length === 0 || !window.matchMedia("(min-width: 768px)").matches) return;
    let disposed = false;
    let cleanup = () => {};

    void import("three").then((THREE) => {
      if (disposed) return;
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(30, 16 / 5, 0.1, 200);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.style.display = "block";
      wrap.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dl = new THREE.DirectionalLight(0xffffff, 1.6);
      dl.position.set(3, 5, 6);
      scene.add(dl);
      const pl = new THREE.PointLight(0xf2a541, 8, 20);
      pl.position.set(0, 0, 4);
      scene.add(pl);

      const s = 1.3, h = s / 2, r = 0.25;
      const shape = new THREE.Shape();
      shape.moveTo(-h + r, -h);
      shape.lineTo(h - r, -h);
      shape.quadraticCurveTo(h, -h, h, -h + r);
      shape.lineTo(h, h - r);
      shape.quadraticCurveTo(h, h, h - r, h);
      shape.lineTo(-h + r, h);
      shape.quadraticCurveTo(-h, h, -h, h - r);
      shape.lineTo(-h, -h + r);
      shape.quadraticCurveTo(-h, -h, -h + r, -h);
      const tileGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.25, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 4,
      });
      const iconGeo = new THREE.PlaneGeometry(1.1, 1.1);
      const ringGeo = new THREE.TorusGeometry(0.95, 0.02, 8, 64);

      function iconSvg(icon: string | null) {
        const key = (icon as CategoryIconKey) in CATEGORY_ICONS ? (icon as CategoryIconKey) : "tag";
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="512" height="512" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${CATEGORY_ICONS[key].paths}</svg>`;
      }

      function texture(c: Banner3DCategory) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 256;
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        const draw = (img: HTMLImageElement, pad: number) => {
          const g = canvas.getContext("2d")!;
          g.clearRect(0, 0, 256, 256);
          g.drawImage(img, pad, pad, 256 - pad * 2, 256 - pad * 2);
          tex.needsUpdate = true;
        };
        const drawIcon = () => {
          const img = new Image();
          img.onload = () => draw(img, 56);
          img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(iconSvg(c.icon));
        };
        if (c.image_url) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => draw(img, 28);
          img.onerror = drawIcon;
          img.src = cdnImage(c.image_url, 300);
        } else {
          drawIcon();
        }
        return tex;
      }

      type Item = {
        group: InstanceType<typeof THREE.Group>;
        tile: InstanceType<typeof THREE.Mesh>;
        tileMat: InstanceType<typeof THREE.MeshStandardMaterial>;
        ringMat: InstanceType<typeof THREE.MeshBasicMaterial>;
        ring: InstanceType<typeof THREE.Mesh>;
        k: number;
        hover: number;
        cat: Banner3DCategory;
      };
      const items: Item[] = categories.map((cat, k) => {
        const group = new THREE.Group();
        const tileMat = new THREE.MeshStandardMaterial({ color: 0x4a2266, metalness: 0.3, roughness: 0.35 });
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.z = -0.15;
        group.add(tile);
        const icon = new THREE.Mesh(iconGeo, new THREE.MeshBasicMaterial({ map: texture(cat), transparent: true }));
        icon.position.z = 0.17;
        group.add(icon);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xf2a541, transparent: true, opacity: 0 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        group.add(ring);
        scene.add(group);
        return { group, tile, tileMat, ringMat, ring, k, hover: 0, cat };
      });

      const gap = 1.75;
      const span = gap * items.length;
      function layout() {
        const w = wrap!.clientWidth, hgt = wrap!.clientHeight;
        renderer.setSize(w, hgt);
        cam.aspect = w / hgt;
        // pull the camera back far enough that every tile fits the width
        const z = Math.max(9, (span + 1.5) / (2 * Math.tan((cam.fov * Math.PI) / 360) * cam.aspect));
        cam.position.set(0, 0.3, z);
        cam.lookAt(0, -0.2, 0);
        cam.updateProjectionMatrix();
      }
      layout();
      const ro = new ResizeObserver(layout);
      ro.observe(wrap);

      const ray = new THREE.Raycaster();
      const mouse = new THREE.Vector2(9, 9);
      const setMouse = (e: PointerEvent) => {
        const b = wrap.getBoundingClientRect();
        mouse.set(((e.clientX - b.left) / b.width) * 2 - 1, (-(e.clientY - b.top) / b.height) * 2 + 1);
      };
      const hitItem = () => {
        ray.setFromCamera(mouse, cam);
        const hit = ray.intersectObjects(items.map((i) => i.tile));
        return hit.length ? items.find((i) => i.tile === hit[0].object) ?? null : null;
      };
      const onLeave = () => mouse.set(9, 9);
      const onClick = (e: PointerEvent) => {
        setMouse(e);
        const it = hitItem();
        if (it) router.push(`/category/${it.cat.slug}`);
      };
      wrap.addEventListener("pointermove", setMouse);
      wrap.addEventListener("pointerleave", onLeave);
      wrap.addEventListener("pointerup", onClick);

      const clock = new THREE.Clock();
      let raf = 0;
      let lastLabel = "";
      const loop = () => {
        const t = clock.getElapsedTime();
        const hov = hitItem();
        const active = hov ?? items[Math.floor(t / 3.5) % items.length];
        if (active.cat.name !== lastLabel) {
          lastLabel = active.cat.name;
          setLabel(lastLabel);
        }
        wrap.style.cursor = hov ? "pointer" : "";
        for (const it of items) {
          it.hover += ((it === active ? 1 : 0) - it.hover) * 0.05;
          const x = it.k * gap - span / 2 + gap / 2;
          it.group.position.set(x, Math.sin(t * 0.6 + it.k * 0.7) * 0.1 - 0.2 + it.hover * 0.35, it.hover * 0.6);
          it.group.rotation.y = Math.sin(t * 0.4 + it.k) * 0.12 - x * 0.03 + it.hover * Math.sin(t * 1.5) * 0.06;
          it.group.scale.setScalar(1 + it.hover * 0.3);
          it.ringMat.opacity = it.hover;
          it.ring.rotation.z = t * 0.5;
          it.tileMat.color.setHex(it.hover > 0.5 ? 0x6b3891 : 0x4a2266);
        }
        renderer.render(scene, cam);
        raf = requestAnimationFrame(loop);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        wrap.removeEventListener("pointermove", setMouse);
        wrap.removeEventListener("pointerleave", onLeave);
        wrap.removeEventListener("pointerup", onClick);
        scene.traverse((o) => {
          const m = o as InstanceType<typeof THREE.Mesh>;
          if (m.isMesh) {
            const mat = m.material as InstanceType<typeof THREE.MeshBasicMaterial>;
            mat.map?.dispose();
            mat.dispose();
          }
        });
        tileGeo.dispose();
        iconGeo.dispose();
        ringGeo.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [categories, router]);

  return (
    <div
      ref={wrapRef}
      className="relative aspect-[16/5] w-full overflow-hidden rounded-[22px] bg-[radial-gradient(ellipse_at_50%_40%,#6b3891,#2a1140)]"
    >
      <p className="pointer-events-none absolute bottom-[6%] left-0 z-10 w-full text-center text-[20px] font-bold text-[#f2a541]">
        {label}
      </p>
    </div>
  );
}
