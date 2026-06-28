import * as THREE from 'three';

/**
 * SurfaceAnchorController
 *
 *途： * ・オブジェクトを「特定の地形オブジェクト」にローカル座標で固定する
 * - 無限スクロール地形で「ズレない配置」を実現
 */
export class SurfaceAnchorController {

    /**
     * =========================
     * アタッチ（固定）
     * =========================
     */
    attach(object, surfaceAnchorObject) {

        // 無効ならdetachして終了
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

        // --- 現在のworld位置取得 ---
        const worldPosition =
            new THREE.Vector3();

        object.getWorldPosition(worldPosition);

        /**
         * world → anchorのローカル座標へ変換
         */
        const localPosition =
            surfaceAnchorObject.worldToLocal(
                worldPosition.clone()
            );

        // --- アンカー情報保存 ---
        object.userData.surfaceAnchorObject =
            surfaceAnchorObject;

        object.userData.surfaceAnchorLocalPosition =
            localPosition;

        object.userData.useSurfaceAnchor =
            true;

        // world位置もバックアップ
        object.userData.anchorPosition =
            worldPosition.clone();

        // 状態フラグ
        object.userData.isWorldFixed = true;
        object.userData.followMiku = false;

        return true;
    }


    /**
     * =========================
     * デタッチ（解除）
     * =========================
     */
    detach(object) {

        if (!object) {
            return;
        }

        const worldPosition =
            new THREE.Vector3();

        object.updateMatrixWorld(true);

        object.getWorldPosition(worldPosition);

        // アンカー解除
        object.userData.useSurfaceAnchor =
            false;

        object.userData.surfaceAnchorObject =
            null;

        object.userData.surfaceAnchorLocalPosition =
            null;

        // 現位置を固定座標として保持
        object.userData.anchorPosition =
            worldPosition.clone();

        object.userData.isWorldFixed =
            true;

        object.userData.followMiku =
            false;
    }


    /**
     * =========================
     * 更新（追従）
     * =========================
     */
    updateObject(object) {

        if (!object) {
            return false;
        }

        const surfaceAnchorObject =
            object.userData?.surfaceAnchorObject;

        const localPosition =
            object.userData?.surfaceAnchorLocalPosition;

        // 有効なアンカーがない場合は処理しない
        if (
            object.userData?.useSurfaceAnchor !== true ||
            !surfaceAnchorObject ||
            !surfaceAnchorObject.parent ||
            !localPosition
        ) {
            return false;
        }

        surfaceAnchorObject.updateMatrixWorld(true);

        /**
         * ローカル → world に変換（これが核心）
         */
        const worldPosition =
            surfaceAnchorObject.localToWorld(
                localPosition.clone()
            );

        // 位置更新
        object.position.copy(worldPosition);

        // 安定用バックアップ
        object.userData.anchorPosition =
            worldPosition.clone();

        object.userData.isWorldFixed =
            true;

        object.userData.followMiku =
            false;

        return true;
    }
}
