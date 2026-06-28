import * as THREE from 'three';

export class WaterRippleController {
    constructor(scene) {
        this.scene = scene;
        this.activeRipples = [];
    }

    spawn(position, options = {}) {
        if (!this.scene || !position) return null;

        const geometry = new THREE.RingGeometry(
            options.innerRadius ?? 0.75,
            options.outerRadius ?? 0.92,
            options.segments ?? 56
        );

        const material = new THREE.MeshBasicMaterial({
            color: options.color ?? 0x8feeff,
            transparent: true,
            opacity: options.opacity ?? 0.32,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true,
            side: THREE.DoubleSide,
            toneMapped: false
        });

        const ripple = new THREE.Mesh(
            geometry,
            material
        );

        ripple.rotation.x = -Math.PI / 2;

        ripple.position.copy(position);
        ripple.position.y += options.yOffset ?? 0.045;

        ripple.userData.effectType = 'waterRipple';
        ripple.userData.life = 0;
        ripple.userData.duration = options.duration ?? 0.9;
        ripple.userData.startScale = options.startScale ?? 0.75;
        ripple.userData.endScale = options.endScale ?? 1.85;
        ripple.userData.baseOpacity = options.baseOpacity ?? 0.32;

        ripple.scale.setScalar(
            ripple.userData.startScale
        );

        this.scene.add(ripple);
        this.activeRipples.push(ripple);

        return ripple;
    }

    update(delta = 0.016) {
        if (this.activeRipples.length === 0) return;

        this.activeRipples = this.activeRipples.filter(ripple => {
            if (!ripple) return false;

            ripple.userData.life =
                (ripple.userData.life || 0) + delta;

            const duration =
                ripple.userData.duration || 1.0;

            const progress = THREE.MathUtils.clamp(
                ripple.userData.life / duration,
                0,
                1
            );

            this.updateRipple(
                ripple,
                progress
            );

            if (progress >= 1) {
                this.remove(ripple);
                return false;
            }

            return true;
        });
    }

    updateRipple(ripple, progress) {
        if (!ripple) return;

        const startScale =
            ripple.userData.startScale ?? 1.0;

        const endScale =
            ripple.userData.endScale ?? 2.0;

        const eased =
            1.0 - Math.pow(1.0 - progress, 3.0);

        const scale = THREE.MathUtils.lerp(
            startScale,
            endScale,
            eased
        );

        ripple.scale.setScalar(scale);

        const baseOpacity =
            ripple.userData.baseOpacity ?? 0.32;

        const opacity =
            baseOpacity * Math.pow(1.0 - progress, 1.35);

        if (ripple.material) {
            ripple.material.opacity = opacity;
            ripple.material.needsUpdate = true;
        }
    }

    remove(ripple) {
        if (!ripple) return;

        ripple.parent?.remove(ripple);

        ripple.traverse(node => {
            if (!node) return;

            if (node.geometry) {
                node.geometry.dispose?.();
            }

            if (node.material) {
                if (Array.isArray(node.material)) {
                    node.material.forEach(material => {
                        material?.dispose?.();
                    });
                } else {
                    node.material.dispose?.();
                }
            }
        });
    }

    clear() {
        this.activeRipples.forEach(ripple => {
            this.remove(ripple);
        });

        this.activeRipples = [];
    }
}