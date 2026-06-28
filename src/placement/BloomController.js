export class BloomController {
    constructor() {
        this.bloomTargets = [];
        this.hasBloomed = false;
    }

    register(object, metadata = {}) {
        if (!object) return;

        const bloomable = metadata.bloomable ?? false;

        if (!bloomable) return;

        object.userData.bloomData = {
            originalScale: object.scale.clone(),
            targetScale: object.scale.clone().multiplyScalar(1.35),
            hasBloomed: false,
            ...metadata
        };

        this.bloomTargets.push(object);
    }

    bloomAll() {
        if (this.hasBloomed) return;

        this.hasBloomed = true;

        this.bloomTargets.forEach(object => {
            if (!object?.userData?.bloomData) return;

            object.userData.bloomData.hasBloomed = true;

            object.scale.copy(
                object.userData.bloomData.targetScale
            );
        });

        console.log(
            '[BloomController] Bloomed objects:',
            this.bloomTargets.length
        );
    }

    clear() {
        this.bloomTargets = [];
        this.hasBloomed = false;
    }
}
