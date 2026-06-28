export class BackgroundMountainController {
    constructor(options = {}) {
        this.horizonDistance =
            options.horizonDistance ?? 950;
    }

    update({
        mikuZ,
        frontHorizonGroup,
        backHorizonGroup,
        leftMountainGroup,
        rightMountainGroup
    }) {
        if (frontHorizonGroup) {
            frontHorizonGroup.position.set(
                0,
                0,
                mikuZ - this.horizonDistance
            );
        }

        if (backHorizonGroup) {
            backHorizonGroup.position.set(
                0,
                0,
                mikuZ + this.horizonDistance
            );
        }

        if (leftMountainGroup) {
            leftMountainGroup.position.z = mikuZ;
        }

        if (rightMountainGroup) {
            rightMountainGroup.position.z = mikuZ;
        }
    }
}