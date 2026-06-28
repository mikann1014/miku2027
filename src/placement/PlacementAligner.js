import * as THREE from 'three';

/**
 * PlacementAligner
 *
 * ・オブジェクトの「接地（Y位置）」を正しく補正するクラス
 *
 * 役割：
 * - オブジェクトの「底面」を地形にぴったり合わせる
 * - 不均一な地形に対して最適な高さを選ぶ
 *
 * 特徴：
 * 👉 boundingBoxベース（bottom合わせ）
 * 👉 複数点サンプリング対応（段差・坂対応）
 */

export class PlacementAligner {
    constructor(surfacePicker, options = {}) {
        this.surfacePicker = surfacePicker;

        this.footprintSampleRadiusRatio =
            options.footprintSampleRadiusRatio ?? 0.35;
    }

    alignObjectBottomToSurface(object, surfacePoint, offset = 0.0) {
        if (!object) return;

        object.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(object);

        if (
            !Number.isFinite(box.min.y) ||
            !Number.isFinite(box.max.y)
        ) {
            return;
        }

        const currentBottomY = box.min.y;
        const targetBottomY = surfacePoint.y + offset;

        const yCorrection = targetBottomY - currentBottomY;

        object.position.y += yCorrection;
        object.updateMatrixWorld(true);
    }

    alignObjectBottomToBestGroundHeight(
        object,
        centerPoint,
        landObjects,
        offset = 0.0
    ) {
        if (
            !object ||
            !centerPoint ||
            !Array.isArray(landObjects) ||
            landObjects.length === 0
        ) {
            this.alignObjectBottomToSurface(
                object,
                centerPoint,
                offset
            );
            return;
        }

        object.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(object);

        if (
            !Number.isFinite(box.min.y) ||
            !Number.isFinite(box.max.y)
        ) {
            this.alignObjectBottomToSurface(
                object,
                centerPoint,
                offset
            );
            return;
        }

        const size = new THREE.Vector3();
        box.getSize(size);

        const radius =
            Math.max(size.x, size.z) *
            this.footprintSampleRadiusRatio;

        const sampleRadius = Math.max(radius, 0.3);

        const samplePoints = this.createFootprintSamplePoints(
            centerPoint,
            sampleRadius
        );

        let bestGroundY = centerPoint.y;
        let foundGround = false;

        for (const point of samplePoints) {
            const groundY =
                this.surfacePicker.sampleTopGroundYAt(
                    point.x,
                    point.z,
                    centerPoint.y,
                    landObjects
                );

            if (groundY === null) continue;

            if (!foundGround || groundY > bestGroundY) {
                bestGroundY = groundY;
                foundGround = true;
            }
        }

        if (!foundGround) {
            this.alignObjectBottomToSurface(
                object,
                centerPoint,
                offset
            );
            return;
        }

        object.updateMatrixWorld(true);

        const updatedBox = new THREE.Box3().setFromObject(object);

        if (
            !Number.isFinite(updatedBox.min.y) ||
            !Number.isFinite(updatedBox.max.y)
        ) {
            return;
        }

        const currentBottomY = updatedBox.min.y;
        const targetBottomY = bestGroundY + offset;

        const yCorrection = targetBottomY - currentBottomY;

        object.position.y += yCorrection;
        object.updateMatrixWorld(true);
    }

    createFootprintSamplePoints(center, radius) {
        const points = [];

        points.push(center.clone());

        const angles = [
            0,
            Math.PI / 4,
            Math.PI / 2,
            Math.PI * 3 / 4,
            Math.PI,
            Math.PI * 5 / 4,
            Math.PI * 3 / 2,
            Math.PI * 7 / 4
        ];

        for (const angle of angles) {
            points.push(
                new THREE.Vector3(
                    center.x + Math.cos(angle) * radius,
                    center.y,
                    center.z + Math.sin(angle) * radius
                )
            );
        }

        return points;
    }
}