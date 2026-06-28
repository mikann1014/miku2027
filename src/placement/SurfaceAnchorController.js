import * as THREE from 'three';

export class SurfaceAnchorController {
    attach(object, surfaceAnchorObject) {
        if (
            !object ||
            !surfaceAnchorObject ||
            !surfaceAnchorObject.isObject3D
        ) {
            if (object) {
                this.detach(object);
            }

            return false;
        }

        object.updateMatrixWorld(true);
        surfaceAnchorObject.updateMatrixWorld(true);

        const worldPosition =
            new THREE.Vector3();

        object.getWorldPosition(
            worldPosition
        );

        const localPosition =
            surfaceAnchorObject.worldToLocal(
                worldPosition.clone()
            );

        object.userData.surfaceAnchorObject =
            surfaceAnchorObject;

        object.userData.surfaceAnchorLocalPosition =
            localPosition;

        object.userData.useSurfaceAnchor =
            true;

        object.userData.anchorPosition =
            worldPosition.clone();

        object.userData.isWorldFixed =
            true;

        object.userData.followMiku =
            false;

        return true;
    }

    detach(object) {
        if (!object) {
            return;
        }

        const worldPosition =
            new THREE.Vector3();

        object.updateMatrixWorld(true);

        object.getWorldPosition(
            worldPosition
        );

        object.userData.useSurfaceAnchor =
            false;

        object.userData.surfaceAnchorObject =
            null;

        object.userData.surfaceAnchorLocalPosition =
            null;

        object.userData.anchorPosition =
            worldPosition.clone();

        object.userData.isWorldFixed =
            true;

        object.userData.followMiku =
            false;
    }

    updateObject(object) {
        if (!object) {
            return false;
        }

        const surfaceAnchorObject =
            object.userData?.surfaceAnchorObject;

        const localPosition =
            object.userData?.surfaceAnchorLocalPosition;

        if (
            object.userData?.useSurfaceAnchor !== true ||
            !surfaceAnchorObject ||
            !surfaceAnchorObject.parent ||
            !localPosition
        ) {
            return false;
        }

        surfaceAnchorObject.updateMatrixWorld(true);

        const worldPosition =
            surfaceAnchorObject.localToWorld(
                localPosition.clone()
            );

        object.position.copy(
            worldPosition
        );

        object.userData.anchorPosition =
            worldPosition.clone();

        object.userData.isWorldFixed =
            true;

        object.userData.followMiku =
            false;

        return true;
    }
}