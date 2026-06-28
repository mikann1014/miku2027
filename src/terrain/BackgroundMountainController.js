/**
 * BackgroundMountainController
 *
 * ・背景の地平線および左右の山をキャラクター進行に追従させる
 * ・無限に続くように見せるための位置更新を行う
 *
 * 主な機能：
 * ・前後の地平線オブジェクトの位置調整
 * ・左右の山グループのZ位置追従
 *
 * 役割：
 * プレイヤー（ミク）の移動に対して背景を動的に追従させ、
 * シーン全体に「奥行き」と「無限空間感」を演出する
 */

export class BackgroundMountainController {
    constructor(options = {}) {
        /**
         * 初期化
         *
         * ・地平線の前後配置距離を設定
         */

        // ミクから前後どれくらい離して地平線を配置するか
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
        /**
         * フレーム更新処理
         *
         * 処理内容：
         * ・ミクのZ位置を基準に各背景オブジェクトを再配置
         *
         * 引数：
         * ・mikuZ                : ミクの現在Z位置
         * ・frontHorizonGroup   : 前方の地平線グループ
         * ・backHorizonGroup    : 後方の地平線グループ
         * ・leftMountainGroup   : 左側山グループ
         * ・rightMountainGroup  : 右側山グループ
         */

        // =========================
        // 前方地平線
        // =========================
        if (frontHorizonGroup) {
            frontHorizonGroup.position.set(
                0,
                0,
                mikuZ - this.horizonDistance
            );
        }

        // =========================
        // 後方地平線
        // =========================
        if (backHorizonGroup) {
            backHorizonGroup.position.set(
                0,
                0,
                mikuZ + this.horizonDistance
            );
        }

        // =========================
        // 左側の山
        // =========================
        if (leftMountainGroup) {
            // Zだけミクに追従（横位置は固定）
            leftMountainGroup.position.z = mikuZ;
        }

        // =========================
        // 右側の山
        // =========================
        if (rightMountainGroup) {
            // Zだけミクに追従（横位置は固定）
            rightMountainGroup.position.z = mikuZ;
        }
    }
}