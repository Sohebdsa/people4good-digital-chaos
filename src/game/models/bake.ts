import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Draw-call reduction (performance-optimization skill: "share materials so meshes batch").
 * Every procedural prop is built from many small meshes. This merges all *static* meshes of a
 * prop that share a material into one mesh, so a 40-part filing cabinet becomes ~4 draw calls.
 *
 * Anything that animates is kept intact: a node is dynamic if it has a name (looked up later)
 * or carries an animation tag in userData. Static children *inside* a dynamic node are baked
 * relative to that node, so they still move with it.
 */
const ANIM_KEYS = ['bob', 'spin', 'pulse', 'glitch', 'slide', 'float', 'spinY', 'spinX', 'rotor', 'blink', 'flicker', 'scan', 'eq'];
const KEEP_ATTR = new Set(['position', 'normal', 'uv']);

const vcCache = new Map<string, THREE.MeshStandardMaterial>();
function vertexColorMaterial(rough: number, metal: number) {
  const key = `${rough}|${metal}`;
  let m = vcCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal, flatShading: true });
    vcCache.set(key, m);
  }
  return m;
}

function isDynamic(o: THREE.Object3D) {
  if (o.name) return true;
  for (const k of ANIM_KEYS) if (o.userData[k] !== undefined) return true;
  return false;
}

export function bakeStatic(root: THREE.Object3D): THREE.Object3D {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; cast: boolean; receive: boolean }>();
  const remove: THREE.Object3D[] = [];

  const visit = (node: THREE.Object3D) => {
    for (const c of node.children) {
      if (isDynamic(c)) {
        bakeStatic(c);
        continue;
      }
      const mesh = c as THREE.Mesh;
      if (mesh.isMesh && !(mesh as unknown as THREE.InstancedMesh).isInstancedMesh && !Array.isArray(mesh.material) && c.children.length === 0) {
        let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        for (const name of Object.keys(g.attributes)) if (!KEEP_ATTR.has(name)) g.deleteAttribute(name);
        if (!g.attributes.uv || !g.attributes.normal) {
          g.dispose();
          continue;
        }
        g.clearGroups();
        rel.multiplyMatrices(inv, mesh.matrixWorld);
        g = g.applyMatrix4(rel);
        let mat = mesh.material as THREE.Material;
        // Plain-colour lit materials collapse into one shared vertex-colour material, so a whole
        // prop with ten colours becomes a single draw call instead of ten.
        const std = mat as THREE.MeshStandardMaterial;
        if (std.isMeshStandardMaterial && !std.map && !std.transparent && std.emissiveIntensity === 0) {
          const n = g.attributes.position.count;
          const col = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) {
            col[i * 3] = std.color.r;
            col[i * 3 + 1] = std.color.g;
            col[i * 3 + 2] = std.color.b;
          }
          g.setAttribute('color', new THREE.BufferAttribute(col, 3));
          mat = vertexColorMaterial(std.roughness, std.metalness);
        }
        let b = buckets.get(mat);
        if (!b) {
          b = { geos: [], cast: false, receive: false };
          buckets.set(mat, b);
        }
        b.geos.push(g);
        b.cast ||= mesh.castShadow;
        b.receive ||= mesh.receiveShadow;
        remove.push(mesh);
      } else if (c.children.length) {
        visit(c);
      }
    }
  };
  visit(root);

  for (const [mat, b] of buckets) {
    const merged = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
    if (!merged) continue;
    if (b.geos.length > 1) b.geos.forEach((g) => g.dispose());
    merged.computeBoundingSphere();
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = b.cast;
    m.receiveShadow = b.receive;
    m.matrixAutoUpdate = false; // baked: never moves relative to its root
    m.updateMatrix();
    root.add(m);
  }
  for (const r of remove) r.removeFromParent();
  // drop now-empty static groups
  const prune = (node: THREE.Object3D) => {
    for (const c of [...node.children]) {
      prune(c);
      if (!isDynamic(c) && !(c as THREE.Mesh).isMesh && c.children.length === 0 && (c as THREE.Group).isGroup) c.removeFromParent();
    }
  };
  prune(root);
  return root;
}

/** Collect animated descendants once, so per-frame animation never walks the whole tree. */
export function animNodes(root: THREE.Object3D): THREE.Object3D[] {
  if (root.userData.animNodes) return root.userData.animNodes as THREE.Object3D[];
  const list: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o === root) return;
    for (const k of ANIM_KEYS) if (o.userData[k] !== undefined) {
      list.push(o);
      break;
    }
  });
  root.userData.animNodes = list;
  return list;
}

export function countMeshes(root: THREE.Object3D) {
  let n = 0;
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) n++;
  });
  return n;
}

const prototypes = new Map<string, THREE.Group>();

/**
 * Build a model once, then hand out clones. `clone()` shares geometry and material, so every
 * instance of a risk / tool / prop reuses the same GPU buffers (no per-instance uploads or memory).
 * Prototypes must never cache Object3D references in userData (clone() JSON-copies userData).
 */
export function instantiate(key: string, build: () => THREE.Group): THREE.Group {
  let proto = prototypes.get(key);
  if (!proto) {
    proto = build();
    prototypes.set(key, proto);
  }
  return proto.clone(true);
}
