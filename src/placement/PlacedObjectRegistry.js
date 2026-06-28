export class PlacedObjectRegistry {
    constructor(options = {}) {
        this.objects = [];

        this.minSpacing = options.minSpacing ?? 0.75;
    }

    add(object, metadata = {}) {
        if (!object) return;

        object.userData.placementMetadata = {
            ...(object.userData.placementMetadata || {}),
            ...metadata
        };

        this.objects.push(object);
    }

    getAll() {
        return this.objects;
    }

    getBloomableObjects() {
        return this.objects.filter(object => {
            return object?.userData?.placementMetadata?.bloomable;
        });
    }

    isTooClose(targetPoint, minSpacing = this.minSpacing) {
        for (const existingObject of this.objects) {
            if (!existingObject) continue;

            const dx = existingObject.position.x - targetPoint.x;
            const dz = existingObject.position.z - targetPoint.z;

            const horizontalDistance = Math.sqrt(dx * dx + dz * dz);

            if (horizontalDistance < minSpacing) {
                console.log(
                    `[Placement Blocked] Too close. Distance: ${horizontalDistance.toFixed(3)}, Min: ${minSpacing}`
                );

                return true;
            }
        }

        return false;
    }

    clear() {
        this.objects = [];
    }
}