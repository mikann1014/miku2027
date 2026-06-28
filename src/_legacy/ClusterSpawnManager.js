export class ClusterSpawnManager {
    constructor(spawnManager) {
        this.spawnManager = spawnManager;
        this.isBurst = false;
    }

    enableMaxBurst() {
        this.isBurst = true;
    }

    spawnBurst(position, id) {
        if (!this.isBurst) return;

        const COUNT = 25;

        for (let i = 0; i < COUNT; i++) {
            const offset = {
                x: (Math.random() - 0.5) * 10,
                z: (Math.random() - 0.5) * 10
            };

            this.spawnManager.spawn(
                id,
                {
                    x: position.x + offset.x,
                    y: position.y,
                    z: position.z + offset.z
                },
                {
                    scaleMultiplier: 0.5 + Math.random()
                }
            );
        }
    }
}