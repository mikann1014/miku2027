import * as THREE from 'three';

export class PrismPulseController {
    constructor(scene) {
        this.scene = scene;
    }

    update(beat = 0) {
        if (!this.scene) return;

        const pulse = THREE.MathUtils.clamp(
            beat,
            0,
            1
        );

        this.scene.traverse(object => {
            if (!object.userData?.isPrism) return;

            this.updatePrismScale(
                object,
                pulse
            );

            this.updatePrismMaterials(
                object,
                pulse
            );
        });
    }

    updatePrismScale(object, pulse) {
        const baseScale = object.userData.baseScale;

        if (!baseScale) return;

        const scaleBoost =
            1.0 + pulse * 0.22;

        object.scale
            .copy(baseScale)
            .multiplyScalar(scaleBoost);
    }

    updatePrismMaterials(object, pulse) {
        if (object.userData.ignorePulse) {
            return;
        }

        object.traverse(child => {
            const material = child.userData?.lineMaterial;
            const baseColor = child.userData?.baseColor;

            if (!material || !baseColor) return;

            const intensity =
                0.18 + pulse * 2.8;

            material.color
                .copy(baseColor)
                .multiplyScalar(intensity);

            material.opacity =
                0.18 + pulse * 0.82;

            material.transparent = true;
            material.needsUpdate = true;
        });
    }
}