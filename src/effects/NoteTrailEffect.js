import * as THREE from 'three';

export class NoteTrailEffect {
    constructor(scene, options = {}) {
        this.scene = scene;

        this.group = new THREE.Group();
        this.group.name = 'noteTrailEffectGroup';

        if (this.scene) {
            this.scene.add(this.group);
        }

        this.enabled = false;

        this.sources = [];
        this.trails = [];

        this.spawnInterval =
            options.spawnInterval ?? 0.055;

        this.elapsedSinceSpawn = 0;

        this.lifeDuration =
            options.lifeDuration ?? 0.9;

        this.baseSize =
            options.baseSize ?? 0.035;

        this.color =
            new THREE.Color(
                options.color ?? 0x9ffcff
            );
    }

    setSources(objects = []) {
        this.sources =
            objects.filter(object => !!object);
    }

    start(objects = []) {
        this.setSources(objects);
        this.enabled = true;
        this.elapsedSinceSpawn = 0;

        console.log(
            `[NoteTrailEffect] Started. sources=${this.sources.length}`
        );
    }

    stop() {
        this.enabled = false;
    }

    update(delta = 0.016) {
        if (this.enabled) {
            this.elapsedSinceSpawn += delta;

            if (
                this.elapsedSinceSpawn >=
                this.spawnInterval
            ) {
                this.elapsedSinceSpawn = 0;
                this.spawnTrailParticles();
            }
        }

        this.updateTrails(delta);
    }

    spawnTrailParticles() {
        this.sources.forEach(source => {
            if (!source || !source.parent) {
                return;
            }

            const geometry =
                new THREE.SphereGeometry(
                    this.baseSize *
                        THREE.MathUtils.lerp(
                            0.75,
                            1.35,
                            Math.random()
                        ),
                    8,
                    8
                );

            const material =
                new THREE.MeshBasicMaterial({
                    color: this.color,
                    transparent: true,
                    opacity: 0.55,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    toneMapped: false
                });

            const particle =
                new THREE.Mesh(
                    geometry,
                    material
                );

            const worldPosition =
                new THREE.Vector3();

            source.getWorldPosition(
                worldPosition
            );

            particle.position.copy(
                worldPosition
            );

            particle.userData.life = 0;
            particle.userData.duration =
                this.lifeDuration *
                THREE.MathUtils.lerp(
                    0.75,
                    1.25,
                    Math.random()
                );

            particle.userData.velocity =
                new THREE.Vector3(
                    (Math.random() - 0.5) * 0.012,
                    0.012 + Math.random() * 0.018,
                    (Math.random() - 0.5) * 0.012
                );

            particle.userData.baseScale =
                particle.scale.clone();

            this.group.add(particle);

            this.trails.push({
                particle,
                geometry,
                material
            });
        });
    }

    updateTrails(delta) {
        if (this.trails.length === 0) {
            return;
        }

        this.trails =
            this.trails.filter(entry => {
                const particle =
                    entry.particle;

                if (!particle) {
                    return false;
                }

                particle.userData.life += delta;

                const duration =
                    particle.userData.duration ??
                    this.lifeDuration;

                const t =
                    THREE.MathUtils.clamp(
                        particle.userData.life /
                            duration,
                        0,
                        1
                    );

                if (particle.userData.velocity) {
                    particle.position.addScaledVector(
                        particle.userData.velocity,
                        delta * 60
                    );
                }

                const fade =
                    1.0 -
                    THREE.MathUtils.smoothstep(
                        t,
                        0.15,
                        1.0
                    );

                entry.material.opacity =
                    0.55 * fade;

                const scale =
                    THREE.MathUtils.lerp(
                        1.0,
                        0.18,
                        THREE.MathUtils.smoothstep(
                            t,
                            0.25,
                            1.0
                        )
                    );

                if (particle.userData.baseScale) {
                    particle.scale
                        .copy(
                            particle.userData.baseScale
                        )
                        .multiplyScalar(scale);
                }

                entry.material.needsUpdate = true;

                if (t >= 1.0) {
                    this.disposeTrail(entry);
                    return false;
                }

                return true;
            });
    }

    disposeTrail(entry) {
        entry.particle?.parent?.remove(
            entry.particle
        );

        entry.geometry?.dispose?.();
        entry.material?.dispose?.();
    }

    clear() {
        this.trails.forEach(entry => {
            this.disposeTrail(entry);
        });

        this.trails = [];
        this.sources = [];
        this.enabled = false;
        this.elapsedSinceSpawn = 0;
    }
}