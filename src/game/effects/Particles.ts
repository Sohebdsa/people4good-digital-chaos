import * as THREE from 'three';

const MAX = 260;
const WHITE = new THREE.Color(0xffffff);

/** Pooled instanced particle bursts (one draw call). */
export class Particles {
  mesh: THREE.InstancedMesh;
  private pos = new Float32Array(MAX * 3);
  private vel = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private maxLife = new Float32Array(MAX);
  private size = new Float32Array(MAX);
  private gravity = new Float32Array(MAX);
  private next = 0;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();

  constructor(scene: THREE.Scene) {
    const geo = new THREE.OctahedronGeometry(0.09, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < MAX; i++) {
      this.dummy.position.set(0, -100, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, this.color.setHex(0xffffff));
    }
    scene.add(this.mesh);
  }

  burst(x: number, y: number, z: number, color: number, count = 14, opts: { speed?: number; up?: number; gravity?: number; life?: number; size?: number; ring?: boolean } = {}) {
    const { speed = 4, up = 3, gravity = -9, life = 0.7, size = 1, ring = false } = opts;
    for (let n = 0; n < count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % MAX;
      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y;
      this.pos[i * 3 + 2] = z;
      if (ring) {
        const a = (n / count) * Math.PI * 2;
        this.vel[i * 3] = Math.cos(a) * speed;
        this.vel[i * 3 + 1] = Math.sin(a) * speed * 0.6 + up * 0.3;
        this.vel[i * 3 + 2] = 0;
      } else {
        this.vel[i * 3] = (Math.random() - 0.5) * speed * 2;
        this.vel[i * 3 + 1] = Math.random() * up + up * 0.3;
        this.vel[i * 3 + 2] = (Math.random() - 0.5) * speed * 2;
      }
      this.life[i] = life * (0.7 + Math.random() * 0.6);
      this.maxLife[i] = this.life[i];
      this.size[i] = size * (0.6 + Math.random() * 0.8);
      this.gravity[i] = gravity;
      this.color.setHex(color);
      if (Math.random() > 0.6) this.color.lerp(WHITE, 0.5);
      this.mesh.setColorAt(i, this.color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /** dz: world scroll this frame so particles drift with the world. */
  update(dt: number, dz: number) {
    let any = false;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      const k = i * 3;
      this.vel[k + 1] += this.gravity[i] * dt;
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt + dz;
      const lifeK = Math.max(0, this.life[i] / this.maxLife[i]);
      this.dummy.position.set(this.pos[k], this.pos[k + 1], this.pos[k + 2]);
      this.dummy.rotation.set(this.life[i] * 8, this.life[i] * 6, 0);
      this.dummy.scale.setScalar(this.life[i] > 0 ? this.size[i] * lifeK : 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
