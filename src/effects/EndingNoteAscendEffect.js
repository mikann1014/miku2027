import * as THREE from 'three';

export class EndingNoteAscendEffect {
    constructor(scene, spawnManager, options = {}) {
        this.scene = scene;
        this.spawnManager = spawnManager;

        this.group = new THREE.Group();
        this.group.name = 'endingNoteAscendEffectGroup';

        if (this.scene) {
            this.scene.add(this.group);
        }

        this.active = false;
        this.elapsed = 0;

        this.duration =
            options.duration ?? 7.5;

        this.count =
            options.count ?? 14;

        this.notes = [];
    }

    start(originPosition, options = {}) {
        this.clear();

        if (!originPosition) {
            return;
        }

        this.duration =
            options.duration ?? this.duration;

        this.count =
            options.count ?? this.count;

        for (let i = 0; i < this.count; i++) {
            const note =
                this.createNote(
                    originPosition,
                    i
                );

            if (note) {
                this.notes.push(note);
            }
        }

        this.elapsed = 0;
        this.active = true;

        console.log(
            `[EndingNoteAscendEffect] Started. count=${this.notes.length}`
        );
    }

    createNote(originPosition, index) {
        if (
            !this.spawnManager ||
            typeof this.spawnManager.spawn !== 'function'
        ) {
            return null;
        }

        const angle =
            Math.random() * Math.PI * 2;

        const radius =
            0.6 + Math.random() * 3.5;

        const position =
            originPosition
                .clone()
                .add(
                    new THREE.Vector3(
                        Math.cos(angle) * radius,
                        0.8 + Math.random() * 1.6,
                        Math.sin(angle) * radius
                    )
                );

        const note =
            this.spawnManager.spawn(
                'tone',
                position,
                {
                    scaleMultiplier:
                        0.28 + Math.random() * 0.2,
                    randomRotation: true
                }
            );

        if (!note) {
            return null;
        }

        note.name =
            `ending_ascending_note_${index}`;

        this.group.add(note);

        const color =
            new THREE.Color().setHSL(
                0.52 + Math.random() * 0.1,
                0.9,
                0.7
            );

        this.applyNoteMaterial(
            note,
            color
        );

        note.userData.startPosition =
            note.position.clone();

        note.userData.phase =
            Math.random() * Math.PI * 2;

        note.userData.ascendSpeed =
            7.0 + Math.random() * 5.0;

        note.userData.sideDrift =
            new THREE.Vector3(
                (Math.random() - 0.5) * 2.4,
                0,
                (Math.random() - 0.5) * 2.4
            );

        note.userData.baseScale =
            note.scale.clone();

        return note;
    }

    applyNoteMaterial(object, color) {
        object.traverse(child => {
            if (!child) return;

            const lineMaterial =
                child.userData?.lineMaterial;

            if (lineMaterial) {
                const cloned =
                    lineMaterial.clone();

                cloned.color.copy(color);
                cloned.opacity = 0.95;
                cloned.transparent = true;
                cloned.depthWrite = false;
                cloned.blending = THREE.AdditiveBlending;
                cloned.toneMapped = false;
                cloned.needsUpdate = true;

                child.userData.lineMaterial = cloned;
            }

            if (
                child.material &&
                child.isMesh &&
                !child.userData?.isWire
            ) {
                const materials =
                    Array.isArray(child.material)
                        ? child.material
                        : [child.material];

                const clonedMaterials =
                    materials.map(material => {
                        const cloned =
                            material.clone();

                        cloned.transparent = true;
                        cloned.opacity = 0.0;
                        cloned.depthWrite = false;
                        cloned.colorWrite = false;
                        cloned.needsUpdate = true;

                        return cloned;
                    });

                child.material =
                    Array.isArray(child.material)
                        ? clonedMaterials
                        : clonedMaterials[0];
            }
        });
    }

    update(delta = 0.016) {
        if (!this.active) {
            return;
        }

        this.elapsed += delta;

        const t =
            THREE.MathUtils.clamp(
                this.elapsed / this.duration,
                0,
                1
            );

        this.notes.forEach(note => {
            if (!note) return;

            const phase =
                note.userData.phase ?? 0;

            const start =
                note.userData.startPosition;

            const sideDrift =
                note.userData.sideDrift ||
                new THREE.Vector3();

            const ascendSpeed =
                note.userData.ascendSpeed ?? 8;

            const spiral =
                new THREE.Vector3(
                    Math.cos(
                        this.elapsed * 1.8 + phase
                    ),
                    0,
                    Math.sin(
                        this.elapsed * 1.8 + phase
                    )
                ).multiplyScalar(
                    0.8 * (1.0 - t)
                );

            note.position.copy(start);

            note.position.y +=
                ascendSpeed *
                this.elapsed;

            note.position.addScaledVector(
                sideDrift,
                t
            );

            note.position.add(spiral);

            note.rotation.y += delta * 1.8;
            note.rotation.z += delta * 0.9;

            const scaleFade =
                THREE.MathUtils.lerp(
                    1.0,
                    0.15,
                    THREE.MathUtils.smoothstep(
                        t,
                        0.55,
                        1.0
                    )
                );

            if (note.userData.baseScale) {
                note.scale
                    .copy(note.userData.baseScale)
                    .multiplyScalar(scaleFade);
            }

            this.setOpacity(
                note,
                1.0 -
                    THREE.MathUtils.smoothstep(
                        t,
                        0.68,
                        1.0
                    )
            );
        });

        if (t >= 1.0) {
            this.clear();
        }
    }

    setOpacity(object, opacity) {
        object.traverse(child => {
            const materials = [];

            if (child.material) {
                if (Array.isArray(child.material)) {
                    materials.push(...child.material);
                } else {
                    materials.push(child.material);
                }
            }

            if (child.userData?.lineMaterial) {
                materials.push(child.userData.lineMaterial);
            }

            materials.forEach(material => {
                if (!material) return;

                material.transparent = true;
                material.opacity = opacity;
                material.needsUpdate = true;
            });
        });
    }

    clear() {
        this.notes.forEach(note => {
            note.parent?.remove(note);

            note.traverse?.(child => {
                if (child.material) {
                    const materials =
                        Array.isArray(child.material)
                            ? child.material
                            : [child.material];

                    materials.forEach(material => {
                        material.dispose?.();
                    });
                }

                if (child.userData?.lineMaterial) {
                    child.userData.lineMaterial.dispose?.();
                }
            });
        });

        this.notes = [];
        this.active = false;
        this.elapsed = 0;
    }
}


