import * as THREE from 'three';

export class PrismBurstEffect {
    constructor(spawnManager, options = {}) {
        this.spawnManager = spawnManager;

        this.count = options.count ?? 6;

        this.scaleMultiplier =
            options.scaleMultiplier ?? 0.6;

        this.lifeDecrease =
            options.lifeDecrease ?? 0.04;

        this.moveSpeed =
            options.moveSpeed ?? 0.4;

        this.rotationSpeed =
            options.rotationSpeed ?? 0.15;

        this.color = options.color || new THREE.Color(
            1.5,
            1.5,
            2.0
        );
    }

    spawn(position) {
        if (!this.spawnManager || !position) return;

        for (let i = 0; i < this.count; i++) {
            const id = this.getRandomPrismId();

            const prism = this.spawnManager.spawn(
                id,
                position.clone(),
                {
                    scaleMultiplier: this.scaleMultiplier
                }
            );

            if (!prism) continue;

            prism.userData.ignorePulse = true;

            const direction = this.createRandomDirection();

            this.animatePrism(
                prism,
                direction
            );
        }
    }

    getRandomPrismId() {
        return `Prism${Math.floor(Math.random() * 3) + 1}`;
    }

    createRandomDirection() {
        return new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() * 1.2,
            Math.random() - 0.5
        ).normalize();
    }

    animatePrism(prism, direction) {
        let life = 1.0;

        const animate = () => {
            if (!prism || !prism.parent) {
                return;
            }

            life -= this.lifeDecrease;

            prism.position.addScaledVector(
                direction,
                this.moveSpeed
            );

            prism.rotation.x += this.rotationSpeed;
            prism.rotation.y += this.rotationSpeed;

            this.updatePrismMaterial(
                prism,
                life
            );

            if (life <= 0) {
                prism.parent?.remove(prism);
                return;
            }

            requestAnimationFrame(animate);
        };

        animate();
    }

    updatePrismMaterial(prism, life) {
        prism.traverse(child => {
            const material =
                child.userData?.lineMaterial;

            if (!material) return;

            material.opacity = life;

            material.color.setRGB(
                this.color.r,
                this.color.g,
                this.color.b
            );

            material.needsUpdate = true;
        });
    }
}