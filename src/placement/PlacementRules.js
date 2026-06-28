/**
 * PlacementRules
 *
 * ・オブジェクト配置時のルール判定を行うクラス
 * ・地面/水/パスなどのサーフェスによる制限を管理
 *
 * 主な機能：
 * ・配置可能なサーフェス判定（ground / water / path）
 * ・水面への配置可否制御
 * ・クラスタ配置対象オブジェクト判定
 * ・傾斜（スロープ）による配置制限
 *
 * 役割：
 * 配置時の「置ける / 置けない」の判断ロジックを集約し、
 * 不正な配置（急斜面・不適切サーフェス）を防ぐ
 */

import * as THREE from 'three';

export class PlacementRules {
    constructor(options = {}) {
        /**
         * 初期化
         *
         * ・水上配置の許可設定
         * ・許容傾斜角度
         * ・クラスター対象オブジェクト一覧
         */

        // すべてのオブジェクトを水上に配置可能にするか
        this.allowAllObjectsOnWater =
            options.allowAllObjectsOnWater ?? true;

        // 許容する最大傾斜角（度）
        this.maxSlopeDegrees =
            options.maxSlopeDegrees ?? 55;

        // クラスタ配置対象となるオブジェクトID一覧
        this.clusterObjectIds = options.clusterObjectIds ?? [
            'flower1',
            'flower2',
            'flower3',
            'Grass1',
            'Grass2',
            'Grass3'
        ];
    }

    canPlaceOnWater(id) {
        /**
         * 水面に配置可能か判定
         *
         * ルール：
         * ・allowAllObjectsOnWater が true → 無条件許可
         * ・false の場合は Leaf のみ許可
         */

        if (this.allowAllObjectsOnWater) {
            return true;
        }

        return id === 'Leaf';
    }

    canUseClusterPlacement(id) {
        /**
         * クラスタ配置が可能なオブジェクトか判定
         *
         * ・事前定義された clusterObjectIds に含まれるかで判断
         */

        return this.clusterObjectIds.includes(id);
    }

    validateInitialSurface(hit, id) {
        /**
         * 初期ヒット面の妥当性チェック
         *
         * 処理内容：
         * ・Raycast結果（hit）を元に配置可能か判定
         * ・サーフェスタイプごとにルール適用
         *
         * 引数：
         * ・hit : RaycastIntersectオブジェクト
         * ・id  : 配置対象オブジェクトID
         *
         * 戻り値：
         * ・{ ok: true, surfaceType }
         * ・{ ok: false, reason }
         */

        // ヒット情報が無効
        if (!hit || !hit.object) {
            return {
                ok: false,
                reason: 'No surface hit.'
            };
        }

        const surfaceType = hit.object.userData.surfaceType;

        // =========================
        // パス（道） → 配置不可
        // =========================
        if (surfaceType === 'path') {
            return {
                ok: false,
                reason: 'Top surface is path.'
            };
        }

        // =========================
        // 水面
        // =========================
        if (surfaceType === 'water') {
            if (!this.canPlaceOnWater(id)) {
                return {
                    ok: false,
                    reason: `${id} cannot be placed on water.`
                };
            }

            return {
                ok: true,
                surfaceType
            };
        }

        // =========================
        // 地面
        // =========================
        if (surfaceType === 'ground') {
            // Leaf は水専用
            if (id === 'Leaf') {
                return {
                    ok: false,
                    reason: 'Leaf can only be placed on water.'
                };
            }

            // 傾斜チェック
            if (!this.isSlopePlaceable(hit)) {
                return {
                    ok: false,
                    reason: 'Slope is too steep.'
                };
            }

            return {
                ok: true,
                surfaceType
            };
        }

        // =========================
        // 未対応サーフェス
        // =========================
        return {
            ok: false,
            reason: `Unsupported surface type: ${surfaceType}`
        };
    }

    isSlopePlaceable(hit) {
        /**
         * 傾斜角による配置可否判定
         *
         * 処理：
         * ・ポリゴンの法線から傾斜角を算出
         * ・上方向ベクトルとの差分角度を取得
         * ・maxSlopeDegrees 以下なら配置可能
         *
         * 注意：
         * ・法線が取得できない場合は許可（安全側）
         */

        if (!hit || !hit.face || !hit.object) {
            return true;
        }

        // ローカル法線
        const localNormal = hit.face.normal.clone();

        // ワールド変換用行列
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(
            hit.object.matrixWorld
        );

        // ワールド空間の法線に変換
        const worldNormal = localNormal
            .applyMatrix3(normalMatrix)
            .normalize();

        // 上方向ベクトル
        const up = new THREE.Vector3(0, 1, 0);

        // 内積から角度を取得
        const dot = THREE.MathUtils.clamp(
            worldNormal.dot(up),
            -1,
            1
        );

        const slopeRadians = Math.acos(dot);
        const slopeDegrees = THREE.MathUtils.radToDeg(slopeRadians);

        // 許容角度以内ならOK
        return slopeDegrees <= this.maxSlopeDegrees;
    }
}