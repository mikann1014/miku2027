import * as THREE from 'three';
import { SCALES } from '../appState.js';

export class SpawnFactory {
    constructor(scene, materialApplier) {
        this.scene = scene;
        this.materialApplier = materialApplier;
    }

    create(master, id, position, options = {}) {
        if (!master || !id || !position) {
            return null;
        }

        const instance = master.clone(true);

        instance.visible = true;
        instance.position.copy(position);

        this.applyScale(
            instance,
            id,
            options
        );

        this.applyRotation(
            instance,
            options
        );

        if (this.materialApplier) {
            this.materialApplier.applyToObject(
                instance,
                id
            );
        }

        this.applySpecialUserData(
            instance,
            id
        );

        if (this.scene) {
            this.scene.add(instance);
        }

        return instance;
    }

    createMixed(master, id, position, options = {}) {
        if (!master || !id || !position) {
            return null;
        }

        const instance = master.clone(true);

        instance.visible = true;

        const spread = options.spread ?? 4;

        instance.position.set(
            position.x + (Math.random() - 0.5) * spread,
            position.y,
            position.z + (Math.random() - 0.5) * spread
        );

        const baseScale = SCALES[id] ?? 1.0;

        const randomScale =
            options.randomScale ??
            (
                0.5 + Math.random() * 0.8
            );

        instance.scale.setScalar(
            baseScale * randomScale
        );

        instance.rotation.y = Math.random() * Math.PI * 2;

        if (this.materialApplier) {
            this.materialApplier.applyToObject(
                instance,
                id
            );
        }

        this.applySpecialUserData(
            instance,
            id
        );

        if (this.scene) {
            this.scene.add(instance);
        }

        return instance;
    }

    applyScale(instance, id, options = {}) {
        const baseScale = SCALES[id] ?? 1.0;
        const scaleMultiplier = options.scaleMultiplier ?? 1.0;

        instance.scale.setScalar(
            baseScale * scaleMultiplier
        );
    }

    applyRotation(instance, options = {}) {
        if (options.randomRotation ?? true) {
            instance.rotation.y = Math.random() * Math.PI * 2;
        }
    }

    applySpecialUserData(instance, id) {
        if (id.startsWith('Prism')) {
            instance.userData.isPrism = true;
            instance.userData.baseScale = instance.scale.clone();
        }
    }
}