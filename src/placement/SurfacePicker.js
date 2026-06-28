import * as THREE from 'three';

export class SurfacePicker {
    constructor(camera, renderer, options = {}) {
        this.camera = camera;
        this.renderer = renderer;

        this.raycaster = new THREE.Raycaster();

        this.sampleRayStartHeight =
            options.sampleRayStartHeight ?? 80;

        this.sampleRayLength =
            options.sampleRayLength ?? 300;
    }

    pickFromPointer(event, landObjects) {
        const clientX =
            event.clientX ??
            event.touches?.[0]?.clientX;

        const clientY =
            event.clientY ??
            event.touches?.[0]?.clientY;

        if (
            clientX === undefined ||
            clientY === undefined
        ) {
            return null;
        }

        if (!this.renderer || !this.renderer.domElement) {
            console.warn(
                '[SurfacePicker] renderer or renderer.domElement is missing.'
            );
            return null;
        }

        if (!Array.isArray(landObjects) || landObjects.length === 0) {
            console.warn('[SurfacePicker] landObjects is empty.');
            return null;
        }

        const rect =
            this.renderer.domElement.getBoundingClientRect();

        const mouse = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );

        this.raycaster.setFromCamera(
            mouse,
            this.camera
        );

        const hits =
            this.raycaster.intersectObjects(
                landObjects,
                false
            );

        if (!hits || hits.length === 0) {
            return null;
        }

        return hits[0];
    }

    sampleTopSurfaceAt(x, z, referenceY, landObjects) {
    if (!Array.isArray(landObjects) || landObjects.length === 0) {
        return null;
    }

    const origin =
        new THREE.Vector3(
            x,
            referenceY + this.sampleRayStartHeight,
            z
        );

    const direction =
        new THREE.Vector3(
            0,
            -1,
            0
        );

    const sampler =
        new THREE.Raycaster(
            origin,
            direction,
            0,
            this.sampleRayLength
        );

    const hits =
        sampler.intersectObjects(
            landObjects,
            false
        );

    if (!hits || hits.length === 0) {
        return null;
    }

    const validHits =
        hits.filter(hit => {
            if (!hit || !hit.object) {
                return false;
            }

            if (hit.object.userData?.isWire) {
                return false;
            }

            const surfaceType =
                hit.object.userData?.surfaceType;

            return (
                surfaceType === 'water' ||
                surfaceType === 'path' ||
                surfaceType === 'ground' ||
                surfaceType === 'island' ||
                surfaceType === 'mountain'
            );
        });

    if (validHits.length === 0) {
        return null;
    }

    const topHit =
        validHits[0];

    return {
        point: topHit.point.clone(),
        object: topHit.object,
        surfaceType: topHit.object.userData.surfaceType
    };
}

    sampleTopGroundYAt(x, z, referenceY, landObjects) {
    const hit =
        this.sampleTopSurfaceAt(
            x,
            z,
            referenceY,
            landObjects
        );

    if (
        !hit ||
        (
            hit.surfaceType !== 'ground' &&
            hit.surfaceType !== 'mountain' &&
            hit.surfaceType !== 'island'
        )
    ) {
        return null;
    }

    return hit.point.y;
}
    isAreaAllowedSurfaceOnly({
        center,
        radius = 1.0,
        allowedSurfaceTypes = [],
        landObjects,
        referenceY = 0,
        sampleCount = 12,
        includeCenter = true
    }) {
        if (!center) return false;

        if (
            !Array.isArray(allowedSurfaceTypes) ||
            allowedSurfaceTypes.length === 0
        ) {
            return false;
        }

        if (!Array.isArray(landObjects) || landObjects.length === 0) {
            return false;
        }

        const points = [];

        if (includeCenter) {
            points.push(
                new THREE.Vector3(
                    center.x,
                    center.y,
                    center.z
                )
            );
        }

        for (let i = 0; i < sampleCount; i++) {
            const angle =
                (i / sampleCount) * Math.PI * 2;

            points.push(
                new THREE.Vector3(
                    center.x + Math.cos(angle) * radius,
                    center.y,
                    center.z + Math.sin(angle) * radius
                )
            );
        }

        for (const point of points) {
            const hit =
                this.sampleTopSurfaceAt(
                    point.x,
                    point.z,
                    referenceY,
                    landObjects
                );

            if (!hit) {
                return false;
            }

            if (!allowedSurfaceTypes.includes(hit.surfaceType)) {
                return false;
            }
        }

        return true;
    }

    isAreaFreeOfSurfaceTypes({
        center,
        radius = 1.0,
        blockedSurfaceTypes = [],
        landObjects,
        referenceY = 0,
        sampleCount = 12,
        includeCenter = true
    }) {
        if (!center) return false;

        if (!Array.isArray(landObjects) || landObjects.length === 0) {
            return false;
        }

        const points = [];

        if (includeCenter) {
            points.push(
                new THREE.Vector3(
                    center.x,
                    center.y,
                    center.z
                )
            );
        }

        for (let i = 0; i < sampleCount; i++) {
            const angle =
                (i / sampleCount) * Math.PI * 2;

            points.push(
                new THREE.Vector3(
                    center.x + Math.cos(angle) * radius,
                    center.y,
                    center.z + Math.sin(angle) * radius
                )
            );
        }

        for (const point of points) {
            const hit =
                this.sampleTopSurfaceAt(
                    point.x,
                    point.z,
                    referenceY,
                    landObjects
                );

            if (!hit) {
                continue;
            }

            if (blockedSurfaceTypes.includes(hit.surfaceType)) {
                return false;
            }
        }

        return true;
    }
}