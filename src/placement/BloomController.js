/**
ジェクトの「一括開花（スケールアップ）」を制御 * BloomController
 *
 * 役割：
 * - bloom対象登録
 * - 一度だけスケール拡大（演出）
 *
 * 特徴：
 * 一方向（元→拡大）のみ
 * リセットはclearのみ
 */
export class BloomController {

    constructor() {

        // bloom対象オブジェクト
        this.bloomTargets = [];

        // 一度実行したか（再発火防止）
        this.hasBloomed = false;
    }


    /**
     * 対象登録
     */
    register(object, metadata = {}) {

        if (!object) return;

        // bloom対象フラグ
        const bloomable =
            metadata.bloomable ?? false;

        if (!bloomable) return;

        /**
         * 各オブジェクトにbloomデータを埋める
         */
        object.userData.bloomData = {

            // 元のサイズ保存
            originalScale: object.scale.clone(),

            // 拡大後サイズ
            targetScale:
                object.scale.clone().multiplyScalar(1.35),

            // 個別フラグ
            hasBloomed: false,

            ...metadata
        };

        this.bloomTargets.push(object);
    }


    /**
     * =========================
     * 一括開花（メイン）
     * =========================
     */
    bloomAll() {

        // 多重発火防止
        if (this.hasBloomed) return;

        this.hasBloomed = true;

        this.bloomTargets.forEach(object => {

            if (!object?.userData?.bloomData) return;

            object.userData.bloomData.hasBloomed = true;

            // スケールを一気に変更
            object.scale.copy(
                object.userData.bloomData.targetScale
            );
        });

        console.log(
            '[BloomController] Bloomed objects:',
            this.bloomTargets.length
        );
    }


    /**
     * リセット
     */
    clear() {

        this.bloomTargets = [];
        this.hasBloomed = false;
    }
}