import * as THREE from 'three';

export class TerrainFadeController {
    constructor(options = {}) {
        this.fadeFrontStart = options.fadeFrontStart ?? 430;
        this.fadeFrontEnd = options.fadeFrontEnd ?? 760;

        this.fadeBackStart = options.fadeBackStart ?? 260;
        this.fadeBackEnd = options.fadeBackEnd ?? 520;

        this.minFarOpacity = options.minFarOpacity ?? 0.0;
    }

    updateChunks(terrainChunks, mikuZ) {
        if (
            !Array.isArray(terrainChunks) ||
            terrainChunks.length === 0
        ) {
            return;
        }

        terrainChunks.forEach(chunk => {
            const fade = this.calculateFade(
                chunk,
                mikuZ
            );

            this.applyFadeToChunk(
                chunk,
                fade
            );
        });
    }

    calculateFade(chunk, mikuZ) {
        if (!chunk) {
            return 1.0;
        }

        const forwardDistance =
            mikuZ - chunk.centerZ;

        const backwardDistance =
            chunk.centerZ - mikuZ;

        let fade = 1.0;

        if (forwardDistance > this.fadeFrontStart) {
            fade = 1.0 - THREE.MathUtils.smoothstep(
                forwardDistance,
                this.fadeFrontStart,
                this.fadeFrontEnd
            );
        }

        if (backwardDistance > this.fadeBackStart) {
            const backFade =
                1.0 - THREE.MathUtils.smoothstep(
                    backwardDistance,
                    this.fadeBackStart,
                    this.fadeBackEnd
                );

            fade = Math.min(
                fade,
                backFade
            );
        }

        return THREE.MathUtils.clamp(
            fade,
            this.minFarOpacity,
            1.0
        );
    }

    applyFadeToChunk(chunk, fade) {
        if (
            !chunk ||
            !Array.isArray(chunk.fadeTargets)
        ) {
            return;
        }

        chunk.fadeTargets.forEach(target => {
            if (!target.material) {
                return;
            }

            target.material.opacity =
                target.baseOpacity * fade;

            target.material.needsUpdate = true;
        });
    }
}