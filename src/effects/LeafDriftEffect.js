import * as THREE from 'three';

export class LeafDriftEffect {
    constructor(spawnManager, options = {}) {
        this.spawnManager = spawnManager;

        this.activeLeaves = [];

        this.distance = options.distance ?? 1.85;
        this.duration = options.duration ?? 1.45;

        this.rippleInterval =
            options.rippleInterval ?? 0.28;

        this.floatAmplitude =
            options.floatAmplitude ?? 0.045;
    }

    trigger(leafObject, direction, options = {}) {
        if (!leafObject || !direction) return;

        const flatDirection =
            direction.clone().setY(0);

        if (flatDirection.lengthSq() < 0.0001) {
            flatDirection.set(0, 0, -1);
        }

        flatDirection.normalize();

        const existing =
            this.activeLeaves.find(item => {
                return item.object === leafObject;
            });

        if (existing) {
            existing.life = 0;
            existing.startPosition.copy(
                leafObject.position
            );
            existing.direction.copy(flatDirection);
            return;
        }

        this.activeLeaves.push({
            object: leafObject,
            startPosition: leafObject.position.clone(),
            direction: flatDirection,
            life: 0,
            duration: options.duration ?? this.duration,
            distance: options.distance ?? this.distance,
            lastRippleTime: -999,
            baseRotationY: leafObject.rotation.y,
            baseRotationZ: leafObject.rotation.z
        });
    }

    update(delta = 0.016) {
        if (this.activeLeaves.length === 0) return;

        this.activeLeaves =
            this.activeLeaves.filter(item => {
                const object = item.object;

                if (!object || !object.parent) {
                    return false;
                }

                item.life += delta;

                const t =
                    THREE.MathUtils.clamp(
                        item.life / item.duration,
                        0,
                        1
                    );

                const eased =
                    1.0 - Math.pow(1.0 - t, 3.0);

                const travel =
                    item.distance * eased;

                object.position
                    .copy(item.startPosition)
                    .addScaledVector(
                        item.direction,
                        travel
                    );

                object.position.y +=
                    Math.sin(t * Math.PI) *
                    this.floatAmplitude;

                object.rotation.y =
                    item.baseRotationY +
                    Math.sin(t * Math.PI * 2.0) * 0.35;

                object.rotation.z =
                    item.baseRotationZ +
                    Math.sin(t * Math.PI) * 0.22;

                this.spawnTrailRippleIfNeeded(
                    item,
                    t
                );

                if (t >= 1.0) {
                    this.spawnRipple(
                        object.position,
                        {
                            opacity: 0.16,
                            endScale: 1.45,
                            duration: 0.8
                        }
                    );

                    return false;
                }

                return true;
            });
    }

    spawnTrailRippleIfNeeded(item, t) {
        if (
            item.life - item.lastRippleTime <
            this.rippleInterval
        ) {
            return;
        }

        item.lastRippleTime = item.life;

        const position =
            item.object.position.clone();

        this.spawnRipple(
            position,
            {
                opacity:
                    THREE.MathUtils.lerp(
                        0.18,
                        0.08,
                        t
                    ),
                innerRadius: 0.32,
                outerRadius: 0.46,
                startScale: 0.55,
                endScale: 1.25,
                duration: 0.75,
                yOffset: 0.045
            }
        );
    }

    spawnRipple(position, options = {}) {
        if (
            !this.spawnManager ||
            typeof this.spawnManager.spawnWaterRipple !== 'function'
        ) {
            return;
        }

        this.spawnManager.spawnWaterRipple(
            position,
            {
                color: options.color ?? 0x9ffcff,
                opacity: options.opacity ?? 0.14,
                innerRadius: options.innerRadius ?? 0.36,
                outerRadius: options.outerRadius ?? 0.52,
                startScale: options.startScale ?? 0.55,
                endScale: options.endScale ?? 1.35,
                duration: options.duration ?? 0.75,
                yOffset: options.yOffset ?? 0.045
            }
        );
    }

    clear() {
        this.activeLeaves = [];
    }
}
